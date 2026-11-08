// Fog of war for the diorama map: stacked, terrain-draped sheets of noise-driven cel fog (hard-edged bands, lighter
// crowns, slow drift) over the rows not yet in reach, rolling back as Sir Isaac advances; wisps and pairs of
// blinking eyes watch from inside it. Mountains rise above the sea of fog.
import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { DIO, rowZ } from './diorama.js';

const LAYERS = 7;
const VS = `varying vec3 vWP; varying float vVZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vec4 mv = viewMatrix * w; vVZ = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FS = `#include <packing>
  uniform float uTime, uFront, uK, uFade, uNear, uFar, uUseDepth; uniform vec2 uRes; uniform sampler2D tDepth; uniform vec3 uLo, uHi, uRim; varying vec3 vWP; varying float vVZ;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += vn(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  float field(vec2 q, float t){ return fbm(q + vec2(fbm(q * 0.7 - t * 0.01), 0.0) * 0.8); }
  void main(){
    if (uUseDepth > 0.5) { float dz = texture2D(tDepth, gl_FragCoord.xy / uRes).x; if (dz < 1.0 && vVZ > -perspectiveDepthToViewZ(dz, uNear, uFar) + 0.02) discard; }
    float t = uTime;
    float d = (uFront - vWP.z) + (fbm(vWP.xz * 0.11 + 3.0) - 0.5) * 5.0;
    float dens = smoothstep(0.0, 6.0, d);
    if (dens < 0.002) discard;
    vec2 q = vWP.xz * 0.15 + vec2(t * 0.016, t * 0.028) + uK * 5.3;
    float n = field(q, t);
    float v = n * 1.0 + dens * 0.42 - 0.3;
    float th = mix(0.06, 0.74, pow(uK, 1.3));
    float a = smoothstep(th, th + 0.015, v) * dens;
    if (a < 0.01) discard;
    // billow relief: a fake normal from the noise gradient, lit by the lamp, quantised into three cel tones
    float e = 0.06; float n0 = fbm(q); float nx = fbm(q + vec2(e, 0.0)) - n0, nz = fbm(q + vec2(0.0, e)) - n0;
    vec3 N = normalize(vec3(-nx * 9.0, 1.0, -nz * 9.0)); float lit = dot(N, normalize(vec3(-0.55, 0.75, 0.4))) + (v - th) * 0.8;
    float band = lit > 0.86 ? 1.0 : lit > 0.62 ? 0.62 : 0.25;
    vec3 base = mix(uLo, uHi, 0.15 + uK * 0.55);
    vec3 c = mix(base * 0.62, mix(base, vec3(0.93, 0.91, 1.0), uK * 0.6), band);
    float rim = 1.0 - smoothstep(th + 0.015, th + 0.04, v);
    c = mix(c, uRim, rim * 0.85);
    float glint = step(0.94, vn(vWP.xz * 1.7 + t * 0.05)) * step(0.9, band) * uK;
    c += vec3(0.2, 0.18, 0.35) * glint;
    gl_FragColor = vec4(c, a * mix(0.72, 0.95, uK) * uFade);
  }`;

export class MapFog {
  constructor(dio) {
    this.group = new THREE.Group(); this.group.name = 'fogOfWar'; this.front = { value: 0 }; this.time = { value: 0 }; this.fade = { value: 1 }; this.depth = { value: null }; this.res = { value: new THREE.Vector2(1, 1) }; this.near = { value: 0.1 }; this.far = { value: 400 }; this.useDepth = { value: 0 };
    const D = DIO; const X0 = D.X0 - 1.5, X1 = D.X1 + 1.5, Z0 = D.ZN - 4, Z1 = D.ZF - 2; const cols = 64, rows = 150;
    // a softened, capped height so the layers drape over hills but let mountain peaks rise out of the fog
    const base = (x, z) => { let s = 0, m = 0; for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) { const h = dio.heightAt(x + dx, z + dz); s += h; m = Math.max(m, h); } return Math.min(2.6, s / 5 * 0.6 + m * 0.4); };
    const pos = new Float32Array((cols + 1) * (rows + 1) * 3); const B = new Float32Array((cols + 1) * (rows + 1)); const idx = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const k = j * (cols + 1) + i; const x = X0 + (X1 - X0) * (i / cols), z = Z0 + (Z1 - Z0) * (j / rows); B[k] = base(x, z); pos.set([x, 0, z], k * 3); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    this.mats = [];
    for (let l = 0; l < LAYERS; l++) {
      const k = l / (LAYERS - 1); const p = pos.slice(); for (let v = 0; v < B.length; v++) p[v * 3 + 1] = B[v] + 0.12 + k * 1.75;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(idx);
      const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uTime: this.time, uFront: this.front, uFade: this.fade, uK: { value: k }, tDepth: this.depth, uRes: this.res, uNear: this.near, uFar: this.far, uUseDepth: this.useDepth, uLo: { value: new THREE.Color('#262a5c') }, uHi: { value: new THREE.Color('#9c96d4') }, uRim: { value: new THREE.Color('#14123a') } } });
      const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 6 + l; mesh.frustumCulled = false; mesh.userData.noInk = true; mesh.userData.noAO = true; this.group.add(mesh); this.mats.push(m);
    }
    // eyes in the fog: pairs of tiny pixel eyes that blink
    this.eyes = []; const tex = eyeTex(); const rnd = mulberry(7 + (dio.seed % 101));
    for (let k = 0; k < 16; k++) {
      const x = D.X0 + 2 + rnd() * (D.X1 - D.X0 - 4), z = -10 - rnd() * 48; if (!dio.free(x, z, 0.2)) continue;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: rnd() < 0.5 ? new THREE.Color(2.2, 1.6, 0.4) : new THREE.Color(1.6, 0.4, 0.3), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      m.scale.set(0.34, 0.12, 1); m.position.set(x, dio.heightAt(x, z) + 0.35 + rnd() * 0.4, z); m.renderOrder = 5; m.userData.noInk = true; this.group.add(m); this.eyes.push({ m, ph: rnd() * 20, z, rate: 0.6 + rnd() * 0.8 });
    }
    this.target = 0;
  }
  /** row of the current node (-1 at the start) -> fog front z */
  frontFor(row) { return rowZ(row + 2.5) - 1.4; }
  setRow(row, snap = false) { this.target = this.frontFor(row); if (snap) this.front.value = this.target; }
  update(dt, t) {
    this.time.value = t; this.front.value += (this.target - this.front.value) * Math.min(1, dt * 0.9);
    for (const e of this.eyes) { const inside = this.front.value - e.z; const vis = inside > 2.5 ? 1 : 0; const c = (t * e.rate + e.ph) % 5; const blink = c < 0.12 ? 0.08 : 1; const look = Math.sin(t * 0.7 + e.ph) * 0.03; e.m.material.opacity += (vis * (c > 4.2 ? 0 : 1) - e.m.material.opacity) * Math.min(1, dt * 3); e.m.scale.set(0.34, 0.12 * blink, 1); e.m.center.set(0.5 + look, 0.5); }
  }
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function eyeTex() {
  const c = document.createElement('canvas'); c.width = 24; c.height = 8; const g = c.getContext('2d');
  for (const ox of [2, 15]) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(ox, 2, 7, 4); g.fillStyle = '#ffffff'; g.fillRect(ox + 1, 2, 5, 4); g.fillRect(ox, 3, 7, 2); g.fillStyle = '#000000'; g.fillRect(ox + 3, 2, 2, 4); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** draws the fog after the engine's ink pass (so outlines never show through it), depth-tested by hand against the
 *  ink pre-pass depth. Falls back to drawing in the world scene when the ink pass is off. */
export class FogPass extends Pass {
  constructor(fog, camera) { super(); this.fog = fog; this.camera = camera; this.needsSwap = false; this.scene = new THREE.Scene(); }
  attach(engine, world) {
    this.engine = engine; this.world = world; const c = engine.composer; const i = c.passes.indexOf(engine.ink);
    if (!c.passes.includes(this)) { if (i >= 0) c.insertPass(this, i + 1); else c.addPass(this); }
  }
  detach() { const c = this.engine?.composer; if (c && c.passes.includes(this)) c.removePass(this); this.world?.add(this.fog.group); }
  sync() {
    const on = !!(this.engine?.ink?.enabled && this.engine.ink.rt?.depthTexture); this.enabled = on; const host = on ? this.scene : this.world;
    if (host && this.fog.group.parent !== host) { host.add(this.fog.group); this.fog.group.traverse((o) => { if (o.material) o.material.depthTest = !on; }); }
    return on;
  }
  render(renderer, writeBuffer, readBuffer) {
    const ink = this.engine.ink; const F = this.fog; F.depth.value = ink.rt.depthTexture; F.res.value.set(readBuffer.width, readBuffer.height); F.near.value = this.camera.near; F.far.value = this.camera.far; F.useDepth.value = 1;
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); renderer.render(this.scene, this.camera); renderer.autoClear = ac; F.useDepth.value = 0;
  }
}
