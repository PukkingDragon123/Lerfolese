// Flesh kit for the custom-rigged beasts: anatomy is sculpted as a signed-distance field (bone-tagged muscle masses,
// limbs and carves joined with smooth unions), polygonised once with Surface Nets into a single seamless organic mesh,
// relaxed onto the iso-surface, skinned from the sculpt (each mass weights its own bone, blends feather across the
// smooth unions, then diffuse over the mesh) and unwrapped into compact normal-cone charts so the painters in
// charkit can paint clean banded textures from the bind-pose 3D point. Built once per creature id and cached.
import * as THREE from 'three';

const smin = (a, b, k) => { if (k <= 0) return a < b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const V = (p) => (p.isVector3 ? [p.x, p.y, p.z] : p);

/** rotation matrix rows (world -> local) from a local Z axis and an up hint */
function frame(dir, up = [0, 1, 0]) {
  const z = new THREE.Vector3(...dir).normalize(); const u = new THREE.Vector3(...up); if (Math.abs(u.dot(z)) > 0.98) u.set(1, 0, 0);
  const x = new THREE.Vector3().crossVectors(u, z).normalize(); const y = new THREE.Vector3().crossVectors(z, x);
  return [x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z];
}
const eulerRows = (r) => { const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')).invert().elements; return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]]; };

export class Sculpt {
  constructor() { this.prims = []; }
  /** rounded cone a->b (radii ra, rb). bone: name, or [b0, b1] blended along the segment (t0..t1) */
  limb(a, b, ra, rb, bone, o = {}) {
    a = V(a); b = V(b); const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (Math.abs(ra - rb) > L * 0.95) rb = ra - Math.sign(ra - rb) * L * 0.95;
    const p = { type: 0, ax: a[0], ay: a[1], az: a[2], bx: b[0] - a[0], by: b[1] - a[1], bz: b[2] - a[2], ra, rb, ...this._common(bone, o) };
    const r = Math.max(ra, rb) + p.k + 0.02; p.box = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r];
    this.prims.push(p); return p;
  }
  /** a chain of rounded cones through points with radii */
  chain(pts, radii, bones, o = {}) { for (let i = 0; i < pts.length - 1; i++) this.limb(pts[i], pts[i + 1], radii[i], radii[i + 1], Array.isArray(bones) ? bones[Math.min(i, bones.length - 1)] : bones, o); }
  /** ellipsoid at c with radii r; o.rot = euler [x,y,z] (YXZ) or o.dir/o.up = local Z axis / up hint */
  blob(c, r, bone, o = {}) {
    c = V(c); const m = o.dir ? frame(o.dir, o.up) : eulerRows(o.rot || [0, 0, 0]);
    const p = { type: 1, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], m, ...this._common(bone, o) };
    const R = Math.max(r[0], r[1], r[2]) + p.k + 0.02; p.box = [c[0] - R, c[1] - R, c[2] - R, c[0] + R, c[1] + R, c[2] + R];
    this.prims.push(p); return p;
  }
  /** muscle belly between origin a and insertion b: width w (local x), depth d (local y about `up`) */
  muscle(a, b, w, d, bone, o = {}) { a = V(a); b = V(b); const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...dir) / 2; return this.blob([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [w, d, L], bone, { ...o, dir, up: o.up || [0, 0, 1] }); }
  /** rounded box (half extents h, corner radius rr) */
  box(c, h, rr, bone, o = {}) {
    c = V(c); const m = o.dir ? frame(o.dir, o.up) : eulerRows(o.rot || [0, 0, 0]);
    const p = { type: 2, cx: c[0], cy: c[1], cz: c[2], rx: h[0], ry: h[1], rz: h[2], rr, m, ...this._common(bone, o) };
    const R = Math.hypot(h[0], h[1], h[2]) + rr + p.k + 0.02; p.box = [c[0] - R, c[1] - R, c[2] - R, c[0] + R, c[1] + R, c[2] + R];
    this.prims.push(p); return p;
  }
  _common(bone, o) { return { k: o.k ?? 0.05, imp: o.imp ?? 1, sub: !!o.sub, bone, t0: o.t0 ?? 0, t1: o.t1 ?? 1, tag: o.tag || null, skin: o.skin ?? 1, mirror: false }; }
  /** duplicate every prim added by fn mirrored in x (fn receives s = -1 / +1 and a side suffix) */
  sym(fn) { for (const s of [-1, 1]) fn(s, s > 0 ? '_L' : '_R'); }

  // ---------------------------------------------------------------- distance
  static dist(p, x, y, z) {
    if (p.type === 0) { // iq's exact rounded cone
      const bx = p.bx, by = p.by, bz = p.bz; const l2 = bx * bx + by * by + bz * bz; const rr = p.ra - p.rb; const a2 = l2 - rr * rr; const il2 = 1 / l2;
      const px = x - p.ax, py = y - p.ay, pz = z - p.az; const Y = px * bx + py * by + pz * bz; const Z = Y - l2;
      const qx = px * l2 - bx * Y, qy = py * l2 - by * Y, qz = pz * l2 - bz * Y; const x2 = qx * qx + qy * qy + qz * qz; const y2 = Y * Y * l2, z2 = Z * Z * l2;
      const k = Math.sign(rr) * rr * rr * x2; Sculpt._t = Y * il2;
      if (Math.sign(Z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.rb;
      if (Math.sign(Y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.ra;
      return (Math.sqrt(x2 * a2 * il2) + Y * rr) * il2 - p.ra;
    }
    const m = p.m, dx = x - p.cx, dy = y - p.cy, dz = z - p.cz;
    const lx = m[0] * dx + m[1] * dy + m[2] * dz, ly = m[3] * dx + m[4] * dy + m[5] * dz, lz = m[6] * dx + m[7] * dy + m[8] * dz;
    if (p.type === 1) {
      Sculpt._t = lz / p.rz * 0.5 + 0.5;
      const k0 = Math.hypot(lx / p.rx, ly / p.ry, lz / p.rz), k1 = Math.hypot(lx / (p.rx * p.rx), ly / (p.ry * p.ry), lz / (p.rz * p.rz));
      return k1 < 1e-9 ? -Math.min(p.rx, p.ry, p.rz) : (k0 * (k0 - 1)) / k1;
    }
    Sculpt._t = lz / p.rz * 0.5 + 0.5;
    const qx = Math.abs(lx) - p.rx, qy = Math.abs(ly) - p.ry, qz = Math.abs(lz) - p.rz;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - p.rr;
  }
  _accel() {
    if (this.acc) return this.acc;
    const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (const p of this.prims) if (!p.sub) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p.box[i]); b[i + 3] = Math.max(b[i + 3], p.box[i + 3]); }
    const cs = 0.12, n = [0, 1, 2].map((i) => Math.max(1, Math.ceil((b[i + 3] - b[i]) / cs))); const cells = Array.from({ length: n[0] * n[1] * n[2] }, () => []);
    this.prims.forEach((p, pi) => {
      const lo = [0, 1, 2].map((i) => Math.max(0, Math.floor((p.box[i] - b[i]) / cs))), hi = [0, 1, 2].map((i) => Math.min(n[i] - 1, Math.floor((p.box[i + 3] - b[i]) / cs)));
      for (let z = lo[2]; z <= hi[2]; z++) for (let y = lo[1]; y <= hi[1]; y++) for (let x = lo[0]; x <= hi[0]; x++) cells[x + n[0] * (y + n[1] * z)].push(pi);
    });
    return (this.acc = { b, cs, n, cells });
  }
  _cell(x, y, z) {
    const A = this._accel(); const i = Math.floor((x - A.b[0]) / A.cs), j = Math.floor((y - A.b[1]) / A.cs), k = Math.floor((z - A.b[2]) / A.cs);
    if (i < 0 || j < 0 || k < 0 || i >= A.n[0] || j >= A.n[1] || k >= A.n[2]) return null; return A.cells[i + A.n[0] * (j + A.n[1] * k)];
  }
  /** full field value at a point */
  eval(x, y, z) {
    const list = this._cell(x, y, z); if (!list) return 1; let f = 1;
    for (const pi of list) { const p = this.prims[pi]; const d = Sculpt.dist(p, x, y, z); f = p.sub ? -smin(-f, d, p.k) : smin(f, d, p.k); }
    return f;
  }
  grad(x, y, z, e, out) { out[0] = this.eval(x + e, y, z) - this.eval(x - e, y, z); out[1] = this.eval(x, y + e, z) - this.eval(x, y - e, z); out[2] = this.eval(x, y, z + e) - this.eval(x, y, z - e); const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l; return out; }
  /** nearest tagged mass at a surface point: {tag, d, tag2, d2 (nearest mass with another tag)} */
  query(x, y, z, out = {}) {
    out.tag = null; out.d = 9; out.tag2 = null; out.d2 = 9; out.t = 0; out.prim = null; out.dn = 9; const list = this._cell(x, y, z); if (!list) return out;
    for (const pi of list) {
      const p = this.prims[pi]; let d = Sculpt.dist(p, x, y, z); if (p.sub) { if (!p.tag) continue; d = Math.abs(d) - 0.004; }
      if (d < out.d) { out.dn = out.d; if (p.tag !== out.tag) { out.d2 = out.d; out.tag2 = out.tag; } out.d = d; out.tag = p.tag; out.t = Sculpt._t; out.prim = p; } else { if (d < out.dn) out.dn = d; if (d < out.d2 && p.tag !== out.tag) { out.d2 = d; out.tag2 = p.tag; } }
    }
    return out;
  }
  /** 0 = deep crease, 1 = open surface (how much of the normal-offset point is still clear of flesh) */
  cavity(c, delta = 0.04) { const f = this.tri || ((x, y, z) => this.eval(x, y, z)); return Math.min(1, Math.max(0, f(c.x + c.nx * delta, c.y + c.ny * delta, c.z + c.nz * delta) / delta)); }
  /** drop the sampled field once painting is done */
  release() { this.tri = null; this.acc = null; }

  // ---------------------------------------------------------------- polygonise (Surface Nets) + relax + skin + unwrap
  build({ cell = 0.025, bones, relax = 2, smoothW = 6, atlas = 1024, pad = 3, maxChart = 0.05, target = 0 } = {}) {
    const P = this.prims; const B = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of P) if (!p.sub) for (let i = 0; i < 3; i++) { B[i] = Math.min(B[i], p.box[i]); B[i + 3] = Math.max(B[i + 3], p.box[i + 3]); }
    const o = [B[0] - cell * 2, B[1] - cell * 2, B[2] - cell * 2]; const nx = Math.ceil((B[3] - o[0]) / cell) + 3, ny = Math.ceil((B[4] - o[1]) / cell) + 3, nz = Math.ceil((B[5] - o[2]) / cell) + 3;
    const F = new Float32Array(nx * ny * nz).fill(1); const sxy = nx * ny;
    for (const p of P) { // rasterise each mass into its own box only
      const x0 = Math.max(0, Math.floor((p.box[0] - o[0]) / cell)), x1 = Math.min(nx - 1, Math.ceil((p.box[3] - o[0]) / cell));
      const y0 = Math.max(0, Math.floor((p.box[1] - o[1]) / cell)), y1 = Math.min(ny - 1, Math.ceil((p.box[4] - o[1]) / cell));
      const z0 = Math.max(0, Math.floor((p.box[2] - o[2]) / cell)), z1 = Math.min(nz - 1, Math.ceil((p.box[5] - o[2]) / cell));
      for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
        let i = x0 + nx * y + sxy * z; const wy = o[1] + y * cell, wz = o[2] + z * cell;
        for (let x = x0; x <= x1; x++, i++) { const d = Sculpt.dist(p, o[0] + x * cell, wy, wz); F[i] = p.sub ? -smin(-F[i], d, p.k) : smin(F[i], d, p.k); }
      }
    }
    // trilinear field for the cheap passes (projection, relaxation, decimation)
    const tri = (x, y, z) => {
      let gx = (x - o[0]) / cell, gy = (y - o[1]) / cell, gz = (z - o[2]) / cell; gx = Math.min(nx - 1.001, Math.max(0, gx)); gy = Math.min(ny - 1.001, Math.max(0, gy)); gz = Math.min(nz - 1.001, Math.max(0, gz));
      const ix = gx | 0, iy = gy | 0, iz = gz | 0, fx = gx - ix, fy = gy - iy, fz = gz - iz; const i = ix + nx * iy + sxy * iz;
      const a = F[i] + (F[i + 1] - F[i]) * fx, b = F[i + nx] + (F[i + nx + 1] - F[i + nx]) * fx, c = F[i + sxy] + (F[i + sxy + 1] - F[i + sxy]) * fx, d = F[i + sxy + nx] + (F[i + sxy + nx + 1] - F[i + sxy + nx]) * fx;
      const e = a + (b - a) * fy, f = c + (d - c) * fy; return e + (f - e) * fz;
    };
    this.tri = tri; const g = [0, 0, 0]; const e = cell * 0.5;
    const tgrad = (x, y, z) => { g[0] = tri(x + e, y, z) - tri(x - e, y, z); g[1] = tri(x, y + e, z) - tri(x, y - e, z); g[2] = tri(x, y, z + e) - tri(x, y, z - e); const l = Math.hypot(g[0], g[1], g[2]) || 1; g[0] /= l; g[1] /= l; g[2] /= l; return g; };
    const onto = (Pv, v, evalF, gradF) => { for (let it = 0; it < 2; it++) { const x = Pv[v * 3], y = Pv[v * 3 + 1], z = Pv[v * 3 + 2]; const f = evalF(x, y, z); const n = gradF(x, y, z); const s = Math.max(-cell, Math.min(cell, f)); Pv[v * 3] -= n[0] * s; Pv[v * 3 + 1] -= n[1] * s; Pv[v * 3 + 2] -= n[2] * s; } };
    // Surface Nets: one vertex per sign-changing cell at the mean of its edge crossings, one quad per crossing edge
    const VI = new Int32Array(nx * ny * nz).fill(-1); const pos = []; const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const CO = [0, 1, nx, nx + 1, sxy, sxy + 1, sxy + nx, sxy + nx + 1]; const cv = new Float32Array(8);
    for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
      const i = x + nx * y + sxy * z; let mask = 0; for (let c = 0; c < 8; c++) { cv[c] = F[i + CO[c]]; if (cv[c] < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let ax = 0, ay = 0, az = 0, n = 0;
      for (const [a, b] of EDGES) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); ax += (a & 1) + ((b & 1) - (a & 1)) * t; ay += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; az += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; n++; }
      VI[i] = pos.length / 3; pos.push(o[0] + (x + ax / n) * cell, o[1] + (y + ay / n) * cell, o[2] + (z + az / n) * cell);
    }
    let idx = []; const AX = [1, nx, sxy];
    for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
      const i = x + nx * y + sxy * z; const inside = F[i] < 0;
      for (let a = 0; a < 3; a++) {
        if ((F[i + AX[a]] < 0) === inside) continue; const db = AX[(a + 1) % 3], dc = AX[(a + 2) % 3];
        const q = [VI[i], VI[i - db], VI[i - db - dc], VI[i - dc]]; if (q.some((v) => v < 0)) continue; if (!inside) q.reverse();
        const d02 = dist2(pos, q[0], q[2]), d13 = dist2(pos, q[1], q[3]);
        if (d02 < d13) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); else idx.push(q[0], q[1], q[3], q[1], q[2], q[3]);
      }
    }
    let P3 = new Float32Array(pos); let nv = P3.length / 3; let adj = adjacency(nv, idx);
    for (let v = 0; v < nv; v++) onto(P3, v, tri, tgrad);
    for (let r = 0; r < relax; r++) { // tangential relaxation evens the triangles, then back onto the surface
      const Q = P3.slice();
      for (let v = 0; v < nv; v++) {
        const s = adj.off[v], e2 = adj.off[v + 1]; if (e2 === s) continue; let mx = 0, my = 0, mz = 0; for (let j = s; j < e2; j++) { const u = adj.nb[j]; mx += Q[u * 3]; my += Q[u * 3 + 1]; mz += Q[u * 3 + 2]; }
        const k = 1 / (e2 - s); mx = mx * k - Q[v * 3]; my = my * k - Q[v * 3 + 1]; mz = mz * k - Q[v * 3 + 2];
        const n = tgrad(Q[v * 3], Q[v * 3 + 1], Q[v * 3 + 2]); const dn = mx * n[0] + my * n[1] + mz * n[2];
        P3[v * 3] += (mx - n[0] * dn) * 0.6; P3[v * 3 + 1] += (my - n[1] * dn) * 0.6; P3[v * 3 + 2] += (mz - n[2] * dn) * 0.6;
      }
      for (let v = 0; v < nv; v++) onto(P3, v, tri, tgrad);
    }
    this.stats = { rawTris: idx.length / 3 };
    if (target && idx.length / 3 > target) {
      const imp = new Float32Array(nv); const qq = {}; for (let v = 0; v < nv; v++) { this.query(P3[v * 3], P3[v * 3 + 1], P3[v * 3 + 2], qq); imp[v] = qq.prim?.imp ?? 1; }
      ({ P3, idx } = decimate(P3, idx, target, imp, (p) => { const t = new Float32Array(p); onto(t, 0, tri, tgrad); return t; }));
      nv = P3.length / 3; adj = adjacency(nv, idx);
    }
    const ga = [0, 0, 0]; const N3 = new Float32Array(nv * 3);
    for (let v = 0; v < nv; v++) { onto(P3, v, (x, y, z) => this.eval(x, y, z), (x, y, z) => this.grad(x, y, z, cell * 0.3, ga)); this.grad(P3[v * 3], P3[v * 3 + 1], P3[v * 3 + 2], cell * 0.35, ga); N3[v * 3] = ga[0]; N3[v * 3 + 1] = ga[1]; N3[v * 3 + 2] = ga[2]; }
    const W = this.skinWeights(P3, nv, adj, bones, smoothW);
    return unwrap(P3, N3, W, idx, { atlas, pad, maxChart });
  }

  /** per-vertex bone weights: masses near the surface vote for their bones (feathered by the blend radius), then diffuse */
  skinWeights(P3, nv, adj, bones, iters) {
    const nb = bones.length; const bi = new Map(bones.map((b, i) => [b, i])); let W = new Float32Array(nv * nb);
    for (let v = 0; v < nv; v++) {
      const x = P3[v * 3], y = P3[v * 3 + 1], z = P3[v * 3 + 2]; const list = this._cell(x, y, z) || []; let dmin = 9; const ds = [];
      for (const pi of list) { const p = this.prims[pi]; if (p.sub || !p.bone || !p.skin) continue; const d = Sculpt.dist(p, x, y, z); ds.push([p, d, Sculpt._t]); if (d < dmin) dmin = d; }
      for (const [p, d, t] of ds) {
        const span = Math.max(0.02, p.k * 0.8); const w = Math.max(0, 1 - (d - dmin) / span) ** 2 * p.skin; if (w <= 0) continue;
        if (Array.isArray(p.bone)) { const tt = Math.min(1, Math.max(0, (t - p.t0) / Math.max(1e-4, p.t1 - p.t0))); const s = tt * tt * (3 - 2 * tt); W[v * nb + bi.get(p.bone[0])] += w * (1 - s); W[v * nb + bi.get(p.bone[1])] += w * s; }
        else W[v * nb + bi.get(p.bone)] += w;
      }
      let s = 0; for (let b = 0; b < nb; b++) s += W[v * nb + b]; if (s > 0) for (let b = 0; b < nb; b++) W[v * nb + b] /= s; else W[v * nb] = 1;
    }
    for (let it = 0; it < iters; it++) {
      const Q = W.slice();
      for (let v = 0; v < nv; v++) { const s = adj.off[v], e = adj.off[v + 1]; if (e === s) continue; const k = 0.5 / (e - s); for (let b = 0; b < nb; b++) { let a = 0; for (let j = s; j < e; j++) a += Q[adj.nb[j] * nb + b]; W[v * nb + b] = Q[v * nb + b] * 0.5 + a * k; } }
    }
    const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4);
    for (let v = 0; v < nv; v++) {
      const top = []; for (let b = 0; b < nb; b++) { const w = W[v * nb + b]; if (w > 0.01) top.push([w, b]); } top.sort((a, b) => b[0] - a[0]); top.length = Math.min(4, top.length);
      const s = top.reduce((a, t) => a + t[0], 0) || 1; top.forEach(([w, b], j) => { SI[v * 4 + j] = b; SW[v * 4 + j] = w / s; }); if (!top.length) SW[v * 4] = 1;
    }
    return { SI, SW };
  }
}
/** quadric edge-collapse decimation; collapsed vertices land on the surface (proj), importance scales the cost */
function decimate(P, idxIn, target, imp, proj) {
  const nv = P.length / 3; let nf = idxIn.length / 3; const idx = Int32Array.from(idxIn); const Q = new Float64Array(nv * 10);
  for (let f = 0; f < nf; f++) {
    const a = idx[f * 3], b = idx[f * 3 + 1], c = idx[f * 3 + 2]; const n = triN(P, a, b, c); const ar = n[3]; if (ar < 1e-12) continue; const d = -(n[0] * P[a * 3] + n[1] * P[a * 3 + 1] + n[2] * P[a * 3 + 2]);
    const q = [n[0] * n[0], n[0] * n[1], n[0] * n[2], n[0] * d, n[1] * n[1], n[1] * n[2], n[1] * d, n[2] * n[2], n[2] * d, d * d];
    for (const v of [a, b, c]) for (let j = 0; j < 10; j++) Q[v * 10 + j] += q[j] * ar;
  }
  const vf = Array.from({ length: nv }, () => []); for (let f = 0; f < nf; f++) for (let j = 0; j < 3; j++) vf[idx[f * 3 + j]].push(f);
  const alive = new Uint8Array(nf).fill(1), dead = new Uint8Array(nv), ver = new Int32Array(nv); const heap = [];
  const qerr = (a, b, p) => { const x = p[0], y = p[1], z = p[2]; let e = 0; for (const v of [a, b]) { const q = Q.subarray(v * 10, v * 10 + 10); e += q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9]; } return Math.max(0, e); };
  const push = (a, b) => {
    const p = [(P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2]; const l2 = dist2(P, a, b);
    const c = (qerr(a, b, p) + l2 * l2 * 0.05) * Math.max(imp[a], imp[b]); heapPush(heap, { c, a, b, va: ver[a], vb: ver[b] });
  };
  const seen = new Set(); for (let f = 0; f < nf; f++) for (let j = 0; j < 3; j++) { const a = idx[f * 3 + j], b = idx[f * 3 + ((j + 1) % 3)]; const k = Math.min(a, b) * nv + Math.max(a, b); if (!seen.has(k)) { seen.add(k); push(a, b); } }
  const nbrs = (v) => { const s = new Set(); for (const f of vf[v]) for (let j = 0; j < 3; j++) s.add(idx[f * 3 + j]); s.delete(v); return s; };
  while (nf > target && heap.length) {
    const e = heapPop(heap); const { a, b } = e; if (dead[a] || dead[b] || ver[a] !== e.va || ver[b] !== e.vb) continue;
    const p = proj([(P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2]);
    const shared = vf[a].filter((f) => vf[b].includes(f)); const na = nbrs(a), nb = nbrs(b); let common = 0; for (const v of na) if (nb.has(v)) common++;
    if (common !== shared.length || shared.length !== 2) continue;
    let ok = true; // reject collapses that fold or sliver a face
    for (const v of [a, b]) for (const f of vf[v]) {
      if (shared.includes(f)) continue; const n0 = triN(P, idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]); const tmp = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]].map((x) => (x === v ? -1 : x));
      const pts = tmp.map((x) => (x < 0 ? p : [P[x * 3], P[x * 3 + 1], P[x * 3 + 2]])); const n1 = triNp(pts[0], pts[1], pts[2]);
      if (n1[3] < 1e-10 || n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] < 0.3) { ok = false; break; }
    }
    if (!ok) continue;
    for (const f of shared) { alive[f] = 0; nf--; for (let j = 0; j < 3; j++) { const v = idx[f * 3 + j]; vf[v] = vf[v].filter((x) => x !== f); } }
    for (const f of vf[b]) { for (let j = 0; j < 3; j++) if (idx[f * 3 + j] === b) idx[f * 3 + j] = a; vf[a].push(f); }
    vf[b] = []; dead[b] = 1; P[a * 3] = p[0]; P[a * 3 + 1] = p[1]; P[a * 3 + 2] = p[2]; for (let j = 0; j < 10; j++) Q[a * 10 + j] += Q[b * 10 + j]; imp[a] = Math.max(imp[a], imp[b]); ver[a]++;
    for (const v of nbrs(a)) push(a, v);
  }
  const map = new Int32Array(nv).fill(-1); const P2 = []; const out = [];
  for (let f = 0; f < idx.length / 3; f++) { if (!alive[f]) continue; for (let j = 0; j < 3; j++) { const v = idx[f * 3 + j]; if (map[v] < 0) { map[v] = P2.length / 3; P2.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } out.push(map[v]); } }
  return { P3: new Float32Array(P2), idx: out };
}
function triNp(a, b, c) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1e-20; return [nx / l, ny / l, nz / l, l / 2]; }
const triN = (P, a, b, c) => triNp([P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]]);
function heapPush(h, e) { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p].c <= h[i].c) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
function heapPop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < h.length && h[l].c < h[m].c) m = l; if (r < h.length && h[r].c < h[m].c) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
const dist2 = (p, a, b) => (p[a * 3] - p[b * 3]) ** 2 + (p[a * 3 + 1] - p[b * 3 + 1]) ** 2 + (p[a * 3 + 2] - p[b * 3 + 2]) ** 2;
function adjacency(nv, idx) {
  const sets = Array.from({ length: nv }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) for (let j = 0; j < 3; j++) { const a = idx[i + j], b = idx[i + ((j + 1) % 3)]; sets[a].add(b); sets[b].add(a); }
  const off = new Int32Array(nv + 1); for (let v = 0; v < nv; v++) off[v + 1] = off[v] + sets[v].size; const nb = new Int32Array(off[nv]); for (let v = 0; v < nv; v++) nb.set([...sets[v]], off[v]);
  return { off, nb };
}

/** split the mesh into compact charts of near-parallel normals, project each flat, shelf-pack into a square atlas */
function unwrap(P3, N3, { SI, SW }, idx, { atlas, pad, maxChart }) {
  const nt = idx.length / 3; const FN = new Float32Array(nt * 3), FA = new Float32Array(nt);
  for (let f = 0; f < nt; f++) {
    const a = idx[f * 3], b = idx[f * 3 + 1], c = idx[f * 3 + 2];
    const ux = P3[b * 3] - P3[a * 3], uy = P3[b * 3 + 1] - P3[a * 3 + 1], uz = P3[b * 3 + 2] - P3[a * 3 + 2], vx = P3[c * 3] - P3[a * 3], vy = P3[c * 3 + 1] - P3[a * 3 + 1], vz = P3[c * 3 + 2] - P3[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1e-12; FN[f * 3] = nx / l; FN[f * 3 + 1] = ny / l; FN[f * 3 + 2] = nz / l; FA[f] = l / 2;
  }
  const edge = new Map(); const nbr = new Int32Array(nt * 3).fill(-1); const NV = P3.length / 3;
  for (let f = 0; f < nt; f++) for (let j = 0; j < 3; j++) { const a = idx[f * 3 + j], b = idx[f * 3 + ((j + 1) % 3)]; const key = Math.min(a, b) * NV + Math.max(a, b); const g = edge.get(key); if (g === undefined) edge.set(key, f * 3 + j); else if (g >= 0) { nbr[f * 3 + j] = (g / 3) | 0; nbr[g] = f; edge.set(key, -1); } }
  const chart = new Int32Array(nt).fill(-1); const charts = [];
  for (let s = 0; s < nt; s++) {
    if (chart[s] >= 0) continue; const ci = charts.length; const cn = [FN[s * 3] * FA[s], FN[s * 3 + 1] * FA[s], FN[s * 3 + 2] * FA[s]]; let area = FA[s]; const faces = [s]; chart[s] = ci;
    for (let qi = 0; qi < faces.length; qi++) {
      const f = faces[qi];
      for (let j = 0; j < 3; j++) {
        const h = nbr[f * 3 + j]; if (h < 0 || chart[h] >= 0 || area > maxChart) continue; const l = Math.hypot(...cn);
        if ((FN[h * 3] * cn[0] + FN[h * 3 + 1] * cn[1] + FN[h * 3 + 2] * cn[2]) / l < 0.74) continue;
        chart[h] = ci; faces.push(h); area += FA[h]; cn[0] += FN[h * 3] * FA[h]; cn[1] += FN[h * 3 + 1] * FA[h]; cn[2] += FN[h * 3 + 2] * FA[h];
      }
    }
    const n = new THREE.Vector3(...cn).normalize(); const t1 = new THREE.Vector3(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0); t1.addScaledVector(n, -t1.dot(n)).normalize(); const t2 = new THREE.Vector3().crossVectors(n, t1);
    const vs = new Map(); for (const f of faces) for (let j = 0; j < 3; j++) { const v = idx[f * 3 + j]; if (!vs.has(v)) vs.set(v, [P3[v * 3] * t1.x + P3[v * 3 + 1] * t1.y + P3[v * 3 + 2] * t1.z, P3[v * 3] * t2.x + P3[v * 3 + 1] * t2.y + P3[v * 3 + 2] * t2.z]); }
    let best = null; // pick the in-plane rotation with the smallest bounding box
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * (Math.PI / 2), ca = Math.cos(a), sa = Math.sin(a); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [u, v] of vs.values()) { const x = u * ca - v * sa, y = u * sa + v * ca; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (!best || (x1 - x0) * (y1 - y0) < best.A) best = { A: (x1 - x0) * (y1 - y0), ca, sa, x0, y0, w: x1 - x0, h: y1 - y0 };
    }
    charts.push({ faces, vs, ...best });
  }
  // shelf packing; shrink the texel density until it fits
  const order = charts.map((c, i) => i).sort((a, b) => charts[b].h - charts[a].h); let dens = Math.sqrt((atlas * atlas * 0.9) / charts.reduce((s, c) => s + c.A, 0));
  for (let tries = 0; tries < 40; tries++, dens *= 0.96) {
    let x = 0, y = 0, rowH = 0, ok = true;
    for (const i of order) { const c = charts[i]; const w = Math.ceil(c.w * dens) + pad * 2, h = Math.ceil(c.h * dens) + pad * 2; if (x + w > atlas) { x = 0; y += rowH; rowH = 0; } c.px = x; c.py = y; x += w; rowH = Math.max(rowH, h); if (y + rowH > atlas) { ok = false; break; } }
    if (ok) break;
  }
  // emit: vertices duplicated per chart
  const pos = [], nor = [], uv = [], si = [], sw = [], out = [];
  for (const c of charts) {
    const remap = new Map();
    for (const [v, [u0, v0]] of c.vs) {
      remap.set(v, pos.length / 3); pos.push(P3[v * 3], P3[v * 3 + 1], P3[v * 3 + 2]); nor.push(N3[v * 3], N3[v * 3 + 1], N3[v * 3 + 2]);
      const x = u0 * c.ca - v0 * c.sa - c.x0, y = u0 * c.sa + v0 * c.ca - c.y0; uv.push((c.px + pad + x * dens) / atlas, (c.py + pad + y * dens) / atlas);
      for (let j = 0; j < 4; j++) { si.push(SI[v * 4 + j]); sw.push(SW[v * 4 + j]); }
    }
    for (const f of c.faces) out.push(remap.get(idx[f * 3]), remap.get(idx[f * 3 + 1]), remap.get(idx[f * 3 + 2]));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setIndex(out);
  geo.computeBoundingSphere(); geo.userData = { charts: charts.length, tris: out.length / 3, verts: pos.length / 3, dens };
  return geo;
}

/** uncached UV bake for charkit's paintSurface: per covered texel the rest-pose point, normal and dominant bone */
export function bake(geo, size, names) {
  const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index.array;
  const N = size * size; const P = new Float32Array(N * 3), NN = new Float32Array(N * 3), B = new Uint8Array(N), cov = new Uint8Array(N);
  const dom = (v) => { let bw = -1, b = 0; for (let j = 0; j < 4; j++) { const w = sw.getComponent(v, j); if (w > bw) { bw = w; b = si.getComponent(v, j); } } return b; };
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2]; const ax = ua.getX(a) * size, ay = ua.getY(a) * size, bx = ua.getX(b) * size, by = ua.getY(b) * size, cx = ua.getX(c) * size, cy = ua.getY(c) * size;
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5; const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, w2 = 1 - w0 - w1;
      if (w0 < -0.01 || w1 < -0.01 || w2 < -0.01) continue; const o = y * size + x;
      for (let q = 0; q < 3; q++) { P[o * 3 + q] = pa.getComponent(a, q) * w0 + pa.getComponent(b, q) * w1 + pa.getComponent(c, q) * w2; NN[o * 3 + q] = na.getComponent(a, q) * w0 + na.getComponent(b, q) * w1 + na.getComponent(c, q) * w2; }
      B[o] = dom(w0 >= w1 && w0 >= w2 ? a : w1 >= w2 ? b : c); cov[o] = 1;
    }
  }
  for (let pass = 0; pass < 3; pass++) { // pad islands so filtering never reaches unpainted texels
    const add = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const o = y * size + x; if (cov[o]) continue; const nb = x > 0 && cov[o - 1] ? o - 1 : x < size - 1 && cov[o + 1] ? o + 1 : y > 0 && cov[o - size] ? o - size : y < size - 1 && cov[o + size] ? o + size : -1; if (nb >= 0) add.push(o, nb); }
    for (let i = 0; i < add.length; i += 2) { const o = add[i], s = add[i + 1]; for (let q = 0; q < 3; q++) { P[o * 3 + q] = P[s * 3 + q]; NN[o * 3 + q] = NN[s * 3 + q]; } B[o] = B[s]; cov[o] = 1; }
  }
  let n = 0; for (let i = 0; i < N; i++) n += cov[i];
  const S = { size, n, off: new Int32Array(n), P: new Float32Array(n * 3), N: new Float32Array(n * 3), B: new Uint8Array(n), names };
  for (let i = 0, j = 0; i < N; i++) if (cov[i]) { S.off[j] = i; S.P.set(P.subarray(i * 3, i * 3 + 3), j * 3); const l = Math.hypot(NN[i * 3], NN[i * 3 + 1], NN[i * 3 + 2]) || 1; S.N[j * 3] = NN[i * 3] / l; S.N[j * 3 + 1] = NN[i * 3 + 1] / l; S.N[j * 3 + 2] = NN[i * 3 + 2] / l; S.B[j] = B[i]; j++; }
  return S;
}
