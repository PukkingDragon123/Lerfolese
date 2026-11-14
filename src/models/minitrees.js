// Miniature model-railway trees for the diorama, built procedurally: a lofted, tapering trunk that forks into real
// branches (pixel-art bark, faceted low-poly), and canopies of faceted low-poly leaf masses at the branch tips carrying
// a tiling pixel-art leaf skin, realistically lit (no cel bands). Four Mediterranean species; a few seeded
// variants each, shared by every placed tree (two draw calls per tree).
import * as THREE from 'three';
import * as T from './toon.js';
import { pixTex, hash } from './diorama.js';
import { mulberry32 } from '../core/util.js';

const V3 = THREE.Vector3; const TAU = Math.PI * 2;
const SPECIES = {
  olive: { leaves: ['#34502c', '#52763a', '#78984a', '#a8c06a'], bark: ['#3a3028', '#5a4a3c', '#7a6a58'], h: 1.0, spread: 1.0 },
  oak: { leaves: ['#2c5a2c', '#3f7a36', '#62a044', '#9ccc5a'], bark: ['#3a2a1e', '#5a4030', '#7a5a40'], h: 1.25, spread: 0.9 },
  cypress: { leaves: ['#1c3e2c', '#2a5838', '#3e7444', '#62985a'], bark: ['#3a2a20', '#56402e', '#704e36'], h: 1.9, spread: 0.32 },
  pine: { leaves: ['#244a30', '#386a3a', '#548a44', '#82b05a'], bark: ['#4a2e20', '#6e4430', '#90603e'], h: 1.7, spread: 1.15 },
};
// ---------------------------------------------------------------- textures
const TEXC = new Map();
function leafTex(pal) {
  const k = pal.join(); if (TEXC.has(k)) return TEXC.get(k); const R = pal.map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  // a 16x16 sprig: three or four pointed leaves on a twig, 4-tone ramp lit from the top-left, tinted dark outline
  const S = 16, px = new Array(S * S).fill(null); const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < S && y < S) px[y * S + x] = c; };
  const leaf = (cx, cy, ang, len) => { for (let t = 0; t <= len; t += 0.5) { const w = Math.sin((t / len) * Math.PI) * 2.2; for (let s = -w; s <= w; s += 0.5) { const x = Math.round(cx + Math.cos(ang) * t - Math.sin(ang) * s), y = Math.round(cy + Math.sin(ang) * t + Math.cos(ang) * s); put(x, y, s < -w * 0.45 && t > len * 0.25 ? 3 : 2); } } };
  leaf(8, 9, -2.2, 6.5); leaf(8, 9, -0.9, 6.5); leaf(8, 9, 0.4, 6); leaf(8, 9, 1.9, 5.5); leaf(8, 9, -1.55, 7);
  const out = px.slice(); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (px[y * S + x] == null && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => px[(y + b) * S + x + a] != null && x + a >= 0 && x + a < S && y + b >= 0 && y + b < S)) out[y * S + x] = 0;
  const t = pixTex(S, S, (x, y) => { const v = out[y * S + x]; return v == null ? [(R[0][0] + R[1][0]) / 2 | 0, (R[0][1] + R[1][1]) / 2 | 0, (R[0][2] + R[1][2]) / 2 | 0, 255] : [...R[v], 255]; }, { mip: true }); t.wrapS = t.wrapT = THREE.RepeatWrapping; /* opaque, tiling: the skin of a faceted leaf mass */ TEXC.set(k, t); return t;
}
function barkTex(pal) { const k = 'b' + pal.join(); if (TEXC.has(k)) return TEXC.get(k); const R = pal.map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }); const t = pixTex(16, 32, (x, y) => { const ridge = (x + Math.floor(hash(Math.floor(y / 5), 3) * 3)) % 4; return R[ridge === 0 ? 0 : ridge === 3 && hash(x, y) > 0.5 ? 2 : 1]; }, { repeat: [1, 1] }); TEXC.set(k, t); return t; }

// ---------------------------------------------------------------- geometry
function loft(curve, r0, r1, rings = 10, sides = 7) {
  sides = Math.min(sides, 5); rings = Math.min(rings, 6); // clean faceted low-poly limbs
  const pos = [], nrm = [], uv = [], idx = []; const fr = curve.computeFrenetFrames(rings, false); const p = new V3();
  for (let i = 0; i <= rings; i++) { const t = i / rings; curve.getPointAt(t, p); const r = r0 + (r1 - r0) * Math.pow(t, 0.8); const N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= sides; j++) { const a = (j / sides) * TAU; const cx = Math.cos(a), cy = Math.sin(a); const nx = N.x * cx + B.x * cy, ny = N.y * cx + B.y * cy, nz = N.z * cx + B.z * cy; const bump = 1 + (hash(i * 3.1, j * 1.7) - 0.5) * 0.18; pos.push(p.x + nx * r * bump, p.y + ny * r * bump, p.z + nz * r * bump); nrm.push(nx, ny, nz); uv.push(j / sides, t * curve.getLength() * 2.5); } }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
function merge(geos) { let n = 0, m = 0; for (const g of geos) { n += g.attributes.position.count; m += g.index.count; } const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), I = new Uint32Array(m); let o = 0, k = 0; for (const g of geos) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); for (let i = 0; i < g.index.count; i++) I[k++] = g.index.array[i] + o; o += g.attributes.position.count; } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.setIndex(new THREE.BufferAttribute(I, 1)); return out; }
/** leaf cards scattered through a cluster (sphere/ellipsoid); every card takes the cluster's outward normal */
const ICO1 = new THREE.IcosahedronGeometry(1, 1);
function cluster(c, r, n, rnd, out, { flat = 1, card = 0.2 } = {}) {
  // a faceted leaf mass: a jittered low-poly icosahedron squashed to the cluster's shape, flat-lit facets, a tiling pixel
  // leaf skin projected per facet, darker underneath (AO in the vertex colour); smooth outward normals keep the ink to the silhouette
  void n; void card; const P = ICO1.attributes.position; const seed = rnd() * 100; const pts = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const h = Math.sin(x * 12.99 + y * 78.23 + z * 37.72 + seed) * 43758.55; const j = 0.84 + (h - Math.floor(h)) * 0.3; pts.push(new V3(x * r * j, y * r * j * flat, z * r * j).add(c)); }
  for (let i = 0; i < pts.length; i += 3) { const [a, b, d] = [pts[i], pts[i + 1], pts[i + 2]]; const nf = new V3().crossVectors(b.clone().sub(a), d.clone().sub(a)).normalize(); const ao = 0.72 + 0.34 * Math.min(1, (nf.y * 0.5 + 0.5) * 0.8 + 0.2); const ax = Math.abs(nf.x), ay = Math.abs(nf.y), az = Math.abs(nf.z); const base = out.pos.length / 3;
    for (const q of [a, b, d]) { const nn = q.clone().sub(c).normalize(); const [u, v] = ay >= ax && ay >= az ? [q.x, q.z] : ax >= az ? [q.z, q.y] : [q.x, q.y]; out.pos.push(q.x, q.y, q.z); out.nrm.push(nn.x, nn.y, nn.z); out.uv.push(u * 7, v * 7); out.col.push(ao, ao, ao * 0.96); }
    out.idx.push(base, base + 1, base + 2); }
}
function buildTree(kind, seed) {
  const S = SPECIES[kind]; const rnd = mulberry32(seed * 7919 + kind.length * 31); const H = S.h * (0.9 + rnd() * 0.25); const parts = [], twigs = []; const leaves = { pos: [], nrm: [], uv: [], idx: [], col: [] };
  const C = (pts) => new THREE.CatmullRomCurve3(pts.map((a) => new V3(...a)));
  if (kind === 'cypress') {
    parts.push(loft(C([[0, 0, 0], [0.02, H * 0.5, 0.01], [0, H * 0.95, 0]]), 0.06, 0.012, 8, 7));
    for (let i = 0; i < 9; i++) { const t = i / 8; const y = H * (0.22 + t * 0.78); const r = 0.26 * Math.sin((1 - t * 0.85) * Math.PI * 0.62) + 0.05; cluster(new V3((rnd() - 0.5) * 0.05, y, (rnd() - 0.5) * 0.05), r, 60, rnd, leaves, { flat: 0.9, card: 0.14 }); }
  } else {
    const trunkTop = kind === 'pine' ? H * 0.82 : kind === 'olive' ? H * 0.38 : H * 0.48; const lean = (rnd() - 0.5) * 0.15;
    parts.push(loft(C([[0, 0, 0], [lean * 0.4, trunkTop * 0.5, (rnd() - 0.5) * 0.06], [lean, trunkTop, 0]]), kind === 'olive' ? 0.1 : 0.075, 0.05, 10, 8));
    const nb = kind === 'pine' ? 4 : kind === 'olive' ? 4 : 5; const top = new V3(lean, trunkTop, 0);
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * TAU + rnd() * 0.8; const reach = S.spread * (kind === 'pine' ? 0.55 : 0.48) * (0.75 + rnd() * 0.45); const up = kind === 'pine' ? 0.12 + rnd() * 0.1 : kind === 'olive' ? 0.3 + rnd() * 0.25 : 0.38 + rnd() * 0.3;
      const tip = new V3(top.x + Math.cos(a) * reach, top.y + up * H * 0.55, Math.sin(a) * reach); const mid = top.clone().lerp(tip, 0.5).add(new V3(0, 0.06 + (kind === 'olive' ? -0.04 : 0), 0));
      twigs.push(loft(new THREE.CatmullRomCurve3([top.clone().add(new V3(0, -0.04, 0)), mid, tip]), 0.042, 0.012, 7, 6));
      const cr = (kind === 'pine' ? 0.34 : kind === 'olive' ? 0.33 : 0.36) * S.spread * (0.85 + rnd() * 0.3); cluster(tip.clone().add(new V3(0, cr * 0.25, 0)), cr, kind === 'olive' ? 120 : 130, rnd, leaves, { flat: kind === 'pine' ? 0.42 : kind === 'olive' ? 0.62 : 0.85, card: 0.16 });
    }
    if (kind !== 'pine') cluster(new V3(lean, trunkTop + H * 0.42, 0), 0.42 * S.spread, 160, rnd, leaves, { flat: kind === 'olive' ? 0.6 : 0.9, card: 0.17 });
    else cluster(new V3(lean, trunkTop + 0.12, 0), 0.44 * S.spread, 130, rnd, leaves, { flat: 0.4, card: 0.17 });
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(leaves.pos, 3)); lg.setAttribute('normal', new THREE.Float32BufferAttribute(leaves.nrm, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(leaves.uv, 2)); lg.setAttribute('color', new THREE.Float32BufferAttribute(leaves.col, 3)); lg.setIndex(leaves.idx);
  return { wood: merge(parts), twigs: twigs.length ? merge(twigs) : null, leaves: lg };
}
// ---------------------------------------------------------------- materials (shared), templates (cached)
const MAT = new Map();
function mats(kind) {
  if (MAT.has(kind)) return MAT.get(kind); const S = SPECIES[kind];
  const wood = T.toonMaterial(new THREE.MeshStandardMaterial({ map: barkTex(S.bark) }), { sat: 1.1 }); wood.flatShading = true;
  const lm = T.toonMaterial(new THREE.MeshStandardMaterial({ map: leafTex(S.leaves), vertexColors: true }), { sat: 1.1, wind: 0.8, windH: 0.35 }); lm.flatShading = true;
  const prev = lm.onBeforeCompile; lm.onBeforeCompile = (sh, r) => { prev(sh, r); sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'); }; // leaves keep their cluster normal on both faces
  const ck = lm.customProgramCacheKey; lm.customProgramCacheKey = () => ck() + '|leafcl';
  const m = { wood, leaves: lm }; MAT.set(kind, m); return m;
}
const TPL = new Map();
function template(kind, v) { const k = kind + v; if (!TPL.has(k)) TPL.set(k, buildTree(kind, v + 1)); return TPL.get(k); }
/** a placed miniature tree (two meshes sharing cached geometry) */
export function miniTree(kind = 'oak', rnd = Math.random, scale = 1) {
  const g = new THREE.Group(); g.name = 'tree:' + kind; const t = template(kind, Math.floor(rnd() * 3)); const M = mats(kind);
  const w = new THREE.Mesh(t.wood, M.wood); w.castShadow = true; w.receiveShadow = true; g.add(w);
  if (t.twigs) { const tw = new THREE.Mesh(t.twigs, M.wood); tw.castShadow = true; tw.userData.noInk = true; g.add(tw); } // branches inside the canopy: no ink lines through the leaves
  const l = new THREE.Mesh(t.leaves, M.leaves); l.castShadow = true; l.receiveShadow = true; l.onBeforeRender = T.tickWind; g.add(l);
  g.rotation.y = rnd() * TAU; g.scale.setScalar(scale * (0.85 + rnd() * 0.3)); return g;
}
export const TREE_KINDS = Object.keys(SPECIES);
