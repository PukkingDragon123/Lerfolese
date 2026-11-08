// Cel-shaded nature, built procedurally: trees with real branching wood (tapered, gnarled tubes with painted bark)
// and crowns of hand-painted leaf-spray cards (olive, oak, stone pine, fir, cypress, laurel, apple), bushes with
// blossoms, 3D cel flowers (poppy, daisy, lavender, cornflower, narcissus), dense instanced grass tufts with banded
// root-to-tip tones, rolling wind waves and sheen, reeds and cattails, lily pads and water lilies, and cel water.
// Crown cards carry "inflated" normals (from the clump and crown centres), so the toon ramp paints broad, clean
// light / shadow bands across a crown like an anime background; wood gets the engine's ink outlines.
import * as THREE from 'three';
import * as T from './toon.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- geometry accumulator
class Acc {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.w = []; this.i = []; }
  get count() { return this.p.length / 3; }
  vert(p, n, u, v, c, w = 0) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); this.c.push(c.r, c.g, c.b); this.w.push(w); return this.count - 1; }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.w, 1)); g.setIndex(this.i); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
  }
}
const rvec = (r) => { let x, y, z, d; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; d = x * x + y * y + z * z; } while (d > 1 || d < 1e-4); return V(x, y, z).multiplyScalar(1 / Math.sqrt(d)); };
// rotate d away from itself by `ang` about a random perpendicular axis
function spread(d, ang, r, az = r() * Math.PI * 2) { const perp = V().crossVectors(d, Math.abs(d.y) < 0.95 ? V(0, 1, 0) : V(1, 0, 0)).normalize().applyAxisAngle(d, az); return d.clone().applyAxisAngle(perp, ang).normalize(); }

// a tapered tube along a polyline with parallel-transport frames; `gnarl` twists the section, `flare` buttresses the base
function tube(A, pts, rads, sides, { col = C('#ffffff'), base = 0, gnarl = 0, flare = 0, uRep = 2, vRep = 0.8, seed = 0 } = {}) {
  const n = pts.length; const Tn = [], Nn = [], Bn = [];
  for (let i = 0; i < n; i++) Tn.push(pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  let N0 = V().crossVectors(Tn[0], Math.abs(Tn[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize();
  for (let i = 0; i < n; i++) { if (i) { N0 = N0.clone().addScaledVector(Tn[i], -N0.dot(Tn[i])).normalize(); } Nn.push(N0.clone()); Bn.push(V().crossVectors(Tn[i], N0).normalize()); }
  const start = A.count; let vAcc = 0; const cc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (i) vAcc += pts[i].distanceTo(pts[i - 1]);
    const fl = flare * Math.max(0, 1 - i / 2.2);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2; const nr = Nn[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(Bn[i], Math.sin(a));
      const k = 1 + gnarl * (Math.sin(a * 3 + i * 1.3 + seed) * 0.5 + Math.sin(a * 5 - i * 0.7 + seed * 2) * 0.3) + fl * Math.pow(Math.max(0, Math.cos(a * 5 + seed)), 3);
      const p = pts[i].clone().addScaledVector(nr, rads[i] * k);
      const ao = clamp(0.62 + (p.y - base) * 0.22, 0.62, 1); cc.copy(col).multiplyScalar(ao);
      A.vert(p, nr, (j / sides) * uRep, vAcc * vRep, cc, 0);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) { const a = start + i * (sides + 1) + j, b = a + sides + 1; A.quad(a, b, b + 1, a + 1); }
}
// grow one branch: a bending polyline written as a tube; returns its points / radii for children
function grow(A, r, p0, d0, len, r0, r1, segs, { bend = 0.2, up = 0, sides = 7, gnarl = 0, flare = 0, col } = {}) {
  const pts = [p0.clone()], rads = [r0]; let p = p0.clone(); const d = d0.clone().normalize();
  for (let i = 1; i <= segs; i++) { d.add(rvec(r).multiplyScalar(bend)).add(V(0, up, 0)).normalize(); p = p.clone().addScaledVector(d, len / segs); pts.push(p); rads.push(r0 + (r1 - r0) * Math.pow(i / segs, 0.8)); }
  tube(A, pts, rads, sides, { gnarl, flare, col, seed: r() * 10 }); return { pts, rads };
}
function at(b, t) { const f = clamp(t, 0, 1) * (b.pts.length - 1); const i = Math.min(b.pts.length - 2, Math.floor(f)); const k = f - i; return { p: b.pts[i].clone().lerp(b.pts[i + 1], k), r: b.rads[i] + (b.rads[i + 1] - b.rads[i]) * k, d: b.pts[i + 1].clone().sub(b.pts[i]).normalize() }; }

// a clump of leaf-spray cards in an ellipsoid; normals blend the clump's and the crown's outward directions
function clump(F, c, R, n, size, cc, r, { lit = 0.6, flat = false, droop = 0 } = {}) {
  const col = new THREE.Color(); const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const dir = rvec(r); if (flat && dir.y < -0.2) dir.y *= 0.4; const rr = 0.3 + 0.7 * Math.pow(r(), 0.55);
    const p = c.clone().add(V(dir.x * R.x * rr, dir.y * R.y * rr - droop * rr * rr, dir.z * R.z * rr));
    const nOut = V(dir.x / R.x, dir.y / R.y, dir.z / R.z).normalize();
    const nl = nOut.multiplyScalar(lit).addScaledVector(p.clone().sub(cc).normalize(), 1 - lit).add(V(0, 0.18, 0)).normalize();
    q.setFromEuler(e.set(r() * 6.28, r() * 6.28, r() * 6.28)); const ax = V(1, 0, 0).applyQuaternion(q), ay = V(0, 1, 0).applyQuaternion(q);
    const s = size * (0.75 + r() * 0.5) * 0.5; const ao = clamp(0.5 + 0.32 * rr + 0.22 * (nl.y * 0.5 + 0.5), 0.45, 1.02); col.setRGB(ao, ao, ao * 0.98);
    const w = 0.6 + rr * 0.4; const b0 = F.count;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) F.vert(p.clone().addScaledVector(ax, (u * 2 - 1) * s).addScaledVector(ay, (v * 2 - 1) * s), nl, u, v, col, w);
    F.quad(b0, b0 + 1, b0 + 2, b0 + 3);
  }
}

// ---------------------------------------------------------------- painted leaf-spray atlases (flat cel fills, a lit half, tinted rim)
const LEAF = {
  olive: { pal: ['#3d5634', '#5f7c4a', '#93a877', '#c6d0a2'], line: '#24321c', shape: 'lance', n: 150, len: [26, 38], wid: 0.2, twig: '#5c4632' },
  oak: { pal: ['#2c5a22', '#4a8a2e', '#7eb444', '#bcdc68'], line: '#183212', shape: 'lobed', n: 85, len: [30, 44], wid: 0.42, twig: '#4a3626' },
  laurel: { pal: ['#2a4e26', '#3f7232', '#6c9c48', '#a8c870'], line: '#152a12', shape: 'lance', n: 110, len: [30, 44], wid: 0.3, twig: '#4a3626' },
  apple: { pal: ['#2e5a24', '#4c8a30', '#80b448', '#bede70'], line: '#1a3414', shape: 'oval', n: 100, len: [24, 34], wid: 0.45, twig: '#4a3626', fruit: ['#b81e1a', '#e8402a', '#ff9a6a'], fruitN: 5 },
  golden: { pal: ['#2c5222', '#46802c', '#78ac42', '#b6d468'], line: '#183012', shape: 'oval', n: 95, len: [24, 34], wid: 0.42, twig: '#4a3626', fruit: ['#b07a10', '#f0b828', '#fff2a0'], fruitN: 4 },
  pine: { pal: ['#22482e', '#36683a', '#5c9446', '#9cc66a'], line: '#10261a', shape: 'needle', n: 34, twig: '#6a4630' },
  fir: { pal: ['#1a3c30', '#2a5a40', '#468048', '#7aa860'], line: '#0c2018', shape: 'fishbone', n: 7, twig: '#4a3626' },
  cypress: { pal: ['#1c3826', '#2e5630', '#4c7c3a', '#80a858'], line: '#0e1e14', shape: 'scale', n: 9, twig: '#3a2a1e' },
  bush: { pal: ['#2c5224', '#45782e', '#74a844', '#b2d26a'], line: '#183012', shape: 'oval', n: 150, len: [16, 22], wid: 0.5, twig: '#4a3626' },
  oleander: { pal: ['#2a4e26', '#3f7232', '#6c9c48', '#a8c870'], line: '#152a12', shape: 'lance', n: 100, len: [26, 36], wid: 0.22, twig: '#4a3626', bloom: ['#c23a6a', '#ee6a98', '#ffc2d6'], bloomN: 9 },
  broom: { pal: ['#3a5a20', '#5a8a2a', '#8ab83a', '#c8e070'], line: '#1e3010', shape: 'needle', n: 16, twig: '#4a5a2a', bloom: ['#d89a10', '#f8cc28', '#fff0a0'], bloomN: 16, small: true },
  myrtle: { pal: ['#24461e', '#3a6a2a', '#62983e', '#a0c868'], line: '#132810', shape: 'oval', n: 170, len: [12, 18], wid: 0.48, twig: '#3e2e20', bloom: ['#e8e0d0', '#fffaf0', '#ffffff'], bloomN: 10, small: true },
  vine: { pal: ['#2a5a22', '#468c2e', '#7ab842', '#b8dc66'], line: '#163012', shape: 'lobed', n: 70, len: [26, 36], wid: 0.6, twig: '#5a4028', fruit: ['#3a1a4a', '#6a2a7a', '#a86ab8'], fruitN: 3 },
};
function leafPath(shape, len, wid) {
  const p = new Path2D(); const w = len * wid;
  if (shape === 'lobed') { const N = 26; const pts = []; for (let i = 0; i <= N; i++) { const t = i / N; const hw = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.8) * (0.72 + 0.28 * Math.cos(t * Math.PI * 8)); pts.push([t * len, hw]); } p.moveTo(0, 0); for (const [x, y] of pts) p.lineTo(x, -y); for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
  const k = shape === 'oval' ? 0.5 : 0.36; p.moveTo(0, 0); p.quadraticCurveTo(len * k, -w * 1.4, len, 0); p.quadraticCurveTo(len * k, w * 1.4, 0, 0); p.closePath(); return p;
}
const ATLAS = new Map();
export function leafAtlas(kind) {
  if (ATLAS.has(kind)) return ATLAS.get(kind);
  const L = LEAF[kind] || LEAF.oak; const S = 256; const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); const r = mulberry32(kind.length * 977 + kind.charCodeAt(0));
  const tone = (y) => { const k = clamp(1 - y / S + (r() - 0.5) * 0.55, 0, 1); return k < 0.3 ? [0, 1] : k < 0.62 ? [1, 2] : [2, 3]; };
  const twig = (x0, y0, a, len, w) => { g.strokeStyle = L.twig; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(a + 0.2) * len * 0.5, y0 + Math.sin(a + 0.2) * len * 0.5, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len); g.stroke(); };
  const leaf = (x, y, a, len, wid, shape) => {
    const [d, l] = tone(y); const path = leafPath(shape, len, wid);
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = L.pal[d]; g.fill(path);
    g.save(); g.clip(path); g.fillStyle = L.pal[l]; g.fillRect(0, -len, len * 1.2, len * 0.98); g.restore();
    g.strokeStyle = L.line; g.lineWidth = 1.5; g.stroke(path);
    g.strokeStyle = L.pal[Math.max(0, d)]; g.lineWidth = 1; g.beginPath(); g.moveTo(len * 0.08, 0); g.lineTo(len * 0.82, 0); g.stroke(); g.restore();
  };
  const c = S / 2;
  if (L.shape === 'needle') { // pine fascicles: fans of needles on short twigs, outlined first so the spray reads as one silhouette
    const fans = []; for (let i = 0; i < L.n; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * S * 0.3; fans.push([c + Math.cos(a) * d, c + Math.sin(a) * d, a + (r() - 0.5) * 0.8]); }
    for (const [x, y, a] of fans) twig(c, c, Math.atan2(y - c, x - c), Math.hypot(x - c, y - c), 3);
    const nd = (pass) => { for (const [x, y, a] of fans) { const [dk, lt] = tone(y); for (let k = 0; k < 15; k++) { const b = a + (k / 14 - 0.5) * 1.9; const len = (L.small ? 18 : 30) + r() * 12; g.strokeStyle = pass ? L.pal[k % 3 ? lt : dk] : L.line; g.lineWidth = pass ? 2 : 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * len, y + Math.sin(b) * len); g.stroke(); } } };
    const r0 = r; nd(0); nd(1); void r0;
  } else if (L.shape === 'fishbone') { // fir: flat needle sprays along forking twigs
    const sprig = (x, y, a, len, depth) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; const steps = Math.floor(len / 5);
      for (const pass of [0, 1]) { for (let i = 1; i <= steps; i++) { const t = i / steps; const px = x + (ex - x) * t, py = y + (ey - y) * t; const nl = 13 * (1 - t * 0.5); for (const sd of [-1, 1]) { const b = a + sd * 1.05; g.strokeStyle = pass ? L.pal[tone(py)[sd > 0 ? 1 : 0]] : L.line; g.lineWidth = pass ? 2.2 : 4.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * nl, py + Math.sin(b) * nl); g.stroke(); } } }
      g.strokeStyle = L.twig; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      if (depth > 0) for (let k = 0; k < 3; k++) { const t = 0.3 + k * 0.22; sprig(x + (ex - x) * t, y + (ey - y) * t, a + (k % 2 ? 0.7 : -0.7), len * 0.45, depth - 1); }
    };
    for (let i = 0; i < L.n; i++) sprig(c, c, (i / L.n) * Math.PI * 2 + r() * 0.4, S * 0.4, 1);
  } else if (L.shape === 'scale') { // cypress: dense scale-leaf fronds branching fractally
    const frond = (x, y, a, len, w, depth, pass) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; g.strokeStyle = pass ? L.pal[tone(ey)[depth % 2]] : L.line; g.lineWidth = pass ? w : w + 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); if (depth <= 0) return;
      for (let k = 1; k <= 4; k++) { const t = k / 5; frond(x + (ex - x) * t, y + (ey - y) * t, a + (k % 2 ? 0.75 : -0.75), len * 0.42, Math.max(2.5, w * 0.72), depth - 1, pass); }
    };
    const rs = []; for (let i = 0; i < L.n; i++) rs.push([(i / L.n) * Math.PI * 2 + r() * 0.5, S * (0.3 + r() * 0.12)]);
    for (const pass of [0, 1]) for (const [a, len] of rs) frond(c, c, a, len, 7, 2, pass);
  } else { // broadleaves on twigs
    const twigs = []; const nT = 6; for (let i = 0; i < nT; i++) { const a = (i / nT) * Math.PI * 2 + r() * 0.6; const len = S * (0.32 + r() * 0.1); twigs.push([a, len]); twig(c, c, a, len, 3); }
    for (let i = 0; i < L.n; i++) { const [a, len] = twigs[i % nT]; const t = 0.15 + r() * 0.85; const x = c + Math.cos(a) * len * t + (r() - 0.5) * 10, y = c + Math.sin(a) * len * t + (r() - 0.5) * 10; const la = a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7); leaf(x, y, la, L.len[0] + r() * (L.len[1] - L.len[0]), L.wid, L.shape); }
  }
  const dot = (x, y, rad, cols) => { g.fillStyle = L.line; g.beginPath(); g.arc(x, y, rad + 1.4, 0, Math.PI * 2); g.fill(); g.fillStyle = cols[0]; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); g.fillStyle = cols[1]; g.beginPath(); g.arc(x - rad * 0.2, y - rad * 0.2, rad * 0.72, 0, Math.PI * 2); g.fill(); g.fillStyle = cols[2]; g.beginPath(); g.arc(x - rad * 0.38, y - rad * 0.4, rad * 0.26, 0, Math.PI * 2); g.fill(); };
  if (L.fruit) for (let i = 0; i < L.fruitN; i++) { const a = r() * 6.28, d = 20 + r() * 70; dot(c + Math.cos(a) * d, c + Math.sin(a) * d, 9 + r() * 3, L.fruit); }
  if (L.bloom) for (let i = 0; i < L.bloomN; i++) { // five-petal blossoms
    const a = r() * 6.28, d = 14 + r() * 82; const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d; const pr = L.small ? 5 : 8;
    for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI * 2 + a; g.fillStyle = L.line; g.beginPath(); g.arc(x + Math.cos(b) * pr * 0.8, y + Math.sin(b) * pr * 0.8, pr * 0.72, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI * 2 + a; g.fillStyle = L.bloom[k < 2 ? 0 : 1]; g.beginPath(); g.arc(x + Math.cos(b) * pr * 0.8, y + Math.sin(b) * pr * 0.8, pr * 0.58, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = L.bloom[2]; g.beginPath(); g.arc(x, y, pr * 0.32, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ATLAS.set(kind, t); return t;
}
// bark: vertical cel strips, plates and dark fissures
const BARK = { olive: ['#4e4034', '#6e5c4a', '#93806a', '#2a2018'], oak: ['#3e3026', '#5c4a3a', '#7e6a54', '#1e160f'], pine: ['#5a3424', '#8a5236', '#b4744c', '#2a160e'], fir: ['#3a2a22', '#56402e', '#76583e', '#1c120c'], cypress: ['#4a3426', '#6a4a34', '#8a6646', '#24180f'], wood: ['#5e4630', '#806246', '#a4845e', '#2e2016'] };
const BARKTEX = new Map();
function barkTex(kind) {
  if (BARKTEX.has(kind)) return BARKTEX.get(kind); const P = BARK[kind] || BARK.oak; const W = 128, H = 256; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); const r = mulberry32(kind.length * 31 + 5);
  g.fillStyle = P[1]; g.fillRect(0, 0, W, H);
  if (kind === 'pine') { for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, w = 14 + r() * 18, h = 20 + r() * 30; g.fillStyle = P[3]; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = P[r() < 0.5 ? 1 : 2]; g.fillRect(x, y, w, h); g.fillStyle = P[0]; g.fillRect(x, y + h * 0.65, w, h * 0.35); } }
  else for (let i = 0; i < 60; i++) { const x = r() * W, w = 3 + r() * 9, y = r() * H, h = 30 + r() * 120; g.fillStyle = P[r() < 0.45 ? 2 : 0]; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 1.4, y + h / 2, x + (r() - 0.5) * 6, y + h); g.lineTo(x + w, y + h); g.quadraticCurveTo(x + w * 2.2, y + h / 2, x + w, y); g.fill(); }
  g.strokeStyle = P[3]; g.lineCap = 'round'; for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * H; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 12, y + 20, x + (r() - 0.5) * 12, y + 40, x + (r() - 0.5) * 8, y + 50 + r() * 50); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; BARKTEX.set(kind, t); return t;
}

// ---------------------------------------------------------------- materials (sway shared by wood and leaves so they stay together)
const SWAY = `
  mat4 swIM = mat4(1.0);
  #ifdef USE_INSTANCING
  swIM = instanceMatrix;
  #endif
  vec4 swRoot = modelMatrix * swIM * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 swW = modelMatrix * swIM * vec4(transformed, 1.0);
  float swH = max(0.0, swW.y - swRoot.y); float swPh = dot(swRoot.xz, vec2(0.37, 0.23));
  float swGust = pow(0.5 + 0.5 * sin(dot(swRoot.xz, uWindDir) * 0.12 - uTime * 0.9), 3.0);
  vec2 swOff = uWindDir * (0.35 + swGust * 1.1) * 0.002 * uSway + vec2(sin(uTime * 1.3 + swPh), cos(uTime * 1.1 + swPh * 1.3)) * 0.001 * uSway;
  swW.xz += swOff * swH * swH * uWindAmp;
  #ifdef SW_FLUTTER
  float swF = aWind * uWindAmp * (0.6 + swGust);
  swW.xyz += vec3(sin(uTime * 5.3 + swW.x * 3.1 + swW.y * 2.3), sin(uTime * 4.1 + swW.z * 2.7) * 0.6, cos(uTime * 4.7 + swW.y * 3.3 + swW.z * 1.7)) * 0.022 * swF;
  #endif
  vec4 mvPosition = viewMatrix * swW; gl_Position = projectionMatrix * mvPosition;`;
const MATS = new Map();
function swayMat(key, params, { flutter = false, sway = 1, foliage = false } = {}) {
  const k = key + '|' + sway; if (MATS.has(k)) return MATS.get(k);
  const m = new THREE.MeshToonMaterial(params);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: T.WIND.time, uWindDir: T.WIND.dir, uWindAmp: T.WIND.amp, uSway: { value: sway } });
    sh.vertexShader = (flutter ? '#define SW_FLUTTER\n' : '') + 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform float uSway; attribute float aWind;\n' + sh.vertexShader.replace('#include <project_vertex>', SWAY);
    if (foliage) sh.fragmentShader = sh.fragmentShader
      .replace('#include <alphatest_fragment>', 'diffuseColor.a = clamp((diffuseColor.a - 0.5) / max(fwidth(diffuseColor.a), 1e-4) + 0.5, 0.0, 1.0); if (diffuseColor.a < 0.5) discard;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
  };
  m.customProgramCacheKey = () => 'sway|' + (flutter ? 'f' : '') + (foliage ? 'l' : '');
  MATS.set(k, m); return m;
}
// the leaf cards' stand-in for the ink pre-pass (core/ink.js): same sway and alpha, depth plus a flat 'clear' normal,
// so crowns hide the outlines of what is behind them and get a clean outline of their own against the sky
const OCC = new Map();
export function inkOccluderMat(kind, sway = 1) {
  const k = kind + '|' + sway; if (OCC.has(k)) return OCC.get(k);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { map: { value: leafAtlas(kind) }, uTime: T.WIND.time, uWindDir: T.WIND.dir, uWindAmp: T.WIND.amp, uSway: { value: sway } },
    vertexShader: '#define SW_FLUTTER\nuniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform float uSway; attribute float aWind; varying vec2 vUv;\nvoid main(){ vUv = uv; vec3 transformed = position;\n' + SWAY + '\n}',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ float a = texture2D(map, vUv).a; a = clamp((a - 0.5) / max(fwidth(a), 1e-4) + 0.5, 0.0, 1.0); if (a < 0.5) discard; gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); }',
  });
  OCC.set(k, m); return m;
}
export const foliageMat = (kind, sway = 1) => swayMat('leaf:' + kind, { map: leafAtlas(kind), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, gradientMap: T.gradientMap([0.46, 0.74, 1.0]) }, { flutter: true, sway, foliage: true });
export const woodMat = (kind, sway = 1) => swayMat('wood:' + kind, { map: barkTex(kind), vertexColors: true, gradientMap: T.gradientMap([0.42, 0.7, 1.0]) }, { sway });

// ---------------------------------------------------------------- species
const TREE = {
  olive(r, lod) { // gnarled, twisting trunk splitting into leaders; a wide, broken silver-green crown
    const W = new Acc(), F = new Acc(); const sd = lod ? 5 : 9; const tips = [];
    const tr = grow(W, r, V(), V((r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.5), 1.3 + r() * 0.6, 0.32, 0.2, 6, { bend: 0.22, sides: sd, gnarl: 0.3, flare: 0.5 });
    const nL = 2 + (r() < 0.6 ? 1 : 0);
    for (let i = 0; i < nL; i++) {
      const a = at(tr, 0.78 + r() * 0.22); const L = grow(W, r, a.p, spread(a.d, 0.5 + r() * 0.35, r, (i / nL) * 6.28 + r()), 1.4 + r() * 0.8, a.r * 0.78, 0.06, 5, { bend: 0.28, up: 0.06, sides: sd - 2, gnarl: 0.18 });
      for (let k = 0; k < 3; k++) { const b = at(L, 0.35 + k * 0.24 + r() * 0.08); const tw = grow(W, r, b.p, spread(b.d, 0.65 + r() * 0.4, r), 0.7 + r() * 0.6, b.r * 0.7, 0.025, 3, { bend: 0.3, up: 0.12, sides: Math.max(4, sd - 4) }); tips.push(tw.pts.at(-1)); }
      tips.push(L.pts.at(-1));
    }
    const cc = tips.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / tips.length); cc.y -= 0.4;
    for (const t of tips) clump(F, t, V(1.05, 0.72, 1.05).multiplyScalar(0.85 + r() * 0.35), lod ? 13 : 32, lod ? 1.8 : 1.25, cc, r);
    return { wood: W.geo(), leaves: F.geo(), leaf: 'olive', bark: 'olive' };
  },
  oak(r, lod, leaf = 'oak') { // stout buttressed trunk, spreading limbs, a big rounded crown of lobed leaves
    const W = new Acc(), F = new Acc(); const sd = lod ? 5 : 10; const tips = [];
    const tr = grow(W, r, V(), V((r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2), 2.2 + r() * 0.7, 0.42, 0.28, 6, { bend: 0.1, sides: sd, gnarl: 0.12, flare: 0.6 });
    const nL = 4 + Math.floor(r() * 2);
    for (let i = 0; i < nL; i++) {
      const a = at(tr, 0.55 + (i / nL) * 0.45); const L = grow(W, r, a.p, spread(a.d, 0.55 + r() * 0.35, r, (i / nL) * 6.28 * 1.618), 1.9 + r() * 0.9, a.r * 0.62, 0.07, 5, { bend: 0.2, up: 0.05, sides: sd - 3 });
      for (let k = 0; k < 2 + (r() < 0.5 ? 1 : 0); k++) { const b = at(L, 0.45 + k * 0.25); const tw = grow(W, r, b.p, spread(b.d, 0.55 + r() * 0.4, r), 0.9 + r() * 0.6, b.r * 0.66, 0.03, 3, { bend: 0.25, up: 0.1, sides: Math.max(4, sd - 5) }); tips.push(tw.pts.at(-1)); }
      tips.push(L.pts.at(-1));
    }
    const cc = tips.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / tips.length); cc.y -= 0.3;
    for (const t of tips) clump(F, t, V(1.3, 1.05, 1.3).multiplyScalar(0.85 + r() * 0.3), lod ? 14 : 34, lod ? 2.0 : 1.4, cc, r);
    return { wood: W.geo(), leaves: F.geo(), leaf, bark: 'oak' };
  },
  pine(r, lod) { // Mediterranean stone pine: a tall leaning bare trunk under a flat, layered umbrella crown
    const W = new Acc(), F = new Acc(); const sd = lod ? 5 : 9; const tips = []; const lean = V((r() - 0.5) * 0.35, 1, (r() - 0.5) * 0.35);
    const tr = grow(W, r, V(), lean, 4.6 + r() * 1.6, 0.3, 0.16, 8, { bend: 0.07, up: 0.02, sides: sd, gnarl: 0.08, flare: 0.35 });
    const nL = 5 + Math.floor(r() * 2);
    for (let i = 0; i < nL; i++) {
      const a = at(tr, 0.72 + (i / nL) * 0.28); const L = grow(W, r, a.p, spread(V(0, 1, 0), 1.0 + r() * 0.3, r, (i / nL) * 6.28 + r() * 0.5), 1.7 + r() * 0.9, a.r * 0.7, 0.05, 4, { bend: 0.12, up: 0.07, sides: sd - 3 });
      for (let k = 0; k < 2; k++) { const b = at(L, 0.5 + k * 0.3); const tw = grow(W, r, b.p, spread(b.d, 0.5 + r() * 0.3, r), 0.8 + r() * 0.5, b.r * 0.7, 0.025, 3, { bend: 0.2, up: 0.15, sides: 4 }); tips.push(tw.pts.at(-1)); }
      tips.push(L.pts.at(-1));
    }
    const cc = tips.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / tips.length); cc.y -= 1.2;
    for (const t of tips) clump(F, t.clone().add(V(0, 0.15, 0)), V(1.3, 0.5, 1.3).multiplyScalar(0.85 + r() * 0.3), lod ? 13 : 30, lod ? 1.8 : 1.3, cc, r, { flat: true, lit: 0.45 });
    return { wood: W.geo(), leaves: F.geo(), leaf: 'pine', bark: 'pine' };
  },
  fir(r, lod) { // whorls of drooping branches tapering to a spire
    const W = new Acc(), F = new Acc(); const sd = lod ? 5 : 8; const H = 6.5 + r() * 2.5;
    const tr = grow(W, r, V(), V((r() - 0.5) * 0.08, 1, (r() - 0.5) * 0.08), H, 0.26, 0.03, 9, { bend: 0.03, sides: sd, flare: 0.4 });
    for (let y = 1.1; y < H - 0.4; y += 0.5 + r() * 0.15) {
      const u = y / H; const len = (1 - u) * 2.3 + 0.35; const nb = lod ? 4 : 5; const ph = r() * 6.28; const a = at(tr, u);
      for (let k = 0; k < nb; k++) {
        const az = ph + (k / nb) * 6.28; const d = V(Math.cos(az), -0.18 - r() * 0.15, Math.sin(az)).normalize();
        if (!lod) grow(W, r, a.p, d, len, Math.max(0.02, a.r * 0.35), 0.012, 2, { bend: 0.05, up: -0.04, sides: 4 });
        const tip = a.p.clone().addScaledVector(d, len * 0.92); const mid = a.p.clone().addScaledVector(d, len * 0.5);
        const ccx = a.p.clone().add(V(0, 0.3, 0));
        clump(F, tip, V(len * 0.4, 0.22, len * 0.4), lod ? 4 : 9, lod ? 1.5 : 1.0, ccx, r, { lit: 0.3, droop: 0.15 }); clump(F, mid, V(len * 0.32, 0.2, len * 0.32), lod ? 3 : 6, lod ? 1.4 : 0.95, ccx, r, { lit: 0.3 });
      }
    }
    clump(F, at(tr, 1).p, V(0.3, 0.5, 0.3), 5, 0.6, at(tr, 0.9).p, r, { lit: 0.5 });
    return { wood: W.geo(), leaves: F.geo(), leaf: 'fir', bark: 'fir' };
  },
  cypress(r, lod) { // the dark flame of the Mediterranean: a dense spindle of scale-leaf fronds around a straight axis
    const W = new Acc(), F = new Acc(); const H = 6.5 + r() * 3; const R0 = 0.75 + r() * 0.3;
    const tr = grow(W, r, V(), V(0, 1, 0), H * 0.7, 0.2, 0.05, 5, { bend: 0.02, sides: lod ? 5 : 8, flare: 0.3 });
    const K = lod ? 12 : 22;
    for (let k = 0; k < K; k++) {
      const u = (k + 0.5) / K; const y = 0.45 + u * (H - 0.45); const rp = R0 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.18 + u * 0.86)), 0.85) * (u < 0.25 ? 0.85 + u * 0.6 : 1) + 0.08;
      const ax = at(tr, Math.min(1, y / (H * 0.7))).p.setY(y); const c = ax.clone().add(V((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12));
      clump(F, c, V(rp, (H / K) * 1.0, rp), lod ? 12 : 28, lod ? 1.3 : 0.95, ax.clone(), r, { lit: 0.25 });
    }
    return { wood: W.geo(), leaves: F.geo(), leaf: 'cypress', bark: 'cypress' };
  },
  laurel(r, lod) { return { ...TREE.oak(r, lod, 'laurel'), leaf: 'laurel' }; },
  apple(r, lod) { const t = TREE.olive(r, lod); return { ...t, leaf: 'apple', bark: 'oak' }; },
  golden(r, lod) { const t = TREE.olive(r, lod); return { ...t, leaf: 'golden', bark: 'olive' }; },
};
const BUSH = { // low mounds of clumps on short stems; flowering kinds carry blossoms in their atlas
  bush(r, lod, leaf = 'bush', size = 1) {
    const W = new Acc(), F = new Acc(); const n = 3 + Math.floor(r() * 3); const cc = V(0, 0.25 * size, 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + r(), d = (0.25 + r() * 0.35) * size; const top = V(Math.cos(a) * d, (0.45 + r() * 0.35) * size, Math.sin(a) * d);
      if (!lod) grow(W, r, V(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05), top.clone().normalize(), top.length() * 0.85, 0.035 * size, 0.012, 3, { bend: 0.2, sides: 4 });
      clump(F, top, V(0.6, 0.46, 0.6).multiplyScalar(size * (0.85 + r() * 0.3)), lod ? 10 : 24, (lod ? 1.05 : 0.8) * size, cc, r, { lit: 0.55 });
    }
    return { wood: W.count ? W.geo() : null, leaves: F.geo(), leaf, bark: 'wood' };
  },
  oleander(r, lod) { return BUSH.bush(r, lod, 'oleander', 1.25); },
  myrtle(r, lod) { return BUSH.bush(r, lod, 'myrtle', 0.9); },
  broom(r, lod) { return BUSH.bush(r, lod, 'broom', 0.95); },
  vine(r, lod) { return BUSH.bush(r, lod, 'vine', 0.8); },
};
const GEO = new Map(); const VARIANTS = 3;
function treeGeo(kind, v, lod) {
  const key = kind + '|' + v + '|' + lod; if (GEO.has(key)) return GEO.get(key);
  const fn = TREE[kind] || BUSH[kind]; const out = fn(mulberry32(1009 + v * 7717 + kind.length * 131 + kind.charCodeAt(1) * 17), lod); GEO.set(key, out); return out;
}
export const TREE_KINDS = Object.keys(TREE), BUSH_KINDS = Object.keys(BUSH);

/** Instanced woods: add trees / bushes anywhere, then build() one pair of InstancedMeshes per species x variant x LOD. */
export class Grove {
  constructor({ shadows = true } = {}) { this.list = []; this.shadows = shadows; }
  add(kind, x, y, z, { s = 1, ry = null, lod = 0, v = null, tint = null } = {}) { const it = { kind, x, y, z, s, ry: ry ?? ((x * 12.9898 + z * 78.233) % 6.28), lod, v: v ?? Math.abs(Math.floor(x * 3.1 + z * 7.7)) % VARIANTS, tint }; this.list.push(it); return it; }
  build() {
    const g = new THREE.Group(); g.name = 'grove'; const groups = new Map();
    for (const it of this.list) { const k = it.kind + '|' + it.v + '|' + it.lod; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V(), col = new THREE.Color();
    for (const [k, items] of groups) {
      const [kind, v, lod] = k.split('|'); const geo = treeGeo(kind, +v, +lod);
      const mk = (geom, mat, wood) => {
        const im = new THREE.InstancedMesh(geom, mat, items.length);
        items.forEach((it, i) => { q.setFromAxisAngle(V(0, 1, 0), it.ry); m4.compose(p.set(it.x, it.y, it.z), q, s.setScalar(it.s)); im.setMatrixAt(i, m4); const j = Math.sin(it.x * 7.1 + it.z * 3.3) * 0.5 + 0.5; col.setRGB(1, 1, 1).offsetHSL((j - 0.5) * 0.04, (j - 0.5) * 0.1, (j - 0.5) * 0.08); if (it.tint) col.multiply(C(it.tint)); im.setColorAt(i, col); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = this.shadows && +lod === 0; im.receiveShadow = wood; im.onBeforeRender = T.tickWind; im.name = (wood ? 'wood:' : 'leaves:') + kind;
        if (!wood || +lod) im.userData.noInk = true; if (!wood) { im.userData.noAO = true; im.userData.inkOccluder = inkOccluderMat(geo.leaf); } g.add(im); return im;
      };
      if (geo.wood) mk(geo.wood, woodMat(geo.bark), true); mk(geo.leaves, foliageMat(geo.leaf), false);
    }
    this.group = g; return g;
  }
  /** invisible stand-ins at a few trees so birds can perch on the crowns (critters.perchesFrom) */
  perches(n = 6, filter = () => true) {
    const out = []; const pool = this.list.filter((it) => !it.lod && TREE[it.kind] && filter(it));
    for (let i = 0; i < n && pool.length; i++) { const it = pool.splice(Math.floor((i * 7919) % pool.length), 1)[0]; const geo = treeGeo(it.kind, it.v, it.lod); const o = new THREE.Group(); o.position.set(it.x, it.y, it.z); o.rotation.y = it.ry; o.scale.setScalar(it.s); const m = new THREE.Mesh(geo.leaves); m.visible = false; o.add(m); out.push(o); }
    return out;
  }
}
/** one tree as a plain group (props, event sets) */
export function tree(kind = 'olive', { v = 0, s = 1, lod = 0 } = {}) {
  const geo = treeGeo(kind, v, lod); const g = new THREE.Group(); g.name = 'tree:' + kind;
  if (geo.wood) { const w = new THREE.Mesh(geo.wood, woodMat(geo.bark)); w.castShadow = true; w.receiveShadow = true; w.onBeforeRender = T.tickWind; g.add(w); }
  const l = new THREE.Mesh(geo.leaves, foliageMat(geo.leaf)); l.castShadow = true; l.userData.noInk = true; l.userData.noAO = true; l.userData.inkOccluder = inkOccluderMat(geo.leaf); l.onBeforeRender = T.tickWind; g.add(l); g.scale.setScalar(s); return g;
}

// ---------------------------------------------------------------- cel grass: instanced tufts, banded root -> tip, rolling wind waves with sheen
export const GRASS_PAL = {
  meadow: ['#24501f', '#3c842c', '#86c046', '#e8f2a0'], lush: ['#1f4a26', '#33803a', '#78c050', '#e2f4a8'], dry: ['#5a6a2a', '#97a046', '#e0d27a', '#fff2c0'],
  marsh: ['#2a4a30', '#4a7a40', '#9ab860', '#eef0c0'], reed: ['#3a5a2a', '#6a8a3a', '#c8c070', '#fff4c8'], dusk: ['#3a4a2a', '#6a7a36', '#c4b25a', '#ffe0a8'],
};
function tuftGeometry(blades = 7, segs = 4, { width = 0.05, lean = 0.32, seed = 3 } = {}) {
  const r = mulberry32(seed); const A = new Acc(); const white = C('#ffffff');
  for (let b = 0; b < blades; b++) {
    const az = (b / blades) * 6.28 + r() * 0.6; const h = 0.55 + r() * 0.45; const ln = lean * (0.4 + r() * 0.8); const ox = Math.cos(az) * 0.06 * r(), oz = Math.sin(az) * 0.06 * r(); const w = width * (0.75 + r() * 0.5); const fold = (r() - 0.5) * 0.8; const seedU = r();
    const dir = V(Math.cos(az), 0, Math.sin(az)); const side = V(-dir.z, 0, dir.x).applyAxisAngle(dir, 0).applyAxisAngle(V(0, 1, 0), fold);
    const b0 = A.count;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs; const ww = w * Math.pow(1 - t, 0.85) + 0.002; const y = h * t; const off = ln * t * t * h;
      const c = V(ox, y, oz).addScaledVector(dir, off); const n = V(0, 1, 0);
      A.vert(c.clone().addScaledVector(side, -ww), n, seedU, t, white, 0); A.vert(c.clone().addScaledVector(side, ww), n, seedU, t, white, 0);
      if (i < segs) { const a = b0 + i * 2; A.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
  }
  return A.geo();
}
const GRASS_VERT = `
  mat4 gIM = instanceMatrix;
  vec4 groot = modelMatrix * gIM * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 gw = modelMatrix * gIM * vec4(transformed, 1.0);
  float gk = uv.y * uv.y; float gh = max(0.0, gw.y - groot.y);
  float gph = dot(groot.xz, uWindDir); vec2 gperp = vec2(-uWindDir.y, uWindDir.x);
  float gwave = 0.5 + 0.5 * sin(gph * 0.42 - uTime * 1.9 + sin(dot(groot.xz, gperp) * 0.13 + uTime * 0.3) * 1.6);
  gwave = gwave * gwave * (0.75 + 0.25 * sin(dot(groot.xz, gperp) * 0.31 - uTime * 0.5));
  float ggust = pow(0.5 + 0.5 * sin(gph * 0.09 - uTime * 0.55), 3.0);
  vec2 goff = uWindDir * (0.12 + gwave * 0.62 + ggust * 0.4) * uWindAmp * uFlex + vec2(sin(uTime * 3.1 + dot(groot.xz, vec2(1.7, 2.3))), cos(uTime * 2.7 + groot.x * 3.1)) * 0.06 * uFlex;
  vec2 gd = groot.xz - uPtr.xz; float gr = length(gd); goff += (gr > 0.001 ? gd / gr : vec2(0.0)) * smoothstep(uPtrR, 0.0, gr) * uPtrK;
  gw.xz += goff * gk * gh; gw.y -= dot(goff, goff) * gk * gh * 0.42;
  vGH = uv.y; vGSeed = uv.x; vGWave = gwave; vGW = gw.xyz;
  vec4 mvPosition = viewMatrix * gw; gl_Position = projectionMatrix * mvPosition;`;
const GRASS_FRAG = `
  float gb1 = smoothstep(0.26, 0.31, vGH + (vGSeed - 0.5) * 0.08), gb2 = smoothstep(0.6, 0.65, vGH + (vGSeed - 0.5) * 0.1);
  vec3 gcol = mix(mix(uRoot, uMid, gb1), uTip, gb2);
  float gp = sin(vGW.x * 0.11 + sin(vGW.z * 0.07) * 2.0) * sin(vGW.z * 0.13 + vGW.x * 0.05) * 0.5 + 0.5;
  gcol = mix(gcol, gcol * vec3(1.08, 1.05, 0.84), smoothstep(0.55, 0.8, gp) * uPatch);
  gcol *= vColor;
  gcol = mix(gcol, uSheen, smoothstep(0.55, 0.92, vGWave) * smoothstep(0.45, 0.95, vGH) * uSheenK);
  diffuseColor.rgb = gcol;`;
/** spots: [x, y, z, height, tint(0..1 dry mix), width] */
export function celGrass(spots, { pal = GRASS_PAL.meadow, blades = 7, flex = 1, sheenK = 0.26, patch = 1, dry = GRASS_PAL.dry, width = 0.05, lean = 0.32, name = 'celGrass', seed = 3 } = {}) {
  const geo = tuftGeometry(blades, 4, { width, lean, seed });
  const mat = new THREE.MeshToonMaterial({ side: THREE.DoubleSide, gradientMap: T.gradientMap([0.55, 0.8, 1.0]) });
  const U = { uTime: T.WIND.time, uWindDir: T.WIND.dir, uWindAmp: T.WIND.amp, uPtr: T.WIND.ptr, uPtrR: T.WIND.ptrR, uPtrK: T.WIND.ptrK, uFlex: { value: flex }, uRoot: { value: C(pal[0]) }, uMid: { value: C(pal[1]) }, uTip: { value: C(pal[2]) }, uSheen: { value: C(pal[3]) }, uSheenK: { value: sheenK }, uPatch: { value: patch } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform vec3 uPtr; uniform float uPtrR; uniform float uPtrK; uniform float uFlex;\nvarying float vGH; varying float vGSeed; varying float vGWave; varying vec3 vGW;\n' + sh.vertexShader.replace('#include <project_vertex>', GRASS_VERT);
    sh.fragmentShader = 'uniform vec3 uRoot, uMid, uTip, uSheen; uniform float uSheenK, uPatch;\nvarying float vGH; varying float vGSeed; varying float vGWave; varying vec3 vGW;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', GRASS_FRAG)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize((viewMatrix * vec4(0.12, 1.0, 0.1, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'celGrass';
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length)); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(), p = V(), c = new THREE.Color(); const dryC = C(dry[2]).multiply(C(pal[2]).clone().addScalar(1e-3).setRGB(1 / Math.max(0.05, C(pal[2]).r), 1 / Math.max(0.05, C(pal[2]).g), 1 / Math.max(0.05, C(pal[2]).b)));
  const r = mulberry32(seed * 13 + spots.length);
  spots.forEach(([x, y, z, h, j = 0, w = 1], i) => {
    q.setFromEuler(e.set((r() - 0.5) * 0.25, r() * 6.28, (r() - 0.5) * 0.25)); m4.compose(p.set(x, y, z), q, s.set(w * (0.8 + r() * 0.5), h, w * (0.8 + r() * 0.5))); mesh.setMatrixAt(i, m4);
    c.setRGB(1, 1, 1).lerp(dryC, clamp(j, 0, 1) * 0.8).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08); mesh.setColorAt(i, c);
  });
  if (!spots.length) { mesh.setColorAt(0, c.setRGB(1, 1, 1)); mesh.count = 0; }
  mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.onBeforeRender = T.tickWind; mesh.name = name; return mesh;
}

// ---------------------------------------------------------------- 3D cel flowers (instanced; they bend with the same wind as the grass)
function stem(A, h, col, { r0 = 0.022, bend = 0.08, seed = 1 } = {}) { const r = mulberry32(seed); const pts = []; const rads = []; for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push(V(Math.sin(t * 2.2 + r()) * bend * t, h * t, Math.cos(t * 1.7) * bend * 0.4 * t)); rads.push(r0 * (1 - t * 0.4)); } tube(A, pts, rads, 5, { col: C(col), uRep: 1, vRep: 1 }); return pts.at(-1); }
function blade(A, base, dir, len, w, colA, colB, segs = 3, up = 0.4) { // a lance leaf (two-tone split down the midrib)
  const side = V().crossVectors(dir, V(0, 1, 0)).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0); const n = V().crossVectors(side, dir).normalize(); const b0 = A.count;
  for (let i = 0; i <= segs; i++) { const t = i / segs; const ww = w * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)); const c = base.clone().addScaledVector(dir, len * t).add(V(0, up * len * t * (1 - t), 0)); A.vert(c.clone().addScaledVector(side, -ww), n, 0, t, C(colA)); A.vert(c, n, 0.5, t, C(colB)); A.vert(c.clone().addScaledVector(side, ww), n, 1, t, C(colB)); if (i < segs) { const a = b0 + i * 3; A.quad(a, a + 3, a + 4, a + 1); A.quad(a + 1, a + 4, a + 5, a + 2); } }
}
// a cupped petal: rows across, rings out; colours band from the throat to the rim
function petal(A, ctr, out, up, R, wid, cup, cols, { rows = 3, rings = 3, droop = 0, notch = 0 } = {}) {
  const side = V().crossVectors(up, out).normalize(); const b0 = A.count;
  for (let i = 0; i <= rings; i++) { const v = i / rings; const band = v < 0.22 ? 0 : v < 0.7 ? 1 : 2;
    for (let j = 0; j <= rows; j++) { const u = (j / rows) * 2 - 1; const ww = wid * Math.sin(Math.PI * (0.18 + v * 0.7)) * (1 - notch * (v > 0.85 ? Math.abs(Math.sin(u * 6)) : 0));
      const p = ctr.clone().addScaledVector(out, R * v).addScaledVector(up, cup * v * v - droop * v * v * v + Math.abs(u) * cup * 0.35 * v).addScaledVector(side, u * ww);
      A.vert(p, up.clone().addScaledVector(out, -0.4).normalize(), (u + 1) / 2, v, C(cols[band]), 0); } }
  for (let i = 0; i < rings; i++) for (let j = 0; j < rows; j++) { const a = b0 + i * (rows + 1) + j, b = a + rows + 1; A.quad(a, b, b + 1, a + 1); }
}
function knob(A, ctr, R, h, cols, n = 8) { const b0 = A.count; A.vert(ctr.clone().add(V(0, h, 0)), V(0, 1, 0), 0.5, 1, C(cols[1])); for (let i = 0; i <= n; i++) { const a = (i / n) * 6.28; A.vert(ctr.clone().add(V(Math.cos(a) * R, 0, Math.sin(a) * R)), V(Math.cos(a), 0.6, Math.sin(a)).normalize(), i / n, 0, C(cols[0])); } for (let i = 0; i < n; i++) A.i.push(b0, b0 + 1 + i + 1, b0 + 1 + i); }
const FLOWER = {
  poppy(seed) { const A = new Acc(); const top = stem(A, 1, '#5a8a34', { seed }); blade(A, V(0, 0.18, 0), V(0.8, 0.5, 0.2).normalize(), 0.32, 0.05, '#3e6e28', '#64a03a'); blade(A, V(0, 0.32, 0), V(-0.7, 0.6, -0.3).normalize(), 0.26, 0.045, '#3e6e28', '#64a03a');
    const up = V(0.2, 1, 0.1).normalize(); for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.28 + 0.3; const out = V(Math.cos(a), 0, Math.sin(a)).addScaledVector(up, 0.35).normalize(); petal(A, top, out, up, 0.2, 0.15, 0.13, ['#3a0c0c', '#d82a1c', '#ff6a40'], { droop: 0.02 }); } knob(A, top.clone().add(V(0, 0.02, 0)), 0.04, 0.04, ['#2e3a14', '#1a1a10'], 6); return A.geo(); },
  daisy(seed) { const A = new Acc(); const top = stem(A, 1, '#5a8a34', { seed, r0: 0.018 }); blade(A, V(0, 0.08, 0), V(0.9, 0.3, 0.1).normalize(), 0.24, 0.05, '#3e6e28', '#64a03a');
    const up = V(0.1, 1, 0.25).normalize(); for (let k = 0; k < 13; k++) { const a = (k / 13) * 6.28; const out = V(Math.cos(a), 0, Math.sin(a)).addScaledVector(up, 0.12).normalize(); petal(A, top, out, up, 0.15, 0.035, 0.02, ['#d8dce8', '#fbfbf2', '#ffffff'], { rows: 1, rings: 2, droop: 0.04 }); } knob(A, top.clone().add(V(0, 0.012, 0)), 0.05, 0.03, ['#e8a010', '#ffd030'], 8); return A.geo(); },
  cornflower(seed) { const A = new Acc(); const top = stem(A, 1, '#6a8a50', { seed, r0: 0.016 }); blade(A, V(0, 0.25, 0), V(0.6, 0.8, 0.1).normalize(), 0.3, 0.025, '#4e6e40', '#7a9a60');
    const up = V(0, 1, 0.15).normalize(); for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.28; const out = V(Math.cos(a), 0, Math.sin(a)).addScaledVector(up, 0.45).normalize(); petal(A, top, out, up, 0.12, 0.05, 0.05, ['#1a2a6a', '#2f5ad0', '#6a98ff'], { rows: 2, rings: 2, notch: 0.35 }); } knob(A, top.clone().add(V(0, 0.03, 0)), 0.03, 0.03, ['#1a1a4a', '#3a2a7a'], 6); return A.geo(); },
  lavender(seed) { const A = new Acc(); const r = mulberry32(seed); const top = stem(A, 1, '#6a8a5a', { seed, r0: 0.014, bend: 0.04 }); for (let k = 0; k < 3; k++) blade(A, V(0, 0.05 + k * 0.08, 0), V(Math.cos(k * 2.1), 0.9, Math.sin(k * 2.1)).normalize(), 0.24, 0.018, '#5a7a50', '#8aa47a');
    for (let k = 0; k < 11; k++) { const y = 0.6 + k * 0.038; const c = V(Math.sin(y * 2.2) * 0.08 * y, y, Math.cos(y * 1.7) * 0.03 * y); const s = 0.05 * (1 - k / 14); for (let j = 0; j < 3; j++) { const a = j * 2.09 + k * 0.7 + r(); const out = V(Math.cos(a), 0.5, Math.sin(a)).normalize(); petal(A, c, out, V(0, 1, 0), s, s * 0.7, s * 0.4, ['#4a2a7a', '#8a5ac8', '#c4a0f0'], { rows: 1, rings: 1 }); } } void top; return A.geo(); },
  narcissus(seed) { const A = new Acc(); const top = stem(A, 1, '#5a8a40', { seed, r0: 0.02 }); blade(A, V(0, 0, 0), V(0.3, 1, 0.1).normalize(), 0.7, 0.035, '#3e6e30', '#6aa048', 4, 0.1);
    const fwd = V(0.15, 0.25, 1).normalize(); const up = fwd; for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; const out = V().crossVectors(fwd, V(0, 1, 0)).normalize().applyAxisAngle(fwd, a); petal(A, top, out, up, 0.16, 0.07, 0.01, ['#e8e4c8', '#fffef0', '#ffffff'], { rows: 2, rings: 2 }); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; const out = V().crossVectors(fwd, V(0, 1, 0)).normalize().applyAxisAngle(fwd, a).multiplyScalar(0.25).addScaledVector(fwd, 1).normalize(); petal(A, top, out, fwd, 0.08, 0.035, 0.0, ['#e07810', '#f8b020', '#ffd860'], { rows: 1, rings: 2 }); } return A.geo(); },
  clover(seed) { const A = new Acc(); const top = stem(A, 1, '#5a8a40', { seed, r0: 0.016 }); for (let k = 0; k < 3; k++) { const a = k * 2.09; blade(A, V(0, 0.35, 0), V(Math.cos(a), 0.3, Math.sin(a)).normalize(), 0.2, 0.07, '#3e7a2c', '#6aac44', 2, 0.1); } for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.28; petal(A, top, V(Math.cos(a), 0.6, Math.sin(a)).normalize(), V(0, 1, 0), 0.06, 0.025, 0.02, ['#b04a7a', '#e88ab8', '#ffd0e4'], { rows: 1, rings: 1 }); } return A.geo(); },
};
export const FLOWER_KINDS = Object.keys(FLOWER);
const FGEO = new Map();
const FLOWER_VERT = GRASS_VERT.replace('float gk = uv.y * uv.y;', 'float gk = clamp(position.y, 0.0, 1.2); gk *= gk;').replace('vGH = uv.y; vGSeed = uv.x; vGWave = gwave; vGW = gw.xyz;', '');
/** spots: [x, y, z, size] -- one InstancedMesh per kind */
export function celFlowers(kind, spots, { flex = 0.8 } = {}) {
  if (!FGEO.has(kind)) FGEO.set(kind, (FLOWER[kind] || FLOWER.daisy)(kind.length * 7 + 3));
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.6, 0.84, 1.0]) });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: T.WIND.time, uWindDir: T.WIND.dir, uWindAmp: T.WIND.amp, uPtr: T.WIND.ptr, uPtrR: T.WIND.ptrR, uPtrK: T.WIND.ptrK, uFlex: { value: flex } });
    sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform vec3 uPtr; uniform float uPtrR; uniform float uPtrK; uniform float uFlex;\n' + sh.vertexShader.replace('#include <project_vertex>', FLOWER_VERT);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(normalize(vNormal) * 0.45 + (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'celFlower';
  const mesh = new THREE.InstancedMesh(FGEO.get(kind), mat, Math.max(1, spots.length)); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(), p = V(), c = new THREE.Color(); const r = mulberry32(spots.length + kind.length);
  spots.forEach(([x, y, z, h], i) => { q.setFromEuler(e.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2)); m4.compose(p.set(x, y, z), q, s.setScalar(h)); mesh.setMatrixAt(i, m4); c.setRGB(1, 1, 1).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08); mesh.setColorAt(i, c); });
  if (!spots.length) { mesh.setColorAt(0, c.setRGB(1, 1, 1)); mesh.count = 0; }
  mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.onBeforeRender = T.tickWind; mesh.name = 'flowers:' + kind; return mesh;
}

// ---------------------------------------------------------------- water plants
function padGeometry() { // a notched lily pad with a raised rim, radial veins in two tones
  const A = new Acc(); const n = 28, notch = 0.32; A.vert(V(0, 0.012, 0), V(0, 1, 0), 0.5, 0.5, C('#7ab848'));
  for (let i = 0; i <= n; i++) { const a = notch / 2 + (i / n) * (6.28 - notch); const vein = i % 2 ? '#4e8a30' : '#62a03a'; A.vert(V(Math.cos(a) * 0.62, 0.006, Math.sin(a) * 0.62), V(0, 1, 0), 0, 0, C(vein)); A.vert(V(Math.cos(a), 0.03, Math.sin(a)), V(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize(), 0, 0, C('#a8d468')); }
  for (let i = 0; i < n; i++) { const a = 1 + i * 2, b = a + 2; A.i.push(0, b, a); A.quad(a, b, b + 1, a + 1); }
  return A.geo();
}
function lilyGeometry() { const A = new Acc(); const ctr = V(0, 0.03, 0); const up = V(0, 1, 0); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; petal(A, ctr, V(Math.cos(a), 0.15, Math.sin(a)).normalize(), up, 0.2, 0.07, 0.04, ['#e8a0b8', '#ffd0dc', '#fff4f6'], { rows: 2, rings: 2 }); } for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28 + 0.4; petal(A, ctr.clone().add(V(0, 0.02, 0)), V(Math.cos(a), 0.9, Math.sin(a)).normalize(), up, 0.14, 0.06, 0.03, ['#e890ac', '#ffc8d8', '#fff0f4'], { rows: 2, rings: 2 }); } knob(A, ctr.clone().add(V(0, 0.04, 0)), 0.04, 0.03, ['#e8a010', '#ffd040'], 6); return A.geo(); }
let PADG = null, LILYG = null;
/** spots: [x, y, z, size] -> pads; some carry water lilies */
export function lilyPads(spots, { bloom = 0.25 } = {}) {
  PADG ||= padGeometry(); LILYG ||= lilyGeometry(); const g = new THREE.Group(); const flowers = spots.filter((_, i) => (i * 0.618) % 1 < bloom);
  const mk = (geo, list, name, ry0 = 0) => { const mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.6, 0.85, 1.0]) }); const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V(); list.forEach(([x, y, z, sz], i) => { q.setFromAxisAngle(V(0, 1, 0), ry0 + x * 3.7 + z * 1.3); m4.compose(p.set(x, y, z), q, s.setScalar(sz)); im.setMatrixAt(i, m4); }); if (!list.length) im.count = 0; im.receiveShadow = true; im.userData.noAO = true; im.name = name; im.computeBoundingSphere(); im.onBeforeRender = () => { const t = performance.now() / 1000; im.position.y = Math.sin(t * 0.9) * 0.006; }; g.add(im); return im; };
  mk(PADG, spots, 'lilyPads'); const fl = mk(LILYG, flowers.map(([x, y, z, sz]) => [x + 0.08 * sz, y + 0.01, z, sz * 0.8]), 'waterLilies'); fl.userData.noInk = true; return g;
}
/** reeds and cattails standing in shallows */
export function reeds(spots, { cattail = 0.35 } = {}) {
  const g = new THREE.Group(); g.add(celGrass(spots.map(([x, y, z, h]) => [x, y, z, h, 0.2, 0.9]), { pal: GRASS_PAL.reed, blades: 6, width: 0.035, lean: 0.12, flex: 0.45, sheenK: 0.25, patch: 0.3, name: 'reeds', seed: 11 }));
  const heads = spots.filter((_, i) => (i * 0.618) % 1 < cattail); const A = new Acc(); const prof = [[0.001, 0], [0.028, 0.02], [0.034, 0.08], [0.032, 0.16], [0.02, 0.2], [0.004, 0.24]];
  stem(A, 0.82, '#6a7a3a', { r0: 0.012, bend: 0.02, seed: 5 }); const n = 8; const b0 = A.count; prof.forEach(([rr, y]) => { for (let j = 0; j <= n; j++) { const a = (j / n) * 6.28; A.vert(V(Math.cos(a) * rr, 0.8 + y, Math.sin(a) * rr), V(Math.cos(a), 0.2, Math.sin(a)).normalize(), j / n, y, C(y > 0.04 && y < 0.18 ? '#4a2c18' : '#6a4a2a')); } }); for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < n; j++) { const a = b0 + i * (n + 1) + j, b = a + n + 1; A.quad(a, b, b + 1, a + 1); }
  FGEO.set('cattail', A.geo()); const ct = celFlowers('cattail', heads.map(([x, y, z, h]) => [x + 0.05, y, z, h * 1.25]), { flex: 0.4 }); g.add(ct); return g;
}

// ---------------------------------------------------------------- cel water: banded depth, sky fresnel, ripple streaks, sun glitter, shore foam
/** shape: { cx, cz, rx, rz, seed } (a wobbly ellipse) or { pts: [[x, z]...] } outline; returns the mesh (y at 0, place it) */
export function celWater({ cx = 0, cz = 0, rx = 6, rz = 4, rot = 0, seed = 1, rings = 12, spokes = 96, deep = '#1e5a72', mid = '#2f8a98', shallow = '#5ab0a8', sky = '#ffe2c0', foam = '#f4fff4', sun = new THREE.Vector3(0.3, 0.1, -1) } = {}) {
  const r = mulberry32(seed); const ph = [r() * 6, r() * 6, r() * 6]; const edgeR = (a) => 1 + Math.sin(a * 2 + ph[0]) * 0.1 + Math.sin(a * 3 + ph[1]) * 0.07 + Math.sin(a * 5 + ph[2]) * 0.04;
  const cr = Math.cos(rot), sr = Math.sin(rot); const at = (a, d) => { const lx = Math.cos(a) * rx * d, lz = Math.sin(a) * rz * d; return V(cx + lx * cr - lz * sr, 0, cz + lx * sr + lz * cr); };
  const pos = [V(cx, 0, cz)], edge = [0]; for (let i = 1; i <= rings; i++) { const k = i / rings; for (let j = 0; j < spokes; j++) { const a = (j / spokes) * Math.PI * 2; pos.push(at(a, edgeR(a) * Math.pow(k, 0.85))); edge.push(k); } }
  const idx = []; for (let j = 0; j < spokes; j++) idx.push(0, 1 + ((j + 1) % spokes), 1 + j); for (let i = 1; i < rings; i++) for (let j = 0; j < spokes; j++) { const a = 1 + (i - 1) * spokes + j, b = 1 + (i - 1) * spokes + ((j + 1) % spokes), c = a + spokes, d = b + spokes; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setFromPoints(pos); geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const m = new THREE.ShaderMaterial({
    fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uDeep: { value: C(deep) }, uMid: { value: C(mid) }, uShallow: { value: C(shallow) }, uSky: { value: C(sky) }, uFoam: { value: C(foam) }, uSun: { value: sun.clone().normalize() } }]),
    vertexShader: 'attribute float aEdge; varying float vEdge; varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vEdge = aEdge; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: `uniform vec3 uDeep, uMid, uShallow, uSky, uFoam, uSun; uniform float uTime; varying float vEdge; varying vec3 vW;
      #include <fog_pars_fragment>
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float t = uTime; vec3 V = normalize(cameraPosition - vW);
        float wob = sin(vW.x * 1.3 + t * 0.7) * sin(vW.z * 1.7 - t * 0.5) * 0.04;
        float e = vEdge + wob; vec3 c = mix(uDeep, uMid, step(0.5, e)); c = mix(c, uShallow, step(0.88, e) * 0.8);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0); c = mix(c, mix(uSky, uMid, 0.35), step(0.45, fres) * 0.22 + step(0.8, fres) * 0.12);
        float streak = step(0.975, sin(vW.x * 1.6 + vW.z * 0.3 + t * 0.8 + sin(vW.z * 0.8) * 1.2) * sin(vW.z * 3.3 - t * 0.55));
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0)); float sp = pow(max(0.0, dot(R, uSun)), 40.0);
        float glit = step(0.9, h2(floor(vW.xz * vec2(6.0, 14.0)) + floor(t * 2.5))) * smoothstep(0.15, 0.6, sp);
        c = mix(c, uSky, streak * 0.5); c += vec3(0.16, 0.12, 0.06) * step(0.4, sp); c = mix(c, vec3(1.0, 0.97, 0.86), glit);
        float foam = step(0.93, vEdge + sin(atan(vW.z, vW.x) * 24.0 + t * 1.2) * 0.012 + sin(t * 1.4 + vW.x * 2.0) * 0.008);
        c = mix(c, uFoam, foam * 0.85);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  m.uniforms.uTime = T.WIND.time; const mesh = new THREE.Mesh(geo, m); mesh.onBeforeRender = T.tickWind; mesh.userData.noAO = true; mesh.userData.ink = true; mesh.receiveShadow = false; mesh.name = 'celWater';
  // normalised distance from the centre (1 = the shore) and points at an angle / fraction of the way out
  mesh.userData.edgeD = (x, z) => { const dx = x - cx, dz = z - cz; const lx = (dx * cr + dz * sr) / rx, lz = (-dx * sr + dz * cr) / rz; const a = Math.atan2(lz, lx); return Math.hypot(lx, lz) / edgeR(a); };
  mesh.userData.edgePoint = (a, d = 1) => at(a, edgeR(a) * d);
  return mesh;
}
