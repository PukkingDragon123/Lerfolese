// Realistic low-poly pixel-art look, shared by every scene.
//
// 1) Realistic light on the old toon materials: importing this module (engine.js does) swaps three's toon gradient
//    lookup for physically plausible Lambert diffuse (no cel bands), so every MeshToonMaterial in the game, painted
//    pixel-art maps included, is lit by the real sun / sky / bounce / shadows / AO. Gradient maps become no-ops.
// 2) lowpolyify(objectOrMesh, { detail, flat, uvs }) -> converts meshes to clean faceted low poly:
//    - vertex-clustering decimation on a grid whose cell is set by `detail` (0 = very coarse .. 1 = fine; default 0.5),
//      degenerate triangles dropped;
//    - every triangle corner keeps its own UV (so pixel-art maps still map), while all corners in a cluster share
//      ONE position and ONE set of skin weights (skinned meshes keep animating without cracks);
//    - flat normals (non-indexed output) and material.flatShading = true.
//    Works on Mesh, SkinnedMesh and InstancedMesh (the instance geometry). Returns the object. Usage:
//      import { lowpolyify } from '../gfx/lowpoly.js';  lowpolyify(model, { detail: 0.35 });
// 3) flatten(object) -> only flat shading (for geometry that is already low poly).
import * as THREE from 'three';

THREE.ShaderChunk.gradientmap_pars_fragment = `
#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	return vec3( max( dotNL, 0.0 ) ); // realistic Lambert: soft terminator, no cel bands
}`;

export function flatten(obj) {
  obj.traverse((o) => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (m && !m.isShaderMaterial && !m.flatShading) { m.flatShading = true; m.needsUpdate = true; } } });
  return obj;
}

/** decimate one BufferGeometry by vertex clustering; returns a new non-indexed geometry with flat normals */
export function lowpolyGeometry(geo, { detail = 0.5, cell = null } = {}) {
  const P = geo.attributes.position; if (!P) return geo; geo.computeBoundingBox(); const bb = geo.boundingBox; const diag = bb.max.distanceTo(bb.min) || 1;
  const c = cell ?? diag * (0.09 - 0.083 * Math.max(0, Math.min(1, detail))); const inv = 1 / c;
  const key = new Map(); const rep = new Int32Array(P.count); const sum = []; const cnt = [];
  for (let i = 0; i < P.count; i++) { const k = `${Math.round(P.getX(i) * inv)},${Math.round(P.getY(i) * inv)},${Math.round(P.getZ(i) * inv)}`; let id = key.get(k); if (id === undefined) { id = sum.length; key.set(k, id); sum.push([0, 0, 0, i]); cnt.push(0); } rep[i] = id; const s = sum[id]; s[0] += P.getX(i); s[1] += P.getY(i); s[2] += P.getZ(i); cnt[id]++; }
  const cpos = sum.map((s, id) => [s[0] / cnt[id], s[1] / cnt[id], s[2] / cnt[id]]); const first = sum.map((s) => s[3]); // the cluster's representative vertex (its skin weights)
  const idx = geo.index ? geo.index.array : Array.from({ length: P.count }, (_, i) => i); const tris = [];
  for (let t = 0; t + 2 < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], d = idx[t + 2]; if (rep[a] === rep[b] || rep[b] === rep[d] || rep[a] === rep[d]) continue; tris.push(a, b, d); }
  const out = new THREE.BufferGeometry(); const n = tris.length; const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set(cpos[rep[tris[i]]], i * 3); out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const name of Object.keys(geo.attributes)) { if (name === 'position' || name === 'normal') continue; const A = geo.attributes[name]; const sz = A.itemSize; const arr = new A.array.constructor(n * sz); const skin = name === 'skinIndex' || name === 'skinWeight';
    for (let i = 0; i < n; i++) { const src = skin ? first[rep[tris[i]]] : tris[i]; for (let k = 0; k < sz; k++) arr[i * sz + k] = A.getComponent ? A.getComponent(src, k) : A.array[src * sz + k]; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz, A.normalized)); }
  for (const g of geo.groups || []) void g; // material groups are dropped by clustering; multi-material meshes keep the first material
  out.computeVertexNormals(); out.computeBoundingBox(); out.computeBoundingSphere(); out.userData = { ...geo.userData, lowpoly: { from: P.count, tris: n / 3 } }; return out;
}

/** convert an object (or one mesh) to faceted low poly in place; see the header. */
export function lowpolyify(obj, { detail = 0.5, flat = true, skip = null } = {}) {
  obj.traverse((o) => {
    if (!o.isMesh || o.isPoints || (skip && skip(o))) return; const m0 = Array.isArray(o.material) ? o.material[0] : o.material; if (m0?.isShaderMaterial || (m0?.alphaTest > 0 && !o.isSkinnedMesh)) return; // shader FX and leaf cards stay as they are
    const g = lowpolyGeometry(o.geometry, { detail }); if (g === o.geometry || !g.attributes.position.count) return;
    o.geometry = g; if (Array.isArray(o.material)) o.material = o.material[0];
    if (flat && o.material && !o.material.flatShading) { o.material.flatShading = true; o.material.needsUpdate = true; }
  });
  return obj;
}
