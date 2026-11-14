// Set pieces for the prologue (and the reconstruction): the master's interactive teaching CONSTRUCTS (brass and glass,
// gimballed, floating over rune-etched glass sigils), the sky that cracks and falls in shards, the reality-warp pass,
// the pop-up storybook of the new world, the star-viewing dome (a stand-in until the menu's own dome exists: swap it
// through registerSet('dome', builder)), and the golden FORBIDDEN APPLE card face.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as K from '../models/charkit.js';
import { turned, plainMat, Surf, RAMP, parchment, leather, pxTex, vineBorder, goldRule, slab, frontMat, sideMat, wood } from '../ui3d/craft.js';
import { makeApple, telescope } from '../models/orchard.js';
import { miniTree } from '../models/minitrees.js';
import { PROPS } from '../models/world.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const R = (s) => { let x = s; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

// ---------------------------------------------------------------- swappable sets (another module may register a better one)
const SETS = {};
export function registerSet(name, builder) { SETS[name] = builder; }
export const setBuilder = (name, fallback) => SETS[name] || fallback;

// ---------------------------------------------------------------- pixel sigil: a rune ring etched in light (128 px, crisp)
function sigilTex(seed = 1, col = '#bff4ff') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = col; const r = R(seed * 7 + 3);
  const px = (x, y) => g.fillRect(Math.round(x), Math.round(y), 1, 1);
  for (const rad of [60, 52, 30]) for (let i = 0; i < rad * 7; i++) { const a = (i / (rad * 7)) * TAU; px(64 + Math.cos(a) * rad, 64 + Math.sin(a) * rad); }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; for (let d = 52; d < 60; d++) if (k % 2 || d < 56) px(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; const cx = 64 + Math.cos(a) * 41, cy = 64 + Math.sin(a) * 41; const gl = [r(), r(), r(), r(), r(), r()]; for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) if (gl[(i + j) % 6] > 0.45 && (i === 0 || j === 0 || j === 4 || gl[(i * j) % 6] > 0.7)) px(cx - 2 + i, cy - 2 + j); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const b = ((i + 2) / 6) * TAU; for (let s = 0; s <= 40; s++) { const u = s / 40; px(64 + (Math.cos(a) * (1 - u) + Math.cos(b) * u) * 30, 64 + (Math.sin(a) * (1 - u) + Math.sin(b) * u) * 30); } }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function brassRing(r, w = 0.018, sides = 64) { const p = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; p.push([r + Math.cos(a) * w, Math.sin(a) * w * 1.6]); } const m = new THREE.Mesh(turned(p, sides, { smooth: true }), plainMat('brass')); m.castShadow = true; return m; }
const glassMat = (color = 0x8fe8ff, emissive = 0x2a88c0) => new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity: 0.7, transparent: true, opacity: 0.88 });

// ---------------------------------------------------------------- the constructs
function constructBase(seed) {
  const g = new THREE.Group(); const sig = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: sigilTex(seed), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sig.rotation.x = -Math.PI / 2; sig.userData.noInk = true; g.add(sig); const ring = brassRing(0.62, 0.02); g.add(ring);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.55; g.add(hit);
  return { g, sig, ring, hit };
}
function arrow() { // a glass-and-brass force vector: turned shaft, collared head, three fletching vanes
  const g = new THREE.Group(); const m = glassMat();
  const shaft = new THREE.Mesh(turned([[0, -0.6], [0.03, -0.58], [0.026, -0.4], [0.022, 0.3], [0.03, 0.33], [0.022, 0.36], [0, 0.37]], 20), m); g.add(shaft);
  const head = new THREE.Mesh(turned([[0, 0.34], [0.05, 0.36], [0.085, 0.4], [0.07, 0.43], [0.045, 0.52], [0.02, 0.62], [0, 0.66]], 24), m); g.add(head);
  const col = new THREE.Mesh(turned([[0.032, 0.32], [0.045, 0.33], [0.045, 0.36], [0.032, 0.37]], 20), plainMat('brass')); g.add(col);
  for (let i = 0; i < 3; i++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.05, 0.12, 0.2); s.lineTo(0.02, 0.22); s.quadraticCurveTo(0.02, 0.1, 0, 0); const v = new THREE.Mesh(new THREE.ShapeGeometry(s, 6), new THREE.MeshToonMaterial({ color: 0xe8c060, side: THREE.DoubleSide })); v.position.y = -0.6; v.rotation.y = (i / 3) * TAU; g.add(v); }
  g.rotation.z = -Math.PI / 2; return g; // points along +x
}
function weight(r, h) { return new THREE.Mesh(turned([[0, 0], [r * 1.0, 0], [r * 1.05, h * 0.06], [r, h * 0.12], [r * 0.96, h * 0.7], [r * 0.7, h * 0.8], [r * 0.32, h * 0.86], [r * 0.3, h * 0.95], [r * 0.42, h * 1.0], [r * 0.3, h * 1.08], [0, h * 1.1]], 28), plainMat('brass')); }
/** kind: 'force' | 'apple' | 'mass'. Returns { group, hit, kind, glow(on), merge(), play() -> Promise, update(dt, t) } */
export function construct(kind, seed = 1) {
  const B = constructBase(seed + kind.length); const g = B.g; const st = { glow: 0, want: 0, merged: 0, t: 0, play: null };
  const body = new THREE.Group(); body.position.y = 0.7; g.add(body); let apple = null; const dots = [];
  if (kind === 'force') { const a = arrow(); body.add(a); const gim = brassRing(0.42, 0.012); gim.rotation.x = Math.PI / 2; body.add(gim); const gim2 = brassRing(0.38, 0.01); body.add(gim2); st.arrow = a; st.gims = [gim, gim2]; }
  if (kind === 'apple') { apple = makeApple({ s: 0.1, ripe: 1 }); apple.position.set(0, 0.55, 0); body.add(apple); for (let i = 1; i <= 14; i++) { const u = i / 14; const d = new THREE.Mesh(turned([[0, -0.018], [0.014, -0.006], [0.014, 0.006], [0, 0.018]], 8), new THREE.MeshToonMaterial({ color: 0xfff0b0, emissive: 0xffc860, emissiveIntensity: 0.6 })); d.position.set(u * 0.55, 0.55 - u * u * 1.15, 0); d.userData.noInk = true; body.add(d); dots.push(d); } }
  if (kind === 'mass') { const stack = new THREE.Group(); [[0.2, 0.28], [0.15, 0.22], [0.11, 0.17]].reduce((y, [r, h]) => { const w = weight(r, h); w.position.y = y; stack.add(w); return y + h * 1.08; }, -0.55); body.add(stack); st.stack = stack; }
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: sigilTex(seed + 9, '#ffe7a0'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02; halo.userData.noInk = true; g.add(halo);
  let held = null; // the apple the card placed onto this construct
  const api = {
    group: g, hit: B.hit, kind, body,
    glow(on) { st.want = on ? 1 : 0; },
    merge() { st.merged = 1; if (kind !== 'apple') { held = makeApple({ s: 0.1, ripe: 1 }); held.position.set(kind === 'force' ? -0.62 : 0, kind === 'force' ? 0 : 0.42, 0); body.add(held); } else { st.merged = 1; } return held; },
    held: () => held || apple,
    /** End Turn: the construct does what its law says */
    play(onHit, target = null) {
      return new Promise((res) => { st.play = { t: 0, res, onHit, hit: false, target }; });
    },
    update(dt, t) {
      st.t += dt; st.glow += (st.want - st.glow) * Math.min(1, dt * 6); B.sig.rotation.z += dt * (0.3 + st.glow * 2); B.sig.material.opacity = 0.45 + st.glow * 0.5 + st.merged * 0.2; halo.material.opacity = st.glow * 0.8 + st.merged * 0.35; halo.rotation.z -= dt * 0.8;
      body.position.y = 0.7 + Math.sin(st.t * 1.4 + seed) * 0.05; body.rotation.y = kind === 'force' ? Math.sin(st.t * 0.6) * 0.25 : st.t * 0.4;
      if (st.gims) { st.gims[0].rotation.z += dt * 0.9; st.gims[1].rotation.y += dt * 1.3; }
      for (let i = 0; i < dots.length; i++) { const k = (st.t * 0.8 - i / dots.length) % 1; dots[i].scale.setScalar(0.6 + 0.6 * Math.max(0, 1 - Math.abs(k) * 6)); }
      const P = st.play; if (P) {
        P.t += dt; const u = P.t;
        if (kind === 'force' && held) { const k = ss(0, 0.5, u); held.position.set(-0.62 + k * 0.4, 0, 0); if (u > 0.5) { if (!P.launched) { P.launched = true; P.from = held.getWorldPosition(V()); body.remove(held); g.parent.add(held); held.position.copy(P.from); held.scale.setScalar(1); } const f = Math.min(1, (u - 0.5) / 0.9); const to = P.target || P.from.clone().add(V(4, 0, 0)); held.position.lerpVectors(P.from, to, f); held.position.y += Math.sin(f * Math.PI) * 0.9; held.rotation.z -= dt * 14; if (f >= 1 && !P.hit) { P.hit = true; P.onHit?.(held.position.clone()); held.visible = false; } } }
        if (kind === 'apple') { const f = ss(0.1, 1.2, u); const a2 = apple; const k = f; a2.position.set(k * 0.55, 0.55 - k * k * 1.15, 0); a2.rotation.z -= dt * 6; if (f >= 1 && !P.hit) { P.hit = true; P.onHit?.(a2.getWorldPosition(V())); } }
        if (kind === 'mass') { const k = ss(0.05, 0.6, u); st.stack.scale.setScalar(1 + k * 0.45); body.position.y -= k * 0.25; if (u > 0.6 && !P.hit) { P.hit = true; P.onHit?.(g.getWorldPosition(V())); } }
        if (u > 1.9) { st.play = null; P.res(); }
      }
    },
  };
  return api;
}
/** the brass weights get struck: they topple and ring */
export function topple(c, dt, k) { if (c.kind !== 'mass') return; c.body.children[0].children.forEach((w, i) => { w.rotation.z = -k * (0.6 + i * 0.5); w.position.x = k * (0.1 + i * 0.12); }); }

// ---------------------------------------------------------------- the sky cracks and falls
const SKY_FALLBACK = `varying vec3 vW; void main(){ vec3 d = normalize(vW); float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(vec3(1.0, 0.72, 0.42), vec3(0.32, 0.42, 0.78), pow(h, 0.6)); gl_FragColor = vec4(c, 1.0); }`;
/** shards of the sky dome around `center` (radius r). skyMat: the set's own sky material (so the shards match the sky). */
export function skyShards(center, { r = 70, skyMat = null, seed = 9, az = 18, el = 6 } = {}) {
  const g = new THREE.Group(); g.position.copy(center); const rnd = R(seed); const shards = [];
  const mat = skyMat ? skyMat.clone() : new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: SKY_FALLBACK });
  mat.side = THREE.DoubleSide; mat.depthWrite = true; mat.fog = false;
  const grid = []; for (let j = 0; j <= el; j++) { grid.push([]); for (let i = 0; i <= az; i++) { const ja = j > 0 && j < el ? (rnd() - 0.5) * 0.6 : 0, ia = (rnd() - 0.5) * 0.6; const A = ((i + (j === el ? 0 : ia)) / az) * TAU, E = (-0.06 + (j + ja) / el * 1.2) * (Math.PI / 2) * 0.98; grid[j].push(V(Math.cos(E) * Math.sin(A), Math.sin(E), -Math.cos(E) * Math.cos(A)).multiplyScalar(r)); } }
  const tri = (a, b, c) => { // a curved triangle, subdivided, on the sphere, centred on its centroid
    const n = 4; const P = [], idx = []; const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3).setLength(r);
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const u = i / n, v = j / n; P.push(a.clone().multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v).setLength(r).sub(cen)); }
    const id = (i, j) => { let k = 0; for (let q = 0; q < i; q++) k += n + 1 - q; return k + j; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { idx.push(id(i, j), id(i + 1, j), id(i, j + 1)); if (j < n - i - 1) idx.push(id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)); }
    const geo = new THREE.BufferGeometry().setFromPoints(P); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.copy(cen); m.userData.noInk = true; m.frustumCulled = false; g.add(m);
    shards.push({ m, cen, vel: V(), spin: V((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6), delay: rnd() * 1.6 + (1 - cen.y / r) * 0.8, fall: false });
  };
  for (let j = 0; j < el; j++) for (let i = 0; i < az; i++) { const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i], d = grid[j + 1][i + 1]; if (rnd() < 0.5) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); } }
  let crackK = 0;
  return {
    group: g, shards, mat,
    crack(k) { crackK = k; for (const s of shards) if (!s.fall) s.m.scale.setScalar(1 - k * (0.035 + (s.delay % 0.3) * 0.05)); },
    drop(frac = 1) { for (const s of shards) if (!s.fall && (s.delay % 1) < frac) { s.fall = true; s.vel.copy(s.cen).normalize().multiplyScalar(-2 - Math.random() * 3).add(V((Math.random() - 0.5) * 3, -2, (Math.random() - 0.5) * 3)); } },
    update(dt, frozen = false) { if (frozen) return; for (const s of shards) { if (!s.fall) continue; s.vel.y -= 14 * dt; s.m.position.addScaledVector(s.vel, dt); s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt; } void crackK; },
  };
}

// ---------------------------------------------------------------- reality warp (a composer pass: swirl, stretch, bleach)
const WarpShader = {
  uniforms: { tDiffuse: { value: null }, uK: { value: 0 }, uTime: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1.7 }, uWhite: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uK, uTime, uAspect, uWhite; uniform vec2 uC; varying vec2 vUv;
    void main(){ vec2 p = vUv - uC; p.x *= uAspect; float r = length(p); float a = atan(p.y, p.x);
      a += uK * 2.4 * exp(-r * 2.0) + sin(r * 22.0 - uTime * 4.0) * 0.035 * uK;
      float rr = r * (1.0 - 0.32 * uK * smoothstep(0.0, 0.9, r)) + sin(a * 6.0 + uTime) * 0.006 * uK;
      vec2 q = vec2(cos(a), sin(a)) * rr; q.x /= uAspect; vec2 uv = q + uC;
      vec3 c = vec3(0.0); for (int i = 0; i < 8; i++) { float f = float(i) / 7.0; c += texture2D(tDiffuse, mix(uv, uC, f * 0.16 * uK)).rgb; } c /= 8.0;
      float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(l) * vec3(1.06, 1.0, 0.9), uK * 0.55);
      c += vec3(1.0, 0.92, 0.7) * smoothstep(0.35, 0.0, r) * uK * 0.5;
      c = mix(c, vec3(1.0, 0.99, 0.96), uWhite); gl_FragColor = vec4(c, 1.0); }`,
};
export function warpPass(engine) {
  const pass = new ShaderPass(WarpShader); const C = engine.composer; const at = Math.max(1, C.passes.indexOf(engine.bloom)); C.insertPass(pass, at);
  return { pass, u: pass.uniforms, set(k, white = 0) { pass.uniforms.uK.value = k; pass.uniforms.uWhite.value = white; pass.uniforms.uAspect.value = engine.aspect; pass.uniforms.uTime.value = performance.now() / 1000; }, dispose() { C.removePass(pass); pass.dispose?.(); } };
}

// ---------------------------------------------------------------- the pop-up storybook of the new world
function pageTex(seed, right) {
  const S = new Surf(128, 160); parchment(S, 0, 0, 128, 160, { seed, torn: 0, tone: 5 });
  vineBorder(S, 0, 0, 128, 160, { inset: 5, seed }); goldRule(S, 14, 22, 113); goldRule(S, 14, 138, 113);
  for (let k = 0; k < 9; k++) for (let x = 18; x < 110; x++) if (Math.sin(x * 1.7 + k * 9 + seed) > -0.6 && (x - 18) % 23 < 19) S.pix(x, 32 + k * 11 + (right ? 2 : 0), '#6a4a34'); // lines of tiny script
  const c = S.toCanvas(); return pxTex(c);
}
/** an open book that lies in the white; its pop-ups (forest, village, windmill, temple, orchard) spring up in turn */
export function popBook() {
  const g = new THREE.Group(); const W = 3.0, D = 3.6;
  const cover = (() => { const S = new Surf(96, 64); leather(S, 0, 0, 96, 64, { seed: 4, ramp: RAMP.leather }); for (let x = 6; x < 90; x++) for (const y of [5, 58]) S.pix(x, y, '#e8c060'); return pxTex(S.toCanvas()); })();
  const cv = new THREE.Mesh(slab(W * 2 + 0.3, D + 0.3, 0.12, { cut: 0.08, bevel: 0.04 }), [frontMat(cover), sideMat('walnut')]); cv.rotation.x = -Math.PI / 2; cv.position.y = 0.04; cv.castShadow = cv.receiveShadow = true; g.add(cv);
  const pages = []; for (const s of [-1, 1]) { const geo = new THREE.PlaneGeometry(W, D, 16, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) * s + W / 2; p.setZ(i, Math.sin(Math.min(1, x / W) * Math.PI * 0.5) * 0.12 * (1 - x / W) + 0.02 * Math.sin(x * 3)); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: pageTex(7 + s, s > 0), side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(s * W / 2, 0.16, 0); m.receiveShadow = true; g.add(m); pages.push(m); }
  const pops = []; const rnd = R(77);
  const add = (o, x, z, s, ry = 0) => { const hinge = new THREE.Group(); hinge.position.set(x, 0.17, z); o.scale.multiplyScalar(s); o.rotation.y = ry; hinge.add(o); hinge.rotation.x = -Math.PI / 2; hinge.scale.setScalar(0.001); g.add(hinge); pops.push({ hinge, t0: pops.length * 0.45, s: 1 }); return o; };
  for (let i = 0; i < 6; i++) add(miniTree(['oak', 'pine', 'olive', 'oak', 'cypress', 'oak'][i] || 'oak', rnd, 1), -2.5 + (i % 3) * 0.55, -1.2 + Math.floor(i / 3) * 0.7, 0.45);
  try { add(PROPS.cottage(3, { w: 3.4, d: 3, h: 2.6 }), -0.9, 0.9, 0.22, 0.4); } catch (e) { /* */ }
  try { add(PROPS.windmill(2), -2.2, 0.8, 0.2, -0.3); } catch (e) { /* */ }
  try { add(PROPS.tholos(5, { R: 1.6, n: 8, h: 2.4 }), 1.6, -0.6, 0.32); } catch (e) { /* */ }
  for (let i = 0; i < 4; i++) add(miniTree(i % 2 ? 'oak' : 'pine', rnd, 1), 0.6 + i * 0.6, 1.2 - (i % 2) * 0.3, 0.38);
  try { add(PROPS.cypress(2, 0.5), 2.6, 0.4, 0.5); } catch (e) { /* */ }
  let t = -1;
  return { group: g, open() { t = 0; }, update(dt) { if (t < 0) return; t += dt; for (const p of pops) { const k = ss(p.t0, p.t0 + 0.55, t); const over = Math.sin(Math.min(1, Math.max(0, (t - p.t0) / 0.8)) * Math.PI) * 0.25 * (1 - ss(p.t0 + 0.5, p.t0 + 1.2, t)); p.hinge.rotation.x = -Math.PI / 2 * (1 - k) + over * 0.4; p.hinge.scale.setScalar(Math.max(0.001, k * (1 + over))); } } };
}

// ---------------------------------------------------------------- the star-viewing dome (stand-in): a stone drum of columns,
// a ribbed dome with its slit open to the stars, a great brass telescope, a star-map mosaic floor, lamps
function mosaicTex() {
  const S = new Surf(192, 192); const cx = 96, cy = 96;
  for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) { const d = Math.hypot(x - cx, y - cy); if (d > 95) continue; const a = Math.atan2(y - cy, x - cx); const ring = Math.floor(d / 12); const tile = ((Math.floor(a * (4 + ring * 2) / TAU * 4) + ring) % 2); const r = d > 88 ? RAMP.brass : ring % 3 === 0 ? RAMP.night : RAMP.slate; S.set(x, y, r, d > 88 ? 3 : 1 + tile + ((x * 7 + y * 3) % 11 === 0 ? 1 : 0)); }
  const rnd = R(5); for (let i = 0; i < 70; i++) { const a = rnd() * TAU, d = rnd() * 84; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; S.set(x, y, RAMP.gold, 5); if (rnd() < 0.3) { S.set(x + 1, y, RAMP.gold, 3); S.set(x - 1, y, RAMP.gold, 3); S.set(x, y + 1, RAMP.gold, 3); S.set(x, y - 1, RAMP.gold, 3); } }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; for (let d = 20; d < 88; d++) if (d % 3) S.set(cx + Math.cos(a) * d, cy + Math.sin(a) * d, RAMP.gold, 2); }
  return pxTex(S.toCanvas());
}
function domeTex() { const S = new Surf(64, 64); wood(S, 0, 0, 64, 64, RAMP.walnut, { seed: 3, base: 2, vertical: true, seams: 3 }); for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x++) S.set(x, y, RAMP.brass, 3); return pxTex(S.toCanvas(), { repeat: true }); }
export function buildDome() {
  const g = new THREE.Group(); g.name = 'star-dome'; const RAD = 7.5;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(RAD, 96), new THREE.MeshToonMaterial({ map: mosaicTex() })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const drum = new THREE.Mesh(turned([[RAD + 0.4, 0], [RAD + 0.4, 3.2], [RAD + 0.6, 3.3], [RAD + 0.6, 3.5], [RAD, 3.5], [RAD, 0]], 96), new THREE.MeshToonMaterial({ color: 0x8a7a6a, side: THREE.DoubleSide })); drum.receiveShadow = true; g.add(drum);
  // the dome shell: a ribbed hemisphere of planks with an open slit facing the sky
  const dt = domeTex(); dt.repeat.set(24, 6); const shellGeo = new THREE.SphereGeometry(RAD + 0.3, 96, 32, 0.32, TAU - 0.64, 0, Math.PI / 2);
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshToonMaterial({ map: dt, side: THREE.BackSide })); shell.position.y = 3.4; shell.rotation.y = Math.PI; g.add(shell);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; if (Math.abs(((a + Math.PI) % TAU) - Math.PI) < 0.36) continue; const pts = []; for (let k = 0; k <= 12; k++) { const e = (k / 12) * Math.PI / 2; pts.push(V(Math.sin(a) * Math.cos(e) * (RAD + 0.15), 3.4 + Math.sin(e) * (RAD + 0.15), Math.cos(a) * Math.cos(e) * (RAD + 0.15))); } const rib = new THREE.Mesh(new K.Loft(13, 8).set(K.curve(pts), () => 0.09).geo, plainMat('brass')); g.add(rib); }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.31; try { const c = PROPS.column(i, 3.2); c.position.set(Math.sin(a) * (RAD - 0.6), 0, Math.cos(a) * (RAD - 0.6)); g.add(c); } catch (e) { /* */ } }
  // the great telescope on its pier, aimed up through the slit
  const scope = telescope('Ad Astra', V(0, 0.8, 0.6).normalize()); scope.scale.setScalar(1.55); scope.position.set(2.4, 0, -3.4); scope.rotation.y = Math.PI * 0.85; g.add(scope); // its engraved tag turned to the wall
  // stars beyond the slit and a sky of them overhead (pixel points), and two lamps
  const N = 900; const sp = new Float32Array(N * 3); const rnd = R(11); for (let i = 0; i < N; i++) { const a = rnd() * TAU, e = 0.15 + rnd() * 1.35; sp.set([Math.cos(e) * Math.sin(a) * 60, Math.sin(e) * 60 + 3, -Math.cos(e) * Math.cos(a) * 60], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff4d8, size: 2.2, sizeAttenuation: false, toneMapped: false })); stars.userData.noInk = true; g.add(stars);
  for (const s of [-1, 1]) { const l = new THREE.PointLight(0xffb060, 18, 9, 1.6); l.position.set(s * 3.4, 2.6, 1.6); g.add(l); }
  const moon = new THREE.DirectionalLight(0x9ab0ff, 1.4); moon.position.set(-2, 10, -6); moon.castShadow = true; g.add(moon); g.add(new THREE.HemisphereLight(0x6a70c0, 0x2a1a20, 0.9));
  g.userData.spots = { master: V(-1.2, 0, -1.4), hero: V(1.6, 0, 2.2), dog: V(2.6, 0, 1.3), scope: scope.position.clone(), look: V(0, 1.6, -1) };
  return { group: g, update() {}, background: new THREE.Color(0x0a0c22) };
}

// ---------------------------------------------------------------- the forbidden apple: the Apple card, gilded, crackling, wrong
export function forbiddenFace(baseCanvas, frame = 0) {
  const c = document.createElement('canvas'); c.width = baseCanvas.width; c.height = baseCanvas.height; const g = c.getContext('2d'); g.drawImage(baseCanvas, 0, 0);
  g.globalCompositeOperation = 'color'; g.fillStyle = '#e8b030'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,214,90,0.18)'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
  const r = R(31 + frame * 13); const W = c.width, H = c.height; const px = Math.max(2, Math.round(W / 96));
  for (let k = 0; k < 6; k++) { let x = r() * W, y = r() * H; g.fillStyle = k % 2 ? '#fff6c8' : '#ffd84a'; for (let s = 0; s < 22; s++) { g.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px); x += (r() - 0.5) * px * 6; y += (r() - 0.3) * px * 4; if (r() < 0.12) { g.fillStyle = '#ffffff'; } } }
  g.strokeStyle = '#2a0a10'; g.lineWidth = px; for (let k = 0; k < 3; k++) { g.beginPath(); let x = W * (0.2 + r() * 0.6), y = 0; g.moveTo(x, y); while (y < H) { x += (r() - 0.5) * W * 0.15; y += H * (0.05 + r() * 0.08); g.lineTo(Math.round(x / px) * px, Math.round(y / px) * px); } g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1; }
  return c;
}
export { sigilTex, brassRing };
