// Hi-def character toolkit. Smooth parametric surfaces (ring stacks, swept tubes, lathes, thick cloth shells) whose
// UVs land in per-surface cells of a pixel-art texture atlas; painters get (u,v) plus the rest-pose 3D point so faces
// and patterns can be drawn in 3D space. Cel/toon materials with rim light, inverted-hull outlines, skinning helpers,
// and a per-type kit cache so every instance shares geometry, textures and materials.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PixelCanvas } from '../gfx/pixel.js';
import { toTexture } from '../gfx/textures.js';

const V3 = THREE.Vector3; export const TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0) => new V3(x, y, z);
export const spow = (a, e) => Math.sign(a) * Math.pow(Math.abs(a), e);
export const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const bump = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w)); // gaussian bump
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

// ---------------------------------------------------------------- geometry
function geo(pos, uv, idx) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
function volume(g) { const p = g.attributes.position.array, ix = g.index.array; let s = 0; for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3; s += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]); } return s; }
function flipIdx(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; return g; }
// smooth normals, welded across seams / poles / shell edges so shading and outline hulls stay continuous
export function smoothNormals(g) {
  g.computeVertexNormals(); const p = g.attributes.position.array, n = g.attributes.normal.array, m = new Map();
  for (let i = 0; i < p.length / 3; i++) { const k = Math.round(p[i * 3] * 2e4) + ',' + Math.round(p[i * 3 + 1] * 2e4) + ',' + Math.round(p[i * 3 + 2] * 2e4); const a = m.get(k); a ? a.push(i) : m.set(k, [i]); }
  for (const a of m.values()) if (a.length > 1) { let x = 0, y = 0, z = 0; for (const i of a) { x += n[i * 3]; y += n[i * 3 + 1]; z += n[i * 3 + 2]; } const l = Math.hypot(x, y, z) || 1; for (const i of a) { n[i * 3] = x / l; n[i * 3 + 1] = y / l; n[i * 3 + 2] = z / l; } }
  return g;
}
// grid surface from fn(u,v,out); u wraps around (seam shares positions), v runs along
export function surface(fn, U, V, { wrap = true, orient = true, flip = false } = {}) {
  const nu = U + 1, nv = V + 1, pos = new Float32Array(nu * nv * 3), uv = new Float32Array(nu * nv * 2), p = new V3();
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const k = j * nu + i; fn(wrap && i === U ? 0 : i / U, j / V, p); pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; uv[k * 2] = i / U; uv[k * 2 + 1] = j / V; }
  const idx = []; for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = j * nu + i, b = a + 1, c = a + nu + 1, d = a + nu; idx.push(a, b, c, a, c, d); }
  const g = geo(pos, uv, idx); if ((orient && volume(g) < 0) !== flip) flipIdx(g); smoothNormals(g); g.userData.fn = fn; return g;
}
// ring-stack loft: keys rows [y, w, zs, zf, zb, nf, nb, x0]; Catmull-Rom through rows; u around (0.5 = front +Z).
// w half width, zs z of widest point, zf front z, zb back z, nf/nb superellipse exponents (2 round, >2 boxy, <2 pointed)
export function stack(keys, { warp = 0, disp } = {}) {
  const n = keys.length, C = keys[0].length, r = new Array(8).fill(0);
  const fn = (u, v, o) => {
    const f = Math.min(n - 1.0001, v * (n - 1)), i = Math.floor(f), t = f - i;
    for (let c = 0; c < C; c++) r[c] = cr(keys[Math.max(0, i - 1)][c], keys[i][c], keys[i + 1][c], keys[Math.min(n - 1, i + 2)][c], t);
    const [y, w, zs, zf, zb, nf, nb, x0 = 0] = r; const s = u - 0.5, th = TAU * (s - (warp * Math.sin(TAU * s)) / TAU), sn = Math.sin(th), cs = Math.cos(th);
    const e = 2 / Math.max(0.6, cs >= 0 ? nf : nb);
    o.set(x0 + Math.max(0, w) * spow(sn, e), y, zs + ((cs >= 0 ? zf : zb) - zs) * Math.pow(Math.abs(cs), e));
    if (disp) disp(o, th, v, r); return o;
  };
  fn.theta = (u) => { const s = u - 0.5; return TAU * (s - (warp * Math.sin(TAU * s)) / TAU); };
  return fn;
}
export const lathe = (prof, o) => stack(prof.map(([r, y, z = 0]) => [y, r, z, z + r, z - r, 2, 2]), o);
// tube swept along a Catmull-Rom path. rad(v, a) -> r | [rx, ry]; sec(a, v) -> unit section [x, y]; up = section 'front' hint
export function sweep(pts, rad, { up = v3(0, 0, 1), closed = false, sec = null, M = 64, tension = 0.5 } = {}) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p.clone() : v3(...p))), closed, 'catmullrom', tension);
  const P = [], N = [], B = [], T = []; const b = up.clone();
  for (let i = 0; i <= M; i++) {
    const t = i / M, tg = c.getTangentAt(Math.min(t, 0.99999)); P.push(c.getPointAt(Math.min(t, 1))); T.push(tg);
    b.addScaledVector(tg, -b.dot(tg)); if (b.lengthSq() < 1e-8) b.set(tg.y, -tg.x, 0.3); b.normalize(); B.push(b.clone()); N.push(new V3().crossVectors(b, tg).normalize());
  }
  const q = new V3(), nn = new V3(), bb = new V3();
  const fn = (u, v, o) => {
    const f = Math.min(M - 1e-4, v * M), i = Math.floor(f), t = f - i; q.lerpVectors(P[i], P[i + 1], t); nn.lerpVectors(N[i], N[i + 1], t).normalize(); bb.lerpVectors(B[i], B[i + 1], t).normalize();
    const a = TAU * (u - 0.5); let ex = Math.sin(a), ey = Math.cos(a); if (sec) [ex, ey] = sec(a, v);
    const r = rad(v, a); const rx = typeof r === 'number' ? r : r[0], ry = typeof r === 'number' ? r : r[1];
    return o.copy(q).addScaledVector(nn, ex * rx).addScaledVector(bb, ey * ry);
  };
  fn.at = (v, out = new V3()) => out.copy(c.getPointAt(sat(v))); fn.tan = (v, out = new V3()) => out.copy(c.getTangentAt(Math.min(0.9999, sat(v))));
  fn.len = c.getLength(); return fn;
}
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
export function normalAt(fn, u, v, out, e = 1e-3) { fn(Math.min(1, u + e), v, _a); fn(Math.max(0, u - e), v, _b); fn(u, Math.min(1, v + e), _c); fn(u, Math.max(0, v - e), _d); return out.crossVectors(_a.sub(_b), _c.sub(_d)).normalize(); }
// thick cloth/leather shell around a mid-surface fn: outer + inner skins and rim strips (rims sample the edge texels)
export function shell(fn, U, V, th = 0.01, { wrap = false, out = null, flip = false } = {}) {
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
  const parts = [[surface(off(1), U, V, { wrap, orient: false }), 'o'], [surface(off(-1), U, V, { wrap, orient: false }), 'i'], [rim((s) => [s, 0], U), 'v0'], [rim((s) => [s, 1], U), 'v1']];
  if (!wrap) parts.push([rim((s) => [0, s], V), 'u0'], [rim((s) => [1, s], V), 'u1']);
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
export function transform(g, m) { g.applyMatrix4(m); return g; }
export const mat4 = (p = [0, 0, 0], r = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(v3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), typeof s === 'number' ? v3(s, s, s) : v3(...s));
// approximate surface extents: [perimeter around u, length along v]
export function measure(fn, wrap = true) {
  const p = new V3(), q = new V3(); let per = 0, len = 0;
  for (const v of [0.3, 0.5, 0.7]) { fn(0, v, q); for (let i = 1; i <= 24; i++) { fn(i / 24, v, p); per += p.distanceTo(q); q.copy(p); } }
  for (const u of [0.125, 0.375, 0.625, 0.875]) { fn(u, 0, q); for (let i = 1; i <= 24; i++) { fn(u, i / 24, p); len += p.distanceTo(q); q.copy(p); } }
  return [per / 3, len / 4];
}

// ---------------------------------------------------------------- skinning
// weights from fn(position, u, v) -> [[boneIndex, w], ...]
export function skin(g, wf) {
  const p = g.attributes.position, uv = g.attributes.uv, n = p.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), q = new V3();
  for (let i = 0; i < n; i++) { q.fromBufferAttribute(p, i); const ws = wf(q, uv.getX(i), uv.getY(i)).filter((w) => w[1] > 1e-3).sort((a, b) => b[1] - a[1]).slice(0, 4); let t = 0; for (const w of ws) t += w[1]; ws.forEach((w, k) => { si[i * 4 + k] = w[0]; sw[i * 4 + k] = w[1] / (t || 1); }); if (!ws.length) sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); return g;
}
// weights along a joint chain: joints [[v, bone], ...] (v = position along the tube where that bone takes over)
export const chain = (joints, blend = 0.08) => (v) => {
  let k = 0; while (k + 1 < joints.length && v > joints[k + 1][0]) k++;
  const nx = joints[k + 1], pv = joints[k];
  if (nx && v > nx[0] - blend) { const t = sstep(nx[0] - blend, nx[0] + blend, v); return [[pv[1], 1 - t], [nx[1], t]]; }
  if (k > 0 && v < pv[0] + blend) { const t = sstep(pv[0] - blend, pv[0] + blend, v); return [[joints[k - 1][1], 1 - t], [pv[1], t]]; }
  return [[pv[1], 1]];
};

// ---------------------------------------------------------------- atlas
export class Atlas {
  constructor(W = 512, H = 512) { Object.assign(this, { W, H, cells: [], keys: new Map() }); }
  // reserve a cell sized from the surface (or size [w,h] in world units) at `dens` px/unit; same key -> shared cell
  add(g, dens, paint, { key, size, over, fn } = {}) {
    let c = key && this.keys.get(key);
    if (!c) { const f = fn || g.userData.fn; const [pw, ph] = size || measure(f); c = { w0: Math.max(4, pw * dens), h0: Math.max(4, ph * dens), paint, over, fn: f, geos: [] }; this.cells.push(c); if (key) this.keys.set(key, c); }
    c.geos.push(g); return g;
  }
  layout() {
    let s = 1; while (!this.pack(s)) s *= 0.94;
    for (const c of this.cells) for (const g of c.geos) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (c.x + uv.getX(i) * c.w) / this.W, 1 - (c.y + uv.getY(i) * c.h) / this.H); uv.needsUpdate = true; }
    this.scale = s; return this;
  }
  pack(s) {
    const L = [...this.cells].sort((a, b) => b.h0 - a.h0); let x = 2, y = 2, rh = 0;
    for (const c of L) { c.w = Math.max(4, Math.round(c.w0 * s)); c.h = Math.max(4, Math.round(c.h0 * s)); if (x + c.w + 2 > this.W) { x = 2; y += rh + 3; rh = 0; } if (c.w + 4 > this.W || y + c.h + 2 > this.H) return false; c.x = x; c.y = y; x += c.w + 3; rh = Math.max(rh, c.h); }
    return true;
  }
  render(p = {}, base = null) {
    const pc = new PixelCanvas(this.W, this.H); if (base) pc.data.set(base.data); let E = null; const W = this.W, H = this.H;
    for (const c of this.cells) {
      const f = base ? c.over : c.paint; if (!f) continue; const q = new V3();
      f({ pc, x: c.x, y: c.y, w: c.w, h: c.h, c, P: (u, v) => c.fn(u, v, q), glow: (x, y, col) => (E || (E = new PixelCanvas(W, H).clear('#000000'))).px(x, y, col),
        X: (u) => c.x + u * c.w, Y: (v) => c.y + v * c.h, U: (x) => (x - c.x + 0.5) / c.w, Vv: (y) => (y - c.y + 0.5) / c.h,
        each(cb) { for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) { const col = cb((x - c.x + 0.5) / c.w, (y - c.y + 0.5) / c.h, x, y); if (col) pc.px(x, y, col); } } }, p);
    }
    if (!base) dilate(pc, 2);
    return { pc, E };
  }
}
function dilate(pc, n) { const W = pc.w, H = pc.h; for (let k = 0; k < n; k++) { const s = pc.data.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (s[i] >>> 24) continue; const nb = (x > 0 && s[i - 1] >>> 24 && s[i - 1]) || (x < W - 1 && s[i + 1] >>> 24 && s[i + 1]) || (y > 0 && s[i - W] >>> 24 && s[i - W]) || (y < H - 1 && s[i + W] >>> 24 && s[i + W]); if (nb) pc.data[i] = nb; } } }
export const tex = (pc) => (pc ? toTexture(pc, { wrap: false }) : null);

// ---------------------------------------------------------------- materials
const grads = new Map();
export function gradient(levels = [0.36, 0.36, 0.36, 0.62, 1, 1, 1, 1]) {
  const k = levels.join(); if (grads.has(k)) return grads.get(k);
  const t = new THREE.DataTexture(new Uint8Array(levels.map((l) => Math.round(l * 255))), levels.length, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; grads.set(k, t); return t;
}
// cel material: stepped diffuse + warm fresnel rim
export function toon({ map = null, color = 0xffffff, emissiveMap = null, emissive = 0x000000, emissiveIntensity = 1, rim = 0xfff0d8, rimK = 0.32, grad, side = THREE.FrontSide, transparent = false, alphaTest = 0 } = {}) {
  const m = new THREE.MeshToonMaterial({ map, color, gradientMap: gradient(grad), emissiveMap, emissive: emissiveMap ? 0xffffff : emissive, emissiveIntensity, side, transparent, alphaTest });
  m.userData.rim = { value: new THREE.Color(rim) }; m.userData.rimK = { value: rimK };
  m.onBeforeCompile = (s) => {
    s.uniforms.rimC = m.userData.rim; s.uniforms.rimK = m.userData.rimK;
    s.fragmentShader = 'uniform vec3 rimC; uniform float rimK;\n' + s.fragmentShader.replace('#include <opaque_fragment>', 'float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\noutgoingLight += rimC * rimK * smoothstep(0.62, 0.9, fr) * (0.3 + 0.7 * diffuseColor.rgb);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'toonrim1';
  return m;
}
// inverted-hull outline: back faces pushed out along normals by ~px pixels (capped in object units)
const OUTU = { px: { value: 0.002 } }; const _sz = new THREE.Vector2();
export function outlineMat(color = 0x24141c, px = 1.35, max = 0.009) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); m.userData.w = { value: px }; m.userData.max = { value: max };
  m.onBeforeCompile = (s) => {
    s.uniforms.uPx = OUTU.px; s.uniforms.uW = m.userData.w; s.uniforms.uMax = m.userData.max;
    s.vertexShader = 'uniform float uPx, uW, uMax;\n' + s.vertexShader.replace('#include <begin_vertex>', '#if !defined(USE_ENVMAP) && !defined(USE_SKINNING)\nvec3 objectNormal = vec3(normal);\n#endif\n#include <begin_vertex>')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec3 oN = normalize(normalMatrix * objectNormal); float oS = length(modelViewMatrix[0].xyz);\nmvPosition.xyz += oN * min(uW * uPx * -mvPosition.z, uMax * oS); gl_Position = projectionMatrix * mvPosition;');
  };
  m.customProgramCacheKey = () => 'hull1';
  return m;
}
function outlineHook(r, s, cam) { if (!cam.isPerspectiveCamera) return; const rt = r.getRenderTarget(); const h = rt ? rt.height : r.getDrawingBufferSize(_sz).y; OUTU.px.value = 2 / (cam.projectionMatrix.elements[5] * Math.max(1, h)); }
// mesh + outline hull (shares geometry / skeleton)
export function addMesh(parent, g, m, { line = null, shadow = true, skel = null } = {}) {
  const make = (mm) => { const o = skel ? new THREE.SkinnedMesh(g, mm) : new THREE.Mesh(g, mm); parent.add(o); if (skel) { o.bind(skel, skel.bindMatrix || undefined); o.frustumCulled = false; } return o; };
  const me = make(m); me.castShadow = shadow; me.receiveShadow = true;
  if (line) { const o = make(line); o.castShadow = false; o.receiveShadow = false; o.onBeforeRender = outlineHook; o.renderOrder = -1; me.userData.hull = o; }
  return me;
}
const KITS = new Map();
export const kit = (key, fn) => { if (!KITS.has(key)) KITS.set(key, fn()); return KITS.get(key); };
