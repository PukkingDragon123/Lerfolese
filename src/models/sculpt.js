// Sculpt toolkit: organic, faceted low-poly forms (PS2-era) instead of plain primitives.
// Every helper returns a non-indexed BufferGeometry with flat normals, jittered and noise-displaced.
import * as THREE from 'three';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32 } from '../core/util.js';

const noises = new Map();
const N = (seed) => { if (!noises.has(seed)) noises.set(seed, makeNoise(seed)); return noises.get(seed); };

export function facet(geo) { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; }

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
  const g = new THREE.IcosahedronGeometry(1, detail); g.scale(rx, ry, rz);
  warp(g, { amt: amt * Math.max(rx, ry, rz), freq: freq / Math.max(rx, ry, rz), seed });
  if (flatBottom) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -ry * 0.55) p.setY(i, -ry * 0.55); }
  return facet(g);
}

// tapered faceted limb along -Y from the origin, with a muscle bulge and optional bend
export function limb(len = 1, r0 = 0.12, r1 = 0.08, { sides = 6, segs = 4, bulge = 0.18, bulgeAt = 0.35, bend = 0, seed = 2, amt = 0.08, flatX = 1 } = {}) {
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
  const g = new THREE.BoxGeometry(w, h, d, segs, segs, segs); const p = g.attributes.position; const rnd = mulberry32(seed);
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let o = cache.get(key); if (!o) { o = [(rnd() - 0.5) * jitter * w, (rnd() - 0.5) * jitter * h, (rnd() - 0.5) * jitter * d]; cache.set(key, o); }
    const tk = 1 - taper * (y / h + 0.5);
    // chamfer: pull corners in
    const cx = Math.abs(x) / (w / 2), cy = Math.abs(y) / (h / 2), cz = Math.abs(z) / (d / 2); const corner = cx * cy * cz > 0.99 ? 0.86 : 1;
    p.setXYZ(i, x * tk * corner + o[0], y * (cx * cy > 0.99 || cy * cz > 0.99 ? 0.94 : 1) + o[1], z * tk * corner + o[2]);
  }
  return facet(g);
}

// faceted lathe (apples, pots, skulls): profile [[r,y],...], few sides, noisy
export function turn(profile, { sides = 8, amt = 0.04, seed = 4, twist = 0 } = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), sides);
  if (twist) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const a = y * twist; const x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)); } }
  warp(g, { amt, freq: 3, seed, center: new THREE.Vector3(0, (profile[0][1] + profile[profile.length - 1][1]) / 2, 0) });
  return facet(g);
}

// curved tapering horn / tentacle / tuft along points
export function horn(points, r0 = 0.08, r1 = 0.005, { sides = 5, segs = 10, seed = 5, amt = 0.15 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const g = new THREE.TubeGeometry(curve, segs, 1, sides, false); const p = g.attributes.position; const v = new THREE.Vector3();
  // taper by ring index
  const ring = sides + 1;
  for (let i = 0; i < p.count; i++) {
    const si = Math.floor(i / ring); const t = si / segs; const c = curve.getPointAt(Math.min(1, t));
    v.fromBufferAttribute(p, i).sub(c); const r = r0 + (r1 - r0) * t; v.multiplyScalar(r * (1 + (mulberry32(seed + si)() - 0.5) * amt)); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  // cap the base
  return facet(g);
}

// gem-like faceted ball for eyes, joints, rivets
export const gem = (r = 0.1, detail = 0, seed = 6) => blob(r, r, r, { detail, amt: 0.08, seed });

// Flat-shaded standard material helper
export const fmat = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, ...o });
