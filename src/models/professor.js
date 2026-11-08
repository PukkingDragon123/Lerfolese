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
  MAT.leg = K.uvMat('pup-tableleg', 64, 256, (u, v, o) => { woodPx(o, u, v, C.mahog, C.mahogD, { cracks: 1, seed: 11, grain: 22 }); const chip = K.vnoise(u * 9, v * 30, 8); if (chip > 0.74) K.tone(C.raw, chip > 0.82 ? 0.7 : 0.45, o.col); o.ro = 0.3; });
  MAT.brass = K.uvMat('pup-brass', 32, 64, (u, v, o) => { K.tone(C.brass, K.band(0.6 + Math.cos(u * TAU) * 0.25 - (K.vnoise(u * 20, v * 20, 3) > 0.75 ? 0.25 : 0), 4), o.col); });
  MAT.twine = K.uvMat('pup-twine', 32, 64, (u, v, o) => { const tw = ((u * 3 + v * 14) % 1); K.tone(C.twine, K.band(0.55 + (tw < 0.5 ? 0.1 : -0.1), 3), o.col); });
  MAT.coat = K.uvMat('pup-coat', 256, 256, (u, v, o) => { // plum wool, a cloth patch, holes and ragged hems (alpha cut)
    const f = Math.sin(u * TAU * 9 + Math.sin(v * 7) * 0.8); K.tone(C.coat, K.band(0.55 + (f > 0.55 ? 0.08 : f < -0.6 ? -0.1 : 0), 4), o.col);
    if (u > 0.62 && u < 0.72 && v > 0.3 && v < 0.42) { K.tone(hex('#8a6a3a'), K.band(0.55 + (((u * 200) | 0) % 2 ? 0.05 : 0), 3), o.col); if (u < 0.628 || u > 0.712 || v < 0.308 || v > 0.412) { if (((u + v) * 300) % 1 < 0.5) K.tone(hex('#f0e0b0'), 0.6, o.col); } }
    if (K.vnoise(u * 14, v * 14, 5) > 0.83 && v > 0.2) o.a = 0;
    const hem = 0.94 + Math.abs(((u * 23) % 1) - 0.5) * 0.1 + K.vnoise(u * 40, 3, 1) * 0.03; if (v > hem) o.a = 0; else if (v > hem - 0.02) K.mixc(o.col, C.coatD, 0.5);
  }, { side: THREE.DoubleSide, alphaTest: 0.5 });
  MAT.vest = K.uvMat('pup-vest', 128, 128, (u, v, o) => { K.tone(C.vest, K.band(0.55 + (((u * 60) | 0) % 2 ? 0.04 : 0), 3), o.col); const bu = Math.abs(u - 0.5), k = Math.round((v - 0.12) / 0.14); if (bu < 0.03 && k >= 0 && k < 6 && Math.abs(v - 0.12 - k * 0.14) < 0.03) K.tone(C.brass, 0.75, o.col); if (v > 0.9 - Math.abs(u - 0.5) * 0.3) o.a = 0; }, { side: THREE.DoubleSide, alphaTest: 0.5 });
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
  const l = new K.Loft(rings, sides).set((t, p) => p.set(x, -gap - t * (len - 2 * gap), z), (t) => { const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.sin(t * Math.PI)) * capR(t); return [r, r * rz]; },
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
function tableLeg(len, M) { // turned furniture leg as an arm: square post block, beads and coves, vase, taper, brass ferrule + castor
  const g = new THREE.Group();
  const prof = (t) => { const y = t * len; if (y < 0.11) return 0.052; if (y < 0.13) return 0.05 + Math.sin((y - 0.11) / 0.02 * Math.PI) * 0.012; if (y < 0.15) return 0.04; if (y < 0.17) return 0.046 + Math.sin((y - 0.15) / 0.02 * Math.PI) * 0.008;
    if (y < 0.36) return 0.04 + Math.sin((y - 0.17) / 0.19 * Math.PI) * 0.016; if (y < 0.38) return 0.036; if (y < 0.4) return 0.042; return 0.036 - (y - 0.4) / (len - 0.4) * 0.012 + (Math.abs(y - (len - 0.08)) < 0.008 ? 0.006 : 0); };
  const l = new K.Loft(60, 24).set((t, p) => p.set(0, -0.02 - t * len, 0), (t) => prof(t) * Math.sqrt(Math.min(1, t / 0.02)), { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => t * len < 0.11 ? Math.min(1.25, 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))) : 1 });
  K.mesh(l.geo, M.leg, g);
  const f = new K.Loft(10, 20).set((t, p) => p.set(0, -0.02 - len - t * 0.05, 0), (t) => 0.03 - t * 0.006, { ref: (t, n) => n.set(0, 0, 1) }); K.mesh(f.geo, M.brass, g); // ferrule
  const wheel = new K.Loft(24, 12).set((t, p) => p.set(0, -len - 0.11 + Math.cos(t * TAU) * 0.032, Math.sin(t * TAU) * 0.032), () => 0.014, { ref: (t, n) => n.set(1, 0, 0) }); K.mesh(wheel.geo, M.brass, g); // castor wheel
  for (const s of [-1, 1]) K.mesh(new K.Loft(6, 8).set((t, p) => p.set(s * 0.018, -len - 0.065 - t * 0.05, 0), () => 0.006).geo, M.brass, g); // fork
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
function spectralMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRunes: { value: runeTex() }, uGlow: { value: 1 }, uCol: { value: new THREE.Color(0x9fe8ff) }, uCol2: { value: new THREE.Color(0xb48cff) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uTime; uniform sampler2D uRunes; uniform float uGlow; uniform vec3 uCol; uniform vec3 uCol2; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float r = texture2D(uRunes, vUv * vec2(3.0, 2.0) + vec2(0.0, -uTime * 0.06)).r; float shim = 0.5 + 0.5 * sin(uTime * 3.0 + vP.y * 9.0 + vP.x * 5.0); vec3 c = mix(uCol2, uCol, f) * (f * 0.9 + r * 0.22 * shim + 0.03) * uGlow; gl_FragColor = vec4(c, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
function spectralHand(mat) { // palm above, four fingers curling down round the cross bar, thumb under; the group's origin is the grip
  const hand = new THREE.Group(); const fingers = [];
  K.mesh(new K.Loft(18, 18).set(K.curve([[0, 0.62, -0.62], [0, 0.5, -0.32], [0, 0.36, -0.06]]), (t) => [0.17 + t * 0.06, 0.06 * capR(t, 0.25) + 0.01], { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, hand);
  K.mesh(new K.Loft(12, 14).set(K.curve([[0, 0.66, -0.66], [0, 0.78, -0.95], [0, 0.85, -1.25]]), (t) => (0.13 + t * 0.03) * (1 - t * 0.2), { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, hand); // wrist fading into mist
  for (let i = 0; i < 4; i++) {
    const x = -0.15 + i * 0.1, L = [0.16, 0.12, 0.1].map((v) => v * (i === 0 || i === 3 ? 0.85 : 1)); let par = new THREE.Group(); par.position.set(x, 0.36, -0.06 + (i === 0 || i === 3 ? -0.02 : 0)); hand.add(par); const segs = [];
    for (let k = 0; k < 3; k++) { const j = k ? new THREE.Group() : par; if (k) { j.position.set(0, 0, L[k - 1]); par.add(j); } K.mesh(new K.Loft(10, 12).set((t, p) => p.set(0, 0, t * L[k]), (t) => 0.042 * (1 - k * 0.12) * (1 - t * 0.1) * capR(t, 0.2), { ref: (t, n) => n.set(0, 1, 0) }).geo, mat, j); segs.push(j); par = j; }
    fingers.push(segs);
  }
  const th = new THREE.Group(); th.position.set(0.2, 0.42, -0.3); hand.add(th); K.mesh(new K.Loft(12, 12).set(K.curve([[0, 0, 0], [-0.02, -0.12, 0.12], [-0.06, -0.24, 0.22]]), (t) => 0.05 * (1 - t * 0.3) * capR(t, 0.15)).geo, mat, th);
  return { hand, fingers, thumb: th };
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
  const head = J(neck, 0, 0.12, 0.0); const headMesh = new THREE.Group(); head.add(headMesh);
  const HL = 0.3; const headGeo = new K.Loft(34, 30).set((t, p) => p.set(0, 0.05 + t * HL, 0.015), (t) => { const r = (0.105 + Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.55) * 0.025) * Math.sqrt(Math.min(1, (1 - t) / 0.3)) * (t < 0.04 ? 0.9 : 1); return [r * 0.97, r * 1.1]; }, { ref: (t, n) => n.set(0, 0, 1), shape: (a) => 1 - Math.pow(Math.max(0, Math.cos(a)), 6) * 0.08 }).geo;
  const faceMesh = K.mesh(headGeo, faceMat('smug'), headMesh);
  K.mesh(new K.Loft(12, 14).set(K.curve([[0, 0.2, 0.125], [0, 0.155, 0.17], [0, 0.125, 0.2]]), (t) => 0.026 * (1 - t * 0.45) * capR(t, 0.12), { ref: (t, n) => n.set(0, 0, 1) }).geo, M.faceWood, headMesh); // long carved nose
  for (const s of [-1, 1]) K.mesh(new K.Loft(10, 12).set(K.curve([[s * 0.118, 0.17, 0.0], [s * 0.135, 0.15, -0.015], [s * 0.125, 0.12, -0.01]]), (t) => [0.008, 0.026 * capR(t, 0.2)], { ref: (t, n) => n.set(s, 0, 0) }).geo, M.faceWood, headMesh);
  headMesh.add(woolHair(M, HL + 0.05, 0.0));
  const jaw = J(head, 0, 0.07, -0.02); // hinge at the back; the chin swings down (marionette mouth)
  K.mesh(new K.Loft(16, 22).set((t, p) => p.set(0, -0.005 - t * 0.075, 0.085 - t * 0.012), (t) => [0.07 * capR(t, 0.15) * (1 - t * 0.25), 0.045 * capR(t, 0.15)], { ref: (t, n) => n.set(0, 0, 1) }).geo, M.jaw, jaw);
  // lace cravat, waistcoat, tattered frock coat with sleeves and tails, standing collar
  K.mesh(new K.Loft(12, 16).set(K.curve([[0, 0.55, 0.11], [0, 0.47, 0.135], [0, 0.36, 0.14]]), (t) => [0.03 + t * 0.03, 0.012 + t * 0.006], { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 5 + t * 14) * 0.22 }).geo, M.lace, torso);
  torso.add(sheet(8, 14, (u, v, p) => { const th = (u - 0.5) * 1.5; const y = 0.06 + v * 0.42; const w = 0.15 + Math.sin(Math.min(1, (y / 0.52) * 1.15) * Math.PI * 0.62) * 0.07 + 0.012; p.set(Math.sin(th) * w, y, Math.cos(th) * (0.115 + y * 0.04 + 0.012)); }, M.vest));
  torso.add(sheet(10, 26, (u, v, p) => { const th = 0.62 + u * (TAU - 1.24); const y = 0.54 - v * 0.56; const w = 0.17 + Math.sin(Math.min(1, (y / 0.52) * 1.15) * Math.PI * 0.62) * 0.07 + 0.02; p.set(Math.sin(th) * w, y, Math.cos(th) * (0.13 + 0.03 + y * 0.02)); }, M.coat));
  torso.add(sheet(3, 16, (u, v, p) => { const th = 1.0 + u * (TAU - 2.0); const r = 0.06 + v * 0.03; p.set(Math.sin(th) * r, 0.54 + v * 0.09, -0.01 + Math.cos(th) * r); }, M.coat));
  const tails = J(pelvis, 0, 0.1, -0.05);
  tails.add(sheet(10, 16, (u, v, p) => { const th = 2.05 + u * (TAU - 4.1); const y = -v * 0.58; const r = 0.19 + v * 0.07; p.set(Math.sin(th) * r * (Math.abs(u - 0.5) < 0.02 && v > 0.3 ? 1.02 : 1), y, Math.cos(th) * (r * 0.75)); }, M.coat));
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
  const smat = spectralMat(); const S = spectralHand(smat); const ghost = S.hand; ghost.position.set(0, -0.2, -0.05); ctrl.add(ghost); ghost.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const NM = 46; const mp = new Float32Array(NM * 3); const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: new THREE.Color(0xb8f4ff).multiplyScalar(2.2), size: 0.045, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); motes.frustumCulled = false; ctrl.add(motes);
  const moteSeed = Array.from({ length: NM }, (_, i) => [Math.random() * TAU, 0.2 + Math.random() * 0.7, Math.random() * 3, 0.3 + Math.random() * 0.7]);
  const SEG = 10; const strPos = new Float32Array(6 * SEG * 6); const strGeo = new THREE.BufferGeometry(); strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  strings.frustumCulled = false; root.add(strings);
  const anchors = [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, 0.3], [0, 0, -0.3], [-0.25, 0, 0], [0.25, 0, 0]].map((p) => V(...p));
  const headTop = J(head, 0, 0.36, 0.01); const back = J(torso, 0, 0.42, -0.13); const knees = legs.map((l) => J(l.kn, 0, -0.02, 0.05));
  const attach = [hands[0], hands[1], headTop, back, knees[0], knees[1]];

  // ---------------- animation state: the hand drives the strings, the strings drive the puppet
  const sp = (v = 0, w = 7, z = 0.3) => new Spring(v, w, z);
  const st = {
    t: 0, mode: 'idle', modeT: 9, talk: 0, look: new THREE.Vector2(), expr: 'smug', hold: 0, blink: 0, shown: '', nextJit: 1,
    hand: { x: sp(0, 6, 0.5), y: sp(0, 6, 0.5), z: sp(0, 6, 0.5), tilt: sp(0, 8, 0.45), roll: sp(0, 8, 0.45), curl: sp(0.55, 10, 0.5) },
    pull: { L: sp(0.08, 9, 0.35), R: sp(0.08, 9, 0.35), head: sp(0.5, 8, 0.4), kL: sp(0, 9, 0.35), kR: sp(0, 9, 0.35) }, slack: sp(0, 6, 0.6),
    j: { shL: sp(0, 8, 0.22), shR: sp(0, 8, 0.22), shLz: sp(0.12, 8, 0.25), shRz: sp(-0.12, 8, 0.25), elL: sp(-0.2, 9, 0.25), wrL: sp(0, 10, 0.2), hipL: sp(0, 8, 0.25), hipR: sp(0, 8, 0.25), knL: sp(0.05, 9, 0.25), knR: sp(0.05, 9, 0.25), torso: sp(0, 6, 0.35), torsoZ: sp(0, 6, 0.3), headX: sp(0, 8, 0.3), headY: sp(0, 6, 0.4), headZ: sp(0, 7, 0.25), tails: sp(0, 5, 0.2), bodyX: sp(0, 4, 0.35), bodyY: sp(0, 6, 0.4), jaw: sp(0, 30, 0.5) },
  };
  const EXPR = new Set(Object.keys(EX));
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
      if (mode === 'throw') { H.z.kick(-3); H.tilt.kick(-4); P.L.kick(6); }
      if (mode === 'hurt') { st.slack.value = 1; st.slack.target = 0; H.y.kick(-3); st.expr = 'hurt'; st.hold = 1.1; }
      if (mode === 'cast') { H.y.kick(3); st.expr = st.expr === 'smug' ? 'think' : st.expr; }
      if (mode === 'cheer') { H.y.kick(5); st.expr = 'delight'; st.hold = 1.4; }
    },
    update(dt) {
      dt = Math.min(dt, 0.05); st.t += dt; st.modeT += dt; const t = st.t, m = st.modeT, H = st.hand, P = st.pull, Jn = st.j;
      // the hand: idle bob and sway; the mode decides how it jerks the strings
      H.x.target = Math.sin(t * 0.9) * 0.08; H.y.target = Math.sin(t * 1.6) * 0.05; H.z.target = 0; H.tilt.target = Math.sin(t * 1.3) * 0.07; H.roll.target = Math.sin(t * 0.7) * 0.06; H.curl.target = 0.55 + Math.sin(t * 2.1) * 0.05;
      P.L.target = 0.08 + Math.sin(t * 1.7) * 0.04; P.R.target = 0.08 + Math.sin(t * 1.7 + 1) * 0.04; P.head.target = 0.5; P.kL.target = Math.max(0, Math.sin(t * 1.4)) * 0.18; P.kR.target = Math.max(0, Math.sin(t * 1.4 + 2)) * 0.18;
      const md = st.mode;
      if (md === 'throw' && m < 0.9) { const k = m < 0.25 ? 0 : 1; H.z.target = k ? 0.35 : -0.25; H.tilt.target = k ? 0.35 : -0.25; P.L.target = m < 0.25 ? 0.35 : m < 0.5 ? 1.0 : 0.3; H.curl.target = k ? 0.85 : 0.4; }
      if (md === 'cast' && m < 1.2) { H.y.target = 0.3; H.tilt.target = -0.15; P.L.target = 0.85; P.R.target = 0.85; H.curl.target = 0.25; smat.uniforms.uGlow.value = 2.2; } else smat.uniforms.uGlow.value += (1 - smat.uniforms.uGlow.value) * Math.min(1, dt * 3);
      if (md === 'cheer' && m < 1.5) { const b = Math.abs(Math.sin(m * 9)); H.y.target = 0.25 + b * 0.15; P.L.target = 0.95 + b * 0.1; P.R.target = 0.95 + b * 0.1; P.kL.target = b * 0.6; P.kR.target = (1 - b) * 0.6; H.curl.target = 0.8; }
      if (md !== 'idle' && m > 1.6) st.mode = 'idle';
      st.slack.update(dt); const sl = Math.max(0, st.slack.value); if (sl > 0.02) { H.curl.target = 0.15; P.L.target *= 1 - sl; P.R.target *= 1 - sl; P.kL.target *= 1 - sl; P.kR.target *= 1 - sl; P.head.target *= 1 - sl; }
      for (const k in H) H[k].update(dt); for (const k in P) P[k].update(dt);
      ctrl.position.set(H.x.value * 0.6, 3.55 + H.y.value, H.z.value * 0.5); cross.rotation.set(H.tilt.value, 0, H.roll.value);
      ghost.rotation.set(H.tilt.value * 0.6, Math.sin(t * 0.5) * 0.08, H.roll.value * 0.6); ghost.position.y = -0.2 + Math.sin(t * 1.3) * 0.02;
      S.fingers.forEach((f, i) => f.forEach((j, k) => { j.rotation.x = H.curl.value * (0.55 + k * 0.25) + Math.sin(t * 2.3 + i) * 0.04; }));
      S.thumb.rotation.z = -0.2 + H.curl.value * 0.3; smat.uniforms.uTime.value = t;
      for (let i = 0; i < NM; i++) { const [a, r, ph, sp2] = moteSeed[i]; const y = ((t * sp2 * 0.25 + ph) % 1.6) - 0.3; mp.set([Math.cos(a + t * sp2 * 0.6) * r, y + 0.3, Math.sin(a + t * sp2 * 0.6) * r * 0.8 - 0.25], i * 3); } mg.attributes.position.needsUpdate = true;
      // dangling jitter: little random knocks to the loose joints
      st.nextJit -= dt; if (st.nextJit < 0) { st.nextJit = 0.6 + Math.random() * 1.2; const ks = ['shL', 'shR', 'elL', 'hipL', 'hipR', 'knL', 'knR', 'headZ', 'tails', 'wrL']; Jn[ks[(Math.random() * ks.length) | 0]].kick((Math.random() - 0.5) * 2.4); }
      // the strings set the joint targets (pull 1 = arm hauled up and forward)
      Jn.shL.target = -P.L.value * 2.3 - (md === 'throw' && m > 0.25 && m < 0.6 ? 0.6 : 0); Jn.shLz.target = 0.12 + P.L.value * 0.25 + sl * 0.1; Jn.elL.target = -0.15 - P.L.value * 0.7;
      Jn.shR.target = -P.R.value * 2.1; Jn.shRz.target = -0.12 - P.R.value * 0.25 - sl * 0.1; Jn.wrL.target = Math.sin(t * 2.3) * 0.12;
      Jn.hipL.target = -P.kL.value * 0.9 - sl * 0.8; Jn.hipR.target = -P.kR.value * 0.9 - sl * 0.7; Jn.knL.target = 0.05 + P.kL.value * 1.3 + sl * 1.4; Jn.knR.target = 0.05 + P.kR.value * 1.3 + sl * 1.3;
      Jn.torso.target = 0.08 + sl * 0.5 - (P.L.value + P.R.value) * 0.06; Jn.torsoZ.target = -H.roll.value * 0.7 + Math.sin(t * 1.1) * 0.03;
      Jn.headX.target = (1 - P.head.value) * 0.5 - 0.1 + st.look.y * -0.3 + sl * 0.35; Jn.headY.target = st.look.x * 0.5 + Math.sin(t * 0.6) * 0.1; Jn.headZ.target = Math.sin(t * 0.8) * 0.06;
      Jn.tails.target = -Jn.hipL.value * 0.3 + Math.sin(t * 1.9) * 0.05; Jn.bodyX.target = H.x.value * 0.35; Jn.bodyY.target = 0.02 + Math.max(0, H.y.value) * 0.5 - sl * 0.3 + (P.L.value + P.R.value) * 0.03;
      Jn.jaw.target = st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.5 : sl * 0.25; if (st.talk > 0) st.talk -= dt;
      for (const k in Jn) Jn[k].update(dt);
      arms[1].sh.rotation.set(Jn.shL.value, 0, Jn.shLz.value); arms[1].el.rotation.set(Jn.elL.value, 0, 0); arms[1].wr.rotation.set(Jn.wrL.value, 0, 0);
      arms[0].sh.rotation.set(Jn.shR.value, 0, Jn.shRz.value); arms[1].twine.rotation.set(Math.sin(t * 2.7) * 0.3, 0, Math.sin(t * 2.1) * 0.2);
      legs[1].hip.rotation.set(Jn.hipL.value, 0, 0); legs[0].hip.rotation.set(Jn.hipR.value, 0, 0); legs[1].kn.rotation.set(Jn.knL.value, 0, 0); legs[0].kn.rotation.set(Jn.knR.value, 0, 0);
      legs[1].an.rotation.set(-Jn.knL.value * 0.3, 0, 0); legs[0].an.rotation.set(-Jn.knR.value * 0.3, 0, 0);
      torso.rotation.set(Jn.torso.value, 0, Jn.torsoZ.value); pelvis.rotation.set(-sl * 0.2, 0, -Jn.torsoZ.value * 0.4); tails.rotation.x = Math.max(-0.1, Jn.tails.value) + 0.08;
      head.rotation.set(Jn.headX.value, Jn.headY.value, Jn.headZ.value); jaw.rotation.x = Jn.jaw.value;
      body.position.set(Jn.bodyX.value, Jn.bodyY.value, 0); body.rotation.set(0, 0, -H.roll.value * 0.4);
      // face: expression texture swap (+ blinks)
      if (st.hold > 0) st.hold -= dt; else if (st.expr === 'hurt' || st.expr === 'delight') st.expr = 'smug';
      st.blink -= dt; if (st.blink < -3.4) st.blink = 0.13; const fx = st.blink > 0 ? 'blink' : st.expr; if (fx !== st.shown) { st.shown = fx; faceMesh.material = faceMat(fx); }
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
