// Pixel-art particle system: CPU simulated, drawn as atlas-mapped points (one draw call per system).
import * as THREE from 'three';
import { buildAtlas } from './sprites.js';
import { toTexture } from './textures.js';

let ATLAS = null;
function atlas() { if (!ATLAS) { const a = buildAtlas(); ATLAS = { ...a, tex: toTexture(a.pc, { wrap: false }) }; ATLAS.tex.minFilter = THREE.NearestFilter; ATLAS.tex.generateMipmaps = false; } return ATLAS; }

const VS = `attribute float aSize; attribute float aFrame; attribute vec4 aColor; attribute float aRot; varying vec4 vColor; varying float vFrame; varying float vRot;
uniform float uScale; void main(){ vColor = aColor; vFrame = aFrame; vRot = aRot; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.1, -mv.z); }`;
const FS = `uniform sampler2D uAtlas; varying vec4 vColor; varying float vFrame; varying float vRot;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + 0.5;
 if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard;
 float col = mod(vFrame, 8.0), row = floor(vFrame / 8.0);
 vec2 uv = (vec2(col, row) + vec2(p.x, p.y)) / 8.0; uv.y = 1.0 - uv.y;
 vec4 t = texture2D(uAtlas, uv); if (t.a < 0.5) discard; gl_FragColor = vec4(t.rgb * vColor.rgb, vColor.a); }`;

export class Particles {
  constructor(max = 2000, { additive = false, depthWrite = false, scale = 7 } = {}) {
    const A = atlas(); this.A = A; this.max = max; this.count = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.size0 = new Float32Array(max); this.size1 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.spin = new Float32Array(max); this.rot = new Float32Array(max);
    this.col = new Float32Array(max * 4); this.fade = new Uint8Array(max); this.wobble = new Float32Array(max); this.floorY = new Float32Array(max).fill(-1e9); this.bounce = new Float32Array(max);
    const g = (this.geo = new THREE.BufferGeometry());
    this.aPos = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.aFrame = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aSize', this.aSize); g.setAttribute('aFrame', this.aFrame); g.setAttribute('aColor', this.aColor); g.setAttribute('aRot', this.aRot);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uAtlas: { value: A.tex }, uScale: { value: scale } }, transparent: true, depthWrite, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    this.frameOf = new Float32Array(max);
  }
  // spawn(o): {pos:[x,y,z], vel:[...], spread, life, size, size1, color:'#hex'|THREE.Color, alpha, sprite, grav, drag, spin, fade, wobble, floor, bounce}
  spawn(o) {
    if (this.count >= this.max) return;
    const i = this.count++; const s = o.spread || 0;
    this.p[i * 3] = o.pos[0] + (Math.random() - 0.5) * s; this.p[i * 3 + 1] = o.pos[1] + (Math.random() - 0.5) * s; this.p[i * 3 + 2] = o.pos[2] + (Math.random() - 0.5) * s;
    const vs = o.velSpread || 0;
    this.v[i * 3] = (o.vel?.[0] || 0) + (Math.random() - 0.5) * vs; this.v[i * 3 + 1] = (o.vel?.[1] || 0) + (Math.random() - 0.5) * vs; this.v[i * 3 + 2] = (o.vel?.[2] || 0) + (Math.random() - 0.5) * vs;
    const life = o.life ?? 1; this.life[i] = life; this.maxLife[i] = life;
    this.size0[i] = o.size ?? 1; this.size1[i] = o.size1 ?? this.size0[i];
    this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.spin[i] = o.spin ?? 0; this.rot[i] = o.rot ?? Math.random() * 6.28;
    const c = o.color instanceof THREE.Color ? o.color : new THREE.Color(o.color || '#ffffff');
    this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b; this.col[i * 4 + 3] = o.alpha ?? 1;
    this.fade[i] = o.fade === false ? 0 : 1; this.wobble[i] = o.wobble || 0; this.floorY[i] = o.floor ?? -1e9; this.bounce[i] = o.bounce ?? 0.35;
    this.frameOf[i] = this.A.index(o.sprite || 'dot');
  }
  burst(n, o) { for (let k = 0; k < n; k++) this.spawn(typeof o === 'function' ? o(k) : o); }
  update(dt, time) {
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this._swap(i, --n); i--; continue; }
      const d = Math.exp(-this.drag[i] * dt);
      this.v[i * 3] *= d; this.v[i * 3 + 1] = this.v[i * 3 + 1] * d - this.grav[i] * dt; this.v[i * 3 + 2] *= d;
      if (this.wobble[i]) { this.v[i * 3] += Math.sin(time * 3 + i) * this.wobble[i] * dt; this.v[i * 3 + 2] += Math.cos(time * 2.3 + i * 1.7) * this.wobble[i] * dt; }
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      if (this.p[i * 3 + 1] < this.floorY[i]) { this.p[i * 3 + 1] = this.floorY[i]; this.v[i * 3 + 1] *= -this.bounce[i]; this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; this.spin[i] *= 0.5; }
      this.rot[i] += this.spin[i] * dt;
    }
    this.count = n;
    const P = this.aPos.array, S = this.aSize.array, F = this.aFrame.array, C = this.aColor.array, Ro = this.aRot.array;
    for (let i = 0; i < n; i++) {
      const k = 1 - this.life[i] / this.maxLife[i];
      P[i * 3] = this.p[i * 3]; P[i * 3 + 1] = this.p[i * 3 + 1]; P[i * 3 + 2] = this.p[i * 3 + 2];
      S[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * k; F[i] = this.frameOf[i]; Ro[i] = Math.round(this.rot[i] / (Math.PI / 4)) * (Math.PI / 4);
      C[i * 4] = this.col[i * 4]; C[i * 4 + 1] = this.col[i * 4 + 1]; C[i * 4 + 2] = this.col[i * 4 + 2];
      C[i * 4 + 3] = this.col[i * 4 + 3] * (this.fade[i] ? Math.min(1, (1 - k) * 3) : 1);
    }
    this.geo.setDrawRange(0, n);
    for (const a of [this.aPos, this.aSize, this.aFrame, this.aColor, this.aRot]) a.needsUpdate = true;
  }
  _swap(i, j) {
    const sw3 = (arr) => { for (let c = 0; c < 3; c++) arr[i * 3 + c] = arr[j * 3 + c]; };
    sw3(this.p); sw3(this.v);
    for (const arr of [this.life, this.maxLife, this.size0, this.size1, this.grav, this.drag, this.spin, this.rot, this.fade, this.wobble, this.frameOf, this.floorY, this.bounce]) arr[i] = arr[j];
    for (let c = 0; c < 4; c++) this.col[i * 4 + c] = this.col[j * 4 + c];
  }
  clear() { this.count = 0; this.geo.setDrawRange(0, 0); }
}
