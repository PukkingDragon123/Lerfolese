// Shared rig plumbing for the custom beasts: bone hierarchies from rest-pose joint positions (world-aligned rest
// frames, so rotation.x swings a hanging limb back and pitches an upright one forward), skinned meshes bound to them,
// additive key-framed pose clips, the battle state/act/talk conventions of creatures.js, and target highlight.
import * as THREE from 'three';
import { Spring } from '../../core/tween.js';

/** bones from [name, parent, [x,y,z] rest joint position] rows */
export function makeBones(rows) {
  const map = {}, bones = [];
  for (const [name, parent, p] of rows) {
    const b = new THREE.Bone(); b.name = name; b.userData.rest = new THREE.Vector3(...p); b.position.set(...p);
    if (parent) { b.position.sub(map[parent].userData.rest); map[parent].add(b); }
    b.rotation.order = 'YXZ'; map[name] = b; bones.push(b);
  }
  return { map, bones, names: bones.map((b) => b.name), rows };
}
/** a SkinnedMesh on (shared) geometry; the first one adopts the bone hierarchy, later ones share the skeleton */
export function skinned(geo, mat, B, parent) {
  const m = new THREE.SkinnedMesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
  if (!B.skeleton) { m.add(B.bones[0]); m.updateMatrixWorld(true); B.skeleton = new THREE.Skeleton(B.bones); }
  m.bind(B.skeleton, new THREE.Matrix4()); parent?.add(m); return m;
}
/** rigid mesh/group following one bone: rest-space geometry is re-expressed in the bone's frame */
export function onBone(B, name, obj) { const b = B.map[name]; obj.position.sub(b.userData.rest); b.add(obj); return obj; }

/** single-bone skin attributes for a rigid or loft geometry; or per-vertex weights from fn(i) -> [[bone, w], ...] */
export function skinAttrs(geo, B, fn) {
  const n = geo.attributes.position.count; const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); const ix = new Map(B.names.map((x, i) => [x, i]));
  for (let i = 0; i < n; i++) { const w = typeof fn === 'string' ? [[fn, 1]] : fn(i); let s = 0; w.slice(0, 4).forEach(([b, x], j) => { si[i * 4 + j] = ix.get(b); sw[i * 4 + j] = x; s += x; }); for (let j = 0; j < 4; j++) sw[i * 4 + j] /= s || 1; }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); return geo;
}

// ---------------------------------------------------------------- additive pose clips
const ease = (t) => t * t * (3 - 2 * t);
/** keys: [[time, {bone: [rx, ry, rz], ...}], ...]; returns the blended additive pose at time t (holds the last key) */
export function sample(keys, t, out = {}, w = 1) {
  if (w <= 0) return out; let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const [t0, a] = keys[i], [t1, b] = keys[Math.min(i + 1, keys.length - 1)]; const k = t1 > t0 ? ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))) : 1;
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const n of names) { const pa = a[n] || Z3, pb = b[n] || Z3; const o = (out[n] ||= [0, 0, 0]); for (let j = 0; j < 3; j++) o[j] += (pa[j] + (pb[j] - pa[j]) * k) * w; }
  return out;
}
const Z3 = [0, 0, 0];
export const add = (P, n, x = 0, y = 0, z = 0) => { const o = (P[n] ||= [0, 0, 0]); o[0] += x; o[1] += y; o[2] += z; };
/** write a pose (bone -> euler) onto the bones (every bone resets to rest first) */
export function apply(B, P) { for (const b of B.bones) { const p = P[b.name]; if (p) b.rotation.set(p[0], p[1], p[2]); else b.rotation.set(0, 0, 0); } }

// ---------------------------------------------------------------- battle conventions (mirrors creatures.js rig())
export function battleRig(root, height) {
  const st = { t: Math.random() * 10, mode: 'idle', modeT: 0, hit: new Spring(0, 14, 0.35), lunge: new Spring(0, 9, 0.45), lift: new Spring(0, 10, 0.4), dead: 0, deadT: 0, talk: 0 };
  const api = {
    root, height, st, mats: [],
    act(mode) {
      if (st.dead > 0 && mode !== 'die') return;
      st.mode = mode; st.modeT = 0; if (mode === 'hurt') st.hit.kick(10); if (mode === 'attack') st.lunge.kick(9); if (mode === 'cast') st.lift.kick(6); if (mode === 'die' && !st.dead) { st.dead = 0.001; st.deadT = 0; }
      this.onAct?.(mode);
    },
    talk(s = 1) { st.talk = s; },
    common(dt, hold = 1.3) {
      st.t += dt; st.modeT += dt; for (const k of ['hit', 'lunge', 'lift']) st[k].update(dt);
      if (st.talk > 0) st.talk -= dt;
      if (st.dead > 0) { st.deadT += dt; st.dead = Math.min(1, st.dead + dt * 1.4); }
      if (st.mode !== 'idle' && st.mode !== 'die' && st.modeT > hold) st.mode = 'idle';
      const hl = !!root.userData.hl; if (hl !== api._hl) { api._hl = hl; for (const m of api.mats) m.color.setScalar(hl ? 1.32 : 1); }
      if (hl) { const k = 1.22 + Math.sin(st.t * 7) * 0.1; for (const m of api.mats) m.color.setRGB(k, k * 0.97, k * 0.9); }
    },
    /** per-instance material copies so a highlight brightens only this beast */
    own(mat) { const m = mat.clone(); api.mats.push(m); return m; },
  };
  return api;
}
