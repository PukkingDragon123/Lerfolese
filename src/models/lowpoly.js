// Stylized low-poly environment kit, "magical Greek dusk": faceted, flat-shaded forms painted per face from
// 5-tone hue-shifted ramps (violet/teal shadows -> warm gold lights) with per-face jitter. Builders write into a
// Mesher so a whole stage merges into a handful of draw calls; animated materials share one clock (sway, ripple,
// flicker, bob). No textures anywhere: colour lives in the vertices.
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';

const V3 = THREE.Vector3;
const C = (h) => new THREE.Color(h);
const ramp = (...h) => h.map(C);
const TAU = Math.PI * 2;
const _t = new V3(), _u = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3();

// ---------------------------------------------------------------- palettes (dark -> light, hue-shifted)
export const PAL = {
  bark: ramp('#21192a', '#3a2c36', '#5a4538', '#7c6247', '#a68a60'),
  barkGrey: ramp('#1c1b2c', '#32324a', '#4e4f60', '#717178', '#9c958c'),
  wood: ramp('#2a1726', '#4a2a2b', '#6f4432', '#96633d', '#c38d52'),
  olive: ramp('#172636', '#24423f', '#3c6248', '#678a56', '#a6b670'),
  cypress: ramp('#0d1724', '#12292d', '#1a4033', '#295b3c', '#4c7944'),
  leaf: ramp('#15233a', '#1c3c3f', '#2b5a42', '#548046', '#a0aa58'),
  grass: ramp('#1e2c37', '#2d4837', '#476836', '#778a3d', '#bdac57'),
  dryGrass: ramp('#33283a', '#54443e', '#7f6845', '#ab8d4d', '#dcbf6b'),
  dirt: ramp('#311f2f', '#51343f', '#76524a', '#9c7254', '#c99c69'),
  gravel: ramp('#302632', '#4f4046', '#74625a', '#9c866e', '#c6ac86'),
  stone: ramp('#25233c', '#3c3a52', '#57536a', '#7b7582', '#ab9f92'),
  marble: ramp('#4b4a6b', '#7d7a98', '#ada6b3', '#d5cbc2', '#f6ead3'),
  moss: ramp('#16283a', '#1f413c', '#335f3f', '#5a8243', '#98aa55'),
  hedge: ramp('#0b1a24', '#122f2e', '#1b4634', '#2a613b', '#4b7f42'),
  mud: ramp('#1c1726', '#2c2434', '#43363d', '#5d4b47', '#7f6650'),
  bronze: ramp('#24141d', '#52291d', '#894e25', '#c48735', '#f6ca64'),
  terra: ramp('#311722', '#612a27', '#93462d', '#c06b39', '#e9995b'),
  reed: ramp('#232e2b', '#394831', '#5a6936', '#888b42', '#c4ae5b'),
  water: ramp('#0d2636', '#133a48', '#1a5058', '#286a68', '#4c9488'),
  wax: ramp('#6a4a5a', '#a07a78', '#d2b096', '#efd6ae', '#fff3d6'),
  paper: ramp('#4e3a46', '#806a6a', '#b6a08a', '#dccaa6', '#f8ead0'),
  apple: ramp('#3a0e22', '#6c1428', '#a4202c', '#d8463a', '#f6904e'),
  iron: ramp('#16141f', '#2a2733', '#45404a', '#6a6266', '#958a84'),
};
export const FLOWER = { poppy: ['#9a1830', '#e0383c', '#ff7a4e'], daisy: ['#c8b8c8', '#f6eee4', '#ffd85a'], lavender: ['#4a2e7a', '#7a58c8', '#b496f0'], gold: ['#b0661e', '#f0b030', '#ffe27a'], asphodel: ['#b08aa8', '#f2dcea', '#ffe6f2'], rose: ['#7a1840', '#d04070', '#ff9ab0'] };

// key light used when baking face tones (front-left, low amber sun of the battle stage)
export const KEY = new V3(-0.6, 0.55, 0.45).normalize();

// ---------------------------------------------------------------- shared clock + materials
export const CLOCK = { value: 0 };
const tick = () => { CLOCK.value = performance.now() / 1000; };
function inject(m, key, body) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = CLOCK; sh.vertexShader = 'uniform float uTime;\nattribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + body); };
  m.customProgramCacheKey = () => key; m.userData.animated = true; return m;
}
const SWAY = `{ vec4 wq = modelMatrix * vec4(position, 1.0); float ph = wq.x * 0.37 + wq.z * 0.23;
  transformed.x += sin(uTime * 1.35 + ph) * 0.055 * sway; transformed.z += cos(uTime * 1.05 + ph * 1.7) * 0.035 * sway; }`;
const RIPPLE = `{ vec4 wq = modelMatrix * vec4(position, 1.0);
  transformed.y += (sin(wq.x * 1.3 + uTime * 1.1) + sin(wq.z * 1.9 - uTime * 0.8 + wq.x * 0.5)) * 0.03 * sway; }`;
const FLICKER = `{ float tq = floor(uTime * 12.0) / 12.0; vec4 wq = modelMatrix * vec4(position, 1.0); float ph = wq.x * 3.1 + wq.z * 2.3 + wq.y * 1.7;
  transformed.x += sin(tq * 9.0 + ph) * 0.045 * sway; transformed.z += cos(tq * 7.0 + ph * 1.3) * 0.035 * sway; transformed.y += sin(tq * 11.0 + ph * 0.7) * 0.07 * sway; }`;
const BOB = `{ float on = step(0.001, sway); transformed.y += sin(uTime * 1.6 + sway * 40.0) * 0.16 * on; transformed.x += cos(uTime * 0.9 + sway * 31.0) * 0.12 * on; }`;
const MATS = {};
export function mat(kind) {
  if (MATS[kind]) return MATS[kind];
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, ...o });
  const m = {
    lp: () => inject(std({}), 'lp-sway', SWAY),
    grass: () => inject(std({ roughness: 0.95, side: THREE.DoubleSide }), 'lp-grass', SWAY),
    metal: () => std({ roughness: 0.42, metalness: 0.6 }),
    water: () => inject(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94 }), 'lp-water', RIPPLE),
    glow: () => inject(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), 'lp-glow', BOB),
    flame: () => inject(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }), 'lp-flame', FLICKER),
    far: () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    farLit: () => std({ fog: false }),
  }[kind]();
  return (MATS[kind] = m);
}

// ---------------------------------------------------------------- mesher: non-indexed triangles + face colours
export class Mesher {
  constructor() { this.p = []; this.c = []; this.w = []; }
  get empty() { return this.p.length === 0; }
  get tris() { return this.p.length / 9; }
  tri(a, b, c, col, sa = 0, sb = sa, sc = sa) {
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); this.c.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b); this.w.push(sa, sb, sc);
  }
  triV(a, b, c, ca, cb, cc, sa = 0, sb = 0, sc = 0) { this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); this.w.push(sa, sb, sc); }
  quad(a, b, c, d, col, s = 0) { this.tri(a, b, c, col, s); this.tri(a, c, d, col, s); }
  // add a geometry transformed by m; paint(normal, centroid, faceIndex) -> Color; sway: number | (local, world) => number
  add(geo, m, paint, sway = 0) {
    const p = geo.attributes.position; const idx = geo.index; const n = idx ? idx.count : p.count; const flip = m ? m.determinant() < 0 : false; const sf = typeof sway === 'function';
    const L = [new V3(), new V3(), new V3()];
    for (let i = 0; i < n; i += 3) {
      for (let k = 0; k < 3; k++) L[k].fromBufferAttribute(p, idx ? idx.getX(i + k) : i + k);
      const a = L[0].clone(), b = (flip ? L[2] : L[1]).clone(), c = (flip ? L[1] : L[2]).clone();
      if (m) { a.applyMatrix4(m); b.applyMatrix4(m); c.applyMatrix4(m); }
      const nn = new V3().subVectors(b, a).cross(_t.subVectors(c, a)); const len = nn.length(); if (len < 1e-10) continue; nn.divideScalar(len);
      const cen = new V3().add(a).add(b).add(c).multiplyScalar(1 / 3);
      const col = paint(nn, cen, i / 3);
      if (sf) this.tri(a, b, c, col, sway(L[0], a), sway(flip ? L[2] : L[1], b), sway(flip ? L[1] : L[2], c)); else this.tri(a, b, c, col, sway);
    }
    return this;
  }
  build(material = 'lp', { cast = true, receive = true } = {}) {
    if (this.empty) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('sway', new THREE.Float32BufferAttribute(this.w, 1));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    const mm = typeof material === 'string' ? mat(material) : material; const mesh = new THREE.Mesh(g, mm); mesh.castShadow = cast; mesh.receiveShadow = receive;
    if (mm.userData.animated) mesh.onBeforeRender = tick;
    return mesh;
  }
}

// ---------------------------------------------------------------- painting
export function painter(pal, rnd, { base = 2, up = 1.1, sun = 0.8, jit = 0.7, ao = null, light = 0.08 } = {}) {
  const top = pal.length - 1;
  return (n, cen) => {
    let t = base + n.y * up + n.dot(KEY) * sun + (rnd() - 0.5) * jit; if (ao) t += ao(cen, n);
    const i = t < 0 ? 0 : t > top ? top : Math.round(t);
    return pal[i].clone().multiplyScalar(1 + (rnd() - 0.5) * light);
  };
}
// emissive faces: baked facet brightness so crystals and runes read as cut gems
export function glowPainter(hex, boost = 2, rnd = Math.random) {
  const c = C(hex);
  return (n) => c.clone().multiplyScalar(boost * (0.7 + 0.35 * Math.max(0, n.y) + 0.25 * Math.max(0, n.dot(KEY)) + (rnd() - 0.5) * 0.15));
}

// ---------------------------------------------------------------- geometry helpers
export const M4 = (x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), typeof s === 'number' ? _s.set(s, s, s) : _s.copy(s));
const hash = (x, y, z, s = 0) => { const h = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 997) * 78.233 + Math.round(z * 997) * 37.719 + s * 4.581) * 43758.5453; return h - Math.floor(h); };
export function toGeo(T) { const a = new Float32Array(T.length * 3); for (let i = 0; i < T.length; i++) { a[i * 3] = T[i].x; a[i * 3 + 1] = T[i].y; a[i * 3 + 2] = T[i].z; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }
function orient(T, a, b, c, dir) { const n = _u.subVectors(b, a).cross(_t.subVectors(c, a)); if (n.dot(dir) < 0) T.push(a, c, b); else T.push(a, b, c); }
function polyOut(T, pts, center) { for (let i = 1; i < pts.length - 1; i++) { const cen = new V3().add(pts[0]).add(pts[i]).add(pts[i + 1]).multiplyScalar(1 / 3); orient(T, pts[0], pts[i], pts[i + 1], cen.sub(center)); } }

export function jitter(geo, amt, seed = 0) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + (hash(x, y, z, seed) - 0.5) * amt, y + (hash(x, y, z, seed + 1) - 0.5) * amt, z + (hash(x, y, z, seed + 2) - 0.5) * amt); }
  return geo;
}
// chisel: random planes shave the form, leaving crisp flat facets (vertices beyond a plane are projected onto it)
export function chisel(geo, rnd, cuts = 6, depth = 0.25, { minY = -0.25 } = {}) {
  const p = geo.attributes.position; const v = new V3(); const n = new V3();
  for (let k = 0; k < cuts; k++) {
    n.set(rnd() * 2 - 1, minY + rnd() * (1 - minY), rnd() * 2 - 1).normalize();
    let max = -1e9; for (let i = 0; i < p.count; i++) max = Math.max(max, v.fromBufferAttribute(p, i).dot(n));
    const d = max * (1 - depth * (0.35 + 0.65 * rnd()));
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const e = v.dot(n) - d; if (e > 0) { v.addScaledVector(n, -e); p.setXYZ(i, v.x, v.y, v.z); } }
  }
  return geo;
}
// chamfered block centred at the origin (bevelled edges catch the light like cut stone)
export function block(w, h, d, { bevel = 0.05, jit = 0, seed = 1, taper = 0 } = {}) {
  const rnd = mulberry32(seed * 131 + 7); const W = w / 2, H = h / 2, D = d / 2; const b = Math.min(bevel, W * 0.45, H * 0.45, D * 0.45); const P = {};
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const t = sy > 0 ? 1 - taper : 1; const j = new V3((rnd() - 0.5) * jit, (rnd() - 0.5) * jit, (rnd() - 0.5) * jit);
    P[`${sx}${sy}${sz}`] = { x: new V3(sx * W * t, sy * (H - b), sz * (D - b) * t).add(j), y: new V3(sx * (W - b) * t, sy * H, sz * (D - b) * t).add(j), z: new V3(sx * (W - b) * t, sy * (H - b), sz * D * t).add(j) };
  }
  const g = (sx, sy, sz, a) => P[`${sx}${sy}${sz}`][a]; const T = []; const O = new V3();
  for (const s of [-1, 1]) {
    polyOut(T, [g(s, 1, 1, 'x'), g(s, 1, -1, 'x'), g(s, -1, -1, 'x'), g(s, -1, 1, 'x')], O);
    polyOut(T, [g(1, s, 1, 'y'), g(1, s, -1, 'y'), g(-1, s, -1, 'y'), g(-1, s, 1, 'y')], O);
    polyOut(T, [g(1, 1, s, 'z'), g(1, -1, s, 'z'), g(-1, -1, s, 'z'), g(-1, 1, s, 'z')], O);
  }
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    polyOut(T, [g(a, c, 1, 'x'), g(a, c, -1, 'x'), g(a, c, -1, 'y'), g(a, c, 1, 'y')], O);
    polyOut(T, [g(a, 1, c, 'x'), g(a, -1, c, 'x'), g(a, -1, c, 'z'), g(a, 1, c, 'z')], O);
    polyOut(T, [g(1, a, c, 'y'), g(-1, a, c, 'y'), g(-1, a, c, 'z'), g(1, a, c, 'z')], O);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) polyOut(T, [g(sx, sy, sz, 'x'), g(sx, sy, sz, 'y'), g(sx, sy, sz, 'z')], O);
  return toGeo(T);
}
// lathe from a bottom->top outline [[r, y, fluted?], ...]; fluted rings alternate radius so flutes read as stripes
export function lathe(profile, sides = 8, { flutes = 0, depth = 0.12, phase = 0, jit = 0, seed = 1, twist = 0 } = {}) {
  const rnd = mulberry32(seed * 71 + 5); const N = flutes ? flutes * 2 : sides; const T = [];
  const rings = profile.map(([r, y, fl], i) => { const ring = []; const ph = phase + twist * i; for (let k = 0; k < N; k++) { const a = ph + (k / N) * TAU; const rr = r * (fl && k % 2 ? 1 - depth : 1) * (1 + (jit ? (rnd() - 0.5) * jit : 0)); ring.push(new V3(Math.cos(a) * rr, y + (jit && r > 0 ? (rnd() - 0.5) * jit * 0.3 : 0), Math.sin(a) * rr)); } return ring; });
  for (let i = 0; i < rings.length - 1; i++) {
    const dr = profile[i + 1][0] - profile[i][0], dy = profile[i + 1][1] - profile[i][1]; const ph = phase + twist * (i + 0.5);
    for (let k = 0; k < N; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % N], c = rings[i + 1][(k + 1) % N], d = rings[i + 1][k]; const am = ph + ((k + 0.5) / N) * TAU; const dir = new V3(Math.cos(am) * dy, -dr, Math.sin(am) * dy);
      if (profile[i][0] > 1e-5) orient(T, a, b, c, dir); if (profile[i + 1][0] > 1e-5) orient(T, a, c, d, dir);
    }
  }
  const cap = (ring, y, dir) => { const cen = new V3(0, y, 0); for (let k = 0; k < N; k++) orient(T, cen, ring[k], ring[(k + 1) % N], dir); };
  if (profile[0][0] > 1e-5) cap(rings[0], profile[0][1], new V3(0, -1, 0));
  if (profile.at(-1)[0] > 1e-5) cap(rings.at(-1), profile.at(-1)[1], new V3(0, 1, 0));
  return toGeo(T);
}
// tapered prism along a path (branches, roots, horns, handles)
export function tube(path, rad, sides = 6, { twist = 0, jit = 0, seed = 1, cap = true, tipLen = 1.4 } = {}) {
  const rnd = mulberry32(seed * 37 + 11); const T = []; const n = path.length;
  const tan = path.map((p, i) => new V3().subVectors(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]).normalize());
  const nrm = Math.abs(tan[0].y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0); nrm.addScaledVector(tan[0], -nrm.dot(tan[0])).normalize();
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = tan[i]; nrm.addScaledVector(t, -nrm.dot(t)).normalize(); const bin = new V3().crossVectors(t, nrm); const ring = [];
    for (let k = 0; k < sides; k++) { const a = (k / sides) * TAU + twist * i; const r = rad[i] * (1 + (rnd() - 0.5) * jit); ring.push(path[i].clone().addScaledVector(nrm, Math.cos(a) * r).addScaledVector(bin, Math.sin(a) * r)); }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) { const mid = new V3().addVectors(path[i], path[i + 1]).multiplyScalar(0.5); for (let k = 0; k < sides; k++) { const a = rings[i][k], b = rings[i][(k + 1) % sides], c = rings[i + 1][(k + 1) % sides], d = rings[i + 1][k]; const cen = new V3().add(a).add(b).add(c).add(d).multiplyScalar(0.25); const dir = cen.sub(mid); orient(T, a, b, c, dir); orient(T, a, c, d, dir); } }
  if (cap) { const last = path[n - 1]; const tip = last.clone().addScaledVector(tan[n - 1], rad[n - 1] * tipLen); for (let k = 0; k < sides; k++) { const a = rings[n - 1][k], b = rings[n - 1][(k + 1) % sides]; const cen = new V3().add(a).add(b).add(tip).multiplyScalar(1 / 3); orient(T, a, b, tip, cen.sub(last)); } }
  return toGeo(T);
}
// faceted leaf cluster: jittered icosahedron with a flat chiselled underside
export function clump(r, seed, { sy = 0.72, detail = 0, jit = 0.28, flat = 0.6, cuts = 0 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail); jitter(g, jit, seed); if (cuts) chisel(g, mulberry32(seed + 5), cuts, 0.18, { minY: 0.1 }); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -flat) p.setY(i, -flat - (p.getY(i) + flat) * 0.25);
  g.scale(r, r * sy, r); return g;
}
export function rockGeo(seed, { sx = 1, sy = 0.7, sz = 0.9, cuts = 7, detail = 1, depth = 0.3, jit = 0.22, sink = 0.28 } = {}) {
  const rnd = mulberry32(seed * 31 + 5); const g = new THREE.IcosahedronGeometry(1, detail); jitter(g, jit, seed); g.scale(sx, sy, sz); chisel(g, rnd, cuts, depth);
  const p = g.attributes.position; const fl = -sy * sink; for (let i = 0; i < p.count; i++) if (p.getY(i) < fl) p.setY(i, fl);
  g.translate(0, -fl - sy * 0.06, 0); return g;
}
const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return new V3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); };
const xf = (v, m) => v.clone().applyMatrix4(m);

// ================================================================ NATURE
export function oliveTree(M, mtx, seed = 1, { size = 1, pal = PAL.olive, bark = PAL.bark } = {}) {
  const rnd = mulberry32(seed * 977 + 3); const barkP = painter(bark, rnd, { base: 1.7, up: 0.7, sun: 1.1, jit: 1.0 });
  const lean = new V3((rnd() - 0.5) * 0.7, 0, (rnd() - 0.5) * 0.5); const H = (1.25 + rnd() * 0.45) * size; const pts = [], rads = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push(new V3(lean.x * t * t + Math.sin(t * 5 + seed) * 0.13 * size, t * H, lean.z * t * t + Math.cos(t * 4 + seed) * 0.1 * size)); rads.push((0.3 - t * 0.11) * size * (i === 0 ? 1.5 : 1)); }
  M.add(tube(pts, rads, 6, { twist: 0.5, jit: 0.14, seed, cap: false }), mtx, barkP);
  for (let k = 0; k < 4; k++) { const a = k * 1.7 + rnd(); M.add(tube([new V3(0, 0.45 * size, 0), new V3(Math.cos(a) * 0.28 * size, 0.12 * size, Math.sin(a) * 0.28 * size), new V3(Math.cos(a) * 0.55 * size, -0.06, Math.sin(a) * 0.55 * size)], [0.15 * size, 0.1 * size, 0.04 * size], 4, { seed: seed + k * 3, cap: false }), mtx, barkP); }
  const top = pts.at(-1); const tips = []; const nL = 3 + (rnd() < 0.5 ? 1 : 0);
  for (let l = 0; l < nL; l++) {
    const a = (l / nL) * TAU + rnd() * 0.9; const out = (0.75 + rnd() * 0.5) * size; const up = (0.75 + rnd() * 0.5) * size;
    const p1 = top.clone().add(new V3(Math.cos(a) * out * 0.45, up * 0.55, Math.sin(a) * out * 0.45)); const p2 = top.clone().add(new V3(Math.cos(a) * out, up, Math.sin(a) * out));
    M.add(tube([top.clone().add(new V3(0, -0.15 * size, 0)), p1, p2], [0.16 * size, 0.1 * size, 0.055 * size], 5, { twist: 0.4, jit: 0.1, seed: seed + l }), mtx, barkP); tips.push(p2);
    const a2 = a + (rnd() - 0.5) * 1.8; const p3 = p1.clone().add(new V3(Math.cos(a2) * 0.5 * size, 0.55 * size, Math.sin(a2) * 0.5 * size));
    M.add(tube([p1, p3], [0.07 * size, 0.035 * size], 4, { seed: seed + l + 9 }), mtx, barkP); tips.push(p3, p1.clone().add(new V3(Math.cos(a) * 0.35 * size, -0.05 * size, Math.sin(a) * 0.35 * size)));
  }
  const crown = top.clone().add(new V3((rnd() - 0.5) * 0.3 * size, 1.05 * size, (rnd() - 0.5) * 0.3 * size));
  const lobes = [crown, ...tips.filter((_, i) => i % 2 === 0)]; const wy = lobes.map((t) => xf(t, mtx).y); const y0 = Math.min(...wy) - 0.9 * size, y1 = Math.max(...wy) + 0.9 * size;
  const leafP = painter(pal, rnd, { base: 1.9, up: 1.0, sun: 0.9, jit: 0.75, ao: (c) => ((c.y - y0) / (y1 - y0) - 0.5) * 1.3 });
  const L = new THREE.Matrix4(); const put = (p, r, sd, o) => { L.compose(p, _q.setFromEuler(_e.set((rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3)), _s.set(1, 1, 1)); M.add(clump(r, sd, o), mtx.clone().multiply(L), leafP, 1); };
  lobes.forEach((c, i) => put(c.clone().add(new V3(0, 0.15 * size, 0)), (i ? 0.95 + rnd() * 0.25 : 1.15 + rnd() * 0.2) * size, seed * 7 + i, { detail: 1, sy: 0.8, jit: 0.34, flat: 0.5, cuts: 3 }));
  tips.forEach((t, i) => { if (i % 2) put(t.clone().add(new V3(0, 0.1 * size, 0)), (0.55 + rnd() * 0.2) * size, seed * 11 + i, { sy: 0.75 }); });
  for (let k = 0; k < 5; k++) { const a = rnd() * TAU; const c = lobes[1 + (k % (lobes.length - 1))] || crown; put(c.clone().add(new V3(Math.cos(a) * 0.85 * size, (rnd() - 0.6) * 0.5 * size, Math.sin(a) * 0.85 * size)), (0.42 + rnd() * 0.2) * size, seed * 13 + k, { sy: 0.8 }); }
}

export function cypress(M, mtx, seed = 1, { h = 5, pal = PAL.cypress } = {}) {
  const rnd = mulberry32(seed * 613 + 9); const barkP = painter(PAL.bark, rnd, { base: 1.2, sun: 1 });
  M.add(tube([new V3(0, -0.1, 0), new V3(0.02, 0.8, 0)], [0.15, 0.11], 5, { seed, cap: false }), mtx, barkP);
  const P = painter(pal, rnd, { base: 1.6, up: 0.9, sun: 1.3, jit: 0.9, ao: (c, n) => 0 });
  const spindle = (hh, rr, ox, oz, sd) => {
    const n = 11; const prof = [[0, 0.45]];
    for (let i = 1; i < n; i++) { const t = i / n; const sh = t < 0.3 ? 0.62 + (t / 0.3) * 0.38 : Math.pow(1 - (t - 0.3) / 0.7, 0.85); prof.push([rr * sh * (i % 2 ? 1.08 : 0.84), 0.45 + t * (hh - 0.45)]); }
    prof.push([0, hh + 0.15]);
    const L = M4(ox, 0, oz, rnd() * TAU);
    M.add(lathe(prof, 7, { twist: 0.55, jit: 0.1, seed: sd }), mtx.clone().multiply(L), P, (v) => Math.max(0, v.y / hh) ** 2 * 0.7);
  };
  spindle(h, h * 0.13, 0, 0, seed); spindle(h * (0.62 + rnd() * 0.15), h * 0.1, 0.22, 0.12, seed + 1); if (rnd() < 0.6) spindle(h * 0.5, h * 0.085, -0.2, -0.05, seed + 2);
}

export function deadTree(M, mtx, seed = 1, { size = 1, moss = false } = {}) {
  const rnd = mulberry32(seed * 271 + 1); const P = painter(PAL.barkGrey, rnd, { base: 1.6, up: 0.8, sun: 1.1, jit: 1 }); const tips = [];
  const branch = (p0, dir, len, r, depth) => {
    const bend = new V3((rnd() - 0.5) * 0.6, 0.15, (rnd() - 0.5) * 0.6); const d1 = dir.clone().add(bend.multiplyScalar(0.5)).normalize();
    const p1 = p0.clone().addScaledVector(dir, len * 0.5); const p2 = p1.clone().addScaledVector(d1, len * 0.5);
    M.add(tube([p0, p1, p2], [r, r * 0.78, r * 0.55], depth ? 5 : 6, { twist: 0.4, jit: 0.15, seed: seed + depth * 13 + tips.length, cap: depth >= 2 }), mtx, P);
    if (depth >= 2) { tips.push(p2); return; }
    const kids = depth === 0 ? 3 : 2;
    for (let k = 0; k < kids; k++) { const a = (k / kids) * TAU + rnd() * 1.2; const nd = d1.clone().add(new V3(Math.cos(a) * 0.9, 0.35 + rnd() * 0.3, Math.sin(a) * 0.9)).normalize(); branch(k === 0 && depth === 0 ? p1 : p2, nd, len * (0.6 + rnd() * 0.15), r * 0.55, depth + 1); }
  };
  branch(new V3(0, -0.1, 0), new V3((rnd() - 0.5) * 0.2, 1, (rnd() - 0.5) * 0.2).normalize(), 2.4 * size, 0.24 * size, 0);
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd() * 0.6; M.add(tube([new V3(0, 0.4 * size, 0), new V3(Math.cos(a) * 0.3 * size, 0.1, Math.sin(a) * 0.3 * size), new V3(Math.cos(a) * 0.65 * size, -0.05, Math.sin(a) * 0.65 * size)], [0.14 * size, 0.09 * size, 0.03 * size], 4, { seed: seed + k, cap: false }), mtx, P); }
  if (moss) { const mc = PAL.moss; for (const t of tips) if (rnd() < 0.7) { const w = xf(t, mtx); const len = 0.4 + rnd() * 0.7; const a = rnd() * TAU; const dx = Math.cos(a) * 0.06, dz = Math.sin(a) * 0.06; M.tri(new V3(w.x - dx, w.y, w.z - dz), new V3(w.x + dx, w.y, w.z + dz), new V3(w.x + (rnd() - 0.5) * 0.1, w.y - len, w.z), mc[2 + Math.floor(rnd() * 2)], 0, 0, 1); } }
}

export function bush(M, mtx, seed = 1, { r = 0.6, pal = PAL.leaf, flowers = null, G = null } = {}) {
  const rnd = mulberry32(seed * 419 + 2); const n = 7 + Math.floor(rnd() * 3); const tops = []; const y0 = new V3().applyMatrix4(mtx).y;
  const P = painter(pal, rnd, { base: 1.3, up: 1.3, sun: 0.9, jit: 0.9, ao: (c) => ((c.y - y0) / (r * 1.3) - 0.5) * 1.4 });
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU * 1.7 + rnd() * 0.5; const d = i ? r * (0.35 + rnd() * 0.5) : 0; const cr = r * (i ? 0.42 + rnd() * 0.22 : 0.62); const p = new V3(Math.cos(a) * d, cr * 0.5 + (i ? rnd() * r * 0.45 : r * 0.3), Math.sin(a) * d); M.add(clump(cr, seed * 5 + i, { sy: 0.8, jit: 0.34 }), mtx.clone().multiply(M4(p.x, p.y, p.z, rnd() * TAU)), P, 0.5); tops.push(p.clone().setY(p.y + cr * 0.55)); }
  if (flowers && G) { const fr = mulberry32(seed + 77); for (const t of tops) for (let k = 0; k < 3; k++) { const q = xf(t.clone().add(new V3((fr() - 0.5) * r * 0.6, -fr() * 0.08, (fr() - 0.5) * r * 0.6)), mtx); petals(G, q, fr, flowers, 0.06); } }
}
// a few blade triangles, dark at the root, gold at the tip
export function grassTuft(G, x, y, z, rnd, { pal = PAL.grass, h = 0.38, n = 5, spread = 0.1, tone = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU; const lean = 0.12 + rnd() * 0.4; const hh = h * (0.55 + rnd() * 0.7); const bx = x + Math.cos(a) * spread * rnd(), bz = z + Math.sin(a) * spread * rnd();
    const dx = Math.cos(a), dz = Math.sin(a), w = 0.02 + rnd() * 0.016;
    const bl = new V3(bx - dz * w, y, bz + dx * w), br = new V3(bx + dz * w, y, bz - dx * w);
    const mx = bx + dx * lean * hh * 0.35, mz = bz + dz * lean * hh * 0.35, my = y + hh * 0.55;
    const ml = new V3(mx - dz * w * 0.6, my, mz + dx * w * 0.6), mr = new V3(mx + dz * w * 0.6, my, mz - dx * w * 0.6); const tip = new V3(bx + dx * lean * hh, y + hh, bz + dz * lean * hh);
    const t0 = Math.max(0, Math.min(4, Math.round(1.7 + tone + (rnd() - 0.5) * 1.2))), t1 = Math.max(0, Math.min(4, t0 + 1 + (rnd() < 0.5 ? 1 : 0)));
    G.tri(bl, br, mr, pal[t0], 0, 0, 0.45); G.tri(bl, mr, ml, pal[t0], 0, 0.45, 0.45); G.tri(ml, mr, tip, pal[t1], 0.45, 0.45, 1);
  }
}
// star of petal triangles around a centre
export function petals(G, c, rnd, kind = 'poppy', pr = 0.08) {
  const cols = (FLOWER[kind] || FLOWER.poppy).map(C); const n = kind === 'daisy' ? 7 : 5; const ph = rnd() * TAU; const tilt = 0.85;
  for (let k = 0; k < n; k++) { const a0 = ph + (k / n) * TAU; const a1 = a0 + (0.55 * TAU) / n; const am = (a0 + a1) / 2; G.tri(c, new V3(c.x + Math.cos(a0) * pr * 0.55, c.y + pr * tilt * 0.4, c.z + Math.sin(a0) * pr * 0.55), new V3(c.x + Math.cos(am) * pr, c.y + pr * tilt, c.z + Math.sin(am) * pr), cols[k % 2 ? 1 : 2], 0.8); G.tri(c, new V3(c.x + Math.cos(am) * pr, c.y + pr * tilt, c.z + Math.sin(am) * pr), new V3(c.x + Math.cos(a1) * pr * 0.55, c.y + pr * tilt * 0.4, c.z + Math.sin(a1) * pr * 0.55), cols[1], 0.8); }
  const cc = kind === 'daisy' ? C('#ffcf40') : cols[0]; G.tri(new V3(c.x - pr * 0.25, c.y + 0.012, c.z), new V3(c.x + pr * 0.25, c.y + 0.012, c.z + pr * 0.1), new V3(c.x, c.y + 0.02, c.z - pr * 0.25), cc, 0.8);
}
export function flower(G, x, y, z, rnd, kind = 'poppy') {
  const h = (kind === 'asphodel' || kind === 'lavender' ? 0.5 : 0.32) * (0.75 + rnd() * 0.5); const lean = (rnd() - 0.5) * 0.12; const st = PAL.grass[2]; const w = 0.012;
  const top = new V3(x + lean, y + h, z + lean * 0.5); G.tri(new V3(x - w, y, z), new V3(x + w, y, z), top, st, 0, 0, 0.8);
  if (kind === 'asphodel' || kind === 'lavender') { for (let i = 0; i < 4; i++) { const t = 0.55 + i * 0.13; const p = new V3(x + lean * t, y + h * t, z + lean * 0.5 * t); petals(G, p, rnd, kind, 0.045 - i * 0.006); } }
  else petals(G, top, rnd, kind, 0.1 + rnd() * 0.04);
  if (rnd() < 0.6) { const a = rnd() * TAU; const lp = new V3(x + Math.cos(a) * 0.09, y + h * 0.3, z + Math.sin(a) * 0.09); G.tri(new V3(x, y + h * 0.15, z), lp, new V3(x + Math.cos(a + 0.6) * 0.04, y + h * 0.35, z + Math.sin(a + 0.6) * 0.04), PAL.grass[3], 0, 0.5, 0.5); }
}

export function rock(M, mtx, seed = 1, { sx = 1, sy = 0.7, sz = 0.9, pal = PAL.stone, moss = null, strata = 0, cuts = 7, detail = 1, cap = null } = {}) {
  const rnd = mulberry32(seed * 53 + 17); const base = painter(pal, rnd, { base: 1.8, up: 1.1, sun: 1.1, jit: 0.8, ao: strata ? (c) => (Math.floor(c.y / strata) % 2 ? -0.7 : 0.25) : null });
  const mp = moss ? painter(moss, rnd, { base: 1.6, up: 1.2, sun: 0.7, jit: 0.8 }) : null; const cp = cap ? painter(cap, rnd, { base: 1.8, up: 1, sun: 0.8, jit: 0.8 }) : null;
  M.add(rockGeo(seed, { sx, sy, sz, cuts, detail }), mtx, (n, c, i) => (mp && n.y > 0.55 ? mp(n, c) : cp && n.y > 0.78 ? cp(n, c) : base(n, c, i)));
}
// tall stacked stone pillars with banded strata and grassy tops
export function cliff(M, mtx, seed = 1, { len = 10, h = 5, depth = 2.2, pal = PAL.stone, top = PAL.dryGrass } = {}) {
  const rnd = mulberry32(seed * 101 + 7); let x = -len / 2;
  while (x < len / 2) { const w = 1.2 + rnd() * 1.6; const hh = h * (0.55 + rnd() * 0.55); rock(M, mtx.clone().multiply(M4(x + w / 2, -0.3, (rnd() - 0.5) * depth * 0.6, (rnd() - 0.5) * 0.5)), seed * 10 + Math.floor(x * 7), { sx: w * 0.62, sy: hh, sz: depth * (0.5 + rnd() * 0.3), pal, cap: top, strata: 0.55 + rnd() * 0.2, cuts: 9, detail: 1 }); x += w * 0.78; }
}
export function reeds(G, x, y, z, rnd, { n = 7, h = 1.2, spread = 0.25 } = {}) {
  const pal = PAL.reed; const cat = C('#5a3424');
  for (let i = 0; i < n; i++) {
    const bx = x + (rnd() - 0.5) * spread * 2, bz = z + (rnd() - 0.5) * spread * 2; const hh = h * (0.6 + rnd() * 0.6); const a = rnd() * TAU; const lean = (rnd() - 0.3) * 0.25; const w = 0.025;
    const tip = new V3(bx + Math.cos(a) * lean * hh, y + hh, bz + Math.sin(a) * lean * hh); const mid = new V3(bx + Math.cos(a) * lean * hh * 0.3, y + hh * 0.5, bz + Math.sin(a) * lean * hh * 0.3);
    G.tri(new V3(bx - w, y, bz), new V3(bx + w, y, bz), mid, pal[1], 0, 0, 0.4); G.tri(new V3(bx - w * 0.6 + mid.x - bx, mid.y, mid.z), new V3(bx + w * 0.6 + mid.x - bx, mid.y, mid.z), tip, pal[2 + (i % 3 === 0 ? 1 : 0)], 0.4, 0.4, 1);
    if (rnd() < 0.45) { const c0 = mid.clone().lerp(tip, 0.6), c1 = mid.clone().lerp(tip, 0.85); const r = 0.035; for (let k = 0; k < 4; k++) { const a0 = (k / 4) * TAU, a1 = ((k + 1) / 4) * TAU; const p0 = new V3(Math.cos(a0) * r, 0, Math.sin(a0) * r), p1 = new V3(Math.cos(a1) * r, 0, Math.sin(a1) * r); G.tri(c0.clone().add(p0), c0.clone().add(p1), c1.clone().add(p1), cat.clone().multiplyScalar(k % 2 ? 0.7 : 1.1), 0.8, 0.8, 1); G.tri(c0.clone().add(p0), c1.clone().add(p1), c1.clone().add(p0), cat.clone().multiplyScalar(k % 2 ? 0.7 : 1.1), 0.8, 1, 1); } }
    else { const l2 = new V3(bx + Math.cos(a + 1.4) * 0.3, y + hh * 0.45, bz + Math.sin(a + 1.4) * 0.3); G.tri(new V3(bx - w, y + 0.05, bz), new V3(bx + w, y + 0.05, bz), l2, pal[3], 0, 0, 0.7); }
  }
}
export function lilyPad(M, x, y, z, rnd, G) {
  const r = 0.22 + rnd() * 0.18; const n = 7; const ph = rnd() * TAU; const c = new V3(x, y, z); const pal = PAL.moss;
  for (let k = 0; k < n; k++) { if (k === 0) continue; const a0 = ph + (k / n) * TAU, a1 = ph + ((k + 1) / n) * TAU; M.tri(c, new V3(x + Math.cos(a1) * r, y, z + Math.sin(a1) * r), new V3(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r), pal[2 + (k % 2)]); }
  if (G && rnd() < 0.35) petals(G, new V3(x, y + 0.03, z), rnd, 'rose', 0.08);
}

// ================================================================ RUINS
export function column(M, mtx, seed = 1, { h = 3.2, r = 0.3, broken = false, pal = PAL.marble, drums = 4 } = {}) {
  const rnd = mulberry32(seed * 7 + 2); const P = painter(pal, rnd, { base: 1.8, up: 1.0, sun: 1.2, jit: 0.6 });
  M.add(block(r * 3.3, 0.2, r * 3.3, { bevel: 0.03, jit: 0.03, seed }), mtx.clone().multiply(M4(0, 0.1, 0)), P);
  M.add(lathe([[0, 0.2], [r * 1.38, 0.2], [r * 1.38, 0.27], [r * 1.22, 0.33], [r * 1.12, 0.38], [0, 0.38]], 12, { phase: 0.13 }), mtx, P);
  const y0 = 0.38; const shaft = h - (broken ? 0 : 0.42); const nd = broken ? Math.max(1, Math.ceil(drums * (0.35 + rnd() * 0.45))) : drums; const dh = (shaft - y0) / drums;
  const rad = (y) => r * (1 - 0.13 * (y - y0) / (h - y0)) + r * 0.03 * Math.sin(Math.PI * (y - y0) / (h - y0));
  for (let i = 0; i < nd; i++) {
    const a = y0 + i * dh, b = a + dh; const ra = rad(a), rb = rad(b); const c = 0.025;
    const g = lathe([[0, a], [ra * 0.96, a], [ra, a + c, 1], [rb, b - c, 1], [rb * 0.96, b], [0, b]], 0, { flutes: 10, depth: 0.1, phase: rnd() * 0.05 });
    if (broken && i === nd - 1) { const p = g.attributes.position; for (let k = 0; k < p.count; k++) if (p.getY(k) > b - c - 0.001) { const x = p.getX(k), z = p.getZ(k); p.setY(k, b - c - hash(x, 0, z, seed) * dh * 0.75 - (x > 0 ? 0.12 : 0)); } }
    M.add(g, mtx.clone().multiply(M4((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.08)), P);
  }
  if (!broken) {
    const top = shaft; M.add(lathe([[0, top], [rad(top) * 0.98, top], [r * 1.0, top + 0.06], [r * 1.32, top + 0.2], [r * 1.42, top + 0.24], [0, top + 0.24]], 12, { phase: 0.1 }), mtx, P);
    M.add(block(r * 3.1, 0.18, r * 3.1, { bevel: 0.025, jit: 0.02, seed: seed + 3 }), mtx.clone().multiply(M4(0, top + 0.33, 0)), P);
  }
  return broken ? y0 + nd * dh : h;
}
export function fallenDrum(M, mtx, seed = 1, { r = 0.3, len = 0.75, pal = PAL.marble } = {}) {
  const rnd = mulberry32(seed * 3 + 1); const P = painter(pal, rnd, { base: 1.8, up: 1, sun: 1.2, jit: 0.6 }); const c = 0.025;
  M.add(lathe([[0, -len / 2], [r * 0.96, -len / 2], [r, -len / 2 + c, 1], [r, len / 2 - c, 1], [r * 0.96, len / 2], [0, len / 2]], 0, { flutes: 10, depth: 0.1 }), mtx.clone().multiply(M4(0, r * 0.92, 0, 0, 1, 0, Math.PI / 2)), P);
}
// architrave + triglyph frieze + cornice spanning a colonnade
export function entablature(M, mtx, seed = 1, { len = 6, pal = PAL.marble } = {}) {
  const rnd = mulberry32(seed * 19 + 4); const P = painter(pal, rnd, { base: 1.8, up: 1, sun: 1.2, jit: 0.6 }); const dark = painter(pal, rnd, { base: 0.9, up: 1, sun: 1, jit: 0.5 });
  M.add(block(len, 0.42, 0.95, { bevel: 0.03, jit: 0.02, seed }), mtx.clone().multiply(M4(0, 0.21, 0)), P);
  M.add(block(len - 0.05, 0.42, 0.85, { bevel: 0.02, seed: seed + 1 }), mtx.clone().multiply(M4(0, 0.63, 0)), dark);
  const n = Math.round(len / 0.55); for (let i = 0; i < n; i++) M.add(block(0.22, 0.4, 0.12, { bevel: 0.015, seed: seed + i }), mtx.clone().multiply(M4(-len / 2 + (i + 0.5) * (len / n), 0.63, 0.45)), P);
  M.add(block(len + 0.25, 0.16, 1.15, { bevel: 0.04, jit: 0.02, seed: seed + 2 }), mtx.clone().multiply(M4(0, 0.92, 0)), P);
}
// ashlar wall with a ragged, broken top and a few fallen blocks
export function wallChunk(M, mtx, seed = 1, { len = 3, h = 1.6, d = 0.6, pal = PAL.stone, course = 0.42 } = {}) {
  const rnd = mulberry32(seed * 23 + 3); const P = painter(pal, rnd, { base: 1.7, up: 1.1, sun: 1.1, jit: 0.9 }); const rows = Math.max(1, Math.round(h / course)); const ch = h / rows;
  let prev = null;
  for (let r = 0; r < rows; r++) {
    let x = -len / 2 - (r % 2 ? 0.25 : 0); const kept = [];
    while (x < len / 2 - 0.1) {
      const w = Math.min(0.55 + rnd() * 0.5, len / 2 - x); const xc = Math.max(x, -len / 2), ww = x + w - xc; const mid = xc + ww / 2;
      const keep = (r < rows * 0.45 || rnd() > (r / rows) * 0.7 * (Math.abs(x) / (len / 2) + 0.4)) && (!prev || prev.some(([a, b]) => mid > a - 0.05 && mid < b + 0.05));
      if (keep && ww > 0.15) kept.push([xc, xc + ww]);
      if (keep && ww > 0.15) M.add(block(ww - 0.03, ch - 0.03, d * (0.92 + rnd() * 0.12), { bevel: 0.04, jit: 0.035, seed: seed * 50 + r * 9 + Math.floor(x * 10) }), mtx.clone().multiply(M4(xc + ww / 2, r * ch + ch / 2, (rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.05)), P);
      x += w;
    }
    prev = kept;
  }
  for (let i = 0; i < 2; i++) M.add(block(0.5, ch * 0.9, d * 0.8, { bevel: 0.05, jit: 0.05, seed: seed + 90 + i }), mtx.clone().multiply(M4((rnd() - 0.5) * len, ch * 0.42, d * (0.9 + rnd() * 0.5), rnd() * 2, 1, 0, (rnd() - 0.5) * 0.3)), P);
}
export function plinth(M, mtx, seed = 1, { w = 0.95, h = 1.1, pal = PAL.marble } = {}) {
  const rnd = mulberry32(seed * 5 + 9); const P = painter(pal, rnd, { base: 1.8, up: 1.0, sun: 1.2, jit: 0.6 });
  M.add(block(w * 1.25, 0.2, w * 1.25, { bevel: 0.03, jit: 0.02, seed }), mtx.clone().multiply(M4(0, 0.1, 0)), P);
  M.add(block(w, h - 0.4, w, { bevel: 0.025, jit: 0.015, seed: seed + 1 }), mtx.clone().multiply(M4(0, 0.2 + (h - 0.4) / 2, 0)), P);
  M.add(block(w * 1.18, 0.2, w * 1.18, { bevel: 0.035, jit: 0.02, seed: seed + 2 }), mtx.clone().multiply(M4(0, h - 0.1, 0)), P);
  return h;
}
export function amphora(M, mtx, seed = 1, { s = 1, pal = PAL.terra } = {}) {
  const rnd = mulberry32(seed * 41 + 6); const P = painter(pal, rnd, { base: 1.8, up: 0.9, sun: 1.3, jit: 0.5 }); const band = C('#24141e'); const gold = C('#d79a4a');
  const prof = [[0, 0], [0.1, 0], [0.12, 0.05], [0.25, 0.25], [0.31, 0.48], [0.29, 0.62], [0.2, 0.82], [0.1, 0.94], [0.095, 1.06], [0.15, 1.12], [0.13, 1.15], [0, 1.15]].map(([r, y]) => [r * s, y * s]);
  M.add(lathe(prof, 9, { phase: rnd() }), mtx, (n, c, i) => { const y = (c.y - xf(new V3(), mtx).y) / s; return y > 0.5 && y < 0.64 ? band.clone() : y > 0.64 && y < 0.67 ? gold.clone() : P(n, c, i); });
  for (const sd of [-1, 1]) M.add(tube([new V3(sd * 0.1 * s, 1.0 * s, 0), new V3(sd * 0.27 * s, 1.0 * s, 0), new V3(sd * 0.26 * s, 0.72 * s, 0)], [0.03 * s, 0.03 * s, 0.03 * s], 4, { cap: false, seed: seed + sd }), mtx, P);
}

// clipped hedge: a run of chunky chiselled leaf blocks with lighter crowns
export function hedge(M, mtx, seed = 1, { len = 4, h = 1.2, d = 0.9, pal = PAL.hedge } = {}) {
  const rnd = mulberry32(seed * 17 + 5); const P = painter(pal, rnd, { base: 1.5, up: 1.4, sun: 1.0, jit: 1.0 }); let x = -len / 2;
  while (x < len / 2 - 0.05) { const w = Math.min(0.8 + rnd() * 0.5, len / 2 - x); const hh = h * (0.92 + rnd() * 0.12); const g = block(w + 0.08, hh, d * (0.95 + rnd() * 0.1), { bevel: 0.14, jit: 0.1, seed: seed * 31 + Math.floor(x * 10) }); jitter(g, 0.06, seed + Math.floor(x * 10)); M.add(g, mtx.clone().multiply(M4(x + w / 2, hh / 2, (rnd() - 0.5) * 0.06)), P, (v) => (v.y > 0 ? 0.25 : 0)); x += w; }
}
// full-height maze wall: ashlar courses, a cap course, optional hedge crown
export function mazeWall(M, mtx, seed = 1, { len = 4, h = 2.4, d = 0.7, pal = PAL.stone, crown = true } = {}) {
  const rnd = mulberry32(seed * 43 + 1); const P = painter(pal, rnd, { base: 1.7, up: 1.0, sun: 1.1, jit: 1.0 }); const rows = Math.max(2, Math.round((h - 0.2) / 0.45)); const ch = (h - 0.2) / rows;
  for (let r = 0; r < rows; r++) { let x = -len / 2; let first = true; while (x < len / 2 - 0.05) { const w = Math.min((first && r % 2 ? 0.35 : 0.6) + rnd() * 0.45, len / 2 - x); first = false; M.add(block(w - 0.035, ch - 0.035, d * (0.94 + rnd() * 0.08), { bevel: 0.035, jit: 0.03, seed: seed * 70 + r * 13 + Math.floor(x * 9) }), mtx.clone().multiply(M4(x + w / 2, r * ch + ch / 2, (rnd() - 0.5) * 0.03)), P); x += w; } }
  M.add(block(len + 0.08, 0.2, d + 0.14, { bevel: 0.05, jit: 0.02, seed: seed + 9 }), mtx.clone().multiply(M4(0, h - 0.1, 0)), P);
  if (crown) hedge(M, mtx.clone().multiply(M4(0, h - 0.05, 0)), seed + 3, { len: len * 0.96, h: 0.45, d: d * 0.85 });
}
export function stump(M, mtx, seed = 1, { r = 0.32, h = 0.45 } = {}) {
  const rnd = mulberry32(seed * 7 + 3); const P = painter(PAL.barkGrey, rnd, { base: 1.6, sun: 1.1, jit: 0.9 }); const cut = [C('#8a6a4a'), C('#b08a5a'), C('#6a4a3a')];
  M.add(lathe([[0, -0.05], [r * 1.35, -0.05], [r * 1.05, h * 0.25], [r, h * 0.85], [r * 0.95, h], [0, h + 0.03]], 7, { jit: 0.12, seed }), mtx, (n, c, i) => (n.y > 0.8 ? cut[i % 3].clone() : P(n, c, i)));
}
export function horns(M, mtx, seed = 1, { span = 1.2, pal = PAL.marble } = {}) {
  const rnd = mulberry32(seed); const P = painter(pal, rnd, { base: 2, up: 0.8, sun: 1.2, jit: 0.5 });
  for (const sd of [-1, 1]) { const pts = []; const rad = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new V3(sd * (0.12 + t * span * 0.5), Math.sin(t * Math.PI * 0.8) * span * 0.32 + t * t * span * 0.3, Math.sin(t * Math.PI) * 0.12)); rad.push(0.12 * (1 - t * 0.85)); } M.add(tube(pts, rad, 6, { seed: seed + sd, tipLen: 2 }), mtx, P); }
}

// ================================================================ ARCANE ACCENTS
export function glyph(G, mtx, seed, size = 0.24, col = '#3ff0dc', boost = 2.6) {
  const rnd = mulberry32(seed * 97 + 13); const c = C(col).multiplyScalar(boost); const pts = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) pts.push(new V3((x - 1) * size * 0.45, (y - 1) * size * 0.5, 0));
  const strokes = new Set(); const nS = 3 + Math.floor(rnd() * 3); const w = size * 0.07;
  strokes.add('1-7'); for (let i = 0; strokes.size < nS + 1 && i < 30; i++) { const a = Math.floor(rnd() * 9); const dx = Math.floor(rnd() * 3) - 1, dy = Math.floor(rnd() * 3) - 1; const ax = a % 3 + dx, ay = Math.floor(a / 3) + dy; if ((dx || dy) && ax >= 0 && ax < 3 && ay >= 0 && ay < 3) { const b = ay * 3 + ax; strokes.add(Math.min(a, b) + '-' + Math.max(a, b)); } }
  for (const s of strokes) { const [i, j] = s.split('-').map(Number); const A = pts[i], B = pts[j]; const d = new V3().subVectors(B, A).normalize(); const nx = -d.y * w, ny = d.x * w; const a0 = xf(new V3(A.x + nx - d.x * w, A.y + ny - d.y * w, 0), mtx), a1 = xf(new V3(A.x - nx - d.x * w, A.y - ny - d.y * w, 0), mtx), b0 = xf(new V3(B.x + nx + d.x * w, B.y + ny + d.y * w, 0), mtx), b1 = xf(new V3(B.x - nx + d.x * w, B.y - ny + d.y * w, 0), mtx); G.tri(a0, a1, b1, c); G.tri(a0, b1, b0, c); }
}
export function runeStone(M, G, mtx, seed = 1, { h = 1.8, pal = PAL.stone, col = '#3ff0dc' } = {}) {
  const rnd = mulberry32(seed * 13 + 8); const P = painter(pal, rnd, { base: 1.5, up: 1.1, sun: 1.2, jit: 0.8 }); const w = 0.55 + rnd() * 0.2, d = 0.38;
  const tp = 0.22; const g = block(w, h, d, { bevel: 0.07, jit: 0.04, seed, taper: tp }); chisel(g, rnd, 3, 0.08, { minY: 0.6 }); g.translate(0, h / 2 - 0.05, 0); M.add(g, mtx, P);
  const n = Math.max(2, Math.floor(h / 0.42)); const lean = Math.atan((d / 2) * tp / h);
  for (let i = 0; i < n; i++) { const y = h * 0.2 + i * 0.36; glyph(G, mtx.clone().multiply(M4(0, y, (d / 2) * (1 - (tp * (y + 0.05)) / h) + 0.03, 0, 1, -lean)), seed * 9 + i, 0.24, col); }
}
export function crystals(M, G, mtx, seed = 1, { n = 5, h = 0.9, col = '#33e6d6', boost = 1.7, base = true } = {}) {
  const rnd = mulberry32(seed * 29 + 3); const GP = glowPainter(col, boost, rnd);
  for (let i = 0; i < n; i++) { const hh = h * (i ? 0.4 + rnd() * 0.5 : 1); const r = hh * 0.17; const tilt = i ? 0.25 + rnd() * 0.5 : rnd() * 0.15; const a = rnd() * TAU; const L = M4(Math.cos(a) * (i ? 0.18 : 0), 0, Math.sin(a) * (i ? 0.18 : 0), a, 1, Math.sin(a) * tilt, Math.cos(a) * tilt); G.add(lathe([[0, -0.1], [r, -0.05], [r, hh * 0.72], [0, hh]], 6, { phase: rnd() }), mtx.clone().multiply(L), GP); }
  if (base) rock(M, mtx.clone().multiply(M4(0, -0.05, 0)), seed + 5, { sx: h * 0.42, sy: h * 0.2, sz: h * 0.38, detail: 0, cuts: 4 });
}
export function wisp(G, pos, phase, { r = 0.07, col = '#7ff6ec' } = {}) {
  const c = C(col); const pts = [new V3(0, r * 1.8, 0), new V3(r, 0, 0), new V3(0, 0, r), new V3(-r, 0, 0), new V3(0, 0, -r), new V3(0, -r * 1.4, 0)].map((p) => p.add(pos));
  const face = (a, b, cc, k) => G.tri(a, b, cc, c.clone().multiplyScalar(k), phase);
  for (let k = 0; k < 4; k++) { face(pts[0], pts[1 + k], pts[1 + ((k + 1) % 4)], k % 2 ? 3.2 : 4.2); face(pts[5], pts[1 + ((k + 1) % 4)], pts[1 + k], k % 2 ? 2.2 : 2.8); }
}
// glowing rune circle set into a ring of curved flagstones
export function runeCircle(M, G, mtx, seed = 1, { R = 4, width = 0.6, pal = PAL.stone, col = '#3ff0dc' } = {}) {
  const rnd = mulberry32(seed * 61 + 5); const P = painter(pal, rnd, { base: 2, up: 0.6, sun: 0.8, jit: 0.9 }); const N = 18; const th = 0.06; const ri = R - width / 2, ro = R + width / 2;
  for (let s = 0; s < N; s++) {
    const a0 = (s / N) * TAU + 0.012, a1 = ((s + 1) / N) * TAU - 0.012; const pts = (r, y) => [0, 0.5, 1].map((t) => { const a = a0 + (a1 - a0) * t; return xf(new V3(Math.cos(a) * r, y, Math.sin(a) * r), mtx); });
    const ot = pts(ro, th), it = pts(ri, th), ob = pts(ro + 0.02, -0.02), ib = pts(ri - 0.02, -0.02); const n = new V3(0, 1, 0);
    for (let k = 0; k < 2; k++) { M.quad(it[k], it[k + 1], ot[k + 1], ot[k], P(n, ot[k])); M.quad(ot[k], ot[k + 1], ob[k + 1], ob[k], P(new V3(0.3, 0.2, 0.9).normalize(), ot[k])); M.quad(ib[k], ib[k + 1], it[k + 1], it[k], P(new V3(0, 0.2, -1).normalize(), it[k])); }
    if (s % 2 === 0) { const am = (a0 + a1) / 2; glyph(G, mtx.clone().multiply(M4(Math.cos(am) * R, th + 0.008, Math.sin(am) * R, -am - Math.PI / 2)).multiply(M4(0, 0, 0, 0, 1, -Math.PI / 2)), seed * 31 + s, width * 0.7, col, 2.2); }
  }
  const gc = C(col).multiplyScalar(2.4);
  for (const rr of [ri - 0.18, ro + 0.18]) for (let s = 0; s < 72; s++) { if (s % 6 === 5) continue; const a0 = (s / 72) * TAU, a1 = ((s + 0.8) / 72) * TAU; const w = 0.035; const q = [[rr - w, a0], [rr + w, a0], [rr + w, a1], [rr - w, a1]].map(([r, a]) => xf(new V3(Math.cos(a) * r, 0.03, Math.sin(a) * r), mtx)); G.tri(q[0], q[2], q[1], gc); G.tri(q[0], q[3], q[2], gc); }
}

// ================================================================ FIRE
export function flames(F, mtx, seed = 1, { r = 0.25, h = 0.85, n = 9 } = {}) {
  const rnd = mulberry32(seed * 53 + 1);
  const layers = [{ col: '#ff4416', k: 1.6, s: 1.0, cnt: Math.ceil(n * 0.45) }, { col: '#ff8e22', k: 2.3, s: 0.74, cnt: Math.ceil(n * 0.35) }, { col: '#ffe08a', k: 3.4, s: 0.46, cnt: Math.max(2, Math.ceil(n * 0.22)) }];
  for (const Ly of layers) for (let i = 0; i < Ly.cnt; i++) {
    const a = rnd() * TAU, d = rnd() * r * 0.55 * Ly.s; const bx = Math.cos(a) * d, bz = Math.sin(a) * d; const hh = h * Ly.s * (0.6 + rnd() * 0.5) * (1 - (d / (r + 1e-3)) * 0.5); const w = r * Ly.s * (0.32 + rnd() * 0.18);
    const tip = xf(new V3(bx + (rnd() - 0.5) * 0.14 * h, hh, bz + (rnd() - 0.5) * 0.1 * h), mtx); const bot = xf(new V3(bx, -0.03, bz), mtx); const ph = rnd() * TAU; const ring = [];
    for (let k = 0; k < 4; k++) { const aa = ph + (k / 4) * TAU; ring.push(xf(new V3(bx + Math.cos(aa) * w, hh * 0.3, bz + Math.sin(aa) * w), mtx)); }
    const c = C(Ly.col);
    for (let k = 0; k < 4; k++) { const kk = (k + 1) % 4; F.tri(ring[k], ring[kk], tip, c.clone().multiplyScalar(Ly.k * (k % 2 ? 0.85 : 1.1)), 0.3, 0.3, 1); F.tri(ring[kk], ring[k], bot, c.clone().multiplyScalar(Ly.k * 0.8), 0.3, 0.3, 0); }
  }
}
function logs(M, mtx, seed, { n = 4, r = 0.34, h = 0.36, lr = 0.055 } = {}) {
  const rnd = mulberry32(seed * 3 + 7); const P = painter(PAL.wood, rnd, { base: 1.2, sun: 1.2, jit: 0.8 }); const cut = C('#d8a868'); const char = C('#1a1218');
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.4; const p0 = new V3(Math.cos(a) * r, 0.03, Math.sin(a) * r), p1 = new V3(Math.cos(a) * 0.04, h, Math.sin(a) * 0.04); M.add(tube([p0, p0.clone().lerp(p1, 0.5), p1], [lr, lr * 0.95, lr * 0.85], 6, { seed: seed + i, cap: false }), mtx, (nn, c, k) => (c.y - xf(new V3(), mtx).y > h * 0.55 ? char.clone() : P(nn, c, k))); const d = new V3().subVectors(p0, p1).normalize(); const ring = []; for (let k = 0; k < 6; k++) { const aa = (k / 6) * TAU; const u = new V3(-d.z, 0, d.x).normalize(); const v = new V3().crossVectors(d, u); ring.push(xf(p0.clone().addScaledVector(u, Math.cos(aa) * lr).addScaledVector(v, Math.sin(aa) * lr), mtx)); } const cc = xf(p0.clone().addScaledVector(d, 0.01), mtx); for (let k = 0; k < 6; k++) M.tri(cc, ring[k], ring[(k + 1) % 6], cut.clone().multiplyScalar(k % 2 ? 0.85 : 1)); }
}
function embers(G, mtx, seed, r = 0.3) { const rnd = mulberry32(seed + 404); const cols = ['#ff5a1a', '#ff8a2a', '#ffc04a'].map(C); for (let i = 0; i < 14; i++) { const a = rnd() * TAU, d = rnd() * r; const p = new V3(Math.cos(a) * d, 0.04, Math.sin(a) * d); const s = 0.04 + rnd() * 0.04; G.tri(xf(p.clone().add(new V3(-s, 0, s)), mtx), xf(p.clone().add(new V3(s, 0, s * 0.6)), mtx), xf(p.clone().add(new V3(0, s * 0.8, -s)), mtx), cols[i % 3].clone().multiplyScalar(1.6 + rnd())); } }
// stone ring fire pit (battle corners, map campfires)
export function firePit({ seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'firePit'; const M = new Mesher(), F = new Mesher(), G = new Mesher(); const rnd = mulberry32(seed);
  const n = 9; for (let k = 0; k < n; k++) { const a = (k / n) * TAU + rnd() * 0.15; rock(M, M4(Math.cos(a) * 0.5, -0.02, Math.sin(a) * 0.5, -a), seed * 20 + k, { sx: 0.17, sy: 0.16 + rnd() * 0.06, sz: 0.13, cuts: 5, detail: 0, pal: PAL.stone }); }
  const ash = PAL.mud; for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU, a1 = ((k + 1) / 10) * TAU; M.tri(new V3(0, 0.035, 0), new V3(Math.cos(a1) * 0.44, 0.012, Math.sin(a1) * 0.44), new V3(Math.cos(a0) * 0.44, 0.012, Math.sin(a0) * 0.44), ash[k % 2 ? 0 : 1]); }
  logs(M, new THREE.Matrix4(), seed); flames(F, M4(0, 0.06, 0), seed, { r: 0.24, h: 0.8, n: 10 }); embers(G, new THREE.Matrix4(), seed);
  g.add(M.build('lp'), F.build('flame', { cast: false, receive: false }), G.build('glow', { cast: false, receive: false })); return g;
}
// raised bronze brazier on a fluted stone pedestal
export function brazier(M, B, F, G, mtx, seed = 1, { h = 1.1 } = {}) {
  const rnd = mulberry32(seed * 11 + 1); column(M, mtx, seed, { h, r: 0.17, drums: 2 }); const top = h - 0.02;
  const P = painter(PAL.bronze, rnd, { base: 1.8, up: 0.7, sun: 1.4, jit: 0.5 });
  B.add(lathe([[0, top], [0.12, top], [0.38, top + 0.12], [0.52, top + 0.3], [0.5, top + 0.34], [0.38, top + 0.24], [0, top + 0.24]], 10, { phase: 0.3 }), mtx, P);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; B.add(block(0.06, 0.08, 0.06, { bevel: 0.01, seed: k }), mtx.clone().multiply(M4(Math.cos(a) * 0.5, top + 0.37, Math.sin(a) * 0.5, a)), P); }
  embers(G, mtx.clone().multiply(M4(0, top + 0.21, 0)), seed, 0.32); flames(F, mtx.clone().multiply(M4(0, top + 0.22, 0)), seed, { r: 0.3, h: 0.95, n: 11 });
  return top + 0.25;
}

// ================================================================ WATER / TERRAIN
export function waterSheet(W, { x0, x1, z0, z1, y = 0.05, step = 0.9, mask = null, seed = 1, sky = '#e7a07a', sunLine = null } = {}) {
  const rnd = mulberry32(seed * 7 + 99); const pal = PAL.water; const glint = C(sky); const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step); const V = [];
  for (let j = 0; j <= nz; j++) { const row = []; for (let i = 0; i <= nx; i++) { const x = x0 + i * step + (i && i < nx ? (hash(i, j, 3, seed) - 0.5) * step * 0.6 : 0), z = z0 + j * step + (j && j < nz ? (hash(i, j, 5, seed) - 0.5) * step * 0.6 : 0); row.push(new V3(x, y + (hash(i, j, 7, seed) - 0.5) * 0.03, z)); } V.push(row); }
  const face = (a, b, c) => { const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3; if (mask && !mask(cx, cz)) return; const band = Math.sin(cx * 0.21 + Math.sin(cz * 0.5) * 1.4) * 0.5 + Math.sin(cz * 0.9 + cx * 0.07) * 0.5; const t = Math.max(0, Math.min(4, Math.round(2.1 + band * 0.9 + (rnd() - 0.5) * 0.7))); const d = sunLine ? sunLine(cx, cz) : 99; const pg = 0.025 + 0.5 * Math.exp(-d * d / 3); const col = rnd() < pg ? glint.clone().multiplyScalar(0.75 + rnd() * 0.5 + (d < 1 ? 0.4 : 0)) : pal[t].clone().multiplyScalar(0.95 + rnd() * 0.1); W.tri(a, c, b, col, 1); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i]; if ((i + j) % 2) { face(a, b, c); face(a, c, d); } else { face(a, b, d); face(b, c, d); } }
}
// faceted heightfield; colorAt(n, centroid) -> Color
export function terrain(M, { x0, x1, z0, z1, step = 1, heightAt, colorAt, jit = 0.38, seed = 1 }) {
  const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step); const V = [];
  for (let j = 0; j <= nz; j++) { const row = []; for (let i = 0; i <= nx; i++) { let x = x0 + i * step, z = z0 + j * step; if (i && i < nx) x += (hash(i, j, 1, seed) - 0.5) * step * jit * 2; if (j && j < nz) z += (hash(i, j, 2, seed) - 0.5) * step * jit * 2; row.push(new V3(x, heightAt(x, z), z)); } V.push(row); }
  const face = (a, b, c) => { const n = new V3().subVectors(c, a).cross(_t.subVectors(b, a)).normalize(); const cen = new V3().add(a).add(b).add(c).multiplyScalar(1 / 3); M.tri(a, c, b, colorAt(n, cen)); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i]; if ((i + j) % 2) { face(a, b, c); face(a, c, d); } else { face(a, b, d); face(b, c, d); } }
}

// ================================================================ SKY
export const SKIES = {
  meadow: { zen: '#1f2556', hi: '#433f84', mid: '#a06890', low: '#e88c74', hor: '#f4b878', gnd: '#b07c66', sun: '#fff1c8', haze: ['#c98a86', '#a87494', '#7d5c8a'], mtn: ['#2c2448', '#4a3864', '#6e4c78', '#a8687c', '#e69a78'] },
  garden: { zen: '#24215a', hi: '#4c3c86', mid: '#b06a98', low: '#ec8e86', hor: '#f6bc8e', gnd: '#b48078', sun: '#fff0d4', haze: ['#d08e98', '#ae78a0', '#82609a'], mtn: ['#2e2450', '#4c386c', '#724c80', '#ac6886', '#ea9a86'] },
  gully: { zen: '#232450', hi: '#4a3e7c', mid: '#b0687a', low: '#ec8a5c', hor: '#f8b664', gnd: '#b8805a', sun: '#fff0b8', haze: ['#d08a72', '#ac7484', '#7c5a80'], mtn: ['#30243e', '#52364e', '#7a4c58', '#b46a5e', '#ec9c62'] },
  labyrinth: { zen: '#1a1640', hi: '#3a2c6a', mid: '#90506e', low: '#d8645a', hor: '#f09a62', gnd: '#9a6052', sun: '#ffe2b0', haze: ['#b8706e', '#94587a', '#6a4678'], mtn: ['#24183a', '#3e2652', '#623a62', '#9c5462', '#de8462'] },
  marsh: { zen: '#152a46', hi: '#2c4a6a', mid: '#6a7a8a', low: '#b89a86', hor: '#e4c08e', gnd: '#7a8478', sun: '#fff4d0', haze: ['#9a9a92', '#7a8496', '#5a6a8a'], mtn: ['#1c2a3c', '#2c4252', '#4a5e66', '#7e8478', '#c8b08a'] },
  guardian: { zen: '#140f34', hi: '#36225e', mid: '#8a3e6a', low: '#d65252', hor: '#f48a52', gnd: '#94504a', sun: '#ffd8a0', haze: ['#b4605e', '#8a4670', '#5e3670'], mtn: ['#1e1230', '#381e48', '#5c2c56', '#984456', '#dc7452'] },
};
export function skyDome(theme = 'meadow', sunDir = new V3(0.17, 0.07, -1)) {
  const S = SKIES[theme] || SKIES.meadow; const u = (h) => ({ value: C(h) });
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZen: u(S.zen), uHi: u(S.hi), uMid: u(S.mid), uLow: u(S.low), uHor: u(S.hor), uGnd: u(S.gnd), uSunC: u(S.sun), uSun: { value: sunDir.clone().normalize() } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uZen, uHi, uMid, uLow, uHor, uGnd, uSunC, uSun; varying vec3 vW;
      vec3 grad(float e){ if (e < 1.5) return mix(uHor, uLow, e / 1.5); if (e < 5.0) return mix(uLow, uMid, (e - 1.5) / 3.5); if (e < 10.0) return mix(uMid, uHi, (e - 5.0) / 5.0); return mix(uHi, uZen, clamp((e - 10.0) / 30.0, 0.0, 1.0)); }
      void main(){
        vec3 d = normalize(vW - cameraPosition); float e = degrees(asin(clamp(d.y, -1.0, 1.0)));
        float st = e < 12.0 ? 1.15 : 3.5; float eq = (floor(e / st) + 0.5) * st;
        vec3 col = e < 0.0 ? mix(uHor, uGnd, clamp(-e / 5.0, 0.0, 1.0)) : grad(eq);
        float ang = degrees(acos(clamp(dot(d, normalize(uSun)), -1.0, 1.0)));
        float side = smoothstep(-1.0, 1.5, e);
        if (ang < 1.6) col = uSunC * 4.2; else if (ang < 2.3) col = mix(col, uSunC * 1.9, 0.92);
        else col = mix(col, uSunC * 1.05, (ang < 4.2 ? 0.5 : ang < 7.5 ? 0.28 : ang < 13.0 ? 0.13 : ang < 22.0 ? 0.05 : 0.0) * side);
        float streak = step(abs(e - 2.6), 0.18) + step(abs(e - 4.1), 0.12); col = mix(col, uSunC, streak * 0.12 * smoothstep(40.0, 5.0, ang));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), m); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky'; return mesh;
}
// layered faceted ridges baked with dusk light and aerial haze; leaves a notch where the sun sets
export function mountains(M, theme, seed = 1, { cam = new V3(-0.1, 3, 11.4), sunDir = new V3(0.17, 0.07, -1), layers = null } = {}) {
  const S = SKIES[theme] || SKIES.meadow; const rnd = mulberry32(seed * 1301 + 7); const pal = S.mtn.map(C); const Lm = new V3(0.75, 0.55, -0.1).normalize(); const sd = sunDir.clone().normalize(); const snow = [C('#9c8cc0'), C('#cfb6cc'), C('#ffd8bc')];
  const defs = layers || [{ z: -72, X: 85, step: 4.5, h: [3.5, 8], haze: 0.18 }, { z: -102, X: 105, step: 6, h: [6, 13], haze: 0.42 }, { z: -138, X: 135, step: 8, h: [9, 21], haze: 0.62, snow: 15 }];
  defs.forEach((L, li) => {
    const peaks = []; for (let x = -L.X; x < L.X; x += 9 + rnd() * 14) peaks.push({ x: x + rnd() * 6, h: L.h[0] + rnd() * (L.h[1] - L.h[0]), w: 10 + rnd() * 16 });
    const notchX = cam.x + (sd.x / -sd.z) * (cam.z - L.z); const hz = C(S.haze[li] || S.haze.at(-1));
    const hAt = (x) => { let h = 0.6; for (const p of peaks) h = Math.max(h, p.h * Math.pow(Math.max(0, 1 - Math.abs(x - p.x) / p.w), 1.15)); const nd = Math.min(1, Math.abs(x - notchX) / (10 + li * 6)); return h * (0.3 + 0.7 * nd * nd * (3 - 2 * nd)); };
    const rows = [[-4, 13, 0], [0.45, 6.5, 0.6], [1, 0, 1], [0.4, -9, 0.6]]; const V = [];
    const nx = Math.ceil((2 * L.X) / L.step);
    for (const [k, dz, jj] of rows) { const row = []; for (let i = 0; i <= nx; i++) { const x = -L.X + i * L.step + (i && i < nx ? (rnd() - 0.5) * L.step * 0.7 * jj : 0); const h = hAt(x); const y = k < 0 ? k : h * k + (rnd() - 0.5) * 1.2 * jj * (L.step / 5); row.push(new V3(x, y, L.z + dz + (rnd() - 0.5) * 2 * jj)); } V.push(row); }
    const face = (a, b, c) => {
      const n = new V3().subVectors(b, a).cross(_t.subVectors(c, a)).normalize(); if (n.z < 0 && n.y < 0.2) n.negate();
      const cy = (a.y + b.y + c.y) / 3; let t = 1.1 + n.dot(Lm) * 2.4 + n.y * 0.6 + (rnd() - 0.5) * 0.7; const i = Math.max(0, Math.min(4, Math.round(t)));
      let col = (L.snow && cy > L.snow * (0.85 + rnd() * 0.15) ? snow[Math.max(0, Math.min(2, Math.round(t * 0.6)))] : pal[i]).clone();
      col.lerp(hz, L.haze + (cy < 2 ? 0.12 : 0)); M.tri(a, b, c, col);
    };
    for (let r = 0; r < V.length - 1; r++) for (let i = 0; i < nx; i++) { const a = V[r][i], b = V[r][i + 1], c = V[r + 1][i + 1], d = V[r + 1][i]; if ((i + r) % 2) { face(a, b, c); face(a, c, d); } else { face(a, b, d); face(b, c, d); } }
  });
}
// flat faceted cumulus streaks: gold undersides, rose flanks, lavender crowns
export function clouds(M, theme, seed = 1, { n = 8, z = -160, sunDir = new V3(0.17, 0.07, -1) } = {}) {
  const S = SKIES[theme] || SKIES.meadow; const rnd = mulberry32(seed * 911 + 5); const under = C(S.sun).multiplyScalar(1.05), flank = C(S.low).lerp(C(S.hor), 0.35), body = C(S.mid).lerp(C(S.low), 0.25), crown = C(S.hi).lerp(C(S.mid), 0.45);
  const sx = sunDir.x / Math.max(0.05, -sunDir.z) * 160;
  for (let c = 0; c < n; c++) {
    const cx = (c / (n - 1) - 0.5) * 230 + (rnd() - 0.5) * 22; const cy = 15.5 + rnd() * 11; const cz = z - rnd() * 30; const w = 13 + rnd() * 24; const bumps = 3 + Math.floor(rnd() * 3); const k = 1 + Math.max(0, 1 - Math.abs(cx - sx) / 70) * 0.35;
    const P = (x, y, zz) => new V3(x, y, zz);
    const bl = P(cx - w / 2, cy, cz), br = P(cx + w / 2, cy, cz), ul = P(cx - w * 0.38, cy - 0.9 - rnd() * 0.6, cz), ur = P(cx + w * 0.42, cy - 0.7 - rnd() * 0.5, cz);
    M.tri(bl, ul, ur, under.clone().multiplyScalar(k)); M.tri(bl, ur, br, under.clone().multiplyScalar(k * 0.92));
    for (let b = 0; b < bumps; b++) {
      const bx = cx - w / 2 + ((b + 0.5) * w) / bumps + (rnd() - 0.5) * 2; const br2 = (w / bumps) * (0.62 + rnd() * 0.4) * (b === Math.floor(bumps / 2) ? 1.3 : 1); const zz = cz + 0.3 + b * 0.25 - (b === Math.floor(bumps / 2) ? 0.6 : 0); const cen = P(bx, cy, zz); const seg = 5; const sy = 0.55 + rnd() * 0.15; let prev = null;
      for (let s = 0; s <= seg; s++) { const a = (s / seg) * Math.PI; const p = P(bx + Math.cos(a) * br2, cy + Math.sin(a) * br2 * sy, zz); if (prev) { const am = ((s - 0.5) / seg) * Math.PI; const up = Math.sin(am), rt = Math.cos(am); const col = (up > 0.8 ? crown : rt > 0.35 ? flank : rt < -0.6 ? body : body.clone().lerp(crown, 0.4)).clone().multiplyScalar(k * (0.95 + rnd() * 0.1)); M.tri(cen, prev, p, col); } prev = p; }
    }
  }
}
// image-based light: a tiny gradient world (violet zenith, amber horizon, dusky ground) prefiltered by PMREM
const ENV = new Map();
export function gradientEnv(renderer, key, { top = '#4a4a8a', hor = '#e8a070', gnd = '#3a2630', sun = null, sunDir = new V3(-0.6, 0.5, 0.45) } = {}) {
  if (!renderer) return null; if (ENV.has(key)) return ENV.get(key);
  const sc = new THREE.Scene(); const g = new THREE.SphereGeometry(10, 24, 16); const p = g.attributes.position; const cols = []; const T = C(top), H = C(hor), G = C(gnd), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y > 0) col.copy(H).lerp(T, Math.pow(y, 0.6)); else col.copy(H).lerp(G, Math.min(1, -y * 2.5)); cols.push(col.r, col.g, col.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  if (sun) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshBasicMaterial({ color: C(sun).multiplyScalar(6) })); s.position.copy(sunDir).normalize().multiplyScalar(8); sc.add(s); }
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.02); pm.dispose(); g.dispose();
  ENV.set(key, rt.texture); return rt.texture;
}
