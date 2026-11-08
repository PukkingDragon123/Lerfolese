// Sir Isaac Plumb: an old, slim, stooped natural philosopher whose body is a carved, varnished wooden marionette.
// Base mesh: Quaternius Universal Base Characters (CC0), reshaped in bind pose (thin limbs and torso, larger head),
// animated with the Universal Animation Library (CC0). Clothing is real geometry where it matters (skinned frock-coat
// tails to the knees, standing collar, cuffs, lace jabot, shoe buckles), plus carved joint rings at shoulders,
// elbows, wrists and knees and a mop of lofted wild white hair. Everything is painted onto the model's own UVs.
// He hangs from a floating control cross held by his own faint glowing ghost; 6 glowing strings.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';

const F = K.FACE.male; const SCALE = 2.2 / 1.83;
const C = {
  wood: K.hex('#bf7a3e'), woodD: K.hex('#5e2e1c'), face: K.hex('#e9b98a'), coat: K.hex('#6e2a80'), trim: K.hex('#f0bd4e'),
  vest: K.hex('#dba22c'), cravat: K.hex('#f6f1e8'), breeches: K.hex('#4a2a5e'), stock: K.hex('#efe6d4'), shoe: K.hex('#2c1e30'), brass: K.hex('#f2c454'),
  hair: K.hex('#f2eef8'), lip: K.hex('#b4555c'), blush: K.hex('#ec7a6a'), nose: K.hex('#e47c6c'), iris: K.hex('#3c9cb4'), ink: K.hex('#4a2438'),
};
const T = [0, 0, 0];
const lit = (c, k = 0.35) => 0.5 + c.ny * 0.16 + c.nz * 0.06 + c.sh * k;
const HEADS = 1.12, HPIV = new THREE.Vector3(0, 1.62, 0);
const RULES = {
  pelvis: { k: 0.8 }, spine_01: { k: 0.78 }, spine_02: { k: 0.74 }, spine_03: { k: 0.72 }, clavicle_l: { k: 0.72 }, clavicle_r: { k: 0.72 }, neck_01: { k: 0.7 },
  upperarm_l: { k: 0.62 }, upperarm_r: { k: 0.62 }, lowerarm_l: { k: 0.64 }, lowerarm_r: { k: 0.64 }, hand_l: { k: 0.85 }, hand_r: { k: 0.85 },
  thigh_l: { k: 0.66 }, thigh_r: { k: 0.66 }, calf_l: { k: 0.68 }, calf_r: { k: 0.68 }, Head: { s: HEADS, pivot: HPIV },
};

function coat(c, o, extraL = 0) { K.tone(C.coat, K.band(lit(c) + extraL, 4), o.col); o.ro = 0.85; }
function trim(o, L = 0.6) { K.tone(C.trim, L, o.col); o.ro = 0.4; o.me = 0.4; }
function button(o, d, r) { K.tone(C.brass, d < r * 0.45 ? 0.9 : d < r * 0.8 ? 0.62 : 0.3, o.col); o.me = 0.5; o.ro = 0.3; }
function wood(c, o, along, p1, p2, joints = []) {
  for (const j of joints) if (Math.abs(along - j) < 0.004) { K.tone(C.woodD, 0.25, o.col); o.ro = 0.6; return; }
  K.woodTone(o, C.wood, C.woodD, along, p1, p2, lit(c, 0.25));
}

function paintHead(c, o, E) {
  const ax = Math.abs(c.x); const Y = c.y - F.ey;
  const hairZone = (Y > 0.062 && (c.z < 0.06 || Y > 0.09)) || c.z < -0.03 || (ax > 0.074 && Y > -0.02 && c.z < 0.04 && c.z > -0.04);
  if (hairZone && !(ax > 0.078 && Y < 0.02 && Y > -0.04 && c.z > -0.01)) return K.fur3(c, o, C.hair, 0.012, 2.5, 0.55);
  K.tone(C.face, K.band(lit(c, 0.5), 4), o.col); o.ro = 0.45;
  const g = (c.y * 60 + K.vnoise(c.x * 20, c.y * 4, c.z * 20) * 2.5) % 1; if (g < 0.06) K.mixc(o.col, C.woodD, 0.14); // faint carved grain
  if (ax > 0.078) { if (c.nx * Math.sign(c.x) > 0.5 && Math.hypot(c.z, Y + 0.012) < 0.016) K.mixc(o.col, K.tone(C.face, 0.25, T), 0.5); return; }
  K.paintFace(c, o, F, E, { skin: C.face, ink: C.ink, age: 1, puppet: true, brow: C.hair, bushy: 1.3, browW: 1.45, nose: C.nose, blush: C.blush, lip: C.lip });
}
function paintArm(c, o) {
  const ax = Math.abs(c.x); const dy = c.y - 1.456, dz = c.z + 0.065;
  if (ax < 0.47) { coat(c, o, ax > 0.36 ? (Math.sin(ax * 180) > 0.3 ? 0.1 : -0.06) : 0); if (c.ny < -0.92) K.mixc(o.col, C.ink, 0.45); return; } // sleeve (cuff + elbow ring are geometry)
  const knuckles = /index|middle|ring|pinky/.test(c.b) ? [0.785, 0.83, 0.862] : [];
  wood(c, o, ax, dy, dz, knuckles);
}
function paintLeg(c, o) {
  const lx = Math.abs(c.x) - 0.114, out = Math.sign(c.x) * c.nx > 0.55;
  if (c.y > 0.575) { K.tone(C.breeches, K.band(lit(c) + (c.y < 0.72 && Math.sin(c.y * 220) > 0.6 ? -0.08 : 0), 4), o.col); o.ro = 0.8; if (out && c.y < 0.67 && c.y > 0.59 && Math.abs(c.z + 0.036) < 0.008 && ((c.y - 0.59) * 90) % 1 < 0.4) button(o, 0, 1); return; }
  if (c.y > 0.53) return wood(c, o, c.y, lx, c.z); // knee (under the carved ring)
  if (c.y > 0.105) { K.tone(C.stock, K.band(lit(c, 0.25) + (Math.sin(Math.atan2(lx, c.z + 0.036) * 14) > 0.5 ? 0.06 : 0), 4), o.col); o.ro = 0.9; if (c.y > 0.505) K.mixc(o.col, K.tone(C.stock, 0.3, T), 0.6); return; }
  K.tone(C.shoe, K.band(0.45 + c.ny * 0.3 + c.nz * 0.1, 4), o.col); o.ro = 0.25; // buckled shoes (buckle is geometry)
  if (c.y < 0.02 && c.z < -0.04) K.tone(K.hex('#5a2c2a'), 0.45, o.col);
  if (c.y > 0.085 && c.z > -0.02) K.mixc(o.col, K.tone(C.shoe, 0.75, T), 0.5);
}
function paintTorso(c, o) {
  const ax = Math.abs(c.x), y = c.y; const front = c.z > -0.01 && c.nz > 0.2;
  const vw = 0.07 + (1.42 - y) * 0.07;
  if (front && y > 1.33 && ax < 0.03 + (y - 1.33) * 0.35) { K.tone(C.cravat, K.band(0.55 + c.ny * 0.2 + c.sh * 0.2, 4), o.col); o.ro = 0.9; return; }
  if (front && y > 0.935 + ax * 0.5 && y < 1.43 && ax < vw) { // mustard waistcoat + brass buttons
    K.tone(C.vest, K.band(lit(c, 0.2), 4), o.col); o.ro = 0.7;
    if (((c.x * 160 + 100) % 1 < 0.08) !== ((y * 160) % 1 < 0.08)) K.mixc(o.col, K.tone(C.vest, 0.32, T), 0.3);
    const k = Math.round((y - 1.0) / 0.052); const bd = Math.hypot(c.x, y - 1.0 - k * 0.052); if (k >= 0 && k <= 6 && bd < 0.0085) button(o, bd, 0.0085);
    if (ax > vw - 0.004) K.mixc(o.col, C.ink, 0.5);
    if (Math.abs(y - 1.08) < 0.008 && ax > 0.03 && ax < 0.07) K.mixc(o.col, K.tone(C.vest, 0.3, T), 0.6);
    return;
  }
  if (y < 0.985 && front && ax < 0.1) { K.tone(C.breeches, K.band(lit(c), 4), o.col); o.ro = 0.8; return; }
  const lap = front && y > 1.12 && ax < vw + 0.045;
  coat(c, o, lap ? 0.12 : 0);
  if (front && Math.abs(ax - vw) < 0.0045 && y < 1.45) trim(o, 0.7);
  if (lap && Math.abs(ax - vw - 0.045) < 0.003) K.mixc(o.col, C.ink, 0.5);
  if (front && y > 0.98 && y < 1.32) { const k = Math.round((y - 1.0) / 0.075); const bd = Math.hypot(ax - vw - 0.022, y - 1.0 - k * 0.075); if (bd < 0.011) button(o, bd, 0.011); }
  if (c.z < 0 && ax < 0.0035) K.mixc(o.col, C.ink, 0.6);
}
function painter(E) {
  return (c, o) => {
    const ax = Math.abs(c.x);
    if (c.b === 'Head' || (c.y > 1.585 && ax < 0.13)) return paintHead(c, o, E);
    if (c.b === 'neck_01' || (c.y > 1.5 && ax < 0.11)) { if (c.z > 0.0) { K.tone(C.cravat, K.band(0.5 + c.ny * 0.2, 4), o.col); o.ro = 0.9; } else coat(c, o, 0.1); return; }
    if (ax > 0.19 && c.y > 1.3) return paintArm(c, o);
    if (c.y < 0.975 && /thigh|calf|foot|ball/.test(c.b)) return paintLeg(c, o);
    return paintTorso(c, o);
  };
}

// ---------------------------------------------------------------- shared resources (built once)
let RES = null;
function slab(geo, y, dy = 0.02, maxX = 0.28) { const p = geo.attributes.position; let x = 0, z0 = 9, z1 = -9; for (let i = 0; i < p.count; i++) { if (Math.abs(p.getY(i) - y) > dy || Math.abs(p.getX(i)) > maxX) continue; x = Math.max(x, Math.abs(p.getX(i))); z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); } return { x, z0, z1 }; }
function resources() {
  if (RES) return RES;
  const body = K.baseBody('male'), eyes = K.baseEyes('male');
  const geo = K.reshaped('prof-body', body, RULES), eyeGeo = K.reshaped('prof-eyes', eyes, RULES);
  const S = K.surface('male-body', body, 1024); const shade = K.shadeOf('male');
  const res = K.paintSurface(S, painter(K.EXPR.smug), { shade });
  const faceS = { ...S }; const sel = []; for (let i = 0; i < S.n; i++) { const x = S.P[i * 3], y = S.P[i * 3 + 1], z = S.P[i * 3 + 2]; if (y > F.ey - 0.14 && y < F.ey + 0.11 && z > 0.01 && Math.abs(x) < 0.085) sel.push(i); }
  const pick = (A, k) => { const out = new A.constructor(sel.length * k); sel.forEach((s, j) => { for (let q = 0; q < k; q++) out[j * k + q] = A[s * k + q]; }); return out; };
  Object.assign(faceS, { n: sel.length, off: pick(S.off, 1), P: pick(S.P, 3), N: pick(S.N, 3), B: pick(S.B, 1) });
  const mat = K.paintedMat(res);
  const eyeS = K.surface('male-eyes', eyes, 128); const eyeCache = new Map();
  const eyeTex = (lid) => { const k = Math.round(lid * 10); if (!eyeCache.has(k)) eyeCache.set(k, K.canvasTex(K.paintSurface(eyeS, (c, o) => K.paintEye(c, o, F, { skin: C.face, ink: C.ink, iris: C.iris, irisR: 0.55 }, k / 10)).canvas)); return eyeCache.get(k); };
  const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTex(0.4), roughness: 0.3, flatShading: true });
  const faceCache = new Map(); let cur = 'smug';
  const setFace = (key, E) => {
    if (key === cur) return; cur = key;
    if (!faceCache.has(key)) { const [x0, y0, x1, y1] = K.paintSurface(faceS, painter(E), { shade, into: res }).rect; faceCache.set(key, { x0, y0, data: res.canvas.getContext('2d').getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1) }); }
    else { const f = faceCache.get(key); res.canvas.getContext('2d').putImageData(f.data, f.x0, f.y0); }
    mat.map.needsUpdate = true;
  };
  // clothing / carving materials (painted in UV space)
  const M = {
    skirt: K.uvMat('prof-skirt', 256, 128, (u, v, o) => {
      const pleat = Math.sin(u * Math.PI * 2 * 7); K.tone(C.coat, K.band(0.5 + (pleat > 0.4 ? 0.14 : pleat < -0.5 ? -0.14 : 0) - v * 0.12, 4), o.col); o.ro = 0.85;
      if (v > 0.93 || u < 0.015 || u > 0.985 || (Math.abs(u - 0.5) < 0.012 && v > 0.35)) { K.tone(C.trim, v > 0.965 ? 0.45 : 0.68, o.col); o.me = 0.4; o.ro = 0.4; }
      const bd = Math.min(Math.hypot((u - 0.46) * 6, v - 0.06), Math.hypot((u - 0.54) * 6, v - 0.06)); if (bd < 0.035) button(o, bd, 0.035);
    }, { side: THREE.DoubleSide }),
    cuff: K.uvMat('prof-cuff', 64, 32, (u, v, o) => { K.tone(C.vest, K.band(0.5 + Math.cos(u * 6.28) * 0.2, 4), o.col); o.ro = 0.7; if (v < 0.14 || v > 0.86) trim(o, 0.7); if (Math.abs(u - 0.25) < 0.03 && Math.abs(v - 0.5) < 0.12) button(o, Math.hypot(u - 0.25, (v - 0.5) * 0.25), 0.03); }, { side: THREE.DoubleSide }),
    collar: K.uvMat('prof-collar', 128, 32, (u, v, o) => { K.tone(C.coat, K.band(0.55 + Math.cos(u * 6.28) * 0.12 - v * 0.15, 4), o.col); o.ro = 0.85; if (v < 0.12) trim(o, 0.7); }, { side: THREE.DoubleSide }),
    lace: K.uvMat('prof-lace', 64, 64, (u, v, o) => { const s = Math.sin(u * 6.28 * 6 + v * 20); K.tone(C.cravat, K.band(0.58 + (s > 0.3 ? 0.12 : s < -0.6 ? -0.18 : 0) - v * 0.1, 4), o.col); o.ro = 0.9; }, { side: THREE.DoubleSide }),
    ring: K.uvMat('prof-ring', 64, 32, (u, v, o) => { K.woodTone(o, K.hex('#9a5a2c'), C.woodD, u * 3, v, u, 0.5 + Math.cos(u * 6.28) * 0.25); if (Math.abs(((v * 4) % 1) - 0.5) < 0.12 && Math.abs(Math.cos(u * 6.28)) > 0.9) { K.tone(C.brass, 0.8, o.col); o.me = 0.5; } }),
    hair: K.uvMat('prof-hair', 64, 128, (u, v, o) => { const st = (u * 9 + Math.sin(v * 9) * 0.6) % 1; K.tone(C.hair, K.band(0.52 + Math.cos(u * 6.28) * 0.24 + (st < 0.18 ? -0.18 : 0) - v * 0.12, 4), o.col); o.ro = 0.9; }, { side: THREE.DoubleSide }),
    buckle: new THREE.MeshStandardMaterial({ color: 0xf2c454, metalness: 0.5, roughness: 0.3, flatShading: true }),
  };
  return (RES = { geo, eyeGeo, mat, eyeMat, eyeTex, setFace, M });
}

// lofted, wavy hair locks round the (enlarged) skull: wild Newtonian mop with a high forehead
function hairLocks(mat) {
  const g = new THREE.Group(); const hc = new THREE.Vector3(0, 1.7, -0.005).sub(HPIV).multiplyScalar(HEADS).add(HPIV); let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const az = rnd() * Math.PI * 2, el = -0.5 + rnd() * 1.8; if (Math.cos(az) > 0.3 && el < 1.05) continue; if (Math.cos(az) > 0.75 && el < 1.3) continue;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const p0 = hc.clone().add(new THREE.Vector3(dir.x * 0.098, dir.y * 0.112, dir.z * 0.104));
    const len = 0.07 + rnd() * 0.08 + (el < 0.4 ? 0.06 : 0); const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(); const ph = rnd() * 6; const fat = 0.7 + rnd() * 0.8;
    const l = new K.Loft(8, 5).set((t, out) => { out.copy(p0).addScaledVector(dir, len * t * 0.75 + Math.sin(t * 7 + ph) * 0.015 * t).add(new THREE.Vector3(0, -len * t * t * (el < 0.9 ? 0.55 : 0.15), 0)).addScaledVector(side, Math.sin(t * 4.5 + ph) * 0.03 * t); },
      (t) => [(0.013 * (1 - t * 0.5) + 0.002) * fat, (0.028 * (1 - t * 0.7) + 0.003) * fat], { ref: (t, n) => n.copy(side) });
    K.mesh(l.geo, mat, g);
  }
  return g;
}
function turnedBar(len, r, mat) { // a lathe-turned dowel with knobs and grooves, along +X
  const l = new K.Loft(28, 9).set((t, p) => p.set((t - 0.5) * len, 0, 0), (t) => { const e = Math.min(t, 1 - t) * len; return r * (e < 0.035 ? 0.4 + e / 0.035 * 1.1 : e < 0.06 ? 1.5 - (e - 0.035) * 22 : e < 0.075 ? 0.85 : 1 + Math.sin(e * 40) * 0.04); });
  return K.mesh(l.geo, mat);
}
function dress(P, R) { // real-geometry clothing and carving on one professor instance (bind-pose coordinates)
  const { geo, M } = R; const body = P.body; const info = K.boneInfo(body); const B = (n) => info[n].pos;
  // frock-coat tails: skinned to pelvis + thighs, open at the front, back vent, pleated, hem at the knee
  const rows = 10, cols = 26; const ext = []; for (let r = 0; r <= rows; r++) ext.push(slab(geo, 1.04 - (r / rows) * 0.5, 0.025));
  const th0 = 0.8, th1 = Math.PI * 2 - 0.8;
  K.skinnedSheet(body, rows, cols, (u, v, out) => {
    const e = ext[Math.round(v * rows)]; const th = th0 + (th1 - th0) * u; const pl = 1 + 0.05 * v * Math.abs(((th * 7 / Math.PI) % 2) - 1);
    const rx = (Math.max(0.15, e.x) + 0.028 + v * 0.03) * pl, rz = ((e.z1 - e.z0) / 2 + 0.03 + v * 0.03) * pl, zc = (e.z0 + e.z1) / 2;
    out.set(Math.sin(th) * rx, 1.04 - v * 0.5, zc + Math.cos(th) * rz);
  }, (u, v, p) => { const s = p.x / 0.2; const wl = v * 0.8 * K.sstep(-0.4, 0.6, s), wr = v * 0.8 * K.sstep(-0.4, 0.6, -s); return [['pelvis', Math.max(0.05, 1 - wl - wr)], ['thigh_l', wl], ['thigh_r', wr]]; }, M.skirt, { skip: (u, v) => Math.abs(u - 0.5) < 0.025 && v > 0.35 });
  // standing collar round the back of the neck
  const ne = slab(geo, 1.53, 0.015, 0.1);
  K.skinnedSheet(body, 3, 16, (u, v, out) => { const th = 1.1 + (Math.PI * 2 - 2.2) * u; const r = 1 + v * 0.35; out.set(Math.sin(th) * (ne.x + 0.012) * r, 1.46 + v * 0.1, (ne.z0 + ne.z1) / 2 - 0.005 + Math.cos(th) * ((ne.z1 - ne.z0) / 2 + 0.012) * r); }, (u, v) => [['spine_03', 1 - v * 0.5], ['neck_01', v * 0.5]], M.collar);
  // lace jabot cascading from the throat
  const ch = slab(geo, 1.42, 0.02, 0.1), nk = slab(geo, 1.52, 0.015, 0.08);
  const jab = new K.Loft(10, 12).set(K.curve([[0, 1.535, nk.z1 + 0.004], [0, 1.47, ch.z1 + 0.012], [0, 1.37, ch.z1 + 0.018]]), (t) => [0.028 + t * 0.02, 0.01 + t * 0.006], { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 5 + t * 14) * 0.22 });
  K.attachBind(K.mesh(jab.geo, M.lace), body, 'spine_03');
  // carved joint rings, turned-back cuffs above the elbow, shoe buckles
  for (const sd of ['l', 'r']) {
    const sh = B('upperarm_' + sd), el = B('lowerarm_' + sd), wr = B('hand_' + sd), kn = B('calf_' + sd), ft = B('foot_' + sd);
    const armAx = el.clone().sub(sh).normalize(), foreAx = wr.clone().sub(el).normalize(), handAx = info['middle_01_' + sd].pos.clone().sub(wr).normalize(), legAx = ft.clone().sub(kn).normalize();
    const ring = (c, ax, bone, maxR, w = 0.011) => { const r = K.radiusAt(geo, c, ax, 0.012, maxR).max + w * 0.6; K.attachBind(K.jointRing(c, ax, r, w, M.ring), body, bone); };
    ring(sh.clone().addScaledVector(armAx, 0.05), armAx, 'upperarm_' + sd, 0.075, 0.013);
    ring(el, foreAx, 'lowerarm_' + sd, 0.06); ring(wr, handAx, 'hand_' + sd, 0.05, 0.009); ring(kn, legAx, 'calf_' + sd, 0.07, 0.012);
    const cc = el.clone().addScaledVector(armAx, -0.045); const cr = K.radiusAt(geo, cc, armAx, 0.02, 0.07).max;
    const cuff = new K.Loft(4, 14).set((t, out) => out.copy(cc).addScaledVector(armAx, (t - 0.5) * 0.06), (t) => cr + 0.008 + t * 0.012, { ref: (t, n) => n.set(0, 1, 0) });
    K.attachBind(K.mesh(cuff.geo, M.cuff), body, 'upperarm_' + sd);
    const bs = new THREE.Shape(); bs.moveTo(-0.019, -0.013); bs.lineTo(0.019, -0.013); bs.lineTo(0.019, 0.013); bs.lineTo(-0.019, 0.013); bs.closePath();
    const hole = new THREE.Path(); hole.moveTo(-0.012, -0.007); hole.lineTo(-0.012, 0.007); hole.lineTo(0.012, 0.007); hole.lineTo(0.012, -0.007); hole.closePath(); bs.holes.push(hole);
    const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.005, bevelEnabled: false }); bg.rotateX(-1.05); bg.translate(ft.x, 0.074, 0.03);
    K.attachBind(K.mesh(bg, M.buckle), body, 'foot_' + sd);
  }
  K.attachBind(hairLocks(M.hair), body, 'Head');
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
  const woodMat = K.uvMat('cross-wood', 64, 256, (u, v, o) => K.woodTone(o, C.wood, C.woodD, v * 4, u, v, 0.5 + Math.cos(u * Math.PI * 2) * 0.22));
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
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), grip = new THREE.Vector3(), elbow = new THREE.Vector3(), rq = new THREE.Quaternion();

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
        const { bones: B, anim, R, G } = M; anim.update(dt); const bd = (b, x, y, z) => anim.bend(b, x, y, z);
        // old man's stoop + marionette looseness on top of the animation
        bd(B.spine_02, 0.1 + st.slump.value * 0.04, 0, Math.sin(t * 1.1 + 0.5) * 0.025); bd(B.spine_03, 0.16, 0, 0); bd(B.neck_01, 0.2, 0, 0);
        bd(B.upperarm_l, Math.sin(t * 1.7) * 0.07, 0, Math.sin(t * 1.3) * 0.04); bd(B.upperarm_r, Math.sin(t * 1.7 + 1) * 0.07, 0, Math.sin(t * 1.3 + 2) * 0.04);
        bd(B.hand_l, Math.sin(t * 2.3) * 0.15, 0, 0); bd(B.hand_r, Math.sin(t * 2.3 + 1) * 0.15, 0, 0);
        bd(B.calf_l, Math.max(0, Math.sin(t * 1.4)) * 0.08, 0, 0); bd(B.calf_r, Math.max(0, Math.sin(t * 1.4 + 1)) * 0.08, 0, 0);
        st.jaw.target = st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.35 : 0; st.jaw.update(dt); jaw.rotation.x = st.jaw.value;
        bd(B.Head, -0.32 + st.look.y * 0.25 + Math.sin(t * 1.3) * 0.04 + st.jaw.value * 0.15, st.look.x * 0.45 + Math.sin(t * 0.6) * 0.08, Math.sin(t * 0.8) * 0.05);
        if (st.talk > 0) st.talk -= dt;
        const open = st.talk > 0 && Math.sin(t * 17) > 0; const E = K.EXPR[st.expr];
        R.setFace(st.expr + (open ? '+o' : ''), open ? { ...E, open: Math.max(E.open, 0.55), teeth: 1 } : E);
        st.blink -= dt; if (st.blink < -3.6) st.blink = 0.12;
        R.eyeMat.map = R.eyeTex(st.blink > 0 ? 1 : E.lid);
        root.updateMatrixWorld(true); const gb = G.bones; root.getWorldQuaternion(rq);
        for (const [k, s] of [['l', 1], ['r', -1]]) {
          grip.set(s * 0.46, 0.02, 0).applyMatrix4(cross.matrixWorld); gb['upperarm_' + k].getWorldPosition(tmp);
          elbow.lerpVectors(tmp, grip, 0.5); tmp2.set(s * 0.18, -0.12, -0.05).applyQuaternion(rq); elbow.add(tmp2);
          gb['upperarm_' + k].quaternion.copy(M.bind['upperarm_' + k]); gb['lowerarm_' + k].quaternion.copy(M.bind['lowerarm_' + k]);
          K.aimBone(gb['upperarm_' + k], gb['lowerarm_' + k], elbow); K.aimBone(gb['lowerarm_' + k], gb['hand_' + k], grip);
        }
        gb.Head.quaternion.copy(M.bind.Head); K.nudge(gb.Head, 0.35 + Math.sin(t * 0.9) * 0.05, 0, 0);
      }
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
  K.withAssets(['base_male', 'anims', 'male_shade.png'], () => {
    const R = resources(); const P = K.makeBody('male'); const { model, bones } = P;
    P.body.geometry = R.geo; P.eyes.geometry = R.eyeGeo; P.body.material = R.mat; P.eyes.material = R.eyeMat; model.scale.setScalar(SCALE); body.add(model);
    dress(P, R);
    bones.Head.add(head); head.position.set(0, 0.12, 0.02); bones.Head.add(jaw); jaw.position.set(0, 0.03, 0.08);
    bones.spine_03.add(torso); torso.position.set(0, 0, -0.12);
    bones.hand_r.add(hands[0]); bones.hand_l.add(hands[1]); hands[0].position.set(0, 0.08, 0); hands[1].position.set(0, 0.08, 0);
    bones.calf_r.add(knees[0]); bones.calf_l.add(knees[1]);
    for (const [s, k] of [[-1, 'r'], [1, 'l']]) { arms.push({ sh: bones['upperarm_' + k], el: bones['lowerarm_' + k], wr: bones['hand_' + k], hand: bones['hand_' + k], s }); legs.push({ hip: bones['thigh_' + k], kn: bones['calf_' + k], an: bones['foot_' + k], s }); }
    // the ghost: a translucent additive copy of the same (reshaped) base mesh, holding the cross
    const G = K.makeBody('male'); G.body.geometry = R.geo; G.eyes.geometry = R.eyeGeo; G.body.material = ghostMat; G.eyes.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8fbff).multiplyScalar(3) });
    G.model.traverse((o) => { if (o.isMesh) o.castShadow = false; }); G.model.scale.setScalar(SCALE * 0.78); G.model.position.y = -1.45 * SCALE * 0.78 + 0.05; G.model.rotation.x = 0.25; ghost.add(G.model);
    const bind = {}; for (const k of ['Head', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']) bind[k] = G.bones[k].quaternion.clone();
    M = { R, P, bones, G, bind, anim: new K.Anim(model) };
    M.anim.idle.time = Math.random() * 2;
    api.update(0);
  });
  api.update(0.016);
  return api;
}
