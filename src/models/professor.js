// Sir Isaac Plumb: a real jointed wooden marionette, old and broken. Carved/turned segments (head with a dropping
// marionette jaw, torso block split down one side and wired back together, pelvis, limbs, carved hand with two fingers
// snapped off, buckled shoes) hang from one another on brass pins, eye-screws and twine with gaps at every joint. His
// right arm is a turned TABLE LEG (ring mouldings, brass ferrule and castor for a hand) nailed and lashed at the
// shoulder. Old Newton read: wild white wool hair, painted face, tattered plum frock coat with tails, mustard
// waistcoat, lace cravat. A huge, mostly invisible spectral hand (additive fresnel shimmer, drifting runes, motes)
// holds the control cross; its fingers tilt and pull and the glowing strings drive every pose: idle sway and dangling
// jitter, string-jerked throw / cast / cheer, a slack-string collapse when hurt.
// Everything is smooth lofted geometry with painted cel textures (MeshToonMaterial; the engine adds ink outlines).
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';
import { buildHead } from './puppethead.js';

const { hex } = K;
const T = [0, 0, 0];
const C = {
  oak: hex('#c98a4c'), oakD: hex('#7a3e22'), mahog: hex('#8a3a24'), mahogD: hex('#4a1a16'), raw: hex('#e6c08a'), brass: hex('#f2c454'),
  coat: hex('#6e2a80'), coatD: hex('#3e1650'), vest: hex('#dca22c'), lace: hex('#f6f1e8'), twine: hex('#c8a46a'), wool: hex('#f4f0f6'), shoe: hex('#2a1c2a'),
  ink: hex('#2a1418'), iris: hex('#3c9cb4'), blush: hex('#e8806a'), lip: hex('#a84a50'),
};
const TAU = Math.PI * 2;
const du = (u) => ((u + 0.5) % 1 + 1) % 1 - 0.5; // -0.5..0.5 with 0 = the front (loft u=0 faces +Z)

// ---------------------------------------------------------------- painted materials (UV space: u around, v along)
const crackAt = (u, v, seed, wob = 0.012) => { const c = 0.3 + seed * 0.37 % 0.4; return Math.abs(u - c - Math.sin(v * 37 + seed * 9) * wob - Math.sin(v * 91 + seed) * wob * 0.4); };
function woodPx(o, u, v, base, dark, { cracks = 1, seed = 1, grain = 34 } = {}) {
  const g = (u * grain + Math.sin(v * 6 + u * 9 + seed) * 0.8) % 1; K.tone(base, K.band(0.55 + (g < 0.5 ? 0.04 : -0.03), 4), o.col);
  if (g < 0.07) K.mixc(o.col, K.tone(dark, 0.45, T), 0.5);
  for (let i = 0; i < cracks; i++) { const d = crackAt(u, v, seed + i * 3.1); const len = v > 0.15 + i * 0.2 && v < 0.55 + i * 0.25; if (len && d < 0.006) { o.col[0] = 30; o.col[1] = 14; o.col[2] = 16; } else if (len && d < 0.012) K.mixc(o.col, K.tone(base, 0.8, T), 0.6); }
}
const MAT = {};
function mats() {
  if (MAT.oak) return MAT;
  MAT.oak = K.uvMat('pup-oak', 64, 256, (u, v, o) => woodPx(o, u, v, C.oak, C.oakD, { cracks: 1, seed: 2 }));
  MAT.faceWood = K.uvMat('pup-facewood', 64, 128, (u, v, o) => woodPx(o, u, v, hex('#e8b07c'), C.oakD, { cracks: 0 }));
  MAT.oakB = K.uvMat('pup-oak-broken', 64, 256, (u, v, o) => { woodPx(o, u, v, C.oak, C.oakD, { cracks: 3, seed: 5 }); if (K.vnoise(u * 12, v * 20, 4) > 0.78) K.tone(C.raw, 0.6, o.col); });
  MAT.torso = K.uvMat('pup-torso', 128, 256, (u, v, o) => { woodPx(o, u, v, C.oak, C.oakD, { cracks: 1, seed: 7 }); const sp = Math.abs(du(u) - 0.18 - Math.sin(v * 30) * 0.008); if (sp < 0.007 && v < 0.85) { o.col[0] = 24; o.col[1] = 10; o.col[2] = 14; } else if (sp < 0.016 && v < 0.85) K.tone(C.raw, 0.55, o.col); });
  MAT.leg = K.uvMat('pup-tableleg', 64, 512, (u, v, o) => { // varnished brown turned leg: grain, inked moulding grooves, a few chips
    woodPx(o, u, v, hex('#94582c'), hex('#4a2614'), { cracks: 1, seed: 11, grain: 18 }); const y = v * LEGLEN;
    for (const g of [0.11, 0.128, 0.15, 0.172, 0.36, 0.38, 0.4, LEGLEN - 0.09, LEGLEN - 0.07]) if (Math.abs(y - g) < 0.0035) { o.col[0] = 40; o.col[1] = 20; o.col[2] = 14; }
    if (y < 0.11 && (Math.abs(((u * 4) % 1) - 0.5) > 0.47)) K.mixc(o.col, hex('#3a1c10'), 0.6); // the square post's arrises
    if (K.vnoise(u * 10, v * 60, 8) > 0.86) K.tone(C.raw, 0.6, o.col); });
  MAT.brass = K.uvMat('pup-brass', 32, 64, (u, v, o) => { K.tone(C.brass, K.band(0.6 + Math.cos(u * TAU) * 0.25 - (K.vnoise(u * 20, v * 20, 3) > 0.75 ? 0.25 : 0), 4), o.col); });
  MAT.twine = K.uvMat('pup-twine', 32, 64, (u, v, o) => { const tw = ((u * 3 + v * 14) % 1); K.tone(C.twine, K.band(0.55 + (tw < 0.5 ? 0.1 : -0.1), 3), o.col); });
  MAT.coat = K.uvMat('pup-coat', 512, 256, (u, v, o) => { // plum wool: 3-tone cel folds, gold piping, brass buttons, pocket flaps, patch, worn ragged hem
    const f = Math.sin(u * TAU * 7 + Math.sin(v * 5 + u * 20) * 0.9); K.tone(C.coat, f > 0.55 ? 0.68 : f < -0.45 ? 0.3 : 0.5, o.col);
    if (f > 0.5 && f < 0.6) K.mixc(o.col, C.coatD, 0.35);
    const edge = Math.min(u, 1 - u); if (edge < 0.016) { K.tone(hex('#e8b448'), edge < 0.006 ? 0.75 : 0.5, o.col); }
    const bu = Math.min(Math.hypot((u - 0.035) * 3.2, ((v - 0.1) % 0.14) - 0.035), Math.hypot((u - 0.965) * 3.2, ((v - 0.1) % 0.14) - 0.035)); if (v > 0.08 && v < 0.62 && bu < 0.022) { K.tone(C.brass, bu < 0.008 ? 0.9 : bu < 0.016 ? 0.6 : 0.3, o.col); if (bu < 0.004) o.col.fill(255); }
    for (const pu of [0.22, 0.78]) if (Math.abs(u - pu) < 0.07 && v > 0.66 && v < 0.74) { K.tone(C.coat, 0.36, o.col); if (v > 0.725 || Math.abs(Math.abs(u - pu) - 0.068) < 0.003) K.tone(hex('#e8b448'), 0.55, o.col); }
    if (u > 0.6 && u < 0.7 && v > 0.36 && v < 0.48) { K.tone(hex('#8a6a3a'), (((u * 300) | 0) % 2) ? 0.6 : 0.52, o.col); if (u < 0.606 || u > 0.694 || v < 0.366 || v > 0.474) { if (((u + v) * 400) % 1 < 0.5) K.tone(hex('#f0e0b0'), 0.65, o.col); } }
    if (K.vnoise(u * 16, v * 16, 5) > 0.84 && v > 0.25 && edge > 0.03) o.a = 0;
    const hem = 0.93 + Math.abs(((u * 27) % 1) - 0.5) * 0.09 + K.vnoise(u * 40, 3, 1) * 0.03; if (v > hem) o.a = 0; else if (v > hem - 0.035) K.tone(hex('#9a6aa0'), (((u * 260) | 0) % 2) ? 0.55 : 0.45, o.col);
  }, { side: THREE.DoubleSide, alphaTest: 0.5 });
  MAT.vest = K.uvMat('pup-vest', 256, 256, (u, v, o) => { // mustard brocade: diamond pattern, gold piping, welt pockets, brass buttons + holes, pointed hem
    const d = Math.abs(((u * 10 + v * 8) % 1) - 0.5) + Math.abs(((u * 10 - v * 8) % 1 + 1) % 1 - 0.5); K.tone(C.vest, d < 0.18 ? 0.64 : d > 0.45 ? 0.46 : 0.55, o.col);
    const sh = Math.sin(u * TAU * 4); if (sh < -0.7) K.mixc(o.col, K.tone(C.vest, 0.3, T), 0.35);
    const bu = Math.abs(u - 0.5), k = Math.round((v - 0.14) / 0.13), bd = Math.hypot(bu * 1.4, v - 0.14 - k * 0.13); if (k >= 0 && k < 6 && bd < 0.03) { K.tone(C.brass, bd < 0.012 ? 0.9 : bd < 0.022 ? 0.6 : 0.3, o.col); if (bd < 0.005) o.col.fill(255); }
    if (k >= 0 && k < 6 && Math.abs(v - 0.14 - k * 0.13) < 0.004 && bu > 0.035 && bu < 0.07) K.tone(C.ink, 0.3, o.col);
    for (const pu of [0.28, 0.72]) if (Math.abs(u - pu) < 0.08 && Math.abs(v - 0.22) < 0.006) K.tone(C.ink, 0.25, o.col);
    const hemV = 0.9 - Math.abs(u - 0.5) * 0.3; if (v > hemV) o.a = 0; else if (v > hemV - 0.025 || Math.min(u, 1 - u) < 0.02) K.tone(hex('#e8b448'), 0.6, o.col);
  }, { side: THREE.DoubleSide, alphaTest: 0.5 });
  MAT.lace = K.uvMat('pup-lace', 64, 64, (u, v, o) => { const s = Math.sin(u * TAU * 6 + v * 20); K.tone(C.lace, K.band(0.6 + (s > 0.3 ? 0.1 : s < -0.6 ? -0.2 : 0), 3), o.col); }, { side: THREE.DoubleSide });
  MAT.wool = K.uvMat('pup-wool', 64, 128, (u, v, o) => K.fur2(u, v, o, C.wool, 10, 5, 0.6, 0.1), { side: THREE.DoubleSide });
  MAT.shoe = K.uvMat('pup-shoe', 64, 64, (u, v, o) => { K.tone(C.shoe, K.band(0.5 + Math.cos(u * TAU) * 0.3, 4), o.col); });
  MAT.jaw = K.uvMat('pup-jaw', 128, 64, (u, v, o) => { woodPx(o, u, v, hex('#e2ac78'), C.oakD, { cracks: 0 }); const d = du(u); if (Math.abs(Math.abs(d) - 0.16) < 0.012) K.tone(C.ink, 0.3, o.col); if (Math.abs(d) < 0.12 && v > 0.82) K.tone(C.lip, 0.5, o.col); if (Math.abs(d) < 0.05 && Math.abs(v - 0.35) < 0.025) K.mixc(o.col, C.ink, 0.35); });
  return MAT;
}
// carved, painted face: one texture per expression (eyes, lids, brows, wrinkles, rosy cheeks, mouth corners)
const FACES = new Map();
const EX = { smug: { b: [-0.2, 0.35], lid: 0.45, m: 0.3, asym: 0.8 }, delight: { b: [0.5, 0.4], lid: 0.05, m: 1, asym: 0 }, annoyed: { b: [-0.9, -0.2], lid: 0.5, m: -0.6, asym: 0 },
  hurt: { b: [0.9, -0.5], lid: 0.55, m: -0.9, asym: 0 }, shock: { b: [0.9, 0.9], lid: -0.2, m: -0.2, asym: 0 }, think: { b: [0.4, -0.3], lid: 0.35, m: -0.25, asym: -0.7 }, blink: { b: [0, 0.2], lid: 1, m: 0.2, asym: 0 } };
function faceMat(name) {
  if (FACES.has(name)) return FACES.get(name); const E = EX[name] || EX.smug; const H = 0.3, CIRC = 0.78;
  const m = K.uvMat('pup-face-' + name, 256, 256, (u, v, o) => {
    woodPx(o, u, v, hex('#e8b07c'), C.oakD, { cracks: 1, seed: 13 }); const X = du(u) * CIRC, ax = Math.abs(X), sx = X >= 0 ? 1 : -1, Y = v * H; // metres on the face
    if (ax > 0.16) return;
    const blush = Math.hypot((ax - 0.065) / 1.3, Y - 0.06); if (blush < 0.03) K.mixc(o.col, C.blush, 0.55 * (1 - blush / 0.03));
    const ex = ax - 0.045, ey = Y - 0.115, er = Math.hypot(ex / 1.35, ey); // eyes
    if (er < 0.019) { const lidY = 0.017 - E.lid * 0.034; if (ey > lidY) { K.tone(hex('#e0a470'), 0.45, o.col); if (ey < lidY + 0.004) K.tone(C.ink, 0.2, o.col); return; }
      const ir = Math.hypot(ex, ey + 0.002); if (ir < 0.009) { if (ir < 0.004) { o.col[0] = 16; o.col[1] = 10; o.col[2] = 22; } else K.tone(C.iris, ir < 0.0065 ? 0.6 : 0.4, o.col); if (Math.hypot(ex + 0.003, ey - 0.003) < 0.0022) o.col.fill(255); } else K.tone(hex('#f4ece0'), 0.6, o.col); if (er > 0.016) K.tone(C.ink, 0.25, o.col); return; }
    if (er < 0.024 && ey > 0) K.mixc(o.col, C.ink, 0.55); // heavy upper lid line
    if (Math.abs(Y - (0.093 - (ex * ex) * 8)) < 0.0018 && Math.abs(ex) < 0.02) K.mixc(o.col, C.ink, 0.45); // bags
    const bt = (ax - 0.018) / 0.05; if (bt > 0 && bt < 1) { const by = 0.142 + (E.b[0] * (1 - bt) + E.b[1] * bt) * 0.008 + Math.sin(bt * Math.PI) * 0.004 + sx * E.asym * 0.004 * bt; if (Math.abs(Y - by) < 0.0065 * (1 - bt * 0.4) + K.vnoise(X * 300, Y * 300, 1) * 0.003) { K.tone(C.wool, 0.7, o.col); return; } }
    for (let k = 0; k < 3; k++) if (ax < 0.06 && Math.abs(Y - (0.175 + k * 0.016 + Math.sin(X * 60 + k) * 0.002)) < 0.0013) K.mixc(o.col, C.ink, 0.4); // forehead lines
    if (ax > 0.07 && ax < 0.095 && Math.abs(Y - 0.11 - (ax - 0.07) * (k3(ax))) < 0.0014) K.mixc(o.col, C.ink, 0.35); // crow's feet
    const mw = 0.05, my = 0.012 + E.m * 0.012 * Math.min(1, ax / mw) ** 2 + sx * E.asym * 0.008 * (ax / mw) ** 2; // mouth corners on the head's lower edge
    if (ax < mw && Y < my + 0.004 && Y > my - 0.004 + (ax < mw * 0.7 ? 0 : 0.002)) K.tone(C.ink, 0.25, o.col); else if (ax < mw && Y < my - 0.004) K.tone(C.lip, 0.45, o.col);
    if (Math.abs(ax - 0.06 - Y * 0.15) < 0.0018 && Y < 0.05 && Y > 0.012) K.mixc(o.col, C.ink, 0.5); // nasolabial / marionette lines
  });
  FACES.set(name, m); return m;
}
function k3(ax) { return 0.4 * Math.sin(ax * 300); }

// ---------------------------------------------------------------- geometry helpers (all smooth lofts)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const capR = (t, e = 0.08) => Math.sqrt(Math.min(1, Math.min(t, 1 - t) / e));
/** a turned/carved segment hanging down (-Y) from its joint, gap at both ends, rounded ends, optional chips */
function seg(len, r0, r1, mat, { gap = 0.025, rings = 30, sides = 22, rz = 1, bulge = 0.08, chip = 0, x = 0, z = 0 } = {}) {
  const l = new K.Loft(rings, sides).set((t, p) => p.set(x, -gap - t * (len - 2 * gap), z), (t) => { const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.sin(t * Math.PI)) * capR(t, 0.025) * (Math.min(t, 1 - t) < 0.05 ? 0.92 : 1); return [r, r * rz]; },
    { ref: (t, n) => n.set(0, 0, 1), shape: chip ? (a, t) => 1 - (Math.sin(a * 3 + 1) > 0.94 && t > 0.3 && t < 0.5 ? chip : 0) : null });
  return K.mesh(l.geo, mat);
}
/** turned ring (eye-screw loop, twine wrap, wire): circle of radius r round `axis` at c, tube radius w */
function hoop(c, axis, r, w, mat, sides = 10) { return K.jointRing(c, axis, r, w, mat); }
function pin(c, axis, len, r, mat) { // brass joint pin with domed heads
  const l = new K.Loft(14, 12).set((t, p) => p.copy(c).addScaledVector(axis, (t - 0.5) * len), (t) => { const e = Math.min(t, 1 - t); return r * (e < 0.12 ? 1.7 * Math.sqrt(e / 0.12) : 1); }, { ref: (t, n) => n.set(0, 1, 0) });
  return K.mesh(l.geo, mat);
}
function nail(c, dir, len, mat) { const l = new K.Loft(8, 8).set((t, p) => p.copy(c).addScaledVector(dir, t * len), (t) => (t < 0.15 ? 0.011 : 0.004 * (1 - t * 0.7)), { ref: (t, n) => n.set(0, 1, 0).addScaledVector(dir, 0.5) }); return K.mesh(l.geo, mat); }
function sheet(rows, cols, point, mat) { // rigid cloth grid (coat, tails, waistcoat, collar)
  const pos = [], uv = [], idx = []; const p = V(0, 0, 0);
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { point(c / cols, r / rows, p); pos.push(p.x, p.y, p.z); uv.push(c / cols, r / rows); }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + cols + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return K.mesh(g, mat);
}
const LEGLEN = 0.78;
function tableLeg(len, M) { // turned furniture leg as an arm: square post block, beads and coves, vase, taper, brass ferrule + castor
  const g = new THREE.Group();
  const prof = (t) => { const y = t * len; if (y < 0.11) return 0.05; if (y < 0.128) return 0.046 + Math.sin((y - 0.11) / 0.018 * Math.PI) * 0.018; if (y < 0.15) return 0.034 + Math.abs(y - 0.139) * 0.6; if (y < 0.172) return 0.042 + Math.sin((y - 0.15) / 0.022 * Math.PI) * 0.014;
    if (y < 0.36) return 0.038 + Math.sin((y - 0.17) / 0.19 * Math.PI) * 0.02; if (y < 0.38) return 0.032; if (y < 0.4) return 0.04 + Math.sin((y - 0.38) / 0.02 * Math.PI) * 0.01; return 0.036 - (y - 0.4) / (len - 0.4) * 0.012 + (Math.abs(y - (len - 0.08)) < 0.008 ? 0.006 : 0); };
  const l = new K.Loft(60, 24).set((t, p) => p.set(0, -0.02 - t * len, 0), (t) => prof(t) * Math.sqrt(Math.min(1, t / 0.02)), { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => t * len < 0.11 ? Math.min(1.38, 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))) : 1 });
  K.mesh(l.geo, M.leg, g);
  const f = new K.Loft(10, 20).set((t, p) => p.set(0, -0.02 - len - t * 0.05, 0), (t) => 0.03 - t * 0.006, { ref: (t, n) => n.set(0, 0, 1) }); K.mesh(f.geo, M.brass, g); // ferrule
  
  for (const s of [-1, 1]) K.mesh(new K.Loft(8, 10).set(K.curve([[s * 0.02, -len - 0.065, 0], [s * 0.034, -len - 0.1, 0], [s * 0.026, -len - 0.15, 0]]), () => 0.007).geo, M.brass, g); // castor fork holding the crystal
  return g;
}
function carvedHand(M) { // left hand: carved mitten palm, index and middle fingers, two snapped stumps, thumb
  const g = new THREE.Group();
  K.mesh(new K.Loft(14, 18).set((t, p) => p.set(0, -0.02 - t * 0.09, 0.005), (t) => [0.034 * capR(t, 0.2), 0.018 * capR(t, 0.2)], { ref: (t, n) => n.set(0, 0, 1) }).geo, M.oak, g);
  const fing = (x, len, z = 0.01) => K.mesh(new K.Loft(12, 12).set(K.curve([[x, -0.1, z], [x, -0.1 - len * 0.6, z + 0.008], [x, -0.1 - len, z + 0.022]]), (t) => 0.009 * (1 - t * 0.25) * capR(t, 0.15), { ref: (t, n) => n.set(0, 0, 1) }).geo, M.oak, g);
  fing(0.022, 0.06); fing(0.007, 0.065); fing(-0.009, 0.014); fing(-0.024, 0.01); // two fingers snapped off
  K.mesh(new K.Loft(10, 12).set(K.curve([[0.03, -0.04, 0.012], [0.042, -0.07, 0.03], [0.04, -0.095, 0.04]]), (t) => 0.009 * capR(t, 0.15)).geo, M.oak, g);
  return g;
}
function shoe(M) { const g = new THREE.Group();
  K.mesh(new K.Loft(18, 16).set((t, p) => p.set(0, -0.06 + Math.sin(t * Math.PI) * 0.006, -0.05 + t * 0.2), (t) => [0.05 * capR(t, 0.15) * (1 + t * 0.15), 0.038 * capR(t, 0.15) * (1 - t * 0.35)], { ref: (t, n) => n.set(0, 1, 0), shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.35 }).geo, M.shoe, g);
  const bs = new THREE.Shape(); bs.moveTo(-0.022, -0.015); bs.lineTo(0.022, -0.015); bs.lineTo(0.022, 0.015); bs.lineTo(-0.022, 0.015); bs.closePath(); const h = new THREE.Path(); h.moveTo(-0.014, -0.008); h.lineTo(-0.014, 0.008); h.lineTo(0.014, 0.008); h.lineTo(0.014, -0.008); h.closePath(); bs.holes.push(h);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.006, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }); bg.rotateX(-1.15); bg.translate(0, -0.03, 0.075); K.mesh(bg, M.brass, g); return g; }
function woolHair(M, top, cz) { // wild white wool tufts glued round the back, sides and crown (high bald forehead)
  const g = new THREE.Group(); let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const az = rnd() * TAU, el = -0.35 + rnd() * 1.6; if (Math.cos(az) > 0.25 && el < 1.1) continue; if (Math.cos(az) > 0.7 && el < 1.35) continue;
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const p0 = V(dir.x * 0.115, top * 0.55 + dir.y * 0.16, cz + dir.z * 0.12);
    const len = 0.06 + rnd() * 0.08 + (el < 0.3 ? 0.05 : 0); const side = V(-dir.z, 0, dir.x).normalize(); const ph = rnd() * 6, fat = 0.8 + rnd() * 0.9;
    const l = new K.Loft(9, 8).set((t, out) => { out.copy(p0).addScaledVector(dir, len * t * 0.8 + Math.sin(t * 8 + ph) * 0.012 * t).add(V(0, -len * t * t * (el < 0.8 ? 0.6 : 0.1), 0)).addScaledVector(side, Math.sin(t * 6 + ph) * 0.025 * t); },
      (t) => [(0.012 * (1 - t * 0.5) + 0.003) * fat, (0.024 * (1 - t * 0.6) + 0.004) * fat], { ref: () => side });
    K.mesh(l.geo, M.wool, g);
  }
  return g;
}

// ---------------------------------------------------------------- the spectral hand (mostly invisible)
function runeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) { const x = 20 + (i % 6) * 40 + rnd() * 6, y = 20 + Math.floor(i / 6) * 50 + rnd() * 6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) g.lineTo(x + (rnd() - 0.5) * 24, y + rnd() * 30); g.stroke(); if (rnd() < 0.5) { g.beginPath(); g.arc(x, y + 14, 6 + rnd() * 5, 0, TAU * (0.5 + rnd() * 0.5)); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function spectralMat(fade = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRunes: { value: RUNES || (RUNES = runeTex()) }, uGlow: { value: 1 }, uCol: { value: new THREE.Color(0xb8f6ff) }, uCol2: { value: new THREE.Color(0x9a7cff) }, uFade: { value: fade ? 1 : 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    // crisp rim line + crisp rune strokes (no soft fill): reads as a drawn, glowing hand outline, mostly invisible inside
    fragmentShader: 'uniform float uTime; uniform sampler2D uRunes; uniform float uGlow; uniform vec3 uCol; uniform vec3 uCol2; uniform float uFade; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float rim = smoothstep(0.62, 0.7, f) + smoothstep(0.86, 0.9, f) * 0.6; float r = step(0.55, texture2D(uRunes, vUv * vec2(2.0, 1.0) + vec2(0.0, -uTime * 0.05)).r); float shim = 0.6 + 0.4 * sin(uTime * 3.0 + vUv.y * 12.0); float a = (rim * 0.95 + r * 0.32 * shim + 0.02) * uGlow * (1.0 - uFade * smoothstep(0.1, 0.95, vUv.y)); gl_FragColor = vec4(mix(uCol2, uCol, rim) * a, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
}
let RUNES = null;
/** palm down over the cross; four fingers (3 phalanges, knuckle bulges) curl forward and down round the bar,
 *  the thumb hooks under it from behind; the forearm streams up and back into mist. Group origin = the grip. */
function spectralHand(mat, fadeMat) {
  const hand = new THREE.Group(); const fingers = [];
  const knuckle = (L, r0, r1) => (t, ) => { const e = Math.min(t, 1 - t); return (r0 + (r1 - r0) * t) * (1 + (e < 0.12 ? 0.18 * (1 - e / 0.12) : 0)) * capR(t, 0.06); };
  K.mesh(new K.Loft(22, 24).set(K.curve([[0, 0.36, -0.5], [0, 0.27, -0.33], [0, 0.17, -0.15]]), (t) => [0.16 + t * 0.06, (0.052 + t * 0.012) * capR(t, 0.08)], { ref: (t, n) => n.set(0, 1, 0.4) }).geo, mat, hand); // palm
  K.mesh(new K.Loft(18, 20).set(K.curve([[0, 0.36, -0.5], [0, 0.52, -0.82], [0, 0.72, -1.15]]), (t) => [0.15 + t * 0.05, 0.11 + t * 0.04], { ref: (t, n) => n.set(0, 1, 0) }).geo, fadeMat, hand); // wrist into mist
  const F = [[-0.17, [0.1, 0.075, 0.06], 0.036], [-0.06, [0.125, 0.085, 0.065], 0.04], [0.05, [0.13, 0.09, 0.068], 0.041], [0.155, [0.115, 0.08, 0.062], 0.037]];
  for (const [x, L, r] of F) {
    let par = new THREE.Group(); par.position.set(x, 0.17, -0.15); hand.add(par); const segs = [];
    for (let k = 0; k < 3; k++) { const j = k ? new THREE.Group() : par; if (k) { j.position.set(0, 0, L[k - 1]); par.add(j); } K.mesh(new K.Loft(12, 16).set((t, p) => p.set(0, 0, t * L[k]), knuckle(L[k], r * (1 - k * 0.12), r * (0.92 - k * 0.12)), { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, j); segs.push(j); par = j; }
    fingers.push(segs);
  }
  const th = new THREE.Group(); th.position.set(-0.22, 0.22, -0.34); th.rotation.set(0.9, 0.5, 0.4); hand.add(th); const t2 = new THREE.Group(); t2.position.set(0, 0, 0.12); th.add(t2);
  K.mesh(new K.Loft(12, 16).set((t, p) => p.set(0, 0, t * 0.12), knuckle(0.12, 0.05, 0.044), { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, th); K.mesh(new K.Loft(12, 16).set((t, p) => p.set(0, 0, t * 0.09), knuckle(0.09, 0.042, 0.034), { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, t2);
  return { hand, fingers, thumb: th, thumb2: t2 };
}


// ---------------------------------------------------------------- battle-mage kit: robe, mantle, pauldron, bracer, belt, vials, scroll case, quill, amulet, war-club, sigil
function runeGlyph(gx, gy) {
  const c = Math.floor(gx), x = gx - c; if (gy < 0.2 || gy > 0.8 || x < 0.18 || x > 0.82) return false; const y = (gy - 0.2) / 0.6; const h = Math.abs((Math.sin(c * 12.9898 + 4.1) * 43758.5453) % 1);
  if (Math.abs(x - 0.5) < 0.07) return true;
  if (h > 0.2 && x > 0.5 && y > 0.3 && y < 0.78 && Math.abs((x - 0.5) - (y - 0.3) * 0.6) < 0.065) return true;
  if (h > 0.45 && x < 0.5 && y > 0.25 && y < 0.7 && Math.abs((0.5 - x) - (0.7 - y) * 0.6) < 0.065) return true;
  if (h > 0.7 && Math.abs(y - 0.5) < 0.065 && Math.abs(x - 0.5) < 0.28) return true;
  if (h < 0.2 && Math.abs(Math.hypot(x - 0.5, (y - 0.25) * 0.8) - 0.18) < 0.05 && y < 0.35) return true;
  return false;
}
function gearMats() {
  if (MAT.robe) return MAT; const gold = hex('#f0c454');
  const runeBand = (o, gx, gy) => { K.tone(hex('#1a1640'), 0.45, o.col); if (runeGlyph(gx, gy)) K.tone(gold, 0.78, o.col); if (gy < 0.1 || gy > 0.9) K.tone(hex('#e2ae46'), 0.6, o.col); };
  MAT.robe = K.uvMat('wiz-robe', 512, 512, (u, v, o) => { // deep indigo robe: 3-tone folds, embroidered rune bands on the front edges and above the hem, ragged hem
    const f = Math.sin(u * TAU * 8 + Math.sin(v * 4 + u * 17) * 0.9); K.tone(hex('#30307a'), f > 0.5 ? 0.66 : f < -0.5 ? 0.3 : 0.48, o.col);
    const e = Math.min(u, 1 - u); if (e < 0.04) runeBand(o, v * 40, e / 0.04); else if (v > 0.82 && v < 0.9) runeBand(o, u * 70, (v - 0.82) / 0.08);
    if (K.vnoise(u * 20, v * 20, 9) > 0.86 && v > 0.4 && e > 0.05) o.a = 0;
    const hem = 0.94 + Math.abs(((u * 29) % 1) - 0.5) * 0.07 + K.vnoise(u * 50, 2, 2) * 0.02; if (v > hem) o.a = 0; else if (v > hem - 0.025) K.tone(hex('#5a5aa0'), 0.5, o.col);
  }, { side: THREE.DoubleSide, alphaTest: 0.5 });
  MAT.robeTop = K.uvMat('wiz-robe-top', 512, 256, (u, v, o) => { const f = Math.sin(u * TAU * 6 + v * 3); K.tone(hex('#30307a'), f > 0.5 ? 0.66 : f < -0.5 ? 0.32 : 0.48, o.col); const e = Math.min(u, 1 - u); if (e < 0.045) runeBand(o, v * 18, e / 0.045); }, { side: THREE.DoubleSide });
  MAT.cape = K.uvMat('wiz-cape', 256, 256, (u, v, o) => { const f = Math.sin(u * TAU * 5 + v * 2); K.tone(hex('#7a1e2e'), f > 0.45 ? 0.64 : f < -0.5 ? 0.3 : 0.48, o.col); if (v < 0.06) K.tone(gold, 0.6, o.col); const hem = 0.86 + Math.abs(((u * 13) % 1) - 0.5) * 0.18 + K.vnoise(u * 30, 1, 3) * 0.05; if (v > hem) o.a = 0; else if (v > hem - 0.03) K.tone(hex('#4a1020'), 0.45, o.col); if (K.vnoise(u * 12, v * 12, 4) > 0.86 && v > 0.3) o.a = 0; }, { side: THREE.DoubleSide, alphaTest: 0.5 });
  MAT.leather = K.uvMat('wiz-leather', 128, 128, (u, v, o) => { K.tone(hex('#6a3e22'), K.band(0.5 + (K.vnoise(u * 20, v * 20, 2) - 0.5) * 0.25, 4), o.col); const e = Math.min(u, 1 - u, v, 1 - v); if (e < 0.06 && e > 0.035 && ((u + v) * 60) % 1 < 0.5) K.tone(hex('#e0c890'), 0.6, o.col); if (e < 0.02) K.tone(hex('#3a2010'), 0.4, o.col); if (Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.2) < 0.02) K.tone(hex('#3a2010'), 0.35, o.col); }, { side: THREE.DoubleSide });
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false });
  MAT.crystal = new THREE.MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x3ac8ff, emissiveIntensity: 1.6, roughness: 0.15, flatShading: true });
  MAT.paper = K.uvMat('wiz-quill', 32, 128, (u, v, o) => { K.tone(hex('#f2ead8'), K.band(0.6 - Math.abs(u - 0.5) * 0.4 + (Math.sin(v * 160 + u * 8) > 0.6 ? -0.12 : 0), 3), o.col); if (Math.abs(u - 0.5) < 0.04) K.tone(hex('#8a7a60'), 0.5, o.col); }, { side: THREE.DoubleSide });
  return MAT;
}
function sigilTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (const r of [118, 96]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
  g.beginPath(); for (let i = 0; i <= 7; i++) { const a = (i * 3 / 7) * TAU; g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); } g.stroke();
  g.font = 'bold 18px serif'; g.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { g.save(); g.rotate((i / 14) * TAU); g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈ'[i], -6, -100); g.restore(); }
  const t = new THREE.CanvasTexture(c); return t;
}
function wizardGear(J, M) {
  const G = gearMats(); const gold = M.brass; const torsoW = (y) => 0.15 + Math.sin(Math.min(1, (y / 0.52) * 1.15) * Math.PI * 0.62) * 0.07;
  // long robe: an open-fronted coat-robe over the frock coat (upper on the torso, skirt panels on the hips that swing)
  J.torso.add(sheet(10, 30, (u, v, p) => { const th = 0.95 + u * (TAU - 1.9); const y = 0.6 - v * 0.62; const w = torsoW(Math.max(0, y)) + 0.045; p.set(Math.sin(th) * w, y, Math.cos(th) * (0.17 + y * 0.02 + 0.018)); }, G.robeTop));
  J.tails.add(sheet(14, 34, (u, v, p) => { const th = 0.7 + u * (TAU - 1.4); const y = -0.02 - v * 1.0; const r = (0.205 + v * 0.16) * (1 + 0.045 * v * Math.sin(th * 9)); p.set(Math.sin(th) * r, y, Math.cos(th) * r * 0.8 - 0.02); }, G.robe));
  // wizard's high collar + short tattered mantle-cape
  J.torso.add(sheet(4, 20, (u, v, p) => { const th = 1.15 + u * (TAU - 2.3); const r = 0.075 + v * 0.085; p.set(Math.sin(th) * r, 0.53 + v * 0.17, -0.02 + Math.cos(th) * r * 0.9); }, G.robeTop));
  J.torso.add(sheet(10, 22, (u, v, p) => { const th = 1.7 + u * (TAU - 3.4); const y = 0.6 - v * 0.5; const r = torsoW(Math.max(0, y)) + 0.075 + v * 0.06; p.set(Math.sin(th) * r * 1.05, y, Math.cos(th) * (0.2 + v * 0.05)); }, G.cape));
  // leather pauldron of three overlapping plates, riveted, on the left shoulder
  for (let k = 0; k < 3; k++) J.shL.add(sheet(6, 12, (u, v, p) => { const a = (u - 0.5) * 2.2; const r = 0.085 + k * 0.012 + v * 0.01; p.set(0.01 + Math.sin(v * 1.2 + 0.25) * r * 0.9, 0.08 - k * 0.042 - v * 0.05 + Math.cos(a) * 0.01, Math.sin(a) * r); }, G.leather));
  for (const z of [-0.06, 0, 0.06]) J.shL.add(nail(V(0.1, 0.07, z), V(1, 0.4, 0).normalize(), 0.012, gold));
  // bracer on the left forearm, a belt with buckle, pouches, potion vials, scroll case and quill
  J.elL.add(K.mesh(new K.Loft(10, 22).set((t, p) => p.set(0, -0.1 - t * 0.17, 0), (t) => 0.046 - t * 0.006 + (Math.abs(t - 0.2) < 0.05 || Math.abs(t - 0.8) < 0.05 ? 0.004 : 0), { ref: (t, n) => n.set(0, 0, 1) }).geo, G.leather));
  J.pelvis.add(sheet(2, 36, (u, v, p) => { const th = u * TAU; p.set(Math.sin(th) * 0.183, 0.1 - v * 0.045, Math.cos(th) * 0.133); }, G.leather));
  { const bs = new THREE.Shape(); bs.moveTo(-0.03, -0.026); bs.lineTo(0.03, -0.026); bs.lineTo(0.03, 0.026); bs.lineTo(-0.03, 0.026); bs.closePath(); const h = new THREE.Path(); h.moveTo(-0.02, -0.016); h.lineTo(-0.02, 0.016); h.lineTo(0.02, 0.016); h.lineTo(0.02, -0.016); h.closePath(); bs.holes.push(h);
    const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }); bg.translate(0, 0.077, 0.136); J.pelvis.add(K.mesh(bg, gold)); }
  for (const [x, z] of [[0.16, 0.06], [-0.15, 0.07]]) { const pg = K.mesh(new K.Loft(10, 16).set((t, p) => p.set(x, 0.08 - t * 0.13, z), (t) => [0.04 * Math.sqrt(Math.min(1, (1 - t) / 0.15)), 0.028 * Math.sqrt(Math.min(1, (1 - t) / 0.15))], { ref: (t, n) => n.set(Math.sign(x), 0, 0.4), shape: (a) => Math.min(1.25, 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))) }).geo, G.leather); J.pelvis.add(pg); }
  const liquids = [0xff4060, 0x40ff90, 0x60a0ff];
  for (let i = 0; i < 3; i++) { const x = 0.05 + i * 0.035, z = 0.145; const prof = (t) => t < 0.55 ? 0.016 : t < 0.7 ? 0.016 - (t - 0.55) * 0.07 : t < 0.9 ? 0.0055 : 0.0075;
    J.pelvis.add(K.mesh(new K.Loft(14, 14).set((t, p) => p.set(x, 0.06 - 0.09 + t * 0.09, z), (t) => prof(t) * Math.sqrt(Math.min(1, t / 0.05)), { ref: (t, n) => n.set(0, 0, 1) }).geo, G.glass));
    J.pelvis.add(K.mesh(new K.Loft(10, 12).set((t, p) => p.set(x, -0.028 + t * 0.045, z), (t) => 0.013 * Math.sqrt(Math.min(1, t / 0.08)), { ref: (t, n) => n.set(0, 0, 1) }).geo, new THREE.MeshToonMaterial({ color: liquids[i], emissive: liquids[i], emissiveIntensity: 0.6 })));
    J.pelvis.add(K.mesh(new K.Loft(4, 10).set((t, p) => p.set(x, 0.062 + t * 0.014, z), () => 0.006).geo, M.oak)); }
  J.torso.add(K.mesh(new K.Loft(14, 16).set((t, p) => p.set(0.13 - t * 0.27, 0.5 - t * 0.42, -0.2 - Math.sin(t * Math.PI) * 0.02), (t) => 0.026 + (t < 0.08 || t > 0.92 ? 0.004 : 0), { ref: (t, n) => n.set(0, 0, -1) }).geo, G.leather));
  for (const t of [0, 1]) J.torso.add(K.mesh(new K.Loft(4, 14).set((q, p) => p.set(0.13 - t * 0.27 + (t ? -1 : 1) * q * 0.018, 0.5 - t * 0.42 + (t ? -1 : 1) * q * 0.03, -0.2), () => 0.031).geo, gold));
  J.pelvis.add(K.mesh(new K.Loft(12, 6).set(K.curve([[0.16, 0.06, 0.07], [0.19, 0.16, 0.09], [0.24, 0.27, 0.1]]), (t) => [0.003, 0.018 * Math.sin(Math.min(1, t * 1.1 + 0.05) * Math.PI)], { ref: (t, n) => n.set(0, 0, 1) }).geo, G.paper));
  // amulet: chain and a brass star medallion holding a glowing crystal
  J.torso.add(K.mesh(new K.Loft(24, 6).set(K.curve([[0.07, 0.56, 0.05], [0.07, 0.46, 0.15], [0, 0.34, 0.2], [-0.07, 0.46, 0.15], [-0.07, 0.56, 0.05]]), () => 0.003).geo, gold));
  { const st = new THREE.Shape(); for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 0.022 : 0.04; st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const mg = new THREE.ExtrudeGeometry(st, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }); mg.translate(0, 0.31, 0.2); J.torso.add(K.mesh(mg, gold)); }
  const cryst = (len, r) => K.mesh(new K.Loft(5, 6).set((t, p) => p.set(0, (t - 0.5) * len, 0), (t) => r * (t < 0.3 ? t / 0.3 : t > 0.75 ? (1 - t) / 0.25 : 1)).geo, G.crystal);
  { const c = cryst(0.035, 0.012); c.position.set(0, 0.31, 0.215); c.rotation.x = Math.PI / 2; J.torso.add(c); }
  // the table leg fitted as a war-club: brass bands, studs, a crystal set in the castor fork
  for (const y of [-0.43, -0.55, -0.66]) J.shR.add(K.mesh(new K.Loft(6, 20).set((t, p) => p.set(0, y - t * 0.022, 0), () => 0.041).geo, gold));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; J.shR.add(K.mesh(new K.Loft(6, 8).set((t, p) => p.set(Math.cos(a) * (0.04 + t * 0.03), -0.6, Math.sin(a) * (0.04 + t * 0.03)), (t) => 0.009 * (1 - t) + 0.001).geo, gold)); }
  { const c = cryst(0.09, 0.024); c.position.set(0, -LEGLEN - 0.12, 0); J.shR.add(c); }
  // the off-hand sigil (glows faintly, blazes when casting)
  const sm = new THREE.MeshBasicMaterial({ map: sigilTex(), color: new THREE.Color(0x9fe8ff).multiplyScalar(2), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const sig = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), sm); sig.position.set(0, -0.08, 0.1); sig.castShadow = false; J.wrL.add(sig);
  return { glow(k) { sm.opacity = 0.12 + k * 0.85; sig.scale.setScalar(1 + k * 0.8); }, update(t) { sig.rotation.z = t * 0.8; G.crystal.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.3; } };
}

// ---------------------------------------------------------------- the puppet
export function createProfessor() {
  const M = mats();
  const root = new THREE.Group(); root.name = 'professor';
  const body = new THREE.Group(); body.name = 'puppet'; root.add(body);
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // skeleton of loose joints (rest pose: arms hanging, facing +Z; feet at y = 0)
  const pelvis = J(body, 0, 1.0, 0);
  K.mesh(new K.Loft(20, 24).set((t, p) => p.set(0, -0.08 + t * 0.17, 0), (t) => [0.17 * capR(t, 0.25), 0.12 * capR(t, 0.25)], { ref: (t, n) => n.set(0, 0, 1) }).geo, M.oakB, pelvis);
  const torso = J(pelvis, 0, 0.12, 0);
  K.mesh(new K.Loft(32, 28).set((t, p) => p.set(0, 0.02 + t * 0.5, 0), (t) => { const w = 0.15 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 0.07; return [w * capR(t, 0.12), (0.11 + t * 0.02) * capR(t, 0.12)]; }, { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => 1 + Math.max(0, Math.cos(a)) * 0.06 * Math.sin(t * Math.PI) }).geo, M.torso, torso);
  for (const y of [0.1, 0.16]) torso.add(hoop(V(0, y, 0.0), V(0, 1, 0), 0.172, 0.004, M.brass)); // wire wrapped round the split
  for (const [y, z] of [[0.12, 0.1], [0.3, 0.1], [0.42, 0.09]]) torso.add(nail(V(0.06, y, z), V(-0.3, 0.1, 1).normalize(), 0.03, M.brass));
  const neck = J(torso, 0, 0.56, -0.01); K.mesh(new K.Loft(10, 16).set((t, p) => p.set(0, -0.02 + t * 0.13, 0), () => 0.042).geo, M.oak, neck);
  const head = J(neck, 0, 0.1, 0.0); const HD = buildHead(); HD.group.scale.setScalar(1.12); head.add(HD.group); const jaw = HD.jawPivot;
  // lace cravat, waistcoat, tattered frock coat with sleeves and tails, standing collar
  K.mesh(new K.Loft(12, 16).set(K.curve([[0, 0.55, 0.11], [0, 0.47, 0.135], [0, 0.36, 0.14]]), (t) => [0.03 + t * 0.03, 0.012 + t * 0.006], { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 5 + t * 14) * 0.22 }).geo, M.lace, torso);
  torso.add(sheet(8, 14, (u, v, p) => { const th = (u - 0.5) * 1.5; const y = 0.06 + v * 0.42; const w = 0.15 + Math.sin(Math.min(1, (y / 0.52) * 1.15) * Math.PI * 0.62) * 0.07 + 0.012; p.set(Math.sin(th) * w, y, Math.cos(th) * (0.115 + y * 0.04 + 0.012)); }, M.vest));
  torso.add(sheet(10, 26, (u, v, p) => { const th = 0.62 + u * (TAU - 1.24); const y = 0.54 - v * 0.56; const w = 0.17 + Math.sin(Math.min(1, (y / 0.52) * 1.15) * Math.PI * 0.62) * 0.07 + 0.02; p.set(Math.sin(th) * w, y, Math.cos(th) * (0.13 + 0.03 + y * 0.02)); }, M.coat));
  torso.add(sheet(3, 16, (u, v, p) => { const th = 1.0 + u * (TAU - 2.0); const r = 0.06 + v * 0.03; p.set(Math.sin(th) * r, 0.54 + v * 0.09, -0.01 + Math.cos(th) * r); }, M.coat));
  const tails = J(pelvis, 0, 0.1, -0.05);
  // arms: [0] = right = the TABLE LEG (nailed + lashed at the shoulder), [1] = left = carved wooden arm
  const arms = [], legs = [], hands = [];
  { const sh = J(torso, -0.25, 0.46, 0); const leg = tableLeg(0.78, M); sh.add(leg);
    for (const y of [-0.04, -0.07, -0.1]) sh.add(hoop(V(0, y, 0), V(0, 1, 0), 0.06, 0.006, M.twine));
    sh.add(hoop(V(0.04, 0.01, 0), V(0, 0, 1), 0.05, 0.007, M.twine)); for (const [x, y] of [[0.02, -0.05], [-0.03, -0.08], [0.0, -0.11]]) sh.add(nail(V(x, y, 0.06), V(0, 0, -1), 0.04, M.brass));
    sh.add(sheet(3, 14, (u, v, p) => { const th = u * TAU; const r = 0.075 + v * 0.012; p.set(Math.sin(th) * r, 0.03 - v * 0.09, Math.cos(th) * r); }, M.coat)); // torn sleeve stub
    const tip = J(sh, 0, -0.9, 0); hands.push(tip); arms.push({ sh, el: sh, wr: tip, hand: tip, s: -1 }); }
  { const sh = J(torso, 0.25, 0.46, 0); sh.add(seg(0.38, 0.05, 0.04, M.oak)); sh.add(pin(V(0, 0, 0), V(1, 0, 0), 0.13, 0.009, M.brass));
    sh.add(sheet(6, 18, (u, v, p) => { const th = u * TAU; const r = 0.068 - v * 0.012; p.set(Math.sin(th) * r, 0.02 - v * 0.3, Math.cos(th) * r); }, M.coat));
    const el = J(sh, 0, -0.4, 0); el.add(seg(0.33, 0.038, 0.03, M.oakB, { chip: 0.25 })); el.add(pin(V(0, 0, 0), V(1, 0, 0), 0.1, 0.008, M.brass));
    el.add(hoop(V(0, 0.012, 0.028), V(1, 0, 0), 0.012, 0.0035, M.brass)); sh.add(hoop(V(0, -0.388, 0.03), V(1, 0, 0), 0.012, 0.0035, M.brass));
    const wr = J(el, 0, -0.35, 0); wr.add(carvedHand(M)); wr.add(hoop(V(0, 0.01, 0), V(1, 0, 0), 0.016, 0.004, M.brass));
    const twine = new K.Loft(14, 8).set(K.curve([[0, 0.0, 0.02], [0.01, -0.06, 0.03], [0.02, -0.14, 0.02], [0.01, -0.2, 0.03]]), () => 0.004); const tw = K.mesh(twine.geo, M.twine, wr); // loose twine
    const hp = J(wr, 0, -0.07, 0.01); hands.push(hp); arms.push({ sh, el, wr, hand: hp, s: 1, twine: tw }); }
  for (const s of [-1, 1]) {
    const hip = J(pelvis, s * 0.1, -0.08, 0); hip.add(seg(0.42, 0.06, 0.047, s > 0 ? M.oak : M.oakB, { chip: s < 0 ? 0.2 : 0 })); hip.add(hoop(V(0, 0.01, 0), V(1, 0, 0), 0.02, 0.005, M.twine));
    const kn = J(hip, 0, -0.43, 0); kn.add(seg(0.4, 0.045, 0.035, M.oak)); kn.add(pin(V(0, 0, 0), V(1, 0, 0), 0.12, 0.009, M.brass));
    const an = J(kn, 0, -0.41, 0); an.add(shoe(M)); legs.push({ hip, kn, an, s });
  }
  // ---------------- control cross held by the spectral hand; strings
  const ctrl = new THREE.Group(); ctrl.position.set(0, 3.55, 0); root.add(ctrl);
  const cross = new THREE.Group(); ctrl.add(cross);
  const woodMat = K.uvMat('cross-wood', 64, 256, (u, v, o) => woodPx(o, u, v, hex('#b8783c'), C.oakD, { cracks: 1, seed: 3 }));
  const bar = (len, r) => K.mesh(new K.Loft(30, 16).set((t, p) => p.set((t - 0.5) * len, 0, 0), (t) => { const e = Math.min(t, 1 - t) * len; return r * (e < 0.035 ? 0.4 + e / 0.035 * 1.1 : e < 0.06 ? 1.5 - (e - 0.035) * 22 : e < 0.075 ? 0.85 : 1 + Math.sin(e * 40) * 0.04); }, { ref: (t, n) => n.set(0, 1, 0) }).geo, woodMat);
  cross.add(bar(1.04, 0.032)); { const b = bar(0.66, 0.03); b.rotation.y = Math.PI / 2; cross.add(b); }
  const smat = spectralMat(), fmat = spectralMat(true); const S = spectralHand(smat, fmat); const ghost = S.hand; ghost.scale.setScalar(1.55); ghost.position.set(0, -0.04, -0.02); ctrl.add(ghost); ghost.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const NM = 46; const mp = new Float32Array(NM * 3); const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: new THREE.Color(0xb8f4ff).multiplyScalar(2.2), size: 0.045, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); motes.frustumCulled = false; ctrl.add(motes);
  const moteSeed = Array.from({ length: NM }, (_, i) => [Math.random() * TAU, 0.2 + Math.random() * 0.7, Math.random() * 3, 0.3 + Math.random() * 0.7]);
  const SEG = 10; const strPos = new Float32Array(6 * SEG * 6); const strGeo = new THREE.BufferGeometry(); strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  strings.frustumCulled = false; root.add(strings);
  const anchors = [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, 0.3], [0, 0, -0.3], [-0.25, 0, 0], [0.25, 0, 0]].map((p) => V(...p));
  const headTop = J(head, 0, 0.36, 0.01); const back = J(torso, 0, 0.42, -0.13); const knees = legs.map((l) => J(l.kn, 0, -0.02, 0.05));
  const tipR = hands[0], tipL = hands[1]; hands[0] = tipL; hands[1] = tipR;
  const attach = [tipR, tipL, headTop, back, knees[0], knees[1]];
  const GEAR = wizardGear({ torso, pelvis, tails, shL: arms[1].sh, elL: arms[1].el, wrL: arms[1].wr, shR: arms[0].sh, neck }, M);

  // ---------------- animation state: the hand drives the strings, the strings drive the puppet
  const sp = (v = 0, w = 7, z = 0.3) => new Spring(v, w, z);
  const st = {
    t: 0, mode: 'idle', modeT: 9, talk: 0, look: new THREE.Vector2(), expr: 'smug', hold: 0, blink: 0, shown: '', nextJit: 1,
    hand: { x: sp(0, 6, 0.5), y: sp(0, 6, 0.5), z: sp(0, 6, 0.5), tilt: sp(0, 8, 0.45), roll: sp(0, 8, 0.45), curl: sp(0.55, 10, 0.5) },
    pull: { L: sp(0.08, 9, 0.35), R: sp(0.08, 9, 0.35), head: sp(0.5, 8, 0.4), kL: sp(0, 9, 0.35), kR: sp(0, 9, 0.35) }, slack: sp(0, 6, 0.6),
    j: { shL: sp(0, 8, 0.22), shR: sp(0, 8, 0.22), shLz: sp(0.12, 8, 0.25), shRz: sp(-0.12, 8, 0.25), elL: sp(-0.2, 9, 0.25), wrL: sp(0, 10, 0.2), hipL: sp(0, 8, 0.25), hipR: sp(0, 8, 0.25), knL: sp(0.05, 9, 0.25), knR: sp(0.05, 9, 0.25), torso: sp(0, 6, 0.35), torsoZ: sp(0, 6, 0.3), headX: sp(0, 8, 0.3), headY: sp(0, 6, 0.4), headZ: sp(0, 7, 0.25), tails: sp(0, 5, 0.2), bodyX: sp(0, 4, 0.35), bodyY: sp(0, 6, 0.4), bodyZ: sp(0, 7, 0.45), torsoY: sp(0, 8, 0.35), jaw: sp(0, 30, 0.5) },
  };
  const EXPR = new Set(Object.keys(EX)); const IMPACT_T = 0.45;
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), a0 = V(0, 0, 0), b0 = V(0, 0, 0);
  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost,
    handWorld(i = 1, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return head.getWorldPosition(out).add(tmp.set(0, 0.15 * root.scale.y, 0)); },
    setExpr(e) { st.expr = EXPR.has(e) && e !== 'blink' ? e : 'smug'; st.hold = 0; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); },
    lookAt(x, y) { st.look.set(x, y); },
    act(mode) {
      st.mode = mode; st.modeT = 0; const H = st.hand, P = st.pull;
      if (mode === 'throw') { H.y.kick(5); H.z.kick(-3); st.expr = 'annoyed'; st.hold = 1.0; return IMPACT_T; } // the hand yanks the club string
      if (mode === 'attack') { st.mode = 'throw'; H.y.kick(5); return IMPACT_T; }
      if (mode === 'hurt') { st.j.bodyZ.kick(-7); st.j.torso.kick(-6); st.j.headX.kick(-6); H.y.kick(-3); st.expr = 'hurt'; st.hold = 1.3; } // knockback, then the strings go slack
      if (mode === 'cast') { H.y.kick(4); st.expr = st.expr === 'smug' ? 'think' : st.expr; }
      if (mode === 'cheer') { H.y.kick(5); st.expr = 'delight'; st.hold = 1.4; }
    },
    impactTime: IMPACT_T,
    update(dt) {
      dt = Math.min(dt, 0.05); st.t += dt; st.modeT += dt; const t = st.t, m = st.modeT, H = st.hand, P = st.pull, Jn = st.j;
      // the hand: idle bob and sway; the mode decides how it jerks the strings
      H.x.target = Math.sin(t * 0.9) * 0.08; H.y.target = Math.sin(t * 1.6) * 0.05; H.z.target = 0; H.tilt.target = Math.sin(t * 1.3) * 0.07; H.roll.target = Math.sin(t * 0.7) * 0.06; H.curl.target = 0.55 + Math.sin(t * 2.1) * 0.05;
      P.L.target = 0.08 + Math.sin(t * 1.7) * 0.04; P.R.target = 0.08 + Math.sin(t * 1.7 + 1) * 0.04; P.head.target = 0.5; P.kL.target = Math.max(0, Math.sin(t * 1.4)) * 0.18; P.kR.target = Math.max(0, Math.sin(t * 1.4 + 2)) * 0.18;
      const md = st.mode;
      // throw with the table-leg club: yank (0-.12) -> wind back, weight back, twist (.12-.42) -> hurl over the top (.42-.56) -> follow-through -> recover
      const ph = md === 'throw' ? (m < 0.12 ? 1 : m < 0.42 ? 2 : m < 0.56 ? 3 : m < 0.95 ? 4 : 0) : 0; const fast = ph ? 24 : 8; for (const k of ['shR', 'shRz', 'torsoY', 'torso', 'bodyZ']) st.j[k].omega = fast;
      if (ph) { H.z.target = ph === 2 ? -0.35 : ph >= 3 ? 0.45 : -0.1; H.tilt.target = ph === 2 ? -0.35 : ph === 3 ? 0.55 : 0.2; H.curl.target = ph >= 3 ? 0.9 : 0.5; P.R.target = ph === 4 ? 0.3 : 0.9; }
      if (md === 'cast' && m < 1.3) { H.y.target = 0.35; H.tilt.target = -0.2; P.L.target = 1.0; P.R.target = 0.95; P.head.target = 1.0; H.curl.target = 0.25; smat.uniforms.uGlow.value = 2.4; GEAR.glow(Math.min(1, m * 3) * (1 - Math.max(0, (m - 1.0) / 0.3))); } else { smat.uniforms.uGlow.value += (1 - smat.uniforms.uGlow.value) * Math.min(1, dt * 3); GEAR.glow(0.15); }
      if (md === 'cheer' && m < 1.5) { const b = Math.abs(Math.sin(m * 9)); H.y.target = 0.25 + b * 0.15; P.L.target = 0.95 + b * 0.1; P.R.target = 0.95 + b * 0.1; P.kL.target = b * 0.6; P.kR.target = (1 - b) * 0.6; H.curl.target = 0.8; }
      if (md !== 'idle' && m > 1.6) st.mode = 'idle';
      if (md === 'hurt') { st.slack.omega = m < 0.62 ? 10 : 16; st.slack.target = m < 0.6 ? 1 : 0; if (m > 0.6 && m - dt <= 0.6) { H.y.kick(9); st.j.bodyY.kick(5); } } // crumple, then jerked back up
      st.slack.update(dt); const sl = Math.max(0, st.slack.value); if (sl > 0.02) { H.curl.target = 0.15; P.L.target *= 1 - sl; P.R.target *= 1 - sl; P.kL.target *= 1 - sl; P.kR.target *= 1 - sl; P.head.target *= 1 - sl; }
      for (const k in H) H[k].update(dt); for (const k in P) P[k].update(dt);
      ctrl.position.set(H.x.value * 0.6, 3.55 + H.y.value, H.z.value * 0.5); cross.rotation.set(H.tilt.value, 0, H.roll.value);
      ghost.rotation.set(-0.35 + H.tilt.value * 0.6, 0.25 + Math.sin(t * 0.5) * 0.06, H.roll.value * 0.6); ghost.position.y = -0.04 + Math.sin(t * 1.3) * 0.015;
      S.fingers.forEach((f, i) => f.forEach((j, k) => { j.rotation.x = H.curl.value * (0.9 + k * 0.35) + Math.sin(t * 2.3 + i * 1.3) * 0.05; }));
      S.thumb2.rotation.x = 0.3 + H.curl.value * 0.6; smat.uniforms.uTime.value = fmat.uniforms.uTime.value = t; fmat.uniforms.uGlow.value = smat.uniforms.uGlow.value;
      for (let i = 0; i < NM; i++) { const [a, r, ph, sp2] = moteSeed[i]; const y = ((t * sp2 * 0.25 + ph) % 1.6) - 0.3; mp.set([Math.cos(a + t * sp2 * 0.6) * r, y + 0.3, Math.sin(a + t * sp2 * 0.6) * r * 0.8 - 0.25], i * 3); } mg.attributes.position.needsUpdate = true;
      // dangling jitter: little random knocks to the loose joints
      st.nextJit -= dt; if (st.nextJit < 0) { st.nextJit = 0.6 + Math.random() * 1.2; const ks = ['shL', 'shR', 'elL', 'hipL', 'hipR', 'knL', 'knR', 'headZ', 'tails', 'wrL']; Jn[ks[(Math.random() * ks.length) | 0]].kick((Math.random() - 0.5) * 2.4); }
      // the strings set the joint targets (pull 1 = arm hauled up and forward)
      Jn.shL.target = -P.L.value * 2.3 - (md === 'throw' && m > 0.25 && m < 0.6 ? 0.6 : 0); Jn.shLz.target = 0.12 + P.L.value * 0.25 + sl * 0.1; Jn.elL.target = -0.15 - P.L.value * 0.7;
      Jn.shR.target = ph === 1 ? -0.5 : ph === 2 ? 1.7 : ph === 3 ? -2.5 : ph === 4 ? -1.1 : -P.R.value * 2.1; Jn.shRz.target = ph === 2 ? -0.45 : -0.12 - P.R.value * 0.25 - sl * 0.1;
      Jn.torsoY.target = ph === 2 ? -0.55 : ph === 3 ? 0.5 : ph === 4 ? 0.3 : Math.sin(t * 0.7) * 0.05; Jn.bodyZ.target = ph === 2 ? -0.09 : ph === 3 ? 0.14 : ph === 4 ? 0.08 : 0; Jn.wrL.target = Math.sin(t * 2.3) * 0.12;
      Jn.hipL.target = -P.kL.value * 0.9 - sl * 0.8; Jn.hipR.target = -P.kR.value * 0.9 - sl * 0.7; Jn.knL.target = 0.05 + P.kL.value * 1.3 + sl * 1.4; Jn.knR.target = 0.05 + P.kR.value * 1.3 + sl * 1.3;
      Jn.torso.target = ph === 2 ? -0.15 : ph === 3 ? 0.38 : ph === 4 ? 0.26 : 0.08 + sl * 0.5 - (P.L.value + P.R.value) * 0.06 - (md === 'cast' && m < 1.2 ? 0.12 : 0);
 Jn.torsoZ.target = -H.roll.value * 0.7 + Math.sin(t * 1.1) * 0.03;
      Jn.headX.target = (1 - P.head.value) * 0.5 - 0.1 + st.look.y * -0.3 + sl * 0.45 - (md === 'cast' && m < 1.2 ? 0.55 : 0); Jn.headY.target = st.look.x * 0.5 + Math.sin(t * 0.6) * 0.1; Jn.headZ.target = Math.sin(t * 0.8) * 0.06;
      Jn.tails.target = -Jn.hipL.value * 0.3 + Math.sin(t * 1.9) * 0.05; Jn.bodyX.target = H.x.value * 0.35; Jn.bodyY.target = 0.02 + Math.max(0, H.y.value) * 0.5 - sl * 0.3 + (P.L.value + P.R.value) * 0.03;
      if (ph === 3 || ph === 4) { Jn.hipL.target = -0.55; Jn.knL.target = 0.55; } // step into the throw
      Jn.jaw.target = st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.5 : sl * 0.25; if (st.talk > 0) st.talk -= dt;
      for (const k in Jn) Jn[k].update(dt);
      arms[1].sh.rotation.set(Jn.shL.value, 0, Jn.shLz.value); arms[1].el.rotation.set(Jn.elL.value, 0, 0); arms[1].wr.rotation.set(Jn.wrL.value, 0, 0);
      arms[0].sh.rotation.set(Jn.shR.value, 0, Jn.shRz.value); arms[1].twine.rotation.set(Math.sin(t * 2.7) * 0.3, 0, Math.sin(t * 2.1) * 0.2);
      legs[1].hip.rotation.set(Jn.hipL.value, 0, 0); legs[0].hip.rotation.set(Jn.hipR.value, 0, 0); legs[1].kn.rotation.set(Jn.knL.value, 0, 0); legs[0].kn.rotation.set(Jn.knR.value, 0, 0);
      legs[1].an.rotation.set(-Jn.knL.value * 0.3, 0, 0); legs[0].an.rotation.set(-Jn.knR.value * 0.3, 0, 0);
      torso.rotation.set(Jn.torso.value, Jn.torsoY.value, Jn.torsoZ.value); pelvis.rotation.set(-sl * 0.2, 0, -Jn.torsoZ.value * 0.4); tails.rotation.x = Math.max(-0.1, Jn.tails.value) + 0.08;
      head.rotation.set(Jn.headX.value, Jn.headY.value, Jn.headZ.value); jaw.rotation.x = Jn.jaw.value;
      body.position.set(Jn.bodyX.value, Jn.bodyY.value, Jn.bodyZ.value); GEAR.update(t, Jn); body.rotation.set(0, 0, -H.roll.value * 0.4);
      // face: expression texture swap (+ blinks)
      if (st.hold > 0) st.hold -= dt; else if (st.expr === 'hurt' || st.expr === 'delight') st.expr = 'smug';
      st.blink -= dt; if (st.blink < -3.4) st.blink = 0.13; const fx = st.blink > 0 ? 'blink' : st.expr; if (fx !== st.shown) { st.shown = fx; HD.setExpr(fx); }
      // taut glowing strings (sag when slack)
      root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(); let q = 0;
      for (let i = 0; i < 6; i++) {
        a0.copy(anchors[i]).applyMatrix4(cross.matrixWorld).applyMatrix4(inv); attach[i].getWorldPosition(b0); b0.applyMatrix4(inv);
        const sag = 0.02 + sl * 0.35;
        for (let k = 0; k < SEG; k++) for (const u of [k / SEG, (k + 1) / SEG]) { tmp.lerpVectors(a0, b0, u); tmp.y -= Math.sin(u * Math.PI) * sag; tmp.x += Math.sin(u * Math.PI) * sag * 0.3 * (i % 2 ? 1 : -1); strPos[q++] = tmp.x; strPos[q++] = tmp.y; strPos[q++] = tmp.z; }
      }
      strGeo.attributes.position.needsUpdate = true; strings.material.opacity = (0.75 + Math.sin(t * 7) * 0.1) * (1 - sl * 0.5);
    },
  };
  root.userData.api = api;
  api.update(0.016);
  return api;
}
