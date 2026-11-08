// Hi-def character toolkit. Smooth parametric surfaces (ring stacks, swept tubes, ribbons, lathes, thick cloth shells)
// whose UVs land in per-surface cells of a painted texture atlas. Painters work per texel in float colour with the
// rest-pose 3D point / normal / cavity of the texel available, and also write height (-> normal map) and
// roughness / metalness. PBR materials fall back to a studio environment map when the scene has none.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3; export const TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0) => new V3(x, y, z);
export const spow = (a, e) => Math.sign(a) * Math.pow(Math.abs(a), e);
export const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) * (x - cx)) / (sx * sx) - ((y - cy) * (y - cy)) / (sy * sy));
export const bump = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w));
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

// ---------------------------------------------------------------- geometry
function volume(g) { const p = g.attributes.position.array, ix = g.index.array; let s = 0; for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3; s += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]); } return s; }
function flipIdx(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; return g; }
// smooth normals, welded across seams / poles / shell edges
export function smoothNormals(g) {
  g.computeVertexNormals(); const p = g.attributes.position.array, n = g.attributes.normal.array, m = new Map();
  for (let i = 0; i < p.length / 3; i++) { const k = Math.round(p[i * 3] * 2e4) + ',' + Math.round(p[i * 3 + 1] * 2e4) + ',' + Math.round(p[i * 3 + 2] * 2e4); const a = m.get(k); a ? a.push(i) : m.set(k, [i]); }
  for (const a of m.values()) if (a.length > 1) { let x = 0, y = 0, z = 0; for (const i of a) { x += n[i * 3]; y += n[i * 3 + 1]; z += n[i * 3 + 2]; } const l = Math.hypot(x, y, z) || 1; for (const i of a) { n[i * 3] = x / l; n[i * 3 + 1] = y / l; n[i * 3 + 2] = z / l; } }
  return g;
}
// grid surface from fn(u,v,out); u wraps (seam shares positions), v runs along. uw/vw warp the sample spacing (not the uv)
export function surface(fn, U, V, { wrap = true, orient = true, flip = false, uw = null, vw = null } = {}) {
  const nu = U + 1, nv = V + 1, pos = new Float32Array(nu * nv * 3), uv = new Float32Array(nu * nv * 2), p = new V3();
  for (let j = 0; j < nv; j++) { const v = vw ? vw(j / V) : j / V; for (let i = 0; i < nu; i++) { const k = j * nu + i, u = uw ? uw(i / U) : i / U; fn(wrap && i === U ? (uw ? uw(0) : 0) : u, v, p); pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; uv[k * 2] = u; uv[k * 2 + 1] = v; } }
  const idx = []; for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = j * nu + i, b = a + 1, c = a + nu + 1, d = a + nu; idx.push(a, b, c, a, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  if ((orient && volume(g) < 0) !== flip) flipIdx(g); smoothNormals(g); g.userData.fn = fn; return g;
}
// ring-stack loft: keys rows [y, w, zs, zf, zb, nf, nb, x0]; Catmull-Rom through rows; u around (0.5 = front +Z).
// w half width, zs z of widest point, zf front z, zb back z, nf/nb superellipse exponents (2 round, >2 boxy, <2 pointed)
export function stack(keys, { warp = 0, disp } = {}) {
  const n = keys.length, C = keys[0].length, r = new Array(8).fill(0); let lastV = -1;
  const fn = (u, v, o) => {
    if (v !== lastV) { lastV = v; const f = Math.min(n - 1.0001, Math.max(0, v) * (n - 1)), i = Math.floor(f), t = f - i; for (let c = 0; c < C; c++) r[c] = cr(keys[Math.max(0, i - 1)][c], keys[i][c], keys[i + 1][c], keys[Math.min(n - 1, i + 2)][c], t); }
    const y = r[0], w = r[1], zs = r[2], zf = r[3], zb = r[4], x0 = C > 7 ? r[7] : 0; const s = u - 0.5, th = TAU * (s - (warp * Math.sin(TAU * s)) / TAU), sn = Math.sin(th), cs = Math.cos(th);
    const e = 2 / Math.max(0.6, cs >= 0 ? r[5] : r[6]);
    o.set(x0 + Math.max(0, w) * spow(sn, e), y, zs + ((cs >= 0 ? zf : zb) - zs) * Math.pow(Math.abs(cs), e));
    if (disp) disp(o, th, v, r); return o;
  };
  return fn;
}
export const lathe = (prof, o) => stack(prof.map(([r, y, z = 0]) => [y, r, z, z + r, z - r, 2, 2]), o);
// tube swept along a Catmull-Rom path. rad(v, a) -> r | [rx, ry]; sec(a, v) -> unit section [x, y]; up = section 'front' hint
export function sweep(pts, rad, { up = v3(0, 0, 1), closed = false, sec = null, M = 64, tension = 0.5 } = {}) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p.clone() : v3(...p))), closed, 'catmullrom', tension);
  const P = [], N = [], B = []; const b = up.clone();
  for (let i = 0; i <= M; i++) {
    const t = i / M, tg = c.getTangentAt(Math.min(t, 0.99999)); P.push(c.getPointAt(Math.min(t, 1)));
    b.addScaledVector(tg, -b.dot(tg)); if (b.lengthSq() < 1e-8) b.set(tg.y, -tg.x, 0.3); b.normalize(); B.push(b.clone()); N.push(new V3().crossVectors(b, tg).normalize());
  }
  const q = new V3(), nn = new V3(), bb = new V3();
  const fn = (u, v, o) => {
    const f = Math.min(M - 1e-4, Math.max(0, v) * M), i = Math.floor(f), t = f - i; q.lerpVectors(P[i], P[i + 1], t); nn.lerpVectors(N[i], N[i + 1], t).normalize(); bb.lerpVectors(B[i], B[i + 1], t).normalize();
    const a = TAU * (u - 0.5); let ex = Math.sin(a), ey = Math.cos(a); if (sec) [ex, ey] = sec(a, v);
    const r = rad(v, a); const rx = typeof r === 'number' ? r : r[0], ry = typeof r === 'number' ? r : r[1];
    return o.copy(q).addScaledVector(nn, ex * rx).addScaledVector(bb, ey * ry);
  };
  fn.curve = c; fn.frame = (v) => { const f = Math.min(M, Math.round(Math.max(0, v) * M)); return { p: P[f], n: N[f], b: B[f] }; }; return fn;
}
// flat ribbon (hair card / strap): u across 0..1, v along; width axis = sweep N, card normal ~ up; curl cups the edges
export function ribbon(pts, width, { up = v3(0, 0, 1), M = 32, curl = 0 } = {}) {
  const f = sweep(pts, () => 0, { up, M });
  return (u, v, o) => { f(0.5, v, o); const fr = f.frame(v), w = width(v), x = (u - 0.5) * w; return o.addScaledVector(fr.n, x).addScaledVector(fr.b, (curl * x * x) / Math.max(1e-4, w)); };
}
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
export function normalAt(fn, u, v, out, e = 1e-3) { fn(Math.min(1, u + e), v, _a); fn(Math.max(0, u - e), v, _b); fn(u, Math.min(1, v + e), _c); fn(u, Math.max(0, v - e), _d); return out.crossVectors(_a.sub(_b), _c.sub(_d)).normalize(); }
// thick cloth/leather shell around a mid-surface fn: outer + inner skins and rim strips (rims sample the edge texels)
export function shell(fn, U, V, th = 0.01, { wrap = false, out = null, flip = false, vw = null, uw = null } = {}) {
  const T = typeof th === 'function' ? th : () => th, n = new V3(), e = 1e-3; let sg = flip ? -1 : 1;
  if (out) { const p = fn(0.5, 0.5, new V3()); normalAt(fn, 0.5, 0.5, n); if (n.dot(p.sub(out)) < 0) sg = -sg; }
  const off = (k) => (u, v, o) => { fn(u, v, o); normalAt(fn, u, v, n); return o.addScaledVector(n, (sg * k * T(u, v)) / 2); };
  const A = new V3(), B = new V3();
  const dir = { o: (u, v, d) => normalAt(fn, u, v, d).multiplyScalar(sg), i: (u, v, d) => normalAt(fn, u, v, d).multiplyScalar(-sg),
    v0: (u, v, d) => d.subVectors(fn(u, 0, A), fn(u, e, B)), v1: (u, v, d) => d.subVectors(fn(u, 1, A), fn(u, 1 - e, B)),
    u0: (u, v, d) => d.subVectors(fn(0, v, A), fn(e, v, B)), u1: (u, v, d) => d.subVectors(fn(1, v, A), fn(1 - e, v, B)) };
  const rim = (edge, steps) => {
    const g = surface((s, t, o) => { const [u, v] = edge(s); return off(1 - 2 * t)(u, v, o); }, steps, 1, { wrap: false, orient: false });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const [u, v] = edge(uv.getX(i)); uv.setXY(i, Math.min(0.999, Math.max(0.001, u)), Math.min(0.999, Math.max(0.001, v))); }
    return g;
  };
  const sw = { wrap, orient: false, uw, vw };
  const parts = [[surface(off(1), U, V, sw), 'o'], [surface(off(-1), U, V, sw), 'i'], [rim((s) => [uw ? uw(s) : s, 0], U), 'v0'], [rim((s) => [uw ? uw(s) : s, 1], U), 'v1']];
  if (!wrap) parts.push([rim((s) => [0, vw ? vw(s) : s], V), 'u0'], [rim((s) => [1, vw ? vw(s) : s], V), 'u1']);
  const P = new V3(), Q = new V3(), R = new V3(), D = new V3();
  for (const [g, k] of parts) { // orient each part along its expected outward direction
    const ix = g.index.array, ps = g.attributes.position, uv = g.attributes.uv; let s = 0; const step = Math.max(3, Math.floor(ix.length / 30 / 3) * 3);
    for (let i = 0; i < ix.length; i += step) { P.fromBufferAttribute(ps, ix[i]); Q.fromBufferAttribute(ps, ix[i + 1]).sub(P); R.fromBufferAttribute(ps, ix[i + 2]).sub(P); dir[k](uv.getX(ix[i]), uv.getY(ix[i]), D); s += Q.cross(R).dot(D); }
    if (s < 0) flipIdx(g);
  }
  const m = merge(parts.map((p) => p[0])); smoothNormals(m); m.userData.fn = fn; return m;
}
export function merge(geos) {
  const keep = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
  const gs = geos.filter(Boolean).map((g) => { const c = new THREE.BufferGeometry(); for (const k of keep) if (g.attributes[k]) c.setAttribute(k, g.attributes[k]); c.setIndex(g.index); return c; });
  const has = keep.filter((k) => gs.every((g) => g.attributes[k]));
  for (const g of gs) for (const k of Object.keys(g.attributes)) if (!has.includes(k)) g.deleteAttribute(k);
  return mergeGeometries(gs);
}
export const mat4 = (p = [0, 0, 0], r = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(v3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), typeof s === 'number' ? v3(s, s, s) : v3(...s));
export const T = (g, p = [0, 0, 0], r = [0, 0, 0], s = 1) => g.applyMatrix4(mat4(p, r, s));
// approximate surface extents: [perimeter around u, length along v]
export function measure(fn) {
  const p = new V3(), q = new V3(); let per = 0, len = 0;
  for (const v of [0.3, 0.5, 0.7]) { fn(0, v, q); for (let i = 1; i <= 24; i++) { fn(i / 24, v, p); per += p.distanceTo(q); q.copy(p); } }
  for (const u of [0.125, 0.375, 0.625, 0.875]) { fn(u, 0, q); for (let i = 1; i <= 24; i++) { fn(u, i / 24, p); len += p.distanceTo(q); q.copy(p); } }
  return [per / 3, len / 4];
}
// bisection helpers on surfaces
export const vAtY = (f, y, u = 0.5) => { let a = 0, b = 1; const q = v3(); for (let i = 0; i < 28; i++) { const m = (a + b) / 2; f(u, m, q); if (q.y < y) a = m; else b = m; } return (a + b) / 2; };
export const surfAt = (f, x, y) => { let best = null, bd = 1e9; const q = v3(); for (let i = 0; i <= 80; i++) { const u = 0.5 + (i / 80) * 0.3 * Math.sign(x || 1); f(u, vAtY(f, y, u), q); const d = Math.abs(q.x - x); if (d < bd) { bd = d; best = q.clone(); best.u = u; } } return best; };

// ---------------------------------------------------------------- skinning
export function skin(g, wf) {
  const p = g.attributes.position, uv = g.attributes.uv, n = p.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), q = new V3();
  for (let i = 0; i < n; i++) { q.fromBufferAttribute(p, i); const ws = wf(q, uv.getX(i), uv.getY(i)).filter((w) => w[1] > 1e-3).sort((a, b) => b[1] - a[1]).slice(0, 4); let t = 0; for (const w of ws) t += w[1]; ws.forEach((w, k) => { si[i * 4 + k] = w[0]; sw[i * 4 + k] = w[1] / (t || 1); }); if (!ws.length) sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); return g;
}
export const chain = (joints, blend = 0.08) => (v) => {
  let k = 0; while (k + 1 < joints.length && v > joints[k + 1][0]) k++;
  const nx = joints[k + 1], pv = joints[k];
  if (nx && v > nx[0] - blend) { const t = sstep(nx[0] - blend, nx[0] + blend, v); return [[pv[1], 1 - t], [nx[1], t]]; }
  if (k > 0 && v < pv[0] + blend) { const t = sstep(pv[0] - blend, pv[0] + blend, v); return [[joints[k - 1][1], 1 - t], [pv[1], t]]; }
  return [[pv[1], 1]];
};

// ---------------------------------------------------------------- atlas (colour + height + roughness/metalness)
export const rgb = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export class Atlas {
  constructor(W = 512, H = 512, { normal = 3 } = {}) { Object.assign(this, { W, H, cells: [], keys: new Map(), normalK: normal }); }
  // reserve a cell sized from the surface at dens px/unit (number or [du, dv]); same key -> shared cell (painted once)
  add(g, dens, paint, { key, size, fn, rough = 0.8, metal = 0 } = {}) {
    let c = key && this.keys.get(key);
    if (!c) { const f = fn || g.userData.fn; const [pw, ph] = size || measure(f); const [du, dv] = Array.isArray(dens) ? dens : [dens, dens]; c = { w0: Math.max(4, pw * du), h0: Math.max(4, ph * dv), paint, fn: f, geos: [], rough, metal }; this.cells.push(c); if (key) this.keys.set(key, c); }
    c.geos.push(g); return g;
  }
  layout() {
    let s = 1; while (!this.pack(s)) s *= 0.95;
    for (const c of this.cells) for (const g of c.geos) { const uv = g.attributes.uv; if (!uv) continue; for (let i = 0; i < uv.count; i++) uv.setXY(i, (c.x + uv.getX(i) * c.w) / this.W, 1 - (c.y + uv.getY(i) * c.h) / this.H); uv.needsUpdate = true; }
    this.scale = s; return this;
  }
  pack(s) {
    const L = [...this.cells].sort((a, b) => b.h0 - a.h0); let x = 3, y = 3, rh = 0;
    for (const c of L) { c.w = Math.max(4, Math.round(c.w0 * s)); c.h = Math.max(4, Math.round(c.h0 * s)); if (x + c.w + 3 > this.W) { x = 3; y += rh + 6; rh = 0; } if (c.w + 6 > this.W || y + c.h + 3 > this.H) return false; c.x = x; c.y = y; x += c.w + 6; rh = Math.max(rh, c.h); }
    return true;
  }
  // paint every cell (painters get (ctx, params)); returns { map, normalMap, roughMap } (roughness in G, metalness in B)
  render(p = {}) {
    const W = this.W, H = this.H, col = new Float32Array(W * H * 4), hgt = new Float32Array(W * H), rm = new Float32Array(W * H * 2), used = new Uint8Array(W * H);
    for (const c of this.cells) {
      for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) { const i = y * W + x; used[i] = 1; col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 0.5; col[i * 4 + 3] = 1; rm[i * 2] = c.rough; rm[i * 2 + 1] = c.metal; }
      if (c.paint) c.paint(cellCtx(c, col, hgt, rm, W), p);
    }
    dilate(col, hgt, rm, used, W, H, 4);
    return { map: canvasTex(col, W, H, true), normalMap: normalTex(hgt, W, H, this.normalK, this.cells), roughMap: rmTex(rm, W, H) };
  }
}
// per-cell painting context. each((u, v, o) => ...) mutates o = { r, g, b, a, h, ro, me, x, y } (pre-filled from the
// buffers so passes layer); with { geo: true } o also carries the texel's rest-pose point (px,py,pz), normal (nx,ny,nz)
// and cavity (cav > 0 in creases / sockets, < 0 on ridges). Return false to leave a texel untouched.
function cellCtx(c, col, hgt, rm, W) {
  let geo = null; const o = { r: 0, g: 0, b: 0, a: 1, h: 0, ro: 0, me: 0, x: 0, y: 0, i: 0 };
  const ctx = {
    c, x: c.x, y: c.y, w: c.w, h: c.h,
    P: (u, v, out = new V3()) => c.fn(u, v, out),
    geo() {
      if (geo) return geo; const n = c.w * c.h, P = new Float32Array(n * 3), N = new Float32Array(n * 3), K = new Float32Array(n), q = new V3();
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { c.fn((x + 0.5) / c.w, (y + 0.5) / c.h, q); const k = (y * c.w + x) * 3; P[k] = q.x; P[k + 1] = q.y; P[k + 2] = q.z; }
      const at = (x, y, k) => P[(Math.min(c.h - 1, Math.max(0, y)) * c.w + ((x % c.w) + c.w) % c.w) * 3 + k];
      const A = new V3(), B = new V3(), C = new V3(), D = new V3(), nn = new V3();
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
        A.set(at(x + 1, y, 0) - at(x - 1, y, 0), at(x + 1, y, 1) - at(x - 1, y, 1), at(x + 1, y, 2) - at(x - 1, y, 2)); B.set(at(x, y + 1, 0) - at(x, y - 1, 0), at(x, y + 1, 1) - at(x, y - 1, 1), at(x, y + 1, 2) - at(x, y - 1, 2));
        nn.crossVectors(A, B); if (nn.lengthSq() < 1e-14) nn.set(0, 0, 1); nn.normalize(); const i = y * c.w + x; N[i * 3] = nn.x; N[i * 3 + 1] = nn.y; N[i * 3 + 2] = nn.z;
        let k = 0; for (const s of [2, 4, 8]) { C.set(0, 0, 0); let l = 0; for (const [dx, dy] of [[s, 0], [-s, 0], [0, s], [0, -s]]) { D.set(at(x + dx, y + dy, 0) - P[i * 3], at(x + dx, y + dy, 1) - P[i * 3 + 1], at(x + dx, y + dy, 2) - P[i * 3 + 2]); l += D.length(); C.add(D); } k += (C.dot(nn) * 4) / (l + 1e-9); }
        K[i] = k / 3;
      }
      if (c.flipN) for (let i = 0; i < N.length; i++) N[i] = -N[i];
      // orient normals outward on average (the parametrisation may be left-handed)
      let s = 0; for (let i = 0; i < n; i += 7) s += N[i * 3] * P[i * 3] + N[i * 3 + 1] * (P[i * 3 + 1] - (c.cy || 0)) + N[i * 3 + 2] * P[i * 3 + 2];
      return (geo = { P, N, K });
    },
    // iterate texels; cb(u, v, o) mutates o; return false to skip writing
    each(cb, { geo: needGeo = false } = {}) {
      const G = needGeo ? ctx.geo() : null;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
        const X = c.x + x, Y = c.y + y, i = Y * W + X; o.x = X; o.y = Y; o.i = y * c.w + x;
        o.r = col[i * 4]; o.g = col[i * 4 + 1]; o.b = col[i * 4 + 2]; o.a = col[i * 4 + 3]; o.h = hgt[i]; o.ro = rm[i * 2]; o.me = rm[i * 2 + 1];
        if (G) { const k = o.i * 3; o.px = G.P[k]; o.py = G.P[k + 1]; o.pz = G.P[k + 2]; o.nx = G.N[k]; o.ny = G.N[k + 1]; o.nz = G.N[k + 2]; o.cav = G.K[o.i]; }
        if (cb((x + 0.5) / c.w, (y + 0.5) / c.h, o) === false) continue;
        col[i * 4] = o.r; col[i * 4 + 1] = o.g; col[i * 4 + 2] = o.b; col[i * 4 + 3] = o.a; hgt[i] = o.h; rm[i * 2] = o.ro; rm[i * 2 + 1] = o.me;
      }
    },
  };
  return ctx;
}
function dilate(col, hgt, rm, used, W, H, n) {
  for (let k = 0; k < n; k++) { const u0 = used.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (u0[i]) continue; const j = x > 0 && u0[i - 1] ? i - 1 : x < W - 1 && u0[i + 1] ? i + 1 : y > 0 && u0[i - W] ? i - W : y < H - 1 && u0[i + W] ? i + W : -1; if (j < 0) continue; for (let c = 0; c < 4; c++) col[i * 4 + c] = col[j * 4 + c]; hgt[i] = hgt[j]; rm[i * 2] = rm[j * 2]; rm[i * 2 + 1] = rm[j * 2 + 1]; used[i] = 1; } }
}
function canvasTex(col, W, H, srgb) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); const im = cx.createImageData(W, H);
  for (let i = 0; i < W * H * 4; i++) im.data[i] = Math.max(0, Math.min(255, Math.round(col[i] * 255)));
  cx.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; return t;
}
function normalTex(hgt, W, H, k, cells) {
  const out = new Float32Array(W * H * 4); for (let i = 0; i < W * H; i++) { out[i * 4] = 0.5; out[i * 4 + 1] = 0.5; out[i * 4 + 2] = 1; out[i * 4 + 3] = 1; }
  for (const c of cells) {
    const h = (xx, yy) => hgt[Math.max(c.y, Math.min(c.y + c.h - 1, yy)) * W + Math.max(c.x, Math.min(c.x + c.w - 1, xx))];
    for (let y = c.y - 3; y < c.y + c.h + 3; y++) for (let x = c.x - 3; x < c.x + c.w + 3; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const X0 = Math.max(c.x, Math.min(c.x + c.w - 1, x)), Y0 = Math.max(c.y, Math.min(c.y + c.h - 1, y));
      const dx = (h(X0 + 1, Y0 - 1) + 2 * h(X0 + 1, Y0) + h(X0 + 1, Y0 + 1) - h(X0 - 1, Y0 - 1) - 2 * h(X0 - 1, Y0) - h(X0 - 1, Y0 + 1)) * k;
      const dy = (h(X0 - 1, Y0 + 1) + 2 * h(X0, Y0 + 1) + h(X0 + 1, Y0 + 1) - h(X0 - 1, Y0 - 1) - 2 * h(X0, Y0 - 1) - h(X0 + 1, Y0 - 1)) * k;
      const l = Math.hypot(dx, dy, 1), i = y * W + x; out[i * 4] = (-dx / l) * 0.5 + 0.5; out[i * 4 + 1] = (dy / l) * 0.5 + 0.5; out[i * 4 + 2] = (1 / l) * 0.5 + 0.5;
    }
  }
  return canvasTex(out, W, H, false);
}
function rmTex(rm, W, H) { const out = new Float32Array(W * H * 4); for (let i = 0; i < W * H; i++) { out[i * 4] = 1; out[i * 4 + 1] = rm[i * 2]; out[i * 4 + 2] = rm[i * 2 + 1]; out[i * 4 + 3] = 1; } return canvasTex(out, W, H, false); }

// ---------------------------------------------------------------- materials
// studio environment (RoomEnvironment PMREM) used only while the rendered scene has no environment of its own
let ENV = null, envPending = false, lastScene = null; const MATS = new Set();
function envHook(r, scene) {
  if (!ENV && !envPending) { envPending = true; import('three/addons/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => { const pm = new THREE.PMREMGenerator(r); ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); lastScene = null; }); }
  if (ENV && scene !== lastScene) { lastScene = scene; const e = scene.environment ? null : ENV; for (const m of MATS) if (m.envMap !== e) { m.envMap = e; m.needsUpdate = true; } }
}
export function pbr(tx, { rough = 1, metal = 1, normal = 1, envI = 0.5, side = THREE.FrontSide, alphaTest = 0, transparent = false, color = 0xffffff, emissive = null, emissiveMap = null, emissiveIntensity = 1, opacity = 1, depthWrite = true } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.normalMap, roughnessMap: tx.roughMap, metalnessMap: tx.roughMap, roughness: rough, metalness: metal, side, alphaTest, transparent, color, envMapIntensity: envI, opacity, depthWrite });
  m.normalScale.set(normal, normal);
  if (emissive != null || emissiveMap) { m.emissive = new THREE.Color(emissive ?? 0xffffff); m.emissiveMap = emissiveMap; m.emissiveIntensity = emissiveIntensity; }
  MATS.add(m); return m;
}
export function track(m) { MATS.add(m); return m; }
// mesh helper: casts/receives shadow and keeps the environment fallback current
export function addMesh(parent, g, m, { shadow = true, order = 0 } = {}) {
  const me = new THREE.Mesh(g, m); me.castShadow = shadow; me.receiveShadow = true; me.renderOrder = order; parent.add(me);
  me.onBeforeRender = envHook; return me;
}
const KITS = new Map();
export const kit = (key, fn) => { if (!KITS.has(key)) KITS.set(key, fn()); return KITS.get(key); };
