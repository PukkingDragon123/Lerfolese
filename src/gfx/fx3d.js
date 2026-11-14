// Physical combat feedback in 3D, plus restrained shader magic.
// - Debris: pooled instanced chunks of whatever hit (apple pieces, stone shards, wood splinters, water droplets) that
//   fly, tumble, bounce on the ground with gravity, settle and shrink away.
// - Dust kicked up from the ground and a few fine pixel sparks (the existing particle systems).
// - Knockback: spring-driven root offset + lean-back tilt + stagger dip on the hit body.
// - Attack choreography helpers: anticipation lean, fast lunge, delayed recoil back to the slot.
// - Magic (only for magic / energy / law moves and casts): animated ground rune decal, swirling energy ribbons,
//   a fresnel energy orb, flickering branching 3D lightning, layered noise-shader flames and a gravity swirl.
// - Newton's casts and throws (watched from prof.mode): a pixel-crisp rune circle drawing itself under him, motes
//   spiralling up into the apple, a bloom where they meet; thrown apples leave a banded glowing trail shedding
//   fine pixel sparkles, and every hit gets a small crisp impact bloom.
import * as THREE from 'three';
import { tweens } from '../core/tween.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- debris (instanced, pooled)
function chunkGeo(seed, sx = 1, sy = 1, sz = 1, detail = 1) { // an irregular rock-like chunk (jittered icosphere, smooth normals)
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; let s = seed * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const jit = new Map(); for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!jit.has(key)) jit.set(key, 0.7 + r() * 0.5); const k = jit.get(key); p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz); }
  g.computeVertexNormals(); return g;
}
function appleGeo() { // skin on one side, flesh on the cut faces (vertex colours)
  const g = chunkGeo(3, 1, 0.8, 1); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const skin = new THREE.Color('#b8202a'), flesh = new THREE.Color('#f6e2b8');
  for (let i = 0; i < p.count; i++) { const c = p.getY(i) > -0.1 ? skin : flesh; col.set([c.r, c.g, c.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const TYPES = {
  apple: { geo: () => appleGeo(), mat: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), size: [0.05, 0.11], bounce: 0.25, life: 1.6 },
  stone: { geo: () => chunkGeo(7, 1, 0.75, 0.9, 0), mat: () => new THREE.MeshStandardMaterial({ color: '#8a8078', roughness: 0.9, flatShading: false }), size: [0.04, 0.12], bounce: 0.35, life: 2.0 },
  wood: { geo: () => chunkGeo(5, 2.8, 0.45, 0.45, 0), mat: () => new THREE.MeshStandardMaterial({ color: '#a8703e', roughness: 0.8 }), size: [0.035, 0.07], bounce: 0.3, life: 1.6 },
  blood: { geo: () => new THREE.IcosahedronGeometry(1, 1), mat: () => new THREE.MeshStandardMaterial({ color: '#4a0408', roughness: 0.25, metalness: 0.1, emissive: '#1e0204', emissiveIntensity: 0.6 }), size: [0.022, 0.05], bounce: 0, life: 2.5, stretch: true, splat: 'blood' },
  wine: { geo: () => new THREE.IcosahedronGeometry(1, 1), mat: () => new THREE.MeshStandardMaterial({ color: '#4a0a34', roughness: 0.2, metalness: 0.1, emissive: '#1e0414', emissiveIntensity: 0.6 }), size: [0.022, 0.05], bounce: 0, life: 2.5, stretch: true, splat: 'wine' },
  paint: { geo: () => chunkGeo(11, 1.2, 0.18, 0.9, 0), mat: () => new THREE.MeshStandardMaterial({ color: '#5a3a8a', roughness: 0.6 }), size: [0.03, 0.06], bounce: 0.2, life: 1.8 },
  water: { geo: () => new THREE.IcosahedronGeometry(1, 2), mat: () => new THREE.MeshStandardMaterial({ color: '#7cc6ff', roughness: 0.05, metalness: 0.1, emissive: '#1a4a7a', emissiveIntensity: 0.5 }), size: [0.025, 0.06], bounce: 0, life: 0.9, splash: true },
};
class Debris {
  constructor(scene, cap = 90) {
    this.sets = {};
    for (const k in TYPES) { const T = TYPES[k]; const m = new THREE.InstancedMesh(T.geo(), T.mat(), cap); m.count = 0; m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); this.sets[k] = { T, m, list: [], cap }; }
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.mx = new THREE.Matrix4(); this.s = new THREE.Vector3(); this.fwd = new THREE.Vector3(0, 0, 1); this.dir = new THREE.Vector3(); this.onSplat = null;
  }
  burst(kind, pos, n, dir = 1, power = 1, vel = null) {
    const S = this.sets[kind] || this.sets.stone;
    for (let i = 0; i < n && S.list.length < S.cap; i++) S.list.push({ p: pos.clone().add(new THREE.Vector3(rnd(-0.15, 0.15), rnd(-0.1, 0.2), rnd(-0.15, 0.15))), v: vel ? vel.clone().add(new THREE.Vector3(rnd(-0.8, 0.8), rnd(-0.6, 0.8), rnd(-0.6, 0.6))) : new THREE.Vector3(dir * rnd(1, 4.5) * power + rnd(-1.5, 1.5), rnd(2.5, 6.5) * power, rnd(-2, 2)), r: new THREE.Vector3(rnd(0, 6), rnd(0, 6), rnd(0, 6)), w: new THREE.Vector3(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14)), size: rnd(...S.T.size), t: 0, rest: 0 });
  }
  update(dt) {
    for (const k in this.sets) {
      const S = this.sets[k]; const T = S.T; let n = 0;
      for (let i = S.list.length - 1; i >= 0; i--) {
        const d = S.list[i]; d.t += dt; d.v.y -= 15 * dt; d.p.addScaledVector(d.v, dt); d.r.addScaledVector(d.w, dt);
        const floor = d.size * 0.6;
        if (d.p.y < floor) { d.p.y = floor; if (T.splat) { this.onSplat?.(T.splat, d.p, d.size); S.list.splice(i, 1); continue; } if (T.splash) { d.t = Math.max(d.t, T.life); } else { d.v.y = Math.abs(d.v.y) * T.bounce; d.v.x *= 0.55; d.v.z *= 0.55; d.w.multiplyScalar(0.5); if (Math.abs(d.v.y) < 0.4) { d.v.y = 0; d.rest += dt; d.v.multiplyScalar(Math.max(0, 1 - dt * 8)); d.w.multiplyScalar(Math.max(0, 1 - dt * 8)); } } }
        if (d.t > T.life + 0.35) { S.list.splice(i, 1); continue; }
      }
      for (const d of S.list) { const fade = d.t > T.life ? 1 - (d.t - T.life) / 0.35 : 1; if (T.stretch) { const sp = d.v.length(); this.q.setFromUnitVectors(this.fwd, this.dir.copy(d.v).normalize()); this.s.set(d.size, d.size, d.size * (1 + sp * 0.35)); } else { this.e.set(d.r.x, d.r.y, d.r.z); this.q.setFromEuler(this.e); this.s.setScalar(d.size); } this.s.multiplyScalar(Math.max(0.01, fade)); this.mx.compose(d.p, this.q, this.s); S.m.setMatrixAt(n++, this.mx); }
      S.m.count = n; S.m.instanceMatrix.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- blood: splatter decals that persist and darken, pools, gashes
function splatTex(kind) { // crisp, fine pixel splatter (grey values, tinted per instance)
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const img = g.createImageData(N, N); const d = img.data; let s = kind === 'gash' ? 7 : 3;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const put = (x, y, v) => { if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; };
  if (kind === 'gash') { for (let x = 6; x < 58; x++) { const t = (x - 6) / 52, w = Math.sin(t * Math.PI) * 9 + 1; const yc = 32 + Math.sin(t * 5) * 3; for (let y = Math.round(yc - w); y <= Math.round(yc + w); y++) { const k = Math.abs(y - yc) / w; put(x, y, k < 0.35 ? 60 : k < 0.7 ? 150 : 230); } } }
  else { const lob = Array.from({ length: 9 }, () => [r() * 6.28, 0.6 + r() * 0.5]); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (x - 32) / 18, dy = (y - 32) / 18, rr = Math.hypot(dx, dy), a = Math.atan2(dy, dx); let R = 0.62; for (const [la, lr] of lob) R = Math.max(R, lr * Math.pow(Math.max(0, Math.cos(a - la)), 6)); if (rr < R) put(x, y, rr < R * 0.55 ? 255 : 205); }
    for (let k = 0; k < 14; k++) { const a = r() * 6.28, dd = 20 + r() * 10, rad = 1 + r() * 2.2; const cx = 32 + Math.cos(a) * dd, cy = 32 + Math.sin(a) * dd; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= rad * rad) put(Math.round(cx + x), Math.round(cy + y), 220); } }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
const SPLAT_COL = { blood: [new THREE.Color('#7a0a12'), new THREE.Color('#240306')], wine: [new THREE.Color('#5a0e44'), new THREE.Color('#22041a')] };
class Splats {
  constructor(scene, cap = 220) { this.cap = cap; this.list = []; this.i = 0; this.m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: splatTex('splat'), alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -4 }), cap); this.m.count = 0; this.m.receiveShadow = true; this.m.frustumCulled = false; this.m.renderOrder = 1; scene.add(this.m); this.mx = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.c = new THREE.Color(); }
  add(kind, pos, size, grow = 0) { const e = { kind, x: pos.x, z: pos.z, rot: Math.random() * 6.28, size: grow ? size * 0.15 : size, target: size, grow, age: 0, h: 0.012 + (this.i % 40) * 0.0004 }; if (this.list.length < this.cap) this.list.push(e); else this.list[this.i % this.cap] = e; this.i++; }
  update(dt) { this.list.forEach((e, n) => { e.age += dt; if (e.size < e.target) e.size = Math.min(e.target, e.size + e.grow * dt); this.q.setFromAxisAngle(UP, e.rot); this.mx.compose(V3.set(e.x, e.h, e.z), this.q, S3.set(e.size, 1, e.size)); this.m.setMatrixAt(n, this.mx); const [c0, c1] = SPLAT_COL[e.kind] || SPLAT_COL.blood; this.m.setColorAt(n, this.c.copy(c0).lerp(c1, Math.min(1, e.age / 30))); }); this.m.count = this.list.length; this.m.instanceMatrix.needsUpdate = true; if (this.m.instanceColor) this.m.instanceColor.needsUpdate = true; }
}
const UP = new THREE.Vector3(0, 1, 0), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
let GASH = null; const gashMat = () => GASH || (GASH = new THREE.MeshLambertMaterial({ map: splatTex('gash'), color: '#6a0810', alphaTest: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));

// ---------------------------------------------------------------- magic shader meshes (additive, short-lived)
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false };
const RUNE_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
    float ring = smoothstep(0.03, 0.0, abs(r - 0.92)) + smoothstep(0.02, 0.0, abs(r - 0.82)) + 0.7 * smoothstep(0.02, 0.0, abs(r - 0.5));
    float ticks = step(0.82, r) * step(r, 0.92) * step(0.72, fract(a * 6.366 + uT * 0.6));
    float glyph = step(0.55, r) * step(r, 0.78) * step(0.55, fract(a * 3.183 - uT * 0.35)) * step(0.3, fract(r * 9.0 + a * 1.2));
    float hex = 0.0; for (int i = 0; i < 3; i++) { float ang = float(i) * 2.0944 + uT * 0.25; vec2 n = vec2(cos(ang), sin(ang)); hex += smoothstep(0.018, 0.0, abs(dot(p, n) - 0.25)) * step(r, 0.5); }
    float m = (ring + ticks * 0.8 + glyph * 0.55 + hex * 0.8) * step(r, 1.0);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.7, uLife);
    gl_FragColor = vec4(uCol * m * life * 1.8, m * life); }`;
const RIBBON_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ float s = fract(vUv.x * 2.0 - uT * 1.6); float head = smoothstep(0.0, 0.85, s) * smoothstep(1.0, 0.9, s); float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float life = smoothstep(0.0, 0.2, uLife) * smoothstep(1.0, 0.6, uLife); float a = head * life * (0.5 + 0.5 * edge);
    gl_FragColor = vec4(mix(uCol, vec3(1.0), head * head * 0.6) * a * 2.2, a); }`;
const ORB_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`;
const ORB_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){ float f = pow(1.0 - max(0.0, dot(vN, vV)), 2.2); float sw = 0.5 + 0.5 * sin(vP.y * 9.0 + atan(vP.z, vP.x) * 3.0 - uT * 7.0);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.65, uLife); float a = (f * 1.4 + sw * 0.18) * life;
    gl_FragColor = vec4(mix(uCol, vec3(1.0), f * 0.5) * a * 2.0, a); }`;
const FLAME_FS = `uniform float uT, uLife; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  void main(){ vec2 uv = vUv; float fb = n(uv * vec2(4.0, 6.0) - vec2(0.0, uT * 3.5)) * 0.6 + n(uv * vec2(9.0, 12.0) - vec2(0.0, uT * 6.0)) * 0.4;
    float shape = (1.0 - abs(uv.x - 0.5) * 2.2 / max(0.15, 1.0 - uv.y)) - uv.y * 0.9 + fb * 0.7 - 0.25;
    float life = smoothstep(0.0, 0.12, uLife) * smoothstep(1.0, 0.55, uLife); float m = smoothstep(0.0, 0.25, shape) * life;
    vec3 col = mix(vec3(0.9, 0.18, 0.05), vec3(1.0, 0.75, 0.2), smoothstep(0.1, 0.6, shape)); col = mix(col, vec3(1.0, 0.97, 0.8), smoothstep(0.55, 0.9, shape));
    gl_FragColor = vec4(col * m * 1.8, m); }`;
const SWIRL_FS = `uniform float uT, uLife; varying vec2 vUv;
  void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x); float arms = 0.5 + 0.5 * sin(a * 3.0 + log(r + 0.02) * 7.0 - uT * 9.0);
    float m = arms * smoothstep(1.0, 0.5, r) * smoothstep(0.08, 0.3, r); float core = smoothstep(0.3, 0.12, r);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.6, uLife);
    vec3 col = mix(vec3(0.45, 0.25, 1.0), vec3(0.55, 0.9, 1.0), arms); gl_FragColor = vec4(col * m * life * 1.8 - core * 0.0, (m + core * 0.6) * life); }`;
const UV_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const smat = (fs, col = '#9a7cf0', vs = UV_VS, extra = {}) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { uT: { value: 0 }, uLife: { value: 0 }, uCol: { value: new THREE.Color(col) } }, side: THREE.DoubleSide, ...ADD, ...extra });

// a rune circle that draws itself in (sweeping rings, then glyphs and a turning triangle), quantised to a pixel grid
const RUNE2_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ vec2 p = (floor(vUv * 128.0) + 0.5) / 64.0 - 1.0; float r = length(p); float a = atan(p.y, p.x); float s = fract(a / 6.2832 + 0.25);
    float d1 = smoothstep(0.0, 0.3, uLife), d2 = smoothstep(0.15, 0.45, uLife); float w = 0.018;
    float ring = step(abs(r - 0.93), w) * step(s, d1) + step(abs(r - 0.82), w * 0.8) * step(1.0 - s, d1) + step(abs(r - 0.5), w * 0.8) * step(s, d2);
    float ticks = step(0.83, r) * step(r, 0.92) * step(0.75, fract(a * 9.549 + uT * 0.4)) * step(s, d1);
    float glyph = step(0.56, r) * step(r, 0.76) * step(0.5, fract(a * 3.8197 - uT * 0.3)) * step(0.35, fract(r * 11.0 + a * 1.4)) * d2;
    float tri = 0.0; for (int i = 0; i < 3; i++) { float ang = float(i) * 2.0944 + uT * 0.35; vec2 n = vec2(cos(ang), sin(ang)); tri += step(abs(dot(p, n) - 0.25), 0.012) * step(r, 0.5); } tri *= d2;
    float m = clamp(ring + ticks * 0.8 + glyph * 0.6 + tri * 0.8, 0.0, 1.0) * step(r, 1.0); float life = 1.0 - smoothstep(0.72, 1.0, uLife); float pulse = 0.85 + 0.15 * sin(uT * 9.0);
    gl_FragColor = vec4(mix(uCol, vec3(1.0), step(0.95, m) * 0.25) * m * life * 1.7 * pulse, m * life); }`;
// an impact bloom: a crisp expanding ring, a shrinking core and four short rays, on a 48px grid
const BLOOM_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ vec2 p = (floor(vUv * 48.0) + 0.5) / 24.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
    float e = 1.0 - pow(1.0 - uLife, 3.0); float R = 0.15 + 0.8 * e; float w = 0.09 * (1.0 - uLife) + 0.03;
    float ring = step(abs(r - R), w); float core = step(r, 0.34 * (1.0 - e)); float rays = step(0.94, abs(cos(a * 2.0))) * step(r, R * 1.2) * step(R * 0.45, r) * (1.0 - step(0.5, uLife));
    float m = clamp(ring + core + rays, 0.0, 1.0); float fade = 1.0 - smoothstep(0.55, 1.0, uLife);
    gl_FragColor = vec4(mix(uCol, vec3(1.0), clamp(core + ring * (1.0 - uLife) * 0.6, 0.0, 1.0)) * m * fade * 2.0, m * fade); }`;
// a glowing trail: banded alpha (pixel-art steps), white-hot head fading through the colour to nothing
const TRAIL_VS = `attribute float aU; varying float vU; varying float vS; attribute float aS; void main(){ vU = aU; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TRAIL_FS = `uniform vec3 uCol; uniform float uFade; varying float vU; varying float vS;
  void main(){ float b = floor(pow(vU, 1.4) * 4.0) / 4.0; float edge = step(abs(vS), 0.35 + 0.65 * vU); float a = b * edge * uFade; if (a <= 0.01) discard;
    gl_FragColor = vec4(mix(uCol, vec3(1.0), step(0.75, b) * step(abs(vS), 0.45)) * a * 1.8, a); }`;
// fine pixel sparkles: a 5x5-texel cross that twinkles (arms shrink), white core, tinted arms
const SPARK_VS = `attribute vec4 aC; varying vec4 vC; uniform float uPx; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPx * aC.a; gl_Position = projectionMatrix * mv; }`;
const SPARK_FS = `varying vec4 vC; void main(){ vec2 g = floor(gl_PointCoord * 5.0) - 2.0; float d = abs(g.x) + abs(g.y); float cross = step(min(abs(g.x), abs(g.y)), 0.0);
    float arm = step(d, vC.a > 0.6 ? 2.0 : 1.0); float m = cross * arm; if (m < 0.5) discard; gl_FragColor = vec4(mix(vC.rgb, vec3(1.0), step(d, 0.0)) * 1.8, 1.0); }`;
class Sparkles {
  constructor(scene, cap = 260) {
    this.cap = cap; this.list = []; const g = new THREE.BufferGeometry(); this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aC', new THREE.BufferAttribute(this.col, 4)); g.setDrawRange(0, 0); this.g = g;
    this.pts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: SPARK_VS, fragmentShader: SPARK_FS, uniforms: { uPx: { value: 13 * Math.min(2, window.devicePixelRatio || 1) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.pts.frustumCulled = false; this.pts.renderOrder = 6; this.pts.userData.noInk = true; this.pts.userData.noAO = true; scene.add(this.pts); this.c = new THREE.Color();
  }
  spawn(p, { vel = null, life = 0.6, col = '#ffe8a0', seek = null, swirl = 0, drag = 2 } = {}) { if (this.list.length >= this.cap) this.list.shift(); this.list.push({ p: p.clone(), v: vel ? vel.clone() : new THREE.Vector3(), life, age: 0, col: new THREE.Color(col), seek, swirl, drag, ph: Math.random() * 6 }); }
  update(dt) {
    let n = 0; for (let i = this.list.length - 1; i >= 0; i--) { const q = this.list[i]; q.age += dt; if (q.age > q.life) { this.list.splice(i, 1); continue; }
      if (q.seek) { const tg = q.seek(); const d = V3.copy(tg).sub(q.p); const L = d.length(); if (L < 0.06 && q.age > 0.2) { this.list.splice(i, 1); continue; } d.normalize(); const sw = S3.crossVectors(d, UP).multiplyScalar(q.swirl * Math.min(1, L)); q.v.addScaledVector(d, 26 * dt).addScaledVector(sw, 9 * dt); q.v.multiplyScalar(Math.exp(-q.drag * dt)); }
      else q.v.multiplyScalar(Math.exp(-q.drag * dt)).y -= 0.4 * dt;
      q.p.addScaledVector(q.v, dt); }
    for (const q of this.list) { if (n >= this.cap) break; this.pos.set([q.p.x, q.p.y, q.p.z], n * 3); const k = q.age / q.life; const tw = 0.5 + 0.5 * Math.sin(q.age * 26 + q.ph); this.col.set([q.col.r, q.col.g, q.col.b, (k < 0.75 ? (tw > 0.35 ? 1 : 0.55) : 0.55)], n * 4); n++; }
    this.g.setDrawRange(0, n); this.g.attributes.position.needsUpdate = true; this.g.attributes.aC.needsUpdate = true;
  }
}
class Trail {
  constructor(scene, col, n = 26, width = 0.11) {
    this.n = n; this.w = width; this.hist = []; const g = new THREE.BufferGeometry(); this.pos = new Float32Array(n * 2 * 3); const u = new Float32Array(n * 2), sd = new Float32Array(n * 2); const idx = [];
    for (let i = 0; i < n; i++) { u[i * 2] = u[i * 2 + 1] = i / (n - 1); sd[i * 2] = -1; sd[i * 2 + 1] = 1; if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aU', new THREE.BufferAttribute(u, 1)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1)); g.setIndex(idx); this.g = g;
    this.mat = new THREE.ShaderMaterial({ vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, uniforms: { uCol: { value: new THREE.Color(col) }, uFade: { value: 1 } }, side: THREE.DoubleSide, ...ADD });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.mesh.userData.noInk = true; this.mesh.userData.noAO = true; scene.add(this.mesh);
  }
  push(p, cam) {
    this.hist.push(p.clone()); while (this.hist.length > this.n) this.hist.shift(); const H = this.hist; const N = this.n; const off = N - H.length; const vd = new THREE.Vector3();
    for (let i = 0; i < N; i++) { const j = Math.max(0, i - off); const a = H[Math.min(H.length - 1, j)], b = H[Math.min(H.length - 1, j + 1)] || a, c = H[Math.max(0, j - 1)];
      const tng = V3.subVectors(b, c); if (tng.lengthSq() < 1e-8) tng.set(1, 0, 0); vd.subVectors(cam.position, a).normalize(); const side = S3.crossVectors(tng, vd).normalize().multiplyScalar(this.w * (0.25 + 0.75 * (i / (N - 1))));
      this.pos.set([a.x - side.x, a.y - side.y, a.z - side.z, a.x + side.x, a.y + side.y, a.z + side.z], i * 6); }
    this.g.attributes.position.needsUpdate = true;
  }
  dispose() { this.mesh.removeFromParent(); this.g.dispose(); this.mat.dispose(); }
}

export class FX3D {
  constructor(S) { this.S = S; this.scene = S.scene; this.debris = new Debris(S.scene); this.splats = new Splats(S.scene); this.debris.onSplat = (kind, p, size) => this.splats.add(kind, p, size * rnd(4, 7)); this.knocks = []; this.items = []; this.emitters = []; this.falls = []; this.sparkles = new Sparkles(S.scene); this.trails = []; this.lastMode = ''; this.castCol = '#9fd8ff'; this.pendingCast = null; this.castAt = -9; this.clock = 0; }
  // ---- gore (medieval storytelling: dark crimson, physical)
  blood(p, n, dir = 1, kind = 'blood') { this.debris.burst(kind, p, n, dir, 0.8); }
  spurt(p, dir = 1, dur = 0.35, up = 0.6, kind = 'blood') { this.emitters.push({ p: p.clone(), vel: new THREE.Vector3(dir * 3.2, 3 + up * 3, 0.4), t: 0, dur, acc: 0, kind }); }
  wound(root, p) { if (!root) return; root.userData.wounds = (root.userData.wounds || 0) + 1; if (root.userData.wounds > 4) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), gashMat()); root.updateMatrixWorld(true); const local = root.worldToLocal(p.clone().add(new THREE.Vector3(rnd(-0.15, 0.15), rnd(-0.2, 0.2), 0.35))); m.position.copy(local); m.rotation.z = rnd(-0.8, 0.8); const s = 1 / Math.max(0.2, root.scale.x); m.scale.setScalar(s * rnd(0.7, 1.1)); root.add(m); }
  death(e, root) { if (!root) return; const p = root.position.clone().add(new THREE.Vector3(0, e.def?.isHead ? 0 : 0.8, 0)); this.blood(p, 18, 1); this.splats.add('blood', new THREE.Vector3(root.position.x, 0, root.position.z + 0.2), rnd(1.6, 2.2), 0.7);
    if (e.def?.isHead) { this.spurt(p, -0.4, 1.2, 1); this.falls.push({ root, v: new THREE.Vector3(rnd(0.5, 1.8), 2.5, rnd(-0.4, 0.4)), w: rnd(4, 8), t: 0 }); } }
  // ---- physical
  hit(e, p, { dmg = 0, kind = 'magic', core = '', okind = '', big = false, crit = false } = {}) {
    const S = this.S; const v = S.enemyViews?.get(e.uid); const dir = 1; const power = big ? 1.3 : 0.9; const id = e.id || '';
    // gore by creature: flesh bleeds (dark crimson), medusa sheds stone chips, the satyr sprays wine as well
    if (dmg > 0) { this.blood(p, Math.round((big ? 14 : 6) * (crit ? 1.5 : 1)), dir); if (id.startsWith('satyr')) this.blood(p, 6, dir, 'wine'); if (id.startsWith('medusa')) this.debris.burst('stone', p, 6, dir, 0.9); if (big) { this.spurt(p, dir); this.wound(v?.api.root, p); } }
    const mat = kind === 'apple' ? 'apple' : kind === 'stone' ? 'stone' : kind === 'water' ? 'water' : okind === 'kinetic' ? 'stone' : null;
    if (mat) this.debris.burst(mat, p, big ? 14 : 8, dir, power);
    this.dust(new THREE.Vector3(p.x, 0.05, p.z), big ? 10 : 5);
    this.sparks(p, big ? 10 : 5, okind === 'burn' || kind === 'fire' ? 'fire' : okind === 'zap' ? 'zap' : 'hit');
    if (v) this.knock(v.api.root, dir, Math.min(1.4, 0.35 + dmg / 30) * (crit ? 1.4 : 1));
    this.bloom(p.clone().add(new THREE.Vector3(0, 0, 0.35)), kind === 'apple' ? '#ffd890' : okind === 'zap' || kind === 'zap' ? '#9ef0ff' : okind === 'burn' || kind === 'fire' ? '#ffa040' : kind === 'magic' ? '#c8b0ff' : '#fff0c8', (big ? 1.3 : 0.9) * (crit ? 1.25 : 1));
    // magic looks only for energy / elemental / untyped (law) moves
    if (okind === 'zap' || kind === 'zap') this.lightning(p.clone().add(new THREE.Vector3(-0.6, 2.2, 0.2)), p);
    if (okind === 'burn' || kind === 'fire') this.flame(new THREE.Vector3(p.x, 0, p.z + 0.2), big ? 1.6 : 1.1);
    if (core === 'gravity') this.swirl(p, big ? 2.4 : 1.8);
    if (kind === 'magic' && !mat && okind !== 'zap' && okind !== 'burn') { this.rune(new THREE.Vector3(p.x, 0, p.z), big ? 2.6 : 2, '#a888ff'); this.orb(p, big ? 0.5 : 0.38); }
  }
  hitPlayer(root, p, dmg) { // Sir Isaac is wood: splinters, sawdust and a flake of coat paint, never blood
    this.debris.burst('wood', p.clone().add(new THREE.Vector3(0.2, -0.5, 0.2)), dmg >= 15 ? 12 : 7, -1, 0.9); this.debris.burst('paint', p.clone().add(new THREE.Vector3(0.1, -0.7, 0.2)), dmg >= 15 ? 3 : 1, -1, 0.7); const P = this.S.parts; if (P) for (let i = 0; i < 8; i++) P.spawn({ pos: [p.x + rnd(-0.2, 0.2), p.y - 0.5, p.z + 0.3], vel: [rnd(-1.6, 0.6), rnd(0.2, 1.4), rnd(-0.5, 0.5)], life: rnd(0.5, 1), size: rnd(10, 18), size1: 26, color: pick(['#e8cc94', '#d4b07a', '#f2deb0']), alpha: 0.8, sprite: 'smoke', drag: 2.5 }); this.dust(new THREE.Vector3(root.position.x, 0.05, root.position.z), 4); if (root) this.knock(root, -1, Math.min(1.2, 0.3 + dmg / 25)); }
  cast(pos, col = '#a888ff') { this.castCol = col; if (this.clock - this.castAt < 0.4) return; this.pendingCast = { pos: pos.clone(), col, t: 0.15 }; }
  castMagic(pos, col = this.castCol) { // the rune draws itself under him, motes spiral up into the apple, a bloom where they meet
    this.castAt = this.clock; this.pendingCast = null; const P = this.S.prof; const target = () => (P?.appleWorld ? P.appleWorld(new THREE.Vector3()) : pos.clone().add(new THREE.Vector3(0, 1.3, 0)));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3).rotateX(-Math.PI / 2), smat(RUNE2_FS, col)); m.position.set(pos.x, 0.05, pos.z); m.renderOrder = 2; m.userData.noInk = true; this.add(m, 1.9, (k, it) => { m.rotation.y = it.t * 0.5; });
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, r = 1.0 + Math.random() * 0.2; const p = new THREE.Vector3(pos.x + Math.cos(a) * r, 0.1 + Math.random() * 0.2, pos.z + Math.sin(a) * r * 0.9); this.sparkles.spawn(p, { vel: new THREE.Vector3(0, 1.2 + Math.random(), 0), life: 1.6, col: i % 3 ? col : '#ffffff', seek: target, swirl: 1.4, drag: 2.6 }); }
    this.after(1.0, () => { const t = target(); this.bloom(t, col, 1.1); for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; this.sparkles.spawn(t, { vel: new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, (Math.random() - 0.5)), life: 0.45, col }); } });
  }
  after(sec, fn) { this.items.push({ mesh: new THREE.Object3D(), life: sec, t: 0, upd: null, done: fn }); }
  bloom(p, col = '#ffe2a0', size = 0.9) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), smat(BLOOM_FS, col)); m.position.copy(p); m.renderOrder = 7; m.userData.noInk = true; return this.add(m, 0.42, () => { m.quaternion.copy(this.S.camera.quaternion); }); }
  dust(pos, n) { const P = this.S.parts; if (!P) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; P.spawn({ pos: [pos.x, pos.y + 0.05, pos.z], vel: [Math.cos(a) * rnd(1, 2.6), rnd(0.3, 1.1), Math.sin(a) * rnd(0.6, 1.6)], life: rnd(0.5, 0.9), size: rnd(18, 30), size1: 44, color: pick(['#c8a478', '#b08a60', '#dcc09a']), alpha: 0.75, sprite: 'smoke', drag: 3 }); } }
  sparks(pos, n, kind = 'hit') { const G = this.S.glowParts; if (!G) return; const cols = kind === 'fire' ? ['#ffb040', '#ff7a1a', '#ffe08a'] : kind === 'zap' ? ['#e8fbff', '#8ee8ff', '#ffffff'] : ['#fff6cf', '#ffe08a', '#ffffff']; for (let i = 0; i < n; i++) G.spawn({ pos: [pos.x, pos.y, pos.z + 0.3], vel: [rnd(-4, 4), rnd(-1, 5), rnd(-1.5, 1.5)], life: rnd(0.2, 0.45), size: rnd(10, 18), color: pick(cols), sprite: kind === 'fire' ? 'ember' : 'spark2', grav: kind === 'fire' ? -2 : 9, drag: 2 }); }
  // spring knockback: root offset + lean-back tilt + stagger dip, settling back to where it started
  knock(root, dir, strength) {
    const old = this.knocks.find((k) => k.root === root); if (old) { old.v += dir * strength * 7; old.tv -= dir * strength * 2.4; return; }
    this.knocks.push({ root, x0: root.position.x, y0: root.position.y, rz0: root.rotation.z, off: 0, v: dir * strength * 7, tilt: 0, tv: -dir * strength * 2.4, t: 0, s: strength });
  }
  // enemy attack choreography: anticipation lean -> fast lunge -> (hit lands) -> follow-through and recoil to the slot
  async lunge(root, rest, targetX) {
    const x0 = root.position.x, dx = Math.sign(targetX - x0) || -1; const rz0 = root.rotation.z; const reach = Math.max(0.8, Math.min(3.4, Math.abs(targetX - x0) - 2.2));
    await tweens.to(root.position, { x: x0 - dx * 0.4 }, 0.26, { ease: 'outQuad', onUpdate: (e) => { root.rotation.z = rz0 + dx * 0.16 * e; } });
    await tweens.to(root.position, { x: x0 + dx * reach }, 0.12, { ease: 'inQuad', onUpdate: (e) => { root.rotation.z = rz0 + dx * (0.16 - 0.34 * e); } });
    this.dust(new THREE.Vector3(root.position.x, 0.05, root.position.z), 4);
    tweens.to(root.position, { x: rest.x }, 0.5, { delay: 0.5, ease: 'outCubic', onUpdate: (e) => { root.rotation.z = rz0 - dx * 0.18 * (1 - e); } }).then(() => { root.rotation.z = rz0; });
  }
  // ---- magic meshes
  add(mesh, life, upd) { this.scene.add(mesh); this.items.push({ mesh, life, t: 0, upd }); return mesh; }
  rune(pos, size = 2.2, col = '#a888ff') { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), smat(RUNE_FS, col)); m.position.set(pos.x, 0.04, pos.z); m.renderOrder = 2; return this.add(m, 1.4, (k, it) => { m.rotation.y = it.t * 0.6; }); }
  ribbons(pos, col = '#a888ff') {
    for (let r = 0; r < 3; r++) { const ph = r * 2.094, rad = 0.65 + r * 0.08; const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(Math.cos(ph + t * 9) * rad * (1 - t * 0.3), t * 2.2, Math.sin(ph + t * 9) * rad * (1 - t * 0.3))); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 5), smat(RIBBON_FS, col)); m.position.set(pos.x, 0.1, pos.z); this.add(m, 1.2, (k, it) => { m.rotation.y = it.t * 2.5; }); }
  }
  orb(pos, r = 0.4, col = '#b48cff') { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 4), smat(ORB_FS, col, ORB_VS)); m.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0.4)); return this.add(m, 0.6, (k) => { m.scale.setScalar(0.6 + k * 1.2); }); }
  swirl(pos, size = 2) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), smat(SWIRL_FS)); m.position.copy(pos).add(new THREE.Vector3(0, 0, 0.5)); return this.add(m, 1.1, (k, it) => { m.quaternion.copy(this.S.camera.quaternion); m.scale.setScalar(1.15 - k * 0.5); }); }
  flame(pos, h = 1.2) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.7, h).translate(0, h / 2, 0), smat(FLAME_FS)); pl.rotation.y = (i / 3) * Math.PI; g.add(pl); } g.position.copy(pos); return this.add(g, 0.9, (k, it) => { for (const c of g.children) c.material.uniforms.uT.value = it.t; }); }
  lightning(from, to) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 2.6), ...ADD }); const g = new THREE.Group(); g.userData.mat = mat;
    const build = () => { for (const c of g.children) c.geometry.dispose(); g.clear(); const main = jag(from, to, 9, 0.35); g.add(tube(main, 0.035, mat)); for (let b = 0; b < 2; b++) { const s = main[2 + b * 3]; const end = s.clone().add(new THREE.Vector3(rnd(-0.9, 0.9), rnd(-0.9, -0.2), rnd(-0.3, 0.3))); g.add(tube(jag(s, end, 4, 0.18), 0.02, mat)); } };
    build(); let acc = 0; return this.add(g, 0.5, (k, it, dt) => { acc += dt; if (acc > 0.06) { acc = 0; build(); } g.visible = Math.random() > 0.15; mat.opacity = 1 - k; });
  }
  update(dt) {
    this.clock += dt; this.debris.update(dt); this.splats.update(dt); this.sparkles.update(dt);
    const P = this.S.prof, md = P?.mode ?? '', mt = P?.modeT ?? 0;
    if (md !== this.lastMode) { if (md === 'cast') this.castMagic(P.root.position, this.castCol); if (md === 'throw') this.trails.push({ tr: new Trail(this.scene, '#ffcf7a'), t: 0, spark: 0 }); this.lastMode = md; }
    if (this.pendingCast && (this.pendingCast.t -= dt) <= 0) this.castMagic(this.pendingCast.pos, this.pendingCast.col);
    for (let i = this.trails.length - 1; i >= 0; i--) { const T = this.trails[i]; T.t += dt; const ap = P?.appleWorld?.(new THREE.Vector3()); const live = md === 'throw' && mt > 0.3 && mt < 1.05;
      if (ap && live) { T.tr.push(ap, this.S.camera); T.spark += dt; while (T.spark > 0.025) { T.spark -= 0.025; this.sparkles.spawn(ap.clone().add(new THREE.Vector3(rnd(-0.06, 0.06), rnd(-0.06, 0.06), rnd(-0.06, 0.06))), { vel: new THREE.Vector3(rnd(-0.4, 0.4), rnd(-0.2, 0.5), rnd(-0.3, 0.3)), life: rnd(0.3, 0.6), col: pick(['#ffd890', '#ffb060', '#ffffff']) }); } }
      if (!live) { T.tr.mat.uniforms.uFade.value -= dt * 4; if (T.tr.mat.uniforms.uFade.value <= 0 || T.t > 3) { T.tr.dispose(); this.trails.splice(i, 1); } } }
    for (let i = this.emitters.length - 1; i >= 0; i--) { const em = this.emitters[i]; em.t += dt; em.acc += dt; while (em.acc > 0.03) { em.acc -= 0.03; this.debris.burst(em.kind, em.p, 2, 1, 1, em.vel); } if (em.t > em.dur) this.emitters.splice(i, 1); }
    for (let i = this.falls.length - 1; i >= 0; i--) { const f = this.falls[i]; f.t += dt; f.v.y -= 15 * dt; f.root.position.addScaledVector(f.v, dt); f.root.rotation.z -= f.w * dt; if (f.root.position.y < 0) { f.root.position.y = 0; f.v.y = Math.abs(f.v.y) * 0.35; f.v.x *= 0.6; f.w *= 0.6; } if (f.t > 2) this.falls.splice(i, 1); }
    for (let i = this.knocks.length - 1; i >= 0; i--) {
      const k = this.knocks[i]; k.t += dt; const acc = -150 * k.off - 15 * k.v; k.v += acc * dt; k.off += k.v * dt; const tacc = -110 * k.tilt - 11 * k.tv; k.tv += tacc * dt; k.tilt += k.tv * dt;
      k.root.position.x = k.x0 + k.off; k.root.rotation.z = k.rz0 + k.tilt; k.root.position.y = k.y0 - 0.08 * k.s * Math.exp(-k.t * 7) * Math.abs(Math.sin(k.t * 16));
      if (k.t > 1.4) { k.root.position.x = k.x0; k.root.position.y = k.y0; k.root.rotation.z = k.rz0; this.knocks.splice(i, 1); }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.t += dt; const k = Math.min(1, it.t / it.life);
      it.mesh.traverse((o) => { if (o.material?.uniforms) { o.material.uniforms.uT.value = it.t; o.material.uniforms.uLife.value = k; } });
      it.upd?.(k, it, dt);
      if (it.t >= it.life) { it.done?.(); this.scene.remove(it.mesh); it.mesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); it.mesh.userData.mat?.dispose(); this.items.splice(i, 1); }
    }
  }
}
function jag(a, b, n, amp) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; const p = a.clone().lerp(b, t); if (i > 0 && i < n) p.add(new THREE.Vector3(rnd(-amp, amp), rnd(-amp, amp) * 0.5, rnd(-amp, amp) * 0.5)); pts.push(p); } return pts; }
function tube(pts, r, mat) { const path = new THREE.CurvePath(); for (let i = 0; i + 1 < pts.length; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1])); return new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 2, r, 4), mat); }
