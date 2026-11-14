// Sir Isaac: a cool YOUNG Isaac Newton who LEVITATES and fights with an orbiting APPLE.
// Body: the Limbo Phobia people port (src/models/limbo, from the user's own game), anime cel-shaded (MeshToon, the
// engine adds ink outlines): long wavy 17th-century hair, a long dark scholar-battlemage coat with brass buttons and
// gold rune trim, burgundy waistcoat, white lace cravat, boots. He floats with a gentle bob, coat tails drifting, a
// faint gravity-rune shimmer and a dust ring on the ground under him. A glossy red apple (stem + leaf) orbits him:
// he launches it (and it can split into several for multi-hits), it returns; he can bite it to heal.
// API (unchanged for the scenes): root, head, jaw, ctrl, arms, legs, torso, body, ghost, handWorld, headWorld,
// setExpr, talk, lookAt, act, update, impactTime; plus appleWorld(out). ctrl/ghost = the apple-orbit group.
// Motion layer: every joint is driven through a critically damped spring (overlapping action, no snapping between
// acts), spring-driven hair, coat tails and lace jabot, breathing, weight shifts, eyes-lead-head look-at with
// saccades and glances at the apple, analytic two-bone hand IK (chin, mouth, apple, casting palm), a hover bob that
// tilts into motion, and act('dodge'). attach(slot, obj) / detach(slot, obj) / boneWorld(name, out) for artifacts.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';
import { LimboBody, LimboAnim, IMPACT } from './limbo/rig.js';
import { runeRingTex } from '../gfx/pixeltex.js';

const { hex } = K;
const TAU = Math.PI * 2;
const HEIGHT = 1.88, FLOAT = 0.32;
const COAT = [30, 34, 56], SHIRT = [242, 236, 224], VEST = [122, 30, 48], BRASS = [240, 196, 84], GOLD = [232, 184, 72];
const APP = { skin: 0xf2caa6, hair: 0x3e2618, hairStyle: 'wavy', build: 'slim', bodyShape: 0.12, age: 0, face: 3, nose: 0, brows: 2, mouth: 1, ears: 1, eyeColor: 0x5a86b0, facialHair: 'none', height: 1 };
const OUTFIT = { torso: { tex: 'c_shirt_button', color: 0xf2ece0 }, torsoOuter: { tex: 'c_labcoat', color: 0x1e2238 }, legs: { tex: 'c_slacks', color: 0x2a2028 }, feet: { tex: 'c_shoes_boot', color: 0x1a1418 } };
const EXPR_MAP = { smug: 'smile', delight: 'happy', annoyed: 'angry', hurt: 'pain', shock: 'surprised', think: 'think' };

// ---------------------------------------------------------------- Limbo paint hook: waistcoat, cravat, coat buttons and rune trim
const near = (o, c, tol = 0.1) => Math.abs(o[0] / (c[0] + 1) - o[1] / (c[1] + 1)) + Math.abs(o[1] / (c[1] + 1) - o[2] / (c[2] + 1)) < tol;
const lum = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
const put = (o, c, k = 1) => { o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; };
const glyph = (gx, gy) => { const c = Math.floor(gx), x = gx - c; if (x < 0.2 || x > 0.8) return false; const h = Math.abs(Math.sin(c * 12.99) * 437.58) % 1; return Math.abs(x - 0.5) < 0.08 || (h > 0.3 && Math.abs((x - 0.5) - (gy - 0.5) * 0.6) < 0.08) || (h > 0.6 && Math.abs(gy - 0.5) < 0.1 && Math.abs(x - 0.5) < 0.25); };
function heroHook(paint, P, spec) {
  const H = P.H;
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ax = Math.abs(c.x), arm = c.part === 'uarm' || c.part === 'farm';
    if (near(o, SHIRT, 0.08) && lum(o) > 120) {
      const yc = P.bustY - 0.01 * H; if (c.nz > 0.2 && c.y > yc && ax < 0.011 * H + (c.y - yc) * 0.45) { if (Math.sin(ax * 900 + c.y * 260) > 0.55) put(o, [214, 210, 222]); return; } // lace cravat
      if (!arm && c.y > P.pelvisY - 0.012 * H && c.y < P.shoulderY) { const k = lum(o) / 236; put(o, VEST, k > 0.97 ? 1.05 : k > 0.85 ? 0.92 : 0.72); const b = Math.round((c.y - P.waistY) / (0.032 * H)); if (ax < 0.005 * H && c.nz > 0.3 && Math.abs(c.y - P.waistY - b * 0.032 * H) < 0.0045 * H) put(o, BRASS); return; } // waistcoat + buttons
    }
    if (near(o, COAT, 0.13) && lum(o) < 90) {
      const hem = P.kneeY + 0.035 * H; if (c.y < hem + 0.03 * H && c.y > hem) { put(o, [20, 22, 36]); if (glyph((Math.atan2(c.x, c.z) + 3.2) * 9, (c.y - hem) / (0.03 * H))) put(o, GOLD); if (c.y > hem + 0.026 * H || c.y < hem + 0.004 * H) put(o, GOLD); return; } // rune band above the hem
      if (c.part === 'farm' && c.y < P.wristY + 0.05 * H) { put(o, c.y < P.wristY + 0.045 * H && c.y > P.wristY + 0.04 * H ? GOLD : [44, 48, 76]); return; } // turned-back cuffs
      if (!arm && c.nz > 0.3 && ax > 0.045 * H && ax < 0.06 * H && c.y > P.waistY - 0.02 * H && c.y < P.bustY + 0.04 * H) { const k = (c.y - P.waistY) / (0.045 * H); if (Math.abs(k - Math.round(k)) < 0.18) put(o, BRASS); } // brass buttons down the coat front
      if (!arm && c.nz > 0.25 && ax > 0.03 * H && ax < 0.036 * H && c.y > P.crotchY) put(o, GOLD); // gold piping on the front edges
    }
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
}

// ---------------------------------------------------------------- the apple (glossy red, stem and leaf) — a lofted apple shape, not a sphere
let APPLE = null;
function appleParts() {
  if (APPLE) return APPLE;
  const R = 0.072;
  const path = (t, p) => p.set(0, (t - 0.5) * 2 * R * 0.92 - (t > 0.9 ? (t - 0.9) * R * 1.6 : 0) + (t < 0.1 ? (0.1 - t) * R * 1.2 : 0), 0);
  const rad = (t) => { const r = R * Math.sin(Math.PI * Math.min(1, Math.max(0, 0.04 + t * 0.92))) * (1 + 0.1 * Math.sin(t * Math.PI * 1.15) - 0.06 * t); return [r, r]; };
  const shape = (a) => 1 + 0.025 * Math.cos(a * 5);
  const geo = new K.Loft(26, 28).set(path, rad, { ref: (t, n) => n.set(0, 0, 1), shape }).geo;
  const bitten = geo.clone(); { const p = bitten.attributes.position; const d = new THREE.Vector3(1, 0.1, 0.25).normalize(); for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = v.clone().normalize().dot(d); if (k > 0.55) { v.multiplyScalar(1 - (k - 0.55) * 1.1); p.setXYZ(i, v.x, v.y, v.z); } } bitten.computeVertexNormals(); }
  const skin = (bite) => K.uvMat(bite ? 'apple-bitten' : 'apple', 128, 128, (u, v, o) => {
    const lit = Math.cos((u - 0.12) * TAU); const streak = Math.abs(((u * 23 + Math.sin(v * 5) * 0.4) % 1) - 0.5) < 0.12 && v > 0.55;
    K.tone(streak ? [238, 120, 52] : [214, 28, 44], lit > 0.55 ? 0.66 : lit < -0.35 ? 0.32 : 0.5, o.col);
    if (v > 0.9) K.tone([150, 160, 40], 0.45, o.col); else if (v < 0.07) K.tone([120, 30, 30], 0.35, o.col);
    if (K.vnoise(u * 60, v * 40, 3) > 0.84) K.tone([252, 210, 160], 0.6, o.col); // lenticel speckles
    if (Math.hypot((u - 0.08) * 2.4, v - 0.66) < 0.06) { o.col[0] = 255; o.col[1] = 248; o.col[2] = 250; } // crisp anime gloss
    if (bite && Math.hypot((u - 0.22) * 2, v - 0.5) < 0.2) { K.tone([250, 238, 200], 0.6, o.col); if (Math.hypot((u - 0.22) * 2, v - 0.5) > 0.18) K.tone([200, 30, 40], 0.4, o.col); }
  });
  const stem = new K.Loft(8, 8).set(K.curve([[0, R * 0.62, 0], [0.006, R * 0.95, 0.002], [0.016, R * 1.2, 0.004]]), (t) => 0.0055 * (1 - t * 0.4), { ref: (t, n) => n.set(0, 0, 1) }).geo;
  const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.022, 0.012, 0.05, 0.004); ls.quadraticCurveTo(0.03, -0.014, 0, 0);
  const leaf = new THREE.ShapeGeometry(ls, 6); { const p = leaf.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / 0.05 * Math.PI) * 0.006 - Math.abs(p.getY(i)) * 0.3); leaf.computeVertexNormals(); }
  APPLE = { geo, bitten, mat: skin(false), matB: skin(true), stem, leaf, stemMat: K.uvMat('apple-stem', 16, 16, (u, v, o) => K.tone([110, 70, 40], 0.5, o.col)), leafMat: K.uvMat('apple-leaf', 32, 32, (u, v, o) => { K.tone([76, 168, 64], Math.abs(v - 0.5) < 0.04 ? 0.7 : u > 0.5 ? 0.42 : 0.56, o.col); }, { side: THREE.DoubleSide }) };
  return APPLE;
}
function makeApple() {
  const A = appleParts(); const g = new THREE.Group(); const body = K.mesh(A.geo, A.mat, g); K.mesh(A.stem, A.stemMat, g);
  const leaf = K.mesh(A.leaf, A.leafMat, g); leaf.position.set(0.008, 0.07, 0); leaf.rotation.set(0.3, 0.6, 0.5);
  g.userData = { body, bite: (on) => { body.geometry = on ? A.bitten : A.geo; body.material = on ? A.matB : A.mat; } }; return g;
}
// long wavy 17th-century locks over the Limbo hair cap: cel tubes (chestnut, crisp highlight band, darker underside)
function wavyLocks(P) {
  const g = new THREE.Group(); let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const m = K.uvMat('hero-locks', 64, 256, (u, v, o) => { const lit = Math.cos(u * TAU); const ring = lit > 0.4 && v > 0.12 && v < 0.2; const c = ring ? [176, 112, 72] : lit < -0.2 ? [46, 26, 20] : [92, 56, 36]; o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; });
  const c = new THREE.Vector3(0, (P.hairY + P.eyeY) / 2 + 0.012, P.hcz - 0.012);
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1; const az = side * (0.75 + rnd() * 2.3), el = -0.15 + rnd() * 1.25; if (Math.cos(az) > 0.25 && el < 1.0) continue;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const p0 = c.clone().add(new THREE.Vector3(dir.x * P.hw * 1.02, dir.y * 0.095, dir.z * P.hd * 0.98));
    const out = new THREE.Vector3(dir.x * 1.2, 0, Math.min(0, dir.z) - 0.2).normalize(); const fall = Math.max(0.08, p0.y - P.shoulderY + 0.02 + rnd() * 0.06); const ph = rnd() * 6.28, amp = 0.008 + rnd() * 0.01, r0 = 0.012 + rnd() * 0.007;
    const pts = []; for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push(p0.clone().addScaledVector(out, 0.008 + t * 0.03 + Math.sin(t * 8 + ph) * amp).add(new THREE.Vector3(0, -t * fall, 0))); }
    K.mesh(new K.Loft(12, 8).set(K.curve(pts), (t) => { const r = r0 * (1 - t * 0.6) * (t < 0.1 ? 0.6 + t * 4 : 1); return [r * 1.25, r * 0.8]; }, { ref: () => out }).geo, m, g);
  }
  return g;
}
// ---------------------------------------------------------------- floating props: inventor's gadgets, notebook + quill, a "!" take
const PROPM = {};
function propMats() {
  if (PROPM.brass) return PROPM;
  PROPM.brass = K.uvMat('prop-brass', 64, 64, (u, v, o) => { K.tone([226, 178, 76], Math.cos(u * TAU) > 0.4 ? 0.7 : Math.cos(u * TAU) < -0.4 ? 0.34 : 0.52, o.col); if (((u * 8) % 1) < 0.05) K.tone([150, 104, 40], 0.4, o.col); });
  PROPM.glass = new THREE.MeshToonMaterial({ color: 0xbfefff, transparent: true, opacity: 0.55, depthWrite: false });
  PROPM.wood = K.uvMat('prop-wood', 32, 64, (u, v, o) => { K.tone([150, 92, 52], ((u * 9 + v * 2) % 1) < 0.15 ? 0.36 : 0.52, o.col); });
  PROPM.leather = K.uvMat('prop-leather', 64, 64, (u, v, o) => { K.tone([110, 46, 36], Math.min(u, 1 - u, v, 1 - v) < 0.05 ? 0.34 : 0.5, o.col); if (Math.abs(Math.min(u, 1 - u, v, 1 - v) - 0.08) < 0.01 && ((u + v) * 40) % 1 < 0.5) K.tone([230, 200, 140], 0.6, o.col); }, { side: THREE.DoubleSide });
  PROPM.page = K.uvMat('prop-page', 128, 128, (u, v, o) => { K.tone([248, 240, 216], 0.6, o.col); const row = (v * 14) % 1; if (u > 0.1 && u < 0.9 && row < 0.1 && Math.sin(u * 60 + Math.floor(v * 14) * 3) > -0.3) K.tone([40, 34, 60], 0.4, o.col); if (Math.hypot(u - 0.7, v - 0.3) < 0.12 && Math.abs(Math.hypot(u - 0.7, v - 0.3) - 0.1) < 0.01) K.tone([40, 34, 60], 0.4, o.col); }, { side: THREE.DoubleSide });
  PROPM.feather = K.uvMat('prop-feather', 32, 128, (u, v, o) => { K.tone([250, 248, 240], Math.abs(u - 0.5) < 0.04 ? 0.35 : u > 0.5 ? 0.46 : 0.62, o.col); if (Math.sin(v * 140 + u * 6) > 0.85) K.tone([200, 196, 210], 0.5, o.col); }, { side: THREE.DoubleSide });
  PROPM.ink = new THREE.MeshToonMaterial({ color: 0xfff6e0, emissive: 0xffe9a0, emissiveIntensity: 0.6 });
  return PROPM;
}
function gear(teeth, r, depth, M) { const s = new THREE.Shape(); for (let i = 0; i <= teeth * 4; i++) { const a = (i / (teeth * 4)) * TAU, rr = i % 4 < 2 ? r : r * 0.8; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  for (let k = 0; k < 4; k++) { const h = new THREE.Path(); const a0 = (k / 4) * TAU + 0.3; h.absarc(0, 0, r * 0.55, a0, a0 + 1.1, false); h.absarc(0, 0, r * 0.25, a0 + 1.1, a0, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * 0.25, bevelThickness: depth * 0.25, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return K.mesh(g, M.brass); }
function gadgets(M) { // a little inventor's kit that assembles and comes apart: two meshing gears, a glass prism, a pendulum, a lens
  const g = new THREE.Group(); const parts = [];
  parts.push(gear(12, 0.05, 0.012, M), gear(8, 0.034, 0.012, M));
  const tri = new THREE.Shape(); tri.moveTo(0, 0.045); tri.lineTo(-0.039, -0.022); tri.lineTo(0.039, -0.022); tri.closePath(); const pg = new THREE.ExtrudeGeometry(tri, { depth: 0.07, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }); pg.translate(0, 0, -0.035); parts.push(K.mesh(pg, M.glass));
  const pend = new THREE.Group(); K.mesh(new K.Loft(6, 8).set((t, p) => p.set(0, -t * 0.1, 0), () => 0.003).geo, M.brass, pend); const bob = K.mesh(new K.Loft(12, 14).set((t, p) => p.set(0, -0.1 - t * 0.04, 0), (t) => 0.018 * Math.sin(Math.PI * (0.1 + t * 0.8)) * (t < 0.5 ? 1 : 1 - (t - 0.5) * 0.6)).geo, M.brass, pend); void bob;
  K.mesh(new K.Loft(14, 8).set((t, p) => p.set(Math.cos(t * Math.PI) * 0.03, Math.sin(t * Math.PI) * 0.02, 0), () => 0.004).geo, M.wood, pend); parts.push(pend);
  const lens = new THREE.Group(); K.mesh(new K.Loft(10, 24).set((t, p) => p.set(0, 0, (t - 0.5) * 0.012), (t) => 0.034 * Math.sqrt(1 - Math.pow(2 * t - 1, 2) * 0.85)).geo, M.glass, lens); K.mesh(K.jointRing(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0.036, 0.0045, M.brass).geometry, M.brass, lens); parts.push(lens);
  for (const q of parts) g.add(q); return { g, parts };
}
function notebook(M) { // open floating notebook (leather cover, curved pages, a page that flips) + quill
  const g = new THREE.Group(); const page = (side) => { const pos = []; const uv = []; const idx = []; const W = 10, Hh = 6; for (let j = 0; j <= Hh; j++) for (let i = 0; i <= W; i++) { const u = i / W, v = j / Hh; pos.push(side * u * 0.14, Math.sin(u * Math.PI) * 0.012 + 0.006, (v - 0.5) * 0.2); uv.push(u, v); }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + W + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  K.mesh(page(1), M.page, g); K.mesh(page(-1), M.page, g); const cover = K.mesh(page(1), M.leather, g); cover.scale.set(1.08, 0.5, 1.06); cover.position.y = -0.006; const c2 = K.mesh(page(-1), M.leather, g); c2.scale.set(1.08, 0.5, 1.06); c2.position.y = -0.006;
  const flip = new THREE.Group(); g.add(flip); K.mesh(page(1), M.page, flip);
  const quill = new THREE.Group(); const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.quadraticCurveTo(0.03, 0.08, 0.008, 0.2); fs.quadraticCurveTo(-0.01, 0.1, 0, 0);
  const fg = new THREE.ShapeGeometry(fs, 8); { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 12) * 0.006); fg.computeVertexNormals(); } K.mesh(fg, M.feather, quill);
  K.mesh(new K.Loft(6, 6).set((t, p) => p.set(0, -0.04 + t * 0.06, 0), (t) => 0.0025 * (t < 0.2 ? t / 0.2 : 1)).geo, M.wood, quill);
  return { g, flip, quill };
}
function bangMark() { // the "!" take: a tapered bar over a dot, white with ink outline by the engine
  const g = new THREE.Group(); const m = new THREE.MeshToonMaterial({ color: 0xfff4c0, emissive: 0xffd860, emissiveIntensity: 0.5 });
  K.mesh(new K.Loft(10, 10).set((t, p) => p.set(0, 0.03 + t * 0.12, 0), (t) => 0.014 + t * 0.012).geo, m, g); K.mesh(new K.Loft(6, 10).set((t, p) => p.set(0, -0.005 + t * 0.022, 0), (t) => 0.016 * Math.sin(Math.PI * (0.15 + t * 0.7))).geo, m, g);
  return g;
}

// pixel-art cloth on the painted page: wool twill on the coat, a small damask diamond on the burgundy waistcoat, 4x4
// tonal clusters; crisp texels (NearestFilter). The face block is left alone.
function pixelCloth(L) {
  const img = L.tex.image, d = img.data, S = img.width, k = S / 256; const h = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if ((x < 113 * k && y < 97 * k) || (x >= 231 * k && x < 256 * k && y >= 63 * k && y < 79 * k)) continue; const i = (y * S + x) * 4; if (!d[i + 3]) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2], lm = r * 0.3 + g * 0.59 + b * 0.11; let f = 1;
    const coat = b > r * 1.15 && b > g * 1.05 && lm < 95, vest = r > g * 1.8 && r > b * 1.4 && r > 50 && lm < 140;
    if (coat) { f = ((x + y) >> 1) % 3 === 0 ? 0.86 : 1; f *= 0.96 + 0.08 * (h(x >> 2, y >> 2) > 0.5 ? 1 : 0); }
    else if (vest) { const dd = Math.abs((x % 8) - 4) + Math.abs((y % 8) - 4); f = dd === 3 ? 1.22 : dd === 0 ? 1.3 : (x + y) % 2 ? 0.97 : 1.0; }
    else continue;
    d[i] = Math.min(255, r * f); d[i + 1] = Math.min(255, g * f); d[i + 2] = Math.min(255, b * f);
  }
  L.gg.base?.set?.(d); L.tex.magFilter = THREE.NearestFilter; L.tex.needsUpdate = true;
}
// the lace jabot under his chin: three ruffled tiers (pixel lace texture) on a spring pivot so it swings and lifts
function laceJabot(L, sc) {
  const m = K.uvMat('hero-jabot', 32, 32, (u, v, o) => { const px = Math.floor(u * 32), py = Math.floor(v * 32); const hole = (px + (py % 4 < 2 ? 0 : 2)) % 4 === 0 && py % 4 === 1; const edge = v > 0.82 && (px % 3 === 0);
    K.tone(hole ? [176, 172, 196] : edge ? [255, 255, 250] : [238, 234, 228], hole ? 0.4 : u < 0.5 ? 0.62 : 0.52, o.col); }, { side: THREE.DoubleSide });
  const piv = new THREE.Group(); const k = 1 / sc;
  for (let tier = 0; tier < 3; tier++) { const W = (0.05 + tier * 0.012) * k, Hh = 0.03 * k, pos = [], uv = [], idx = []; const NU = 12, NV = 3;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU, v = j / NV; pos.push((u - 0.5) * W * (1 + v * 0.5), -v * Hh - tier * 0.017 * k, (Math.sin(u * Math.PI * 6) * 0.004 * v + Math.sin(u * Math.PI) * 0.008 + v * 0.006) * k); uv.push(u, v); }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); K.mesh(g, m, piv); }
  const nr = L.restOf('neck'); const gp = L.mesh.geometry.attributes.position; let fz = nr.z + 0.04 * k; for (let i = 0; i < gp.count; i++) { const y = gp.getY(i); if (y > nr.y - 0.1 * k && y < nr.y - 0.02 * k && Math.abs(gp.getX(i)) < 0.025 * k) fz = Math.max(fz, gp.getZ(i)); }
  piv.position.set(0, nr.y - 0.03 * k, fz + 0.003 * k); L.attach(piv, 'neck'); return piv;
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const JOINTS = { hips: 14, spine: 13, chest: 14, neck: 12, head: 11, uarmL: 20, farmL: 17, handL: 13, uarmR: 20, farmR: 17, handR: 13, thighL: 9, shinL: 8, footL: 7, thighR: 9, shinR: 8, footR: 7 };
// acts with their own choreography (anticipation -> action -> follow-through -> settle)
const ACT = {
  throw(a, m) { // reach the apple up behind the head, coil, whip through (release at IMPACT), follow through, settle
    const up = ss(0, 0.22, m), coil = ss(0.12, 0.32, m) * (1 - ss(0.32, 0.4, m)), whip = ss(0.32, 0.44, m) * (1 - ss(0.6, 1.15, m)), hold = up * (1 - ss(0.33, 0.42, m));
    a('uarmR', -2.3 * hold + 0.45 * coil - 1.25 * whip, 0, -0.3 * hold - 0.1 * whip); a('farmR', -1.3 * hold - 0.5 * coil - 0.25 * whip); a('handR', 0.5 * coil - 0.7 * whip);
    a('chest', -0.1 * coil + 0.24 * whip, -0.55 * coil + 0.5 * whip); a('spine', -0.06 * coil + 0.12 * whip, -0.25 * coil + 0.25 * whip); a('head', -0.05 * coil + 0.12 * whip, 0.25 * coil - 0.12 * whip);
    a('uarmL', -0.85 * coil + 0.3 * whip, 0, 0.45 * coil + 0.3 * whip); a('farmL', -0.9 * coil - 0.45 * whip);
    a('thighL', -0.45 * coil - 0.3 * whip); a('shinL', 0.55 * coil + 0.35 * whip); a('thighR', 0.3 * whip); a('shinR', 0.25 * coil);
    return { lean: -0.12 * coil + 0.2 * whip, lift: 0.04 * coil };
  },
  cast(a, m) { // rise, left palm up under the apple, the right hand traces a sigil, settle
    const rise = ss(0, 0.35, m) * (1 - ss(1.3, 1.7, m)), tr = ss(0.25, 0.5, m) * (1 - ss(1.05, 1.4, m)), g = m * 7.5;
    a('uarmL', -1.15 * rise, 0, 0.3 * rise); a('farmL', -0.6 * rise); a('handL', 0.55 * rise);
    a('uarmR', (-1.05 + Math.sin(g) * 0.25) * tr, Math.cos(g) * 0.2 * tr, (-0.45 + Math.cos(g) * 0.22) * tr); a('farmR', -0.65 * tr); a('handR', (0.3 + Math.sin(g * 1.3) * 0.2) * tr);
    a('chest', -0.14 * rise, 0.16 * rise); a('head', -0.2 * rise, 0.1 * rise); a('thighL', -0.3 * rise); a('shinL', 0.55 * rise); a('thighR', 0.12 * rise); a('shinR', 0.35 * rise); a('footL', 0.3 * rise); a('footR', 0.3 * rise);
    return { lean: -0.06 * rise, lift: 0.12 * rise };
  },
  eat(a, m) { const k = ss(0, 0.35, m) * (1 - ss(1.55, 2.0, m)), bite = ss(0.45, 0.6, m) * (1 - ss(0.7, 0.95, m)); a('uarmR', -0.95 * k, 0, -0.2 * k); a('farmR', -1.8 * k); a('head', 0.12 * k + 0.12 * bite, -0.1 * k); a('chest', 0.05 * k + 0.06 * bite); a('uarmL', -0.2 * k, 0, 0.15 * k); a('farmL', -0.5 * k); return { lean: 0.04 * bite, lift: 0 }; },
  dodge(a, m, o) { const out = ss(0, 0.14, m) * (1 - ss(0.45, 0.9, m)); const d = o.dir || 1; a('chest', 0, 0, d * 0.25 * out); a('spine', -0.1 * out, 0, d * 0.15 * out); a('head', 0.1 * out, -d * 0.2 * out, -d * 0.2 * out); a('uarmL', -0.5 * out, 0, (0.6 + d * 0.3) * out); a('uarmR', -0.5 * out, 0, -(0.6 - d * 0.3) * out); a('farmL', -0.8 * out); a('farmR', -0.8 * out);
    a('thighL', -0.7 * out); a('thighR', -0.6 * out); a('shinL', 1.2 * out); a('shinR', 1.1 * out); return { lean: 0, lift: 0.06 * out, side: d * 0.62 * (ss(0, 0.16, m) - ss(0.42, 0.95, m)), roll: -d * 0.32 * (ss(0, 0.1, m) - ss(0.18, 0.7, m)) }; },
};
const ACT_DUR = { throw: 1.2, cast: 1.7, eat: 2.1, dodge: 1.0 };
const IDLES = ['float', 'chill', 'think', 'ponder', 'invent', 'write'];
export function createProfessor() {
  const root = new THREE.Group(); root.name = 'professor';
  const body = new THREE.Group(); body.name = 'hero'; root.add(body);
  const L = new LimboBody(APP, OUTFIT, { hook: heroHook, overrides: { hairVolume: 1.25, blush: 0.15 } }); const sc = HEIGHT / L.P.crown; L.root.scale.setScalar(sc); body.add(L.root);
  pixelCloth(L); const B = L.bones; const anim = new LimboAnim(L, { sway: 0.6 });
  L.attach(wavyLocks(L.P), B.hair ? 'hair' : 'head'); const jabot = laceJabot(L, sc);
  const head = new THREE.Group(); B.head.add(head); head.position.set(0, 0.12, 0.03); const jaw = new THREE.Group(); head.add(jaw); jaw.position.set(0, -0.06, 0.06);
  const headTop = new THREE.Group(); B.head.add(headTop); headTop.position.set(0, 0.22, 0.01);
  const torso = B.chest;
  const hands = [new THREE.Group(), new THREE.Group()]; B.handL.add(hands[0]); B.handR.add(hands[1]); hands[0].position.set(0, -0.08, 0.01); hands[1].position.set(0, -0.08, 0.01);
  const arms = [{ sh: B.uarmR, el: B.farmR, wr: B.handR, hand: B.handR, s: -1 }, { sh: B.uarmL, el: B.farmL, wr: B.handL, hand: B.handL, s: 1 }];
  const legs = [{ hip: B.thighR, kn: B.shinR, an: B.footR, s: -1 }, { hip: B.thighL, kn: B.shinL, an: B.footL, s: 1 }];
  const ctrl = new THREE.Group(); ctrl.name = 'apple-orbit'; root.add(ctrl); const ghost = ctrl;
  const apple = makeApple(); ctrl.add(apple); const extras = [];
  const shim = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: runeRingTex(), color: new THREE.Color(0x9fe8ff).multiplyScalar(1.4), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  shim.rotation.x = -Math.PI / 2; shim.position.y = 0.02; shim.castShadow = false; root.add(shim);
  const ND = 36; const dp = new Float32Array(ND * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xe8dcc0, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false })); dust.frustumCulled = false; root.add(dust);
  const dseed = Array.from({ length: ND }, () => [Math.random() * TAU, Math.random(), 0.6 + Math.random() * 0.8]);
  // props (live in the floating body's frame)
  const PM = propMats(); const kit = gadgets(PM); kit.g.position.set(0, 1.18, 0.34); body.add(kit.g);
  const nb = notebook(PM); nb.g.position.set(0.02, 1.12, 0.36); nb.g.rotation.set(-0.85, 0, 0); body.add(nb.g); hands[1].add(nb.quill); nb.quill.position.set(0, -0.02, 0.03); nb.quill.rotation.set(0.6, 0, 0.3);
  const NI = 14; const ip = new Float32Array(NI * 3); const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.BufferAttribute(ip, 3));
  const ink = new THREE.Points(ig, new THREE.PointsMaterial({ color: 0x3a3060, size: 0.018, transparent: true, opacity: 0.9, depthWrite: false })); ink.frustumCulled = false; body.add(ink);
  const bang = bangMark(); bang.visible = false; root.add(bang);

  const sp = (v, w = 7, z = 0.5) => new Spring(v, w, z);
  const st = { t: Math.random() * 5, mode: 'idle', modeT: 9, talk: 0, look: new THREE.Vector2(), expr: 'smug', shown: '', hold: 0, blink: 0, orbit: 0, orbitSpd: 1.3, dead: 0, count: 1, bitten: 0,
    lift: sp(FLOAT, 5, 0.45), kx: sp(0, 6, 0.5), kz: sp(0, 6, 0.5), spin: sp(0, 6, 0.6), tilt: sp(0, 7, 0.4), jolt: sp(0, 14, 0.35),
    idleMode: 'battle', idle: 'float', idleT: 0, nextIdle: 8, lock: null, w: Object.fromEntries([...IDLES, 'sleep'].map((k) => [k, k === 'float' ? 1 : 0])), appleVis: 1, twitch: 0, onDone: null, done: null, actOut: null, actOpts: {},
    ws: sp(0, 2.2, 0.9), wsT: 2, gx: sp(0, 6, 0.85), gy: sp(0, 6, 0.85), glanceT: 3, glance: 0, leanX: sp(0, 6, 0.7), leanZ: sp(0, 6, 0.7), hairX: sp(0, 9, 0.32), hairZ: sp(0, 9, 0.32), coatX: sp(0.12, 6, 0.3), coatZ: sp(0, 6, 0.3), jabX: sp(0, 11, 0.3), jabZ: sp(0, 11, 0.3),
    ikL: sp(0, 9, 1), ikR: sp(0, 9, 1), reachT: 9, tgR: new THREE.Vector3(), tgL: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3() };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), inv = new THREE.Matrix4();
  const localOf = (obj, out) => { obj.getWorldPosition(out); root.updateMatrixWorld(true); return out.applyMatrix4(inv.copy(root.matrixWorld).invert()); };
  const EXPR = new Set(Object.keys(EXPR_MAP));
  const ease = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
  // ------------------------------------------------ poses (joint offsets, scaled by their blend weight k)
  const POSE = {
    float(a, t) { a('thighL', -0.14 + Math.sin(t * 1.6) * 0.04); a('thighR', -0.06 + Math.sin(t * 1.6 + 1) * 0.04); a('shinL', 0.36); a('shinR', 0.18); a('footL', 0.55); a('footR', 0.45); a('chest', -0.04); a('head', -0.06, 0, 0.05); },
    chill(a, t) { a('uarmL', -2.65, 0, 0.55); a('uarmR', -2.65, 0, -0.55); a('farmL', -1.95); a('farmR', -1.95); a('head', 0.42, Math.sin(t * 0.4) * 0.15, 0.06); a('thighL', -0.35, 0, -0.14); a('thighR', -0.28, 0, 0.16); a('shinL', 0.12); a('shinR', 0.1); a('footL', 0.45); a('footR', 0.45); a('chest', -0.05); },
    think(a, t) { a('uarmR', -0.5, 0, -1.2); a('farmR', -2.1); a('handR', -0.4); a('head', 0.15, -0.15, -0.08); a('uarmL', -0.3, 0, 0.35); a('farmL', -1.4); a('thighL', -0.14); a('shinL', 0.36); a('footL', 0.55); a('footR', 0.45); a('shinR', 0.2); },
    ponder(a, t) { a('uarmR', -1.15, 0, -0.35); a('farmR', -2.0 + Math.sin(t * 5) * 0.08); a('handR', -0.3); a('uarmL', 0.35, 0, 0.1); a('farmL', -1.2); a('head', 0.12 + Math.sin(t * 0.7) * 0.08, Math.sin(t * 0.9) * 0.55, Math.sin(t * 0.6) * 0.08); a('thighL', -0.1 + Math.sin(t * 2) * 0.12); a('thighR', -0.1 - Math.sin(t * 2) * 0.12); a('shinL', 0.3); a('shinR', 0.3); a('footL', 0.5); a('footR', 0.5); },
    invent(a, t) { a('uarmL', -0.95 + Math.sin(t * 3) * 0.06, 0, 0.25); a('uarmR', -0.95 + Math.sin(t * 3.4 + 1) * 0.06, 0, -0.25); a('farmL', -0.95); a('farmR', -1.0); a('handL', 0.3); a('handR', 0.3); a('head', 0.32); a('thighL', -0.2); a('thighR', -0.1); a('shinL', 0.4); a('shinR', 0.3); a('footL', 0.5); a('footR', 0.5); },
    write(a, t) { a('uarmL', -0.75, 0, 0.3); a('farmL', -1.2); a('handL', 0.4); a('uarmR', -0.85 + Math.sin(t * 9) * 0.03, 0, -0.15); a('farmR', -1.05 + Math.sin(t * 13) * 0.05); a('handR', 0.5 + Math.sin(t * 11) * 0.1); a('head', 0.4, -0.05); a('chest', 0.06); a('thighL', -0.4); a('thighR', -0.35); a('shinL', 0.9); a('shinR', 0.8); a('footL', 0.4); a('footR', 0.4); },
    sleep(a, t) { a('uarmL', -2.7, 0, 0.6); a('uarmR', -2.7, 0, -0.6); a('farmL', -2.0); a('farmR', -2.0); a('chest', Math.sin(t * 1.1) * 0.04); a('head', 0.25 + Math.sin(t * 1.1) * 0.02, 0.35, 0.1); a('thighL', -0.7); a('shinL', 1.3); a('thighR', -0.08, 0, 0.12); a('shinR', 0.05); a('footR', 0.3); },
  };
  // body offsets per pose: [lift (m), rotX (recline), posZ, posX]
  const BODY = { float: [FLOAT, 0, 0, 0], chill: [0.95, -1.0, 0.25, 0], think: [FLOAT, 0, 0, 0], ponder: [FLOAT + 0.05, 0, 0, 0], invent: [FLOAT, 0, 0, 0], write: [FLOAT + 0.1, -0.15, 0, 0], sleep: [0.08, -1.42, 0.0, 0] };
  const bonkPose = (a, m) => { // ~2.5 s from lying asleep: jolt -> sit up rubbing head -> look up -> EUREKA finger up -> rise into the float
    const sit = ease((m - 0.12) / 0.5), rub = m > 0.25 && m < 1.0 ? 1 : 0, look = ease((m - 0.9) / 0.3) * (1 - ease((m - 2.0) / 0.4)), eur = ease((m - 1.35) / 0.25) * (1 - ease((m - 2.15) / 0.3));
    a('uarmR', -2.3 * rub - 2.6 * eur, 0, -0.5 * rub); a('farmR', (-1.7 + Math.sin(m * 22) * 0.25) * rub - 0.2 * eur); a('handR', 0.4 * rub - 0.5 * eur);
    a('uarmL', -0.4 * sit * (1 - eur) + 0.3 * eur, 0, 0.5 * sit); a('farmL', -0.6 * sit);
    a('head', 0.3 * rub - 0.55 * look - 0.25 * eur, 0, 0); a('chest', 0.25 * sit * (1 - look) - 0.15 * eur);
    const legs = 1 - ease((m - 1.9) / 0.5); a('thighL', -1.3 * sit * legs); a('thighR', -1.2 * sit * legs); a('shinL', 1.6 * sit * legs); a('shinR', 1.5 * sit * legs);
    return { lift: 0.08 + (FLOAT - 0.08) * ease((m - 1.95) / 0.5), rotX: -1.42 * (1 - sit) * (1 - ease((m - 1.9) / 0.4)) };
  };
  anim.extra = (add, t) => {
    const md = st.mode, m = st.modeT;
    for (const k in st.w) { const w = st.w[k]; if (w > 0.002) POSE[k]((j, x = 0, y = 0, z = 0) => add(j, x * w, y * w, z * w), t); }
    if (md === 'bonk') bonkPose(add, m);
    st.actOut = ACT[md] && m < ACT_DUR[md] ? ACT[md](add, m, st.actOpts) : null;
    // breathing (chest and shoulders), slow weight shifts, legs trailing them
    const br = Math.sin(t * 1.05), wsv = st.ws.value; add('chest', br * 0.022); add('uarmL', 0, 0, br * 0.018); add('uarmR', 0, 0, -br * 0.018); add('neck', -br * 0.01);
    add('hips', 0, wsv * 0.05, wsv * 0.05); add('spine', 0, -wsv * 0.03, -wsv * 0.04); add('thighL', wsv * 0.08); add('thighR', -wsv * 0.08); add('shinL', Math.max(0, wsv) * 0.12); add('shinR', Math.max(0, -wsv) * 0.12);
    if (st.twitch > 0) { add('handL', Math.sin(st.twitch * 40) * 0.3 * st.twitch); add('footR', Math.sin(st.twitch * 30) * 0.4 * st.twitch); }
    add('head', st.gy.value * -0.25, st.gx.value * 0.45, 0); add('neck', st.gy.value * -0.08, st.gx.value * 0.12, 0); // the head follows the eyes
  };
  // ------------------------------------------------ motion layer: joint springs, two-bone hand IK, secondary motion
  const js = {}; for (const j in JOINTS) js[j] = { x: new THREE.Vector3(), v: new THREE.Vector3(), init: false };
  const filterPose = (dt, boost) => { const n = Math.ceil(dt * 30 * boost / 0.4); const h = dt / n; for (const j in JOINTS) { const b = B[j]; if (!b) continue; const S = js[j], tg = b.rotation; if (!S.init) { S.x.set(tg.x, tg.y, tg.z); S.init = true; } const w = JOINTS[j] * boost;
    for (let i = 0; i < n; i++) for (const ax of ['x', 'y', 'z']) { S.v[ax] += (w * w * (tg[ax] - S.x[ax]) - 2 * w * S.v[ax]) * h; S.x[ax] += S.v[ax] * h; } b.rotation.set(S.x.x, S.x.y, S.x.z); } };
  const V3X = new THREE.Vector3(1, 0, 0), IM = new THREE.Matrix4(), IQ = new THREE.Quaternion(), IQ2 = new THREE.Quaternion();
  const armLen = (sd) => { const u = L.restOf('uarm' + sd), f = L.restOf('farm' + sd), h = L.restOf('hand' + sd); return [u.distanceTo(f), f.distanceTo(h) + 0.075]; }; const LEN = { L: armLen('L'), R: armLen('R') };
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function ik(sd, target, w) { // analytic two-bone IK in the chest frame: the palm reaches `target` (world), elbow tucked back and out
    if (w < 0.01) return; const ua = B['uarm' + sd], fa = B['farm' + sd]; const [L1, L2] = LEN[sd]; B.chest.updateMatrixWorld(true);
    const t = target.clone().applyMatrix4(IM.copy(B.chest.matrixWorld).invert()).sub(ua.position); const D = clampN(t.length(), Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.995); const dh = t.normalize();
    const pole = new THREE.Vector3(sd === 'L' ? 0.45 : -0.45, -0.35, -1).normalize(); const n = new THREE.Vector3().crossVectors(dh, pole); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
    const a1 = Math.acos(clampN((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)); let u = dh.clone().applyAxisAngle(n, a1); const u2 = dh.clone().applyAxisAngle(n, -a1); if (u2.dot(pole) > u.dot(pole)) u = u2;
    const hx = n.clone(), yc = u.clone().negate(), zc = new THREE.Vector3().crossVectors(hx, yc); if (zc.dot(pole) > 0) { hx.negate(); zc.negate(); }
    IM.makeBasis(hx, yc, zc); IQ.setFromRotationMatrix(IM); ua.quaternion.slerp(IQ, w);
    const f = dh.clone().multiplyScalar(D).sub(u.clone().multiplyScalar(L1)).normalize(); IQ2.setFromAxisAngle(V3X, Math.atan2(-f.dot(zc), f.dot(u))); fa.quaternion.slerp(IQ2, w);
  }
  const W = new THREE.Vector3(), W2 = new THREE.Vector3();
  function motion(dt, t) {
    const md = st.mode, m = st.modeT; const fast = (md === 'throw' && m > 0.28 && m < 0.7) || (md === 'dodge' && m < 0.3) || md === 'hurt' ? 1.7 : 1;
    filterPose(dt, fast); root.updateMatrixWorld(true);
    // IK targets: chin (think / ponder), mouth (eat), the casting palm under the apple, an idle touch of the orbiting apple
    let wl = 0, wr = 0; const tR = W.set(0, 0, 0), tL = W2.set(0, 0, 0);
    if (st.w.think > 0.05 || st.w.ponder > 0.05) { jaw.localToWorld(tR.set(0.01, -0.05 + Math.sin(t * 5) * 0.004 * st.w.ponder, 0.07)); wr = Math.max(st.w.think * 0.9, st.w.ponder * 0.55); }
    if (md === 'eat' && m < ACT_DUR.eat) { jaw.localToWorld(tR.set(0.02, -0.01, 0.13 - ss(0.45, 0.6, m) * 0.05 + ss(0.7, 0.95, m) * 0.05)); wr = ss(0.05, 0.4, m) * (1 - ss(1.5, 1.95, m)); }
    if (md === 'cast' && m < ACT_DUR.cast) { B.chest.localToWorld(tL.set(0.1, 0.14, 0.36)); wl = ss(0.05, 0.35, m) * (1 - ss(1.3, 1.7, m)) * 0.85; }
    st.reachT -= dt; if (md === 'idle' && st.idleMode === 'battle' && st.reachT < 0) { st.reachT = 9 + Math.random() * 6; st.reach = 1.4; }
    if (st.reach > 0) { st.reach -= dt; const k = Math.sin(Math.max(0, st.reach / 1.4) * Math.PI); if (md === 'idle') { apple.getWorldPosition(tR).add(new THREE.Vector3(0, -0.05, 0)); wr = Math.max(wr, k * 0.6); } }
    if (wr > 0.01) st.tgR.copy(tR); if (wl > 0.01) st.tgL.copy(tL); // keep the last target while the weight eases out
    st.ikR.target = wr; st.ikL.target = wl; st.ikR.update(dt); st.ikL.update(dt); if (st.ikR.value > 0.01) ik('R', st.tgR, clampN(st.ikR.value, 0, 1)); if (st.ikL.value > 0.01) ik('L', st.tgL, clampN(st.ikL.value, 0, 1));
    // eyes lead, the head follows: glances at the apple now and then, saccades from the face rig
    st.glanceT -= dt; if (st.glanceT < 0) { st.glance = st.glance ? 0 : 1; st.glanceT = st.glance ? 0.5 + Math.random() * 0.6 : 2.5 + Math.random() * 4; }
    let lx = st.look.x, ly = st.look.y; if (st.glance && md === 'idle' && st.w.sleep < 0.5) { const ap = localOf(apple, W.set(0, 0, 0)); const hd = localOf(head, new THREE.Vector3()); lx = clampN((ap.x - hd.x) * 1.4, -1, 1); ly = clampN(-(ap.y - hd.y) * 1.6, -0.6, 0.8); }
    if (md === 'cast' || md === 'eat') { lx *= 0.3; ly = md === 'eat' ? 0.4 : 0.25; } st.gx.target = lx; st.gy.target = ly; st.gx.update(dt); st.gy.update(dt);
    L.gg.look[0] = clampN(lx * 2.2, -2.2, 2.2); L.gg.look[1] = clampN(ly * 1.6, -1, 2);
    // weight shifts every few seconds
    st.wsT -= dt; if (st.wsT < 0) { st.wsT = 2.5 + Math.random() * 3.5; st.ws.target = (Math.random() * 2 - 1) * (st.w.sleep > 0.5 ? 0.2 : 1); } st.ws.update(dt);
    // secondary: hair, coat tails and jabot lag behind the head and the body, flutter in the wind
    const v = st.vel, hv = js.head.v, cv = js.chest.v, wind = Math.sin(t * 2.3) * 0.5 + Math.sin(t * 3.7 + 1) * 0.3;
    st.hairX.target = clampN(-hv.x * 0.07 - cv.x * 0.04 + v.y * 0.12 + v.z * 0.1 + wind * 0.03, -0.35, 0.35); st.hairZ.target = clampN(-hv.z * 0.07 - hv.y * 0.03 + v.x * 0.14 + wind * 0.02, -0.3, 0.3);
    st.coatX.target = 0.12 + Math.sin(t * 1.3) * 0.05 + clampN(v.y * 0.25 + v.z * 0.35 + Math.abs(v.x) * 0.15, -0.2, 0.7) + (md === 'cast' && m < 1.5 ? 0.3 : 0) - (st.dead ? 0.1 : 0); st.coatZ.target = Math.sin(t * 0.9) * 0.04 + clampN(v.x * 0.35, -0.4, 0.4);
    st.jabX.target = clampN(-v.z * 0.4 + v.y * 0.3 - cv.x * 0.08 + wind * 0.05, -0.6, 0.5); st.jabZ.target = clampN(v.x * 0.4 - cv.z * 0.05, -0.4, 0.4);
    for (const k of ['hairX', 'hairZ', 'coatX', 'coatZ', 'jabX', 'jabZ']) st[k].update(dt);
    if (B.hair) B.hair.rotation.set(st.hairX.value, 0, st.hairZ.value); if (B.coat) B.coat.rotation.set(st.coatX.value, 0, st.coatZ.value); jabot.rotation.set(st.jabX.value, 0, st.jabZ.value);
  }
  // ------------------------------------------------ artifact slots: objects worn or used by Newton (sizes in metres at hero scale)
  const SLOT = { head: ['head', [0, 0.2, 0]], neck: ['neck', [0, 0.02, 0.06]], back: ['chest', [0, 0.06, -0.16]], belt: ['hips', [0.13, 0.0, 0.08]], leftHand: ['handL', [0, -0.08, 0.02]], rightHand: ['handR', [0, -0.08, 0.02]], feet: [['footL', 'footR'], [0, -0.03, 0.04]], coat: ['chest', [0, 0.06, 0.13]], orbit: [null, [0, 0, 0]] };
  const anchors = new Map(); const orbitAnchor = new THREE.Group(); orbitAnchor.name = 'orbitSlot'; root.add(orbitAnchor); const orbitList = [];
  const anchor = (bone, off) => { const k = bone + ':' + off.join(); if (anchors.has(k)) return anchors.get(k); const a = new THREE.Group(); a.scale.setScalar(1 / sc); a.position.set(off[0] / sc, off[1] / sc, off[2] / sc); B[bone].add(a); anchors.set(k, a); return a; };
  const pickIdle = () => { const pool = ['chill', 'ponder', 'invent', 'write', 'think'].filter((k) => k !== st.idle); st.idle = pool[Math.floor(Math.random() * pool.length)]; st.idleT = 0; st.nextIdle = 6 + Math.random() * 4; };

  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost, impactTime: IMPACT,
    get mode() { return st.mode; }, get modeT() { return st.modeT; },
    handWorld(i = 1, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    headTopWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return headTop.getWorldPosition(out); },
    appleWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return apple.getWorldPosition(out); },
    /** world position of a rig bone (hips, spine, chest, neck, head, uarmL/R, farmL/R, handL/R, thighL/R, shinL/R, footL/R, hair, coat) */
    boneWorld(name, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return (B[name] || root).getWorldPosition(out); },
    /** wear / hold an object: slot = head | neck | back | belt | leftHand | rightHand | feet (both; a clone goes on the right foot) | orbit | coat. Units are metres at hero scale. */
    attach(slot, obj) { const S = SLOT[slot]; if (!S || !obj) return obj; if (slot === 'orbit') { orbitAnchor.add(obj); orbitList.push(obj); return obj; }
      if (slot === 'feet') { anchor('footL', [S[1][0], S[1][1], S[1][2]]).add(obj); const c = obj.clone(); c.userData.slotTwin = true; obj.userData.slotTwinOf = c; anchor('footR', S[1]).add(c); return obj; }
      anchor(S[0], S[1]).add(obj); return obj; },
    detach(slot, obj) { if (!obj) return; if (slot === 'orbit') { const i = orbitList.indexOf(obj); if (i >= 0) orbitList.splice(i, 1); } obj.userData.slotTwinOf?.removeFromParent(); obj.removeFromParent(); },
    setExpr(e) { st.expr = EXPR.has(e) ? e : 'smug'; st.hold = 0; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); L.talk(sec); },
    lookAt(x, y) { st.look.set(x, y); },
    /** 'battle' (float, think on demand) | 'menu' (cycles chill/ponder/invent/write/think) | 'still' (float only) | or a pose name to hold */
    setIdleMode(mode) { if (IDLES.includes(mode)) { st.idleMode = 'lock'; st.lock = mode; st.idle = mode; } else { st.idleMode = mode; st.lock = null; st.idle = 'float'; if (mode === 'menu') { st.nextIdle = 2 + Math.random() * 2; st.idleT = 0; } } },
    /** throw (opts.count splits the apple) | attack | cast | think | eat | hurt | cheer | die | sleep (looped) | bonk (returns a Promise; opts.onDone) */
    act(mode, opts = {}) {
      if (mode === 'attack') mode = 'throw';
      if (mode === 'sleep') { st.mode = 'sleep'; st.modeT = 0; st.dead = 0; L.setExpression('sleepy'); st.shown = 'sleep'; if (opts.instant !== false) { for (const k in st.w) st.w[k] = k === 'sleep' ? 1 : 0; st.lift.value = st.lift.target = BODY.sleep[0]; st.appleVis = 0; } return undefined; }
      st.mode = mode; st.modeT = 0; st.actOpts = opts;
      if (mode === 'dodge') { st.actOpts = { dir: opts.dir ?? (Math.random() < 0.5 ? -1 : 1) }; st.expr = 'shock'; st.hold = 0.7; return 0.16; }
      if (mode === 'bonk') { st.jolt.kick(14); st.onDone = opts.onDone || null; L.setExpression('surprised'); st.shown = 'bonk'; return new Promise((res) => { st.done = res; }); }
      if (mode === 'throw') { st.count = Math.max(1, opts.count | 0 || 1); st.expr = 'smug'; st.hold = 1; return IMPACT; }
      if (mode === 'cast') { L.setExpression('surprised', 0.4); st.hold = 0; }
      if (mode === 'think') { st.expr = 'think'; st.hold = 2.2; }
      if (mode === 'eat') { st.expr = 'delight'; st.hold = 2.4; }
      if (mode === 'hurt') { anim.play('hit'); st.kz.kick(-6); st.kx.kick(3); st.spin.kick(-4); st.lift.kick(-2); st.expr = 'hurt'; st.hold = 1.0; }
      if (mode === 'cheer') { anim.play('cheer'); st.spin.target += TAU; st.lift.kick(4); st.expr = 'delight'; st.hold = 1.5; }
      if (mode === 'die') { anim.play('death', { hold: true }); st.dead = 1; }
      return undefined;
    },
    update(dt) {
      dt = Math.min(dt, 0.05); st.t += dt; st.modeT += dt; const t = st.t, md = st.mode, m = st.modeT;
      const dur = { think: 2.3, bonk: 2.5, ...ACT_DUR }[md] ?? 1.6;
      if (md !== 'idle' && md !== 'die' && md !== 'sleep' && m > dur) { st.mode = 'idle'; if (md === 'bonk') { st.shown = ''; st.onDone?.(); st.done?.(); st.onDone = st.done = null; } }
      // which pose is wanted, blended smoothly
      st.idleT += dt; if (st.idleMode === 'menu' && st.mode === 'idle' && st.idleT > st.nextIdle) pickIdle();
      const busy = ['throw', 'cast', 'eat', 'hurt', 'cheer', 'bonk', 'die', 'dodge'].includes(st.mode);
      const want = st.mode === 'sleep' ? 'sleep' : st.mode === 'think' ? 'think' : busy ? 'float' : st.idleMode === 'menu' || st.idleMode === 'lock' ? st.idle : 'float';
      for (const k in st.w) st.w[k] += ((k === want && st.mode !== 'bonk' ? 1 : 0) - st.w[k]) * Math.min(1, dt * (st.mode === 'bonk' ? 6 : 2.2));
      // body: blended levitation height, recline and drift; knockback springs; dying drops him
      let lift = 0, rotX = 0, pz = 0, px = 0, ws = 0; for (const k in st.w) { const w = st.w[k]; ws += w; lift += BODY[k][0] * w; rotX += BODY[k][1] * w; pz += BODY[k][2] * w; px += BODY[k][3] * w; } if (ws > 1e-3) { lift /= ws; rotX /= ws; pz /= ws; px /= ws; } else lift = FLOAT; // normalised blend: never snaps
      if (st.mode === 'bonk') { const b = bonkPose(() => {}, m); lift = b.lift; rotX = b.rotX; }
      px += st.w.ponder * Math.sin(t * 0.45) * 0.45; const bob = (1 - st.w.sleep) * (st.mode === 'bonk' ? 0 : 1) * Math.sin(t * 1.6) * 0.05;
      st.lift.target = st.dead ? -0.02 : lift + bob; for (const k of ['lift', 'kx', 'kz', 'spin', 'tilt', 'jolt']) st[k].update(dt);
      st.tilt.target = md === 'hurt' && m < 0.6 ? -0.35 : 0;
      const ao = st.actOut || {}; body.position.set(st.kx.value * 0.1 + px + (ao.side || 0) + st.ws.value * 0.02, st.lift.value + st.jolt.value * 0.02 + (ao.lift || 0), st.kz.value * 0.1 + pz);
      if (dt > 0) { st.vel.subVectors(body.position, st.prev).multiplyScalar(1 / dt); st.vel.clampLength(0, 6); } st.prev.copy(body.position);
      st.leanX.target = clampN(st.vel.z * 0.22 + (ao.lean || 0), -0.4, 0.4); st.leanZ.target = clampN(-st.vel.x * 0.28 + (ao.roll || 0), -0.45, 0.45); st.leanX.update(dt); st.leanZ.update(dt); // tilt into motion
      body.rotation.set(st.tilt.value + rotX + st.leanX.value, st.spin.value + st.w.ponder * Math.cos(t * 0.45) * 0.6, Math.sin(t * 0.9) * 0.03 * (1 - st.w.sleep) + st.leanZ.value);
      if (st.spin.value > TAU * 0.98 && st.spin.target >= TAU) { st.spin.value -= TAU; st.spin.target -= TAU; }
      if (st.mode === 'sleep') { st.twitch = Math.max(0, st.twitch - dt * 2); if (Math.random() < dt * 0.12) { st.twitch = 1; if (Math.random() < 0.5) L.talk(0.5); } }
      anim.update(dt); motion(dt, t);
      orbitList.forEach((o, i) => { const a2 = st.orbit + Math.PI + (i / Math.max(1, orbitList.length)) * TAU; o.position.set(Math.cos(a2) * 0.7 + px, st.lift.value + 1.15 + Math.sin(a2 * 2) * 0.08, Math.sin(a2) * 0.6 + pz); o.rotation.y = a2; });
      // face
      if (st.talk > 0) st.talk -= dt; if (st.hold > 0) st.hold -= dt; else if (st.expr !== 'smug' && st.expr !== 'annoyed') st.expr = 'smug';
      if (st.mode === 'bonk') { const ph = m < 0.9 ? 'surprised' : m < 1.35 ? 'surprised' : m < 2.2 ? 'happy' : 'smile'; if (st.shown !== 'bonk:' + ph) { st.shown = 'bonk:' + ph; L.setExpression(ph); } }
      else if (st.mode !== 'sleep' && st.shown !== st.expr) { st.shown = st.expr; L.setExpression(EXPR_MAP[st.expr] || 'smile'); }
      st.blink -= dt; if (st.blink < -3.3) st.blink = 0.12; L.gg.blink = st.blink > 0 || st.mode === 'sleep' || st.w.think > 0.6 || (st.mode === 'bonk' && m < 0.12) ? 1 : 0;
      // "!" take over his head
      bang.visible = st.mode === 'bonk' && m > 0.06 && m < 1.0; if (bang.visible) { localOf(headTop, bang.position); bang.position.y += 0.12; bang.scale.setScalar(Math.min(1, m * 8) * (1 + Math.max(0, 0.25 - m) * 2)); bang.rotation.z = Math.sin(m * 30) * 0.15 * Math.max(0, 0.6 - m); }
      // props: gadgets assemble and come apart while inventing; the notebook + quill while writing; ink motes
      const wi = st.w.invent, ww = st.w.write;
      kit.g.visible = wi > 0.03; if (kit.g.visible) { const asm = 0.5 - 0.5 * Math.cos(t * 1.2); kit.g.scale.setScalar(wi); kit.parts.forEach((q, i) => { const a = t * (0.7 + i * 0.15) + i * 1.3, r = 0.16 * asm + 0.03; const tx = [-0.03, 0.035, 0, 0, 0][i], ty = [0, 0.02, 0.07, -0.05, 0.03][i]; q.position.set(tx * (1 - asm) + Math.cos(a) * r, ty * (1 - asm) + Math.sin(a * 1.3) * r * 0.5, Math.sin(a) * r * 0.6); q.rotation.set(t * (i % 2 ? 1.2 : -0.9), t * 0.7 + i, i === 0 ? t * 2 : i === 1 ? -t * 3 : 0); }); kit.parts[3].children[0].parent.rotation.z = Math.sin(t * 3) * 0.6; }
      nb.g.visible = ww > 0.03; nb.quill.visible = ww > 0.3; if (nb.g.visible) { nb.g.scale.setScalar(ww); const fl = (t * 0.4) % 1; nb.flip.rotation.z = fl > 0.8 ? -ease((fl - 0.8) / 0.2) * Math.PI : 0; }
      ink.visible = ww > 0.5; if (ink.visible) for (let i = 0; i < NI; i++) { const ph = (t * 0.6 + i / NI) % 1; ip.set([0.02 + Math.sin(i * 7.1) * 0.06, 1.16 + ph * 0.18, 0.4 + Math.cos(i * 3.3) * 0.04], i * 3); } ig.attributes.position.needsUpdate = true;
      // the apple: orbit (lazy when chilling, slow when thinking), throw / cast / eat, hidden while he sleeps until he rises
      st.orbitSpd += ((st.w.think > 0.5 ? 0.25 : st.w.chill > 0.5 ? 0.5 : 1.3) - st.orbitSpd) * Math.min(1, dt * 3); st.orbit += dt * st.orbitSpd;
      const a = st.orbit; const orbitPos = tmp.set(Math.cos(a) * 0.62 + px, st.lift.value + 1.22 + Math.sin(a * 2) * 0.08, Math.sin(a) * 0.55 + pz);
      let pos = orbitPos.clone(); apple.rotation.y += dt * 2; apple.rotation.z = Math.sin(t * 1.3) * 0.2;
      if (md === 'throw' && m < 1.4) {
        const hand = localOf(hands[1], tmp2); const fwd = new THREE.Vector3(0.25, 1.35, 3.2);
        if (m < 0.36) pos.lerp(hand, ss(0, 0.2, m)); else if (m < IMPACT) pos.copy(hand).lerp(fwd, (m - 0.36) / (IMPACT - 0.36)); else if (m < 1.0) pos.copy(fwd).lerp(orbitPos, (m - IMPACT) / (1.0 - IMPACT)).add(new THREE.Vector3(0, Math.sin((m - IMPACT) / (1 - IMPACT) * Math.PI) * 0.6, 0));
        apple.rotation.x += dt * 18;
        while (extras.length < st.count - 1) { const e = makeApple(); ctrl.add(e); extras.push(e); }
        extras.forEach((e, i) => { e.visible = m > 0.3 && m < 1.0; const s2 = (i + 1) * (i % 2 ? -1 : 1) * 0.55; e.position.copy(pos).add(new THREE.Vector3(s2, Math.abs(s2) * 0.3, -Math.abs(s2) * 0.2).multiplyScalar(Math.sin(Math.min(1, Math.max(0, (m - 0.3) / 0.25)) * Math.PI / 2) * (m < IMPACT ? 1 : Math.max(0, 1 - (m - IMPACT) * 2)))); e.rotation.x += dt * 18; });
      } else extras.forEach((e) => (e.visible = false));
      if (md === 'cast' && m < ACT_DUR.cast) { const palm = localOf(hands[0], tmp2); pos.lerp(palm.add(new THREE.Vector3(0.0, 0.14 + Math.sin(m * 6) * 0.015, 0.03)), ss(0.05, 0.4, m) * (1 - ss(1.3, 1.7, m))); apple.rotation.y += dt * (6 + 10 * ss(0.4, 1.1, m)); }
      if (md === 'eat' && m < ACT_DUR.eat) { const hd = localOf(hands[1], tmp2).add(new THREE.Vector3(0, 0.03, 0.03)); const k = ss(0.05, 0.4, m) * (1 - ss(1.5, 1.95, m)); pos.lerp(hd, k); if (m > 0.6 && !st.bitten) { st.bitten = 1; apple.userData.bite(true); L.talk(0.7); } }
      if (st.bitten && md !== 'eat') { st.bitten += dt; if (st.bitten > 2.5) { st.bitten = 0; apple.userData.bite(false); } }
      if (st.dead) pos.y = Math.max(0.08, pos.y - st.modeT * 1.2);
      st.appleVis += ((st.mode === 'sleep' || (st.mode === 'bonk' && m < 1.9) ? 0 : 1) - st.appleVis) * Math.min(1, dt * 4); apple.scale.setScalar(Math.max(0.001, st.appleVis)); apple.visible = st.appleVis > 0.02;
      ctrl.position.set(0, 0, 0); apple.position.copy(pos);
      // ground shimmer and dust (only while floating)
      const f = (st.dead ? Math.max(0, 1 - st.modeT) : 1) * (1 - st.w.sleep) * (st.mode === 'bonk' ? ease((m - 1.9) / 0.5) : 1); shim.rotation.z = t * 0.3; shim.material.opacity = (0.16 + Math.sin(t * 2.2) * 0.05) * f; shim.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04); shim.position.x = px; shim.position.z = pz;
      for (let i = 0; i < ND; i++) { const [a0, r0, s0] = dseed[i]; const ph = (t * 0.25 * s0 + r0) % 1; const r = 0.25 + ph * 0.5; dp.set([px + Math.cos(a0 + t * 0.2) * r, 0.03 + Math.sin(ph * Math.PI) * 0.12, pz + Math.sin(a0 + t * 0.2) * r], i * 3); }
      dg.attributes.position.needsUpdate = true; dust.material.opacity = 0.55 * f; dust.visible = f > 0.02;
    },
  };
  root.userData.api = api;
  api.update(0.016);
  return api;
}
