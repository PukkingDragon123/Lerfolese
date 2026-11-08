// Low-poly tabletop interior (rewards / shop / lab / end screens): plank table, books, candles, lantern, fruit,
// oil lamp and the shop/lab clutter, all faceted vertex-colour models from the lowpoly kit, lit by candlelight.
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';
import * as LP from './lowpoly.js';

const { Mesher, PAL, M4, lathe, block, tube, painter } = LP;
const V3 = THREE.Vector3; const TAU = Math.PI * 2;
const C = (h) => new THREE.Color(h);
const ramp = (...h) => h.map(C);
const COVERS = [ramp('#240e1c', '#4a1424', '#7a2230', '#a8383a', '#d0644a'), ramp('#0e1430', '#182654', '#24407a', '#3a62a0', '#6a92c0'), ramp('#0c2020', '#123a30', '#1e5a40', '#3a7a4a', '#6aa060'), ramp('#2a1a10', '#4e3018', '#7a5024', '#a8782e', '#d8a848'), ramp('#1e1030', '#382056', '#5a3482', '#8050a8', '#ae80d0')];
const GLASS = ['#3ff0dc', '#c06af0', '#7af06a', '#f0a03a'];

// plank table top: boards with staggered joints, per-strip grain tones, dark seams and knots
function table(M, rnd) {
  const W = 34, D = 18, nb = 7; const bw = D / nb; const wood = ramp('#2a1622', '#4a2a2a', '#6e4231', '#8e5c3a', '#b07a48');
  for (let b = 0; b < nb; b++) {
    const z0 = -D / 2 + b * bw + 0.04, z1 = z0 + bw - 0.08; let x = -W / 2 - (b % 3) * 2.3; const shift = (rnd() - 0.5) * 0.6;
    while (x < W / 2) {
      const len = Math.min(5 + rnd() * 6, W / 2 - x); const x0 = Math.max(x, -W / 2), x1 = x + len - 0.06; if (x1 - x0 < 0.3) { x += len; continue; }
      const lanes = 4; const t = Math.max(1, Math.min(4, Math.round(2.5 + shift + (rnd() - 0.5) * 1.1))); const lane = [...Array(lanes)].map(() => 0.92 + rnd() * 0.14); let sx = x0;
      while (sx < x1 - 0.01) { const sl = Math.min(2.5 + rnd() * 3.5, x1 - sx); const k = 0.96 + rnd() * 0.08; for (let l = 0; l < lanes; l++) { const za = z0 + (l / lanes) * (z1 - z0), zb = z0 + ((l + 1) / lanes) * (z1 - z0); const c = (rnd() < 0.06 ? wood[t - 1] : wood[t]).clone().multiplyScalar(lane[l] * k); M.quad(new V3(sx, 0, zb), new V3(sx + sl, 0, zb), new V3(sx + sl, 0, za), new V3(sx, 0, za), c); } sx += sl; }
      const edge = wood[1]; M.quad(new V3(x0, 0, z1), new V3(x0, -0.3, z1), new V3(x1, -0.3, z1), new V3(x1, 0, z1), edge); M.quad(new V3(x1, 0, z1), new V3(x1, -0.3, z1), new V3(x1, -0.3, z0), new V3(x1, 0, z0), wood[0]);
      if (rnd() < 0.5) { const kx = x0 + rnd() * (x1 - x0), kz = z0 + rnd() * (z1 - z0); for (let k = 0; k < 6; k++) { const a0 = (k / 6) * TAU, a1 = ((k + 1) / 6) * TAU; M.tri(new V3(kx, 0.004, kz), new V3(kx + Math.cos(a1) * 0.14, 0.004, kz + Math.sin(a1) * 0.09), new V3(kx + Math.cos(a0) * 0.14, 0.004, kz + Math.sin(a0) * 0.09), wood[k % 2]); } }
      x += len;
    }
  }
  M.quad(new V3(-W / 2, -0.32, -D / 2), new V3(-W / 2, -0.32, D / 2), new V3(W / 2, -0.32, D / 2), new V3(W / 2, -0.32, -D / 2), wood[0]);
}
function book(M, mtx, seed, { w = 0.34, h = 1.9, d = 1.35, lying = false } = {}) {
  const rnd = mulberry32(seed * 7 + 1); const cov = COVERS[((seed % COVERS.length) + COVERS.length) % COVERS.length]; const P = painter(cov, rnd, { base: 1.8, up: 0.6, sun: 1.2, jit: 0.5 }); const pg = painter(PAL.paper, rnd, { base: 2.6, up: 0.6, sun: 0.8, jit: 0.4 }); const gold = painter(PAL.bronze, rnd, { base: 3, sun: 1 });
  const m = lying ? mtx.clone().multiply(M4(0, w / 2, 0, 0, 1, 0, Math.PI / 2)) : mtx;
  M.add(block(w, h, d, { bevel: 0.03, seed }), m.clone().multiply(M4(0, h / 2, 0)), P);
  M.add(block(w - 0.06, h - 0.1, 0.06, { bevel: 0.01, seed: seed + 1 }), m.clone().multiply(M4(0, h / 2, -d / 2 - 0.005)), pg);
  for (const y of [0.22, h - 0.3, h * 0.55]) M.add(block(w + 0.02, 0.06, 0.05, { bevel: 0.01, seed }), m.clone().multiply(M4(0, y, d / 2 + 0.005)), gold);
}
function candle(M, F, G, mtx, seed, { h = 1.1, r = 0.13 } = {}) {
  const rnd = mulberry32(seed * 5 + 3); const P = painter(PAL.wax, rnd, { base: 2.4, up: 0.8, sun: 1, jit: 0.6 });
  M.add(lathe([[0, 0], [r, 0], [r * 1.02, h * 0.7], [r * 0.98, h - 0.04], [r * 0.7, h], [0, h - 0.02]], 7, { jit: 0.06, seed }), mtx, P);
  for (let k = 0; k < 3; k++) { const a = rnd() * TAU; const dh = 0.15 + rnd() * 0.3; M.add(block(0.07, dh, 0.06, { bevel: 0.02, seed: k }), mtx.clone().multiply(M4(Math.cos(a) * r, h - dh / 2 - 0.02, Math.sin(a) * r, -a)), P); }
  M.add(block(0.025, 0.1, 0.025, { bevel: 0.005 }), mtx.clone().multiply(M4(0, h + 0.03, 0)), () => C('#1a1014'));
  LP.flames(F, mtx.clone().multiply(M4(0, h + 0.06, 0)), seed, { r: 0.07, h: 0.32, n: 5 });
}
function candelabrum(M, B, F, G, mtx, seed) {
  const rnd = mulberry32(seed); const P = painter(PAL.bronze, rnd, { base: 2, up: 0.8, sun: 1.4, jit: 0.5 });
  B.add(lathe([[0, 0], [0.62, 0], [0.62, 0.08], [0.4, 0.18], [0.16, 0.34], [0.1, 0.5], [0.13, 0.62], [0.08, 0.74], [0.08, 1.7], [0.14, 1.8], [0, 1.82]], 10), mtx, P);
  const cups = [[0, 1.82]];
  for (const sd of [-1, 1]) { B.add(tube([new V3(0, 1.25, 0), new V3(sd * 0.45, 1.2, 0), new V3(sd * 0.72, 1.38, 0), new V3(sd * 0.74, 1.55, 0)], [0.05, 0.05, 0.045, 0.045], 5, { cap: false, seed: seed + sd }), mtx, P); cups.push([sd * 0.74, 1.55]); }
  for (const [x, y] of cups) { B.add(lathe([[0, 0], [0.09, 0], [0.18, 0.1], [0.2, 0.14], [0, 0.12]], 8), mtx.clone().multiply(M4(x, y, 0)), P); candle(M, F, G, mtx.clone().multiply(M4(x, y + 0.1, 0)), seed + Math.round(x * 10), { h: 0.85 + rnd() * 0.3, r: 0.1 }); }
}
function lantern(M, B, F, G, mtx, seed) {
  const rnd = mulberry32(seed); const P = painter(PAL.iron, rnd, { base: 2, up: 0.9, sun: 1.3, jit: 0.5 }); const glow = C('#ffc060');
  B.add(lathe([[0, 0], [0.55, 0], [0.55, 0.12], [0.45, 0.2], [0, 0.2]], 6, { phase: 0.52 }), mtx, P);
  B.add(lathe([[0, 1.45], [0.6, 1.45], [0.52, 1.55], [0.2, 1.95], [0.08, 2.05], [0, 2.1]], 6, { phase: 0.52 }), mtx, P);
  for (let k = 0; k < 6; k++) { const a = 0.52 + (k / 6) * TAU; B.add(tube([new V3(Math.cos(a) * 0.47, 0.18, Math.sin(a) * 0.47), new V3(Math.cos(a) * 0.47, 1.47, Math.sin(a) * 0.47)], [0.035, 0.035], 4, { cap: false }), mtx, P); }
  B.add(tube([new V3(-0.18, 2.0, 0), new V3(-0.2, 2.35, 0), new V3(0, 2.5, 0), new V3(0.2, 2.35, 0), new V3(0.18, 2.0, 0)], [0.03, 0.03, 0.03, 0.03, 0.03], 4, { cap: false }), mtx, P);
  G.add(lathe([[0, 0.2], [0.44, 0.24], [0.46, 1.4], [0, 1.44]], 6, { phase: 0.52 }), mtx, (n) => glow.clone().multiplyScalar(0.55 + Math.max(0, n.dot(LP.KEY)) * 0.4));
  candle(M, F, G, mtx.clone().multiply(M4(0, 0.2, 0)), seed + 1, { h: 0.6, r: 0.12 });
}
function fruit(M, mtx, seed, kind = 'apple') {
  const rnd = mulberry32(seed * 3 + 1); const s = kind === 'pom' ? 0.62 : 0.52; const pal = kind === 'pom' ? ramp('#2a0a1c', '#5a1028', '#901c30', '#c43a3a', '#e8784a') : kind === 'green' ? ramp('#14281a', '#2a4a1e', '#4e7426', '#86a432', '#c8d05a') : PAL.apple;
  const P = painter(pal, rnd, { base: 2, up: 0.9, sun: 1.3, jit: 0.7 });
  const prof = [[0, 0.04], [0.45, 0.02], [0.82, 0.22], [0.98, 0.48], [0.9, 0.78], [0.55, 0.96], [0.2, 0.9], [0, 0.82]].map(([r, y]) => [r * s, y * s * 1.05]);
  M.add(lathe(prof, 8, { jit: 0.08, seed, phase: rnd() }), mtx, P);
  if (kind === 'pom') for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; M.add(block(0.08, 0.2, 0.05, { bevel: 0.01, taper: 0.5 }), mtx.clone().multiply(M4(Math.cos(a) * 0.12, s * 1.0, Math.sin(a) * 0.12, -a, 1, 0, Math.cos(a) * 0.4)), P); }
  else { M.add(tube([new V3(0, s * 0.8, 0), new V3(0.03, s * 1.05, 0), new V3(0.08, s * 1.15, 0)], [0.035, 0.03, 0.025], 4, { cap: false }), mtx, () => C('#3a2418')); const lf = C('#4e7a2e'); const a = new V3(0.06, s * 1.05, 0).applyMatrix4(mtx), b = new V3(0.36, s * 1.2, 0.12).applyMatrix4(mtx), c = new V3(0.2, s * 1.28, -0.05).applyMatrix4(mtx); M.tri(a, b, c, lf); M.tri(a, c, b, lf.clone().multiplyScalar(0.7)); }
}
function bowl(M, mtx, seed, { r = 1.5, h = 0.42, pal = PAL.terra } = {}) {
  const rnd = mulberry32(seed); const P = painter(pal, rnd, { base: 1.9, up: 0.6, sun: 1.2, jit: 0.5 });
  M.add(lathe([[0, 0], [r * 0.4, 0], [r * 0.45, 0.06], [r * 0.85, h * 0.5], [r, h], [r * 0.93, h], [r * 0.78, h * 0.55], [r * 0.4, h * 0.25], [0, h * 0.22]], 12, { seed }), mtx, (n, c, i) => { const t = (c.y - new V3().applyMatrix4(mtx).y) / h; return t > 0.62 && t < 0.8 && n.y < 0.5 ? C('#1e1018') : P(n, c, i); });
}
function oilLamp(M, F, mtx, seed) {
  const rnd = mulberry32(seed); const P = painter(PAL.terra, rnd, { base: 2, up: 0.8, sun: 1.3, jit: 0.5 });
  M.add(lathe([[0, 0], [0.4, 0], [0.62, 0.16], [0.6, 0.3], [0.3, 0.42], [0.12, 0.4], [0, 0.36]], 9), mtx.clone().multiply(M4(0, 0, 0, 0, new V3(1, 1, 0.8))), P);
  M.add(tube([new V3(0.4, 0.2, 0), new V3(0.75, 0.24, 0), new V3(0.88, 0.28, 0)], [0.13, 0.11, 0.1], 6, { cap: false }), mtx, P);
  M.add(tube([new V3(-0.55, 0.22, 0), new V3(-0.8, 0.35, 0), new V3(-0.7, 0.55, 0)], [0.04, 0.04, 0.04], 4, { cap: false }), mtx, P);
  LP.flames(F, mtx.clone().multiply(M4(0.88, 0.3, 0)), seed, { r: 0.09, h: 0.42, n: 6 });
}
function scroll(M, mtx, seed, len = 1.6) {
  const rnd = mulberry32(seed); const P = painter(PAL.paper, rnd, { base: 2.4, up: 0.8, sun: 1.2, jit: 0.5 }); const wood = painter(PAL.wood, rnd, { base: 2, sun: 1 });
  M.add(tube([new V3(-len / 2, 0.16, 0), new V3(len / 2, 0.16, 0)], [0.16, 0.16], 7, { cap: false }), mtx, P);
  for (const sd of [-1, 1]) M.add(lathe([[0, 0], [0.06, 0], [0.06, 0.12], [0.1, 0.16], [0, 0.2]], 6), mtx.clone().multiply(M4(sd * len / 2, 0.16, 0, 0, 1, 0, -sd * Math.PI / 2)), wood);
  M.add(block(0.08, 0.34, 0.34, { bevel: 0.02 }), mtx.clone().multiply(M4(0.2, 0.16, 0)), () => C('#8a1c2a'));
}
function inkwell(M, G, mtx, seed) {
  const rnd = mulberry32(seed); M.add(lathe([[0, 0], [0.32, 0], [0.34, 0.3], [0.16, 0.42], [0.14, 0.5], [0, 0.5]], 8), mtx, painter(LP.PAL.iron, rnd, { base: 1.4, sun: 1.4 }));
  const f = ramp('#6a5a6a', '#a898a0', '#e8dccc'); const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new V3(0.05 + t * 0.55, 0.45 + t * 1.5, t * t * 0.25)); }
  for (let i = 0; i < 6; i++) { const w = Math.sin(((i + 0.5) / 6) * Math.PI) * 0.16 + 0.02; const a = pts[i], b = pts[i + 1]; for (const sd of [-1, 1]) { const o = new V3(sd * w, -w * 0.3, 0); const p0 = a.clone().applyMatrix4(mtx), p1 = b.clone().applyMatrix4(mtx), p2 = b.clone().add(o).applyMatrix4(mtx), p3 = a.clone().add(o).applyMatrix4(mtx); for (const [a1, b1, c1, col] of [[p0, p1, p2, f[i % 2 ? 1 : 2]], [p0, p2, p3, f[i % 2 ? 2 : 1]]]) { M.tri(a1, b1, c1, col); M.tri(a1, c1, b1, col.clone().multiplyScalar(0.75)); } } }
}
function barrel(M, B, mtx, seed, { h = 2.1, r = 0.85 } = {}) {
  const rnd = mulberry32(seed); const P = painter(PAL.wood, rnd, { base: 1.9, up: 0.6, sun: 1.3, jit: 0.9 }); const I = painter(PAL.iron, rnd, { base: 2, sun: 1.3 });
  const prof = [[0, 0]]; for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push([r * (0.84 + Math.sin(t * Math.PI) * 0.16), t * h, 1]); } prof.push([0, h - 0.06]);
  M.add(lathe(prof, 0, { flutes: 9, depth: 0.05, seed }), mtx, P);
  for (const t of [0.12, 0.3, 0.7, 0.88]) { const y = t * h; const rr = r * (0.84 + Math.sin(t * Math.PI) * 0.16) + 0.03; B.add(lathe([[rr - 0.02, y - 0.06], [rr, y - 0.05], [rr, y + 0.05], [rr - 0.02, y + 0.06]], 18), mtx, I); }
}
function chest(M, B, G, mtx, seed) {
  const rnd = mulberry32(seed); const P = painter(PAL.wood, rnd, { base: 2, up: 0.7, sun: 1.2, jit: 0.9 }); const I = painter(PAL.bronze, rnd, { base: 2.2, sun: 1.3 });
  M.add(block(2.4, 1.1, 1.5, { bevel: 0.06, jit: 0.02, seed }), mtx.clone().multiply(M4(0, 0.55, 0)), P);
  const lid = lathe([[0, -1.2], [0.76, -1.2], [0.76, 1.2], [0, 1.2]], 8, { phase: 0 }); M.add(lid, mtx.clone().multiply(M4(0, 1.1, 0, 0, new V3(0.62, 1, 1), 0, Math.PI / 2)), P);
  for (const x of [-0.85, 0, 0.85]) { B.add(block(0.14, 1.14, 1.55, { bevel: 0.02 }), mtx.clone().multiply(M4(x, 0.56, 0)), I); B.add(lathe([[0.78, -0.07], [0.8, -0.07], [0.8, 0.07], [0.78, 0.07]], 8), mtx.clone().multiply(M4(x, 1.1, 0, 0, new V3(0.62, 1, 1), 0, Math.PI / 2)), I); }
  B.add(block(0.3, 0.36, 0.08, { bevel: 0.03 }), mtx.clone().multiply(M4(0, 1.0, 0.78)), I);
  coins(B, mtx.clone().multiply(M4(0.4, 0, 1.4)), seed + 3, 14);
}
function coins(B, mtx, seed, n = 10) {
  const rnd = mulberry32(seed); const P = painter(PAL.bronze, rnd, { base: 2.8, up: 1, sun: 1.1, jit: 0.6 });
  for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = rnd() * 0.7; const stack = i < 3 ? 2 + Math.floor(rnd() * 3) : 1; for (let k = 0; k < stack; k++) B.add(lathe([[0, 0], [0.17, 0], [0.17, 0.05], [0, 0.05]], 8, { phase: rnd() }), mtx.clone().multiply(M4(Math.cos(a) * d + (rnd() - 0.5) * 0.03, k * 0.055, Math.sin(a) * d, 0, 1, (rnd() - 0.5) * (k ? 0.05 : 0.3), (rnd() - 0.5) * (k ? 0.05 : 0.3))), P); }
}
function crate(M, mtx, seed, s = 1.6) {
  const rnd = mulberry32(seed); const P = painter(PAL.wood, rnd, { base: 2.1, up: 0.8, sun: 1.2, jit: 1.0 }); const D = painter(PAL.wood, rnd, { base: 1.3, sun: 1.2, jit: 0.6 });
  M.add(block(s - 0.1, s - 0.1, s - 0.1, { bevel: 0.02, seed }), mtx.clone().multiply(M4(0, s / 2, 0)), D);
  for (const [w, h, d, x, y, z] of [[s, 0.18, 0.18, 0, 0.09, s / 2 - 0.09], [s, 0.18, 0.18, 0, s - 0.09, s / 2 - 0.09], [0.18, s, 0.18, -s / 2 + 0.09, s / 2, s / 2 - 0.09], [0.18, s, 0.18, s / 2 - 0.09, s / 2, s / 2 - 0.09], [s, 0.18, 0.18, 0, 0.09, -s / 2 + 0.09], [s, 0.18, 0.18, 0, s - 0.09, -s / 2 + 0.09], [0.18, s, 0.18, -s / 2 + 0.09, s / 2, -s / 2 + 0.09], [0.18, s, 0.18, s / 2 - 0.09, s / 2, -s / 2 + 0.09]]) M.add(block(w, h, d, { bevel: 0.03, jit: 0.01, seed: Math.round(x * 10 + y * 7) }), mtx.clone().multiply(M4(x, y, z)), P);
  M.add(block(s * 1.25, 0.16, 0.18, { bevel: 0.03 }), mtx.clone().multiply(M4(0, s / 2, s / 2 - 0.02, 0, 1, 0, Math.PI / 4)), P);
}
function flask(M, G, mtx, seed, col) {
  const rnd = mulberry32(seed); const glass = LP.glowPainter(col, 0.9, rnd); const t = rnd();
  const prof = t < 0.5 ? [[0, 0], [0.38, 0], [0.48, 0.25], [0.45, 0.55], [0.14, 0.8], [0.12, 1.15], [0, 1.15]] : [[0, 0], [0.3, 0], [0.32, 0.6], [0.25, 0.75], [0.11, 0.85], [0.11, 1.1], [0, 1.1]];
  G.add(lathe(prof, 8, { seed }), mtx, glass); M.add(lathe([[0, 0], [0.13, 0], [0.11, 0.18], [0, 0.18]], 6), mtx.clone().multiply(M4(0, prof.at(-2)[1], 0)), () => C('#5a3424'));
}
function basket(M, mtx, seed) {
  const rnd = mulberry32(seed); const P = painter(PAL.dryGrass, rnd, { base: 2.1, up: 0.6, sun: 1.2, jit: 0.9 });
  M.add(lathe([[0, 0], [0.7, 0], [0.9, 0.3, 1], [1.0, 0.7, 1], [1.05, 0.85], [0.95, 0.88], [0.85, 0.5], [0, 0.42]], 0, { flutes: 11, depth: 0.08, twist: 0.25, seed }), mtx, P);
  for (let i = 0; i < 4; i++) fruit(M, mtx.clone().multiply(M4((rnd() - 0.5) * 0.9, 0.42, (rnd() - 0.5) * 0.9, rnd() * TAU, 0.75)), seed + i, i % 2 ? 'green' : 'apple');
}
// stone wall just behind the table with a low shelf of books and jars (the steep camera only sees its lower band)
function backWall(M, B, G, rnd) {
  const P = painter(PAL.stone, rnd, { base: 1.2, up: 0.8, sun: 1, jit: 1.0 }); const z = -10.4; const ch = 0.62;
  for (let r = 0; r < 7; r++) { let x = -24 + (r % 2) * 0.5; while (x < 24) { const w = 0.9 + rnd() * 0.9; M.add(block(w - 0.05, ch - 0.05, 0.7, { bevel: 0.07, jit: 0.04, seed: r * 50 + Math.round(x * 3) }), M4(x + w / 2, r * ch + ch / 2 - 0.3, z + (rnd() - 0.5) * 0.06), P); x += w; } }
  const W = painter(PAL.wood, rnd, { base: 1.7, sun: 1.2, jit: 0.7 }); const y = 1.45;
  M.add(block(40, 0.22, 1.2, { bevel: 0.04, seed: 9 }), M4(0, y, z + 0.9), W);
  for (let x = -18; x <= 18; x += 6) M.add(block(0.22, 0.6, 1.0, { bevel: 0.04, taper: -0.3, seed: x }), M4(x, y - 0.4, z + 0.8), W);
  let x = -19;
  while (x < 19) { const r = rnd(); if (Math.abs(x) < 3) { x += 0.6; continue; } if (r < 0.55) { const n = 3 + Math.floor(rnd() * 6); for (let i = 0; i < n; i++) book(M, M4(x + i * 0.42, y + 0.11, z + 0.9, (rnd() - 0.5) * 0.12), 60 + Math.round(x * 7) + i, { w: 0.38, h: 1.0 + rnd() * 0.55, d: 0.95 }); x += n * 0.42 + 0.3; } else if (r < 0.8) { flask(M, G, M4(x + 0.3, y + 0.11, z + 0.9, rnd()), Math.round(x * 13), GLASS[Math.floor(rnd() * GLASS.length)]); x += 0.9; } else { LP.amphora(M, M4(x + 0.35, y + 0.11, z + 0.9, rnd()), Math.round(x * 5), { s: 0.75 }); x += 1.0; } }
}

export function dressRoom(scene, kind = 'study') {
  const rnd = mulberry32(kind.length * 31 + 7); const M = new Mesher(), B = new Mesher(), F = new Mesher(), G = new Mesher();
  table(M, rnd); backWall(M, B, G, rnd);
  for (let i = 0; i < 9; i++) book(M, M4(-12.6 + i * 0.4, 0, -5.6, (rnd() - 0.5) * 0.08), i * 3 + 1, { h: 1.6 + rnd() * 0.6 });
  book(M, M4(-8.6, 0, -6.2, 0.4), 50, { lying: true, h: 1.8, d: 1.4, w: 0.36 }); book(M, M4(-8.6, 0.36, -6.2, 0.62), 51, { lying: true, h: 1.6, d: 1.25, w: 0.3 });
  candelabrum(M, B, F, G, M4(9.5, 0, -5.2, 0.3), 3);
  lantern(M, B, F, G, M4(-6.8, 0, -7.0, 0.4), 5);
  bowl(M, M4(-5.4, 0, -3.8), 4); fruit(M, M4(-5.8, 0.1, -3.6, 0.3), 1); fruit(M, M4(-5.0, 0.1, -4.2, 1.7), 2, 'green'); fruit(M, M4(-5.3, 0.14, -3.3, 2.5), 3, 'pom'); fruit(M, M4(-6.9, 0, -2.6, 0.8), 7);
  oilLamp(M, F, M4(12, 0, -2, -0.4), 6); scroll(M, M4(6.4, 0, -6.4, 0.2), 8); inkwell(M, G, M4(4.6, 0, -6.6, -0.3), 9);
  LP.crystals(M, G, M4(3.2, 0, -7.6, 0.4), 11, { n: 5, h: 0.9 });
  if (kind === 'shop') { barrel(M, B, M4(-9.6, 0, -2.6, 0.3), 12); chest(M, B, G, M4(9, 0, -1.8, -0.5), 13); crate(M, M4(11.6, 0, -4.6, 0.2), 14); coins(B, M4(-7.6, 0, -1.6), 15, 8); }
  if (kind === 'lab') { const fp = LP.firePit({ seed: 5 }); fp.position.set(0, 0, -5.6); fp.scale.setScalar(1.7); scene.add(fp); basket(M, M4(-7, 0, -3, 0.4), 16); LP.amphora(M, M4(6.6, 0, -3.8, 0.3), 17, { s: 1.4 }); for (let i = 0; i < 4; i++) flask(M, G, M4(-3.4 + i * 0.9 + (i > 1 ? 7 : 0), 0, -6.4 + (i % 2) * 0.5, rnd()), 20 + i, GLASS[i]); }
  const add = (m) => m && scene.add(m); add(M.build('lp')); add(B.build('metal')); add(F.build('flame', { cast: false, receive: false })); add(G.build('glow', { cast: false, receive: false }));
  for (const [x, y, z, i] of [[9.5, 2.9, -5.0, 9], [12.4, 1.0, -1.8, 4]]) { const l = new THREE.PointLight(0xffa04a, i, 9, 1.8); l.position.set(x, y, z); scene.add(l); }
}
