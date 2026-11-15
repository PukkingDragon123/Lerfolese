// Static batching: bake every still mesh under a group into one merged mesh per material (and render flags), so a
// town of hundreds of little parts costs a handful of draw calls in every pass (colour, ink, AO, shadow).
// Left alone: instanced / skinned meshes, points / lines / sprites, multi-material meshes, transparent or alpha-cut
// materials, leaf cards with ink occluders, anything that animates itself (an onBeforeRender hook on it or a sibling,
// e.g. windmill sails), and anything flagged userData.keep.
//   const n = mergeStatic(group, { castShadow: false })  -> number of meshes merged away
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const NOOP = THREE.Object3D.prototype.onBeforeRender;
const animated = (o) => o.onBeforeRender !== NOOP;
export function mergeStatic(root, { castShadow = null, minParts = 2 } = {}) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || o.children.length || o.userData.keep || o.userData.inkOccluder || o.morphTargetInfluences) return;
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.alphaTest > 0 || m.isShaderMaterial || (m.side === THREE.DoubleSide && m.map?.format === THREE.RGBAFormat && m.alphaTest > 0)) return;
    if (animated(o) || (o.parent && o.parent !== root && o.parent.children.some(animated))) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.keep || !p.visible) return;
    const g = o.geometry; if (!g?.attributes?.position || g.morphAttributes?.position) return;
    const sig = Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}${g.attributes[k].normalized ? 'n' : ''}`).join(',');
    const key = `${m.uuid}|${sig}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.userData.noInk ? 1 : 0}${o.userData.noAO ? 1 : 0}|${o.renderOrder}`;
    let b = buckets.get(key); if (!b) buckets.set(key, (b = { m, list: [], o })); b.list.push(o);
  });
  let merged = 0; const mx = new THREE.Matrix4();
  for (const { m, list, o: first } of buckets.values()) {
    if (list.length < minParts) continue;
    const geos = []; for (const o of list) { mx.multiplyMatrices(inv, o.matrixWorld); let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) { const a = g.attributes[k]; if (a.isInterleavedBufferAttribute || a.normalized || !(a.array instanceof Float32Array)) g.setAttribute(k, new THREE.BufferAttribute(Float32Array.from({ length: a.count * a.itemSize }, (_, i) => a.getComponent ? a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize) : a.array[i]), a.itemSize)); } g.applyMatrix4(mx); g.morphAttributes = {}; g.clearGroups(); geos.push(g); }
    let mg = null; try { mg = mergeGeometries(geos, false); } catch { mg = null; } for (const g of geos) if (g !== mg) g.dispose(); if (!mg) continue;
    const mesh = new THREE.Mesh(mg, m); mesh.name = 'merged:' + (first.name || m.name || 'part'); mesh.castShadow = castShadow ?? first.castShadow; mesh.receiveShadow = first.receiveShadow; mesh.renderOrder = first.renderOrder;
    mesh.userData = { noInk: first.userData.noInk, noAO: first.userData.noAO, merged: list.length, keep: true }; root.add(mesh);
    for (const o of list) { o.parent?.remove(o); } merged += list.length;
  }
  return merged;
}
