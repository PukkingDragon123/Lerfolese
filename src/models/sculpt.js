// Sculpt toolkit: organic, faceted low-poly forms (PS2-era) instead of plain primitives.
// Every helper returns a non-indexed BufferGeometry with flat normals, jittered and noise-displaced.
import * as THREE from 'three';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32 } from '../core/util.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Detail level: high-poly, smooth-shaded forms (the game never uses faceted low-poly).
export const DETAIL = 3;

const noises = new Map();
const N = (seed) => { if (!noises.has(seed)) noises.set(seed, makeNoise(seed)); return noises.get(seed); };

export function facet(geo, { hard = false } = {}) {
  if (hard) { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; }
  let g = geo; g.deleteAttribute('normal'); const uv = g.getAttribute('uv'); if (uv) g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  if (uv && !g.getAttribute('uv')) { /* uv dropped for smooth merge; planar fallback */ const p = g.attributes.position; const a = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { a[i * 2] = p.getX(i) * 0.5 + p.getZ(i) * 0.5; a[i * 2 + 1] = p.getY(i); } g.setAttribute('uv', new THREE.BufferAttribute(a, 2)); }
  return g;
}

// displace vertices along their direction from `center` by fbm noise; shared vertices move together
export function warp(geo, { amt = 0.1, freq = 2.2, seed = 1, center = null, jitter = 0 } = {}) {
  const p = geo.attributes.position; const n = N(seed); const v = new THREE.Vector3(); const c = center || new THREE.Vector3();
  const rnd = mulberry32(seed * 31 + 7); const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    let d = cache.get(key);
    if (!d) {
      const k = (n.fbm(v.x * freq + 11.3, v.y * freq + v.z * freq * 0.7 + 3.1, 3) - 0.5) * 2 * amt;
      const dir = v.clone().sub(c); if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0); dir.normalize();
      d = dir.multiplyScalar(k).add(new THREE.Vector3((rnd() - 0.5) * jitter, (rnd() - 0.5) * jitter, (rnd() - 0.5) * jitter));
      cache.set(key, d);
    }
    p.setXYZ(i, v.x + d.x, v.y + d.y, v.z + d.z);
  }
  p.needsUpdate = true; return geo;
}

// organic lump (rock, muscle, joint, head base)
export function blob(rx = 0.5, ry = rx, rz = rx, { detail = 1, amt = 0.14, seed = 1, freq = 2.0, flatBottom = false } = {}) {
  const g = new THREE.IcosahedronGeometry(1, Math.min(6, detail + DETAIL)); g.scale(rx, ry, rz);
  warp(g, { amt: amt * Math.max(rx, ry, rz), freq: freq / Math.max(rx, ry, rz), seed });
  if (flatBottom) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -ry * 0.55) p.setY(i, -ry * 0.55); }
  return facet(g);
}

// tapered faceted limb along -Y from the origin, with a muscle bulge and optional bend
export function limb(len = 1, r0 = 0.12, r1 = 0.08, { sides: sides0 = 6, segs: segs0 = 4, bulge = 0.18, bulgeAt = 0.35, bend = 0, seed = 2, amt = 0.08, flatX = 1 } = {}) {
  const sides = Math.max(20, sides0 * 4), segs = Math.max(12, segs0 * DETAIL);
  const pts = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs; const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.exp(-Math.pow((t - bulgeAt) / 0.22, 2))); pts.push(new THREE.Vector2(Math.max(0.001, r), -t * len)); }
  pts.unshift(new THREE.Vector2(0.001, 0.0)); pts.push(new THREE.Vector2(0.001, -len));
  const g = new THREE.LatheGeometry(pts.reverse(), sides);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const t = -y / len; p.setX(i, p.getX(i) * flatX + Math.sin(t * Math.PI) * bend * len); }
  warp(g, { amt: amt * r0, freq: 6, seed, center: new THREE.Vector3(0, -len / 2, 0) });
  return facet(g);
}

// chunky chamfered slab (pelvis, hands, shoes, planks); jittered corners
export function slab(w = 1, h = 1, d = 1, { jitter = 0.08, seed = 3, taper = 0, segs = 1 } = {}) {
  const r = Math.min(w, h, d) * 0.18; const g = new RoundedBoxGeometry(w, h, d, 4, r); const p = g.attributes.position; const n = N(seed);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const tk = 1 - taper * (y / h + 0.5);
    const k = (n.fbm(x * 3 + 7, y * 3 + z * 2, 2) - 0.5) * jitter * 0.35;
    p.setXYZ(i, x * tk * (1 + k), y * (1 + k * 0.5), z * tk * (1 + k));
  }
  g.computeVertexNormals(); return g;
}

// faceted lathe (apples, pots, skulls): profile [[r,y],...], few sides, noisy
export function turn(profile, { sides = 8, amt = 0.04, seed = 4, twist = 0 } = {}) {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)));
  const pts = curve.getPoints(Math.max(24, profile.length * 6)).map((v) => new THREE.Vector2(Math.max(0.001, v.x), v.y));
  const g = new THREE.LatheGeometry(pts, Math.max(32, sides * 4));
  if (twist) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const a = y * twist; const x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)); } }
  warp(g, { amt, freq: 3, seed, center: new THREE.Vector3(0, (profile[0][1] + profile[profile.length - 1][1]) / 2, 0) });
  return facet(g);
}

// curved tapering horn / tentacle / tuft along points
export function horn(points, r0 = 0.08, r1 = 0.005, { sides: sides0 = 5, segs: segs0 = 10, seed = 5, amt = 0.15 } = {}) {
  const sides = Math.max(12, sides0 * 3), segs = Math.max(16, segs0 * DETAIL);
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const g = new THREE.TubeGeometry(curve, segs, 1, sides, false); const p = g.attributes.position; const v = new THREE.Vector3();
  // taper by ring index
  const ring = sides + 1;
  for (let i = 0; i < p.count; i++) {
    const si = Math.floor(i / ring); const t = si / segs; const c = curve.getPointAt(Math.min(1, t));
    v.fromBufferAttribute(p, i).sub(c); const r = r0 + (r1 - r0) * Math.pow(t, 0.9); v.multiplyScalar(r * (1 + Math.sin(si * 0.7 + seed) * amt * 0.25)); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  // cap the base
  return facet(g);
}

// gem-like faceted ball for eyes, joints, rivets
export const gem = (r = 0.1, detail = 0, seed = 6) => blob(r, r, r, { detail, amt: 0.04, seed });

// Flat-shaded standard material helper
export const fmat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...o });
