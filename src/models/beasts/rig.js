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
    /** gore: 0 = pristine .. 1 = cut to ribbons (battle passes 1 - hp / maxHp) */
    setWounds(v) { api.wounds = Math.max(0, Math.min(1, v)); for (const m of api.mats) if (m.userData.uW) m.userData.uW.value = api.wounds; },
    wounds: 0,
    /** per-instance material copies so a highlight brightens only this beast */
    own(mat) { const m = mat.clone(); api.mats.push(m); return m; },
  };
  return api;
}

// ---------------------------------------------------------------- wounds (gore that builds as HP drops)
// A second texture on the same atlas: per texel the HP-loss threshold at which a wound shows there (R) and what it is
// (G: 1 = open gash core, 0.6 = torn flesh rim, 0.3 = blood smear / drip). setWounds(1 - hp/maxHp) reveals them.
export function paintWounds(surf, { sites, select = null, seed = 1 }) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const W = sites.map((w, i) => {
    const n = new THREE.Vector3(...w.n).normalize(); const t = new THREE.Vector3(...(w.dir || [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5])); t.addScaledVector(n, -t.dot(n)).normalize(); const b = new THREE.Vector3().crossVectors(n, t);
    return { p: new THREE.Vector3(...w.p), n, t, b, len: w.len || 0.14, wid: w.wid || 0.02, thr: w.thr ?? (0.08 + (i / sites.length) * 0.85), drips: [0, 1, 2].map(() => [(rnd() - 0.5) * (w.len || 0.14) * 0.8, 0.05 + rnd() * 0.16]) };
  });
  const d = new THREE.Vector3();
  return (c, o) => {
    let thr = 1, kind = 0;
    if (!select || select(c)) for (const w of W) {
      d.set(c.x - w.p.x, c.y - w.p.y, c.z - w.p.z); const dep = d.dot(w.n); if (Math.abs(dep) > 0.09) continue;
      const a = d.dot(w.t), x = d.dot(w.b); const u = (2 * a) / w.len; let k = 0;
      if (Math.abs(u) < 1) { const half = w.wid * Math.sqrt(1 - u * u) * (1 + Math.sin(a * 160) * 0.18); const ax = Math.abs(x); k = ax < half * 0.5 ? 1 : ax < half ? 0.6 : ax < half * 2.4 ? 0.3 : 0; }
      if (!k && c.ny < 0.85) for (const [da, dl] of w.drips) { const ry = w.p.y + w.t.y * da - c.y; const rx = a - da; if (ry > 0 && ry < dl && Math.abs(rx) < 0.007 + (1 - ry / dl) * 0.006 && Math.abs(x) < w.wid * 3 + ry) { k = 0.3; break; } }
      if (k && (w.thr < thr || (w.thr === thr && k > kind))) { thr = w.thr; kind = k; }
    }
    o.col[0] = thr * 255; o.col[1] = kind * 255; o.col[2] = 0;
  };
}
/** hook a toon material so wounds fade in where the wound map's threshold is below uWounds */
export function woundTex(canvas) { const t = new THREE.CanvasTexture(canvas); t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t; }
export function woundMat(m, tex, blood = [0.13, 0.004, 0.006]) {
  m.userData.uW = { value: 0 }; const uB = { value: new THREE.Color(...blood) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.woundMap = { value: tex }; sh.uniforms.uWounds = m.userData.uW; sh.uniforms.uBlood = uB;
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D woundMap; uniform float uWounds; uniform vec3 uBlood;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { vec4 wd = texture2D(woundMap, vMapUv); float vis = smoothstep(wd.r - 0.03, wd.r, uWounds) * step(wd.r, 0.99);
        vec3 wc = wd.g > 0.8 ? uBlood * 0.18 : wd.g > 0.45 ? uBlood * 1.9 + vec3(0.03, 0.0, 0.0) : uBlood;
        diffuseColor.rgb = mix(diffuseColor.rgb, wc, vis * (wd.g > 0.45 ? 1.0 : 0.88)); }`);
  };
  m.customProgramCacheKey = () => 'beast-wounds'; return m;
}
