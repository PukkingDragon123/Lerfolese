// MAGIC-FORCE SCIENCE around an apple: what the old teacher's lessons look like when the laws are made visible.
//  * FILINGS: fine 1-px strokes laid along the field lines of a dipole round the apple, like iron filings on paper,
//    drifting slowly along their lines (GPU: every stroke is placed and animated in the vertex shader).
//  * MOTES: polished square pixel motes (never round) that run along the same lines, brighter and faster.
//  * VECTORS: thin flat arrow glyphs (shaft + barbed head) orbiting on tilted paths, always tangent: force vectors.
//  * WELL: a square spacetime grid under the apple, dimpled into a gravity well that deepens with the apple's pull.
// Palette: muted gold and verdigris cyan (a scientific plate, not a firework). Modes blend smoothly:
//   'apple'  gravity: a calm dipole, a shallow well, slow flow
//   'force'  a push: the lines stream and shear along `dir`, vectors line up with it
//   'rotation' spin: the lines twist into a vortex and the vectors race round
// One draw call per layer, no textures; n scales down on the low quality preset / touch devices.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lowEnd = () => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || (navigator.hardwareConcurrency || 8) <= 4;

const FIELD = /* glsl */ `
uniform float uT, uK, uFlow, uTwist, uPush, uR0, uR1; uniform vec3 uDir;
// a point on the field line (shell L, azimuth phi) at parameter u in 0..1 (pole to pole, clipped outside the apple)
vec3 fieldAt(float L, float phi, float u){
  float s0 = clamp(sqrt(uR0 / L), 0.05, 0.99); float th0 = asin(s0); float th = mix(th0, 3.14159265 - th0, u);
  float r = L * sin(th) * sin(th); float ph = phi + uTwist * (th - 1.5708) * 1.6 + uT * (0.08 + uTwist * 0.9);
  vec3 p = vec3(r * sin(th) * cos(ph), r * cos(th), r * sin(th) * sin(ph));
  p += uDir * uPush * (u - 0.5) * L * 0.9 + uDir * uPush * 0.12 * L; // a push shears the lines along the force
  return p;
}`;

const FIL_VS = /* glsl */ `${FIELD}
attribute vec4 aS; attribute float aEnd; varying float vA; varying float vC;
void main(){
  float u = fract(aS.z + uT * uFlow * aS.w * 0.06); float du = 0.035 + 0.02 * aS.w;
  vec3 p = fieldAt(aS.x, aS.y, clamp(u + aEnd * du, 0.0, 1.0));
  vA = sin(u * 3.14159265) * uK * (0.35 + 0.65 * step(0.5, fract(aS.w * 7.3))); vC = fract(aS.y * 3.7 + aS.x * 5.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const MOTE_VS = /* glsl */ `${FIELD}
attribute vec4 aS; uniform float uPx; varying float vA; varying float vC;
void main(){
  float u = fract(aS.z + uT * uFlow * (0.18 + aS.w * 0.22)); vec3 p = fieldAt(aS.x, aS.y, u);
  vA = sin(u * 3.14159265) * uK; vC = fract(aS.y * 3.7 + aS.x * 5.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * (1.6 + aS.w * 1.4), 2.0, 6.0); // square pixels: two to three screen pixels, never a disc
}`;
const INK_FS = /* glsl */ `uniform vec3 uA, uB; varying float vA; varying float vC;
void main(){ if (vA < 0.01) discard; vec3 c = mix(uA, uB, step(0.55, vC)); gl_FragColor = vec4(c * vA * 1.7, min(1.0, vA * 1.3)); }`;
const MOTE_FS = /* glsl */ `uniform vec3 uA, uB; varying float vA; varying float vC;
void main(){ if (vA < 0.02) discard; vec3 c = mix(uA, uB, step(0.5, vC)); c = mix(c, vec3(1.0, 0.97, 0.88), 0.35); gl_FragColor = vec4(c * vA * 2.6, min(1.0, vA * 1.5)); }`;
// the spacetime sheet: a square grid pulled down into the well (a Gaussian dip), fading toward its square edge
const WELL_VS = /* glsl */ `uniform float uDepth, uT; varying float vF;
void main(){ vec3 p = position; float r2 = dot(p.xz, p.xz); p.y -= uDepth * exp(-r2 * 20.0) * (1.0 + 0.04 * sin(uT * 2.0));
  vF = 1.0 - smoothstep(0.16, 0.34, max(abs(position.x), abs(position.z))); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const WELL_FS = /* glsl */ `uniform vec3 uB; uniform float uK; varying float vF; void main(){ float a = vF * uK * 0.45; if (a < 0.01) discard; gl_FragColor = vec4(uB * a, a); }`;

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false };

function arrowGeo() { // a flat vector glyph: a thin shaft and a barbed head (two triangles), pointing along +x
  const s = new THREE.Shape(); const w = 0.006, L = 0.11, hw = 0.022, hl = 0.035;
  s.moveTo(-L / 2, -w); s.lineTo(L / 2 - hl, -w); s.lineTo(L / 2 - hl * 1.15, -hw); s.lineTo(L / 2, 0); s.lineTo(L / 2 - hl * 1.15, hw); s.lineTo(L / 2 - hl, w); s.lineTo(-L / 2, w); s.closePath();
  return new THREE.ShapeGeometry(s);
}

export class ForceField {
  /** scale: world size of the field (1 = about a 0.5 m reach); n: filings */
  constructor({ scale = 1, n = null, inner = 0.09, gold = 0xc9a45c, cyan = 0x6fb2ae, well = true, vectors = 6 } = {}) {
    const low = lowEnd(); n = n ?? (low ? 260 : 620); const nm = Math.round(n * 0.55);
    this.group = new THREE.Group(); this.group.scale.setScalar(scale); this.group.userData.noInk = true; this.t = 0;
    this.k = 0; this.kT = 1; this.mode = 'apple'; this.st = { flow: 1, twist: 0, push: 0, depth: 0.05 }; this.goal = { ...this.st }; this.boost = 0;
    const px = Math.min(2, window.devicePixelRatio || 1);
    this.u = { uT: { value: 0 }, uLife: { value: 0 }, uK: { value: 0 }, uFlow: { value: 1 }, uTwist: { value: 0 }, uPush: { value: 0 }, uR0: { value: inner }, uR1: { value: 0.5 }, uDir: { value: new THREE.Vector3(1, 0, 0) }, uA: { value: new THREE.Color(gold) }, uB: { value: new THREE.Color(cyan) }, uPx: { value: px * 1.2 } };
    const r = mulberry(7);
    { // filings: two vertices each (aEnd 0 / 1)
      const S = new Float32Array(n * 2 * 4), E = new Float32Array(n * 2), P = new Float32Array(n * 2 * 3);
      for (let i = 0; i < n; i++) { const L = 0.16 + Math.pow(r(), 0.8) * 0.36, ph = Math.floor(r() * 18) / 18 * TAU + (r() - 0.5) * 0.09, z = r(), w = r(); for (let e = 0; e < 2; e++) { S.set([L, ph, z, w], (i * 2 + e) * 4); E[i * 2 + e] = e; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4)); g.setAttribute('aEnd', new THREE.BufferAttribute(E, 1));
      this.fil = new THREE.LineSegments(g, new THREE.ShaderMaterial({ vertexShader: FIL_VS, fragmentShader: INK_FS, uniforms: this.u, ...ADD })); this.fil.frustumCulled = false; this.fil.renderOrder = 6; this.group.add(this.fil);
    }
    { // motes on the same lines
      const S = new Float32Array(nm * 4), P = new Float32Array(nm * 3);
      for (let i = 0; i < nm; i++) S.set([0.16 + Math.pow(r(), 0.8) * 0.36, Math.floor(r() * 18) / 18 * TAU, r(), r()], i * 4);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4));
      this.motes = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: MOTE_VS, fragmentShader: MOTE_FS, uniforms: this.u, ...ADD })); this.motes.frustumCulled = false; this.motes.renderOrder = 7; this.group.add(this.motes);
    }
    // vectors: flat arrow glyphs on two tilted orbits
    this.vec = []; this.vecMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(gold).lerp(new THREE.Color(0xfff2d0), 0.25), side: THREE.DoubleSide, ...ADD, opacity: 0 });
    this.vecMat2 = this.vecMat.clone(); this.vecMat2.color.set(cyan);
    const ag = arrowGeo(); for (let i = 0; i < vectors; i++) { const m = new THREE.Mesh(ag, i % 2 ? this.vecMat2 : this.vecMat); m.renderOrder = 7; m.frustumCulled = false; m.userData = { ph: (i / vectors) * TAU, orbit: i % 2, r: 0.27 + (i % 3) * 0.04 }; this.group.add(m); this.vec.push(m); }
    if (well) { // the spacetime sheet (square grid lines)
      const N = low ? 10 : 14, H = 0.34, pts = []; const seg = 24;
      for (let i = 0; i <= N; i++) { const c = -H + (i / N) * 2 * H; for (let j = 0; j < seg; j++) { const a = -H + (j / seg) * 2 * H, b = -H + ((j + 1) / seg) * 2 * H; pts.push(c, 0, a, c, 0, b, a, 0, c, b, 0, c); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.wellU = { uDepth: { value: 0.05 }, uT: this.u.uT, uLife: this.u.uLife, uK: { value: 0 }, uB: this.u.uB };
      this.well = new THREE.LineSegments(g, new THREE.ShaderMaterial({ vertexShader: WELL_VS, fragmentShader: WELL_FS, uniforms: this.wellU, ...ADD })); this.well.position.y = -0.2; this.well.frustumCulled = false; this.well.renderOrder = 5; this.group.add(this.well);
    }
    this.setMode('apple');
  }
  /** 'apple' | 'force' | 'rotation' (modes stack: force keeps its push when spin is added) */
  setMode(m, dir = null) {
    this.mode = m; const G = this.goal;
    if (m === 'apple') Object.assign(G, { flow: 0.8, twist: 0, push: 0, depth: 0.06 });
    if (m === 'force') Object.assign(G, { flow: 2.2, twist: 0, push: 0.55, depth: 0.09 });
    if (m === 'rotation') Object.assign(G, { flow: 2.6, twist: 0.9, push: G.push * 0.6, depth: 0.12 });
    if (dir) this.u.uDir.value.copy(dir).normalize(); return this;
  }
  show(on = true) { this.kT = on ? 1 : 0; return this; }
  kick(v = 1) { this.boost = Math.min(3, this.boost + v); }
  update(dt) {
    this.t += dt; const S = this.st, G = this.goal, e = Math.min(1, dt * 2.2);
    for (const k of ['flow', 'twist', 'push', 'depth']) S[k] += (G[k] - S[k]) * e; this.boost *= Math.exp(-dt * 1.6);
    this.k += (this.kT - this.k) * Math.min(1, dt * 3); const u = this.u; u.uT.value = this.t; u.uK.value = this.k; u.uFlow.value = S.flow * (1 + this.boost); u.uTwist.value = S.twist + this.boost * 0.35; u.uPush.value = S.push;
    if (this.wellU) { this.wellU.uDepth.value = S.depth * (1 + this.boost * 0.3); this.wellU.uK.value = this.k; }
    this.vecMat.opacity = this.vecMat2.opacity = this.k * 0.85; const spd = 0.7 + S.twist * 2.2 + this.boost; const dir = u.uDir.value;
    for (const m of this.vec) { const d = m.userData; d.ph += dt * spd * (d.orbit ? -1 : 1); const a = d.ph, R = d.r; const tilt = d.orbit ? 0.55 : -0.35;
      const x = Math.cos(a) * R, z = Math.sin(a) * R; const y = z * Math.sin(tilt); m.position.set(x, y, z * Math.cos(tilt));
      // tangent of the orbit, bent toward the push direction when a force acts
      const tx = -Math.sin(a), tz = Math.cos(a) * (d.orbit ? -1 : 1); _t.set(tx, tz * Math.sin(tilt), tz * Math.cos(tilt)).lerp(dir, Math.min(0.85, S.push)).normalize();
      m.quaternion.setFromUnitVectors(_x, _t); m.scale.setScalar(0.8 + 0.25 * Math.sin(this.t * 3 + d.ph)); }
    this.group.visible = this.k > 0.005;
  }
  dispose() { this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); this.group.parent?.remove(this.group); }
}
const _t = new THREE.Vector3(), _x = new THREE.Vector3(1, 0, 0);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
