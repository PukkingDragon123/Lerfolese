// Fine particles drawn smoothly at full native resolution as GL points (no pixel grid, no dithering): stardust motes,
// four-point twinkles, rot spores, growing mould hyphae, fruit flies with beating wings, juice drips that stretch and
// splash, dust puffs that open and thin, seed glitter, firefly glows, tumbling leaflets. Every shape is computed in the
// fragment shader with soft alpha; frame sequences (named below) step the shape and size over the particle's life.
//   const m = new Motes(600); scene.add(m.points); m.spawn({ pos, vel, life, seq: 'twinkle', color, k: 1 });
//   m.update(dt, t, renderer)   (call every frame; point size follows the drawing-buffer height)
import * as THREE from 'three';

// sprite names (their old pixel maps document each shape's silhouette; the shader draws them smoothly)
const SPR = {
  m1: ['#'],
  m2: ['.m.', 'm#m', '.m.'],
  dust: ['wl', 'lm'],
  t3: ['.l.', 'l#l', '.l.'],
  t5: ['..m..', '..l..', 'ml#lm', '..l..', '..m..'],
  t7: ['...d...', '...m...', '...l...', 'dml#lmd', '...l...', '...m...', '...d...'],
  t9: ['....d....', '....m....', '....l....', '...mwm...', 'dmlw#wlmd', '...mwm...', '....l....', '....m....', '....d....'],
  x5: ['d...d', '.m.m.', '..#..', '.m.m.', 'd...d'],
  dia: ['..l..', '.lwm.', 'lw#wm', '.mwm.', '..m..'],
  spore1: ['.k.', 'klk', '.k.'],
  spore2: ['.kk.', 'kwlk', 'klmk', '.kk.'],
  spore3: ['.kkk.', 'kwllk', 'kllmk', 'klmmk', '.kkk.'],
  glow: ['..d..', '.dmd.', 'dm#md', '.dmd.', '..d..'],
  ring: ['..mlm..', '.m...m.', 'm.....m', 'l.....l', 'm.....m', '.m...m.', '..mlm..'],
  leafA: ['....kk', '..kwlk', '.kwlmk', 'kllmk.', 'kmmk..', '.kk...'],
  leafB: ['..kk..', '.kwlk.', 'kwllmk', 'kllmmk', '.kmmk.', '..kk..'],
  leafC: ['kk....', 'kwlk..', 'klwmk.', '.kmlmk', '..kmmk', '....kk'],
  streak: ['#wlmd'],
  // rot: mould hyphae tufts that grow (stalk -> fork -> fruiting head), fruit flies (dark body, beating pale wings),
  // juice drips (stretching as they fall) and their tiny splash, dust puffs (a dithered ring that opens and thins)
  hyph1: ['.l.', '.m.'],
  hyph2: ['l.l', '.l.', '.m.'],
  hyph3: ['.w.', 'l.l', '.l.', '.m.'],
  hyph4: ['w.w.w', '.l.l.', '..l..', '..m..'],
  fly1: ['w.w', '.k.'],
  fly2: ['...', 'lkl'],
  drip1: ['w', 'l'],
  drip2: ['l', 'w', 'm'],
  drip3: ['m', 'l', 'w', 'm'],
  splash1: ['l.l', '.m.'],
  splash2: ['m...m', '.d.d.'],
  puff1: ['.mm.', 'mllm', 'mllm', '.mm.'],
  puff2: ['..dmd..', '.m.l.m.', 'd.l.l.d', 'ml...lm', 'd.l.l.d', '.m.l.m.', '..dmd..'],
  puff3: ['...d.d...', '.d.m.m.d.', '..m...m..', 'dm.....md', '.........', 'dm.....md', '..m...m..', '.d.m.m.d.', '...d.d...'],
  puff4: ['....d....', '.d.....d.', '.........', '.........', 'd.......d', '.........', '.........', '.d.....d.', '....d....'],

};
const NAMES = Object.keys(SPR);
const SEQ = { twinkle: ['t3', 't5', 't7', 't9', 't7', 't5', 't3'], glint: ['m1', 't3', 't5', 't3', 'm1'], pulse: ['m1', 'm2', 'glow', 'm2'], leaf: ['leafA', 'leafB', 'leafC', 'leafB'],
  mould: ['m1', 'hyph1', 'hyph2', 'hyph3', 'hyph4', 'hyph4', 'hyph4', 'hyph4'], fly: ['fly1', 'fly2'], drip: ['drip1', 'drip2', 'drip3', 'drip3'], splash: ['splash1', 'splash2'], puff: ['puff1', 'puff2', 'puff3', 'puff4'] };
// each named sprite / frame -> [shape, size (x the base point size), variant]; shapes are drawn smoothly in the
// fragment shader at full native resolution (no pixel grid, no dithering): 0 mote, 1 four-point twinkle, 2 diagonal
// twinkle, 3 spore, 4 ring, 5 leaf, 6 streak, 7 mould hypha, 8 fruit fly, 9 drip, 10 splash, 11 dust puff
const SHP = { m1: [0, 0.16], m2: [0, 0.26], dust: [0, 0.2], t3: [1, 0.3], t5: [1, 0.45], t7: [1, 0.65], t9: [1, 0.85], x5: [2, 0.45], dia: [1, 0.42], spore1: [3, 0.2], spore2: [3, 0.28], spore3: [3, 0.36],
  glow: [0, 0.5], ring: [4, 0.6], leafA: [5, 0.5, 0], leafB: [5, 0.5, 1], leafC: [5, 0.5, 2], streak: [6, 0.5], hyph1: [7, 0.36, 1], hyph2: [7, 0.44, 2], hyph3: [7, 0.52, 3], hyph4: [7, 0.6, 4],
  fly1: [8, 0.3, 0], fly2: [8, 0.3, 1], drip1: [9, 0.26, 0], drip2: [9, 0.32, 1], drip3: [9, 0.38, 2], splash1: [10, 0.4, 0.3], splash2: [10, 0.55, 1], puff1: [11, 0.4, 1], puff2: [11, 0.6, 2], puff3: [11, 0.8, 3], puff4: [11, 0.95, 4] };
const SH = NAMES.map((n) => SHP[n] || [0, 0.2, 0]);
const idx = (n) => Math.max(0, NAMES.indexOf(n));

const VS = `attribute float aFrame; attribute float aVar; attribute float aK; attribute vec4 aColor; uniform float uBase; varying float vShape, vVar; varying vec4 vColor;
void main(){ vShape = aFrame; vVar = aVar; vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, uBase * aK); }`;
const FS = `varying float vShape, vVar; varying vec4 vColor;
void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y; float r = length(p); float a = 0.0; vec3 c = vColor.rgb; float s = vShape;
  if (s < 0.5) { a = exp(-r * r * 7.0); c *= 0.7 + 0.8 * exp(-r * r * 30.0); }
  else if (s < 2.5) { vec2 q = s < 1.5 ? p : mat2(0.7071, 0.7071, -0.7071, 0.7071) * p; float spk = exp(-abs(q.x) * 16.0) * exp(-q.y * q.y * 2.2) + exp(-abs(q.y) * 16.0) * exp(-q.x * q.x * 2.2); a = clamp(spk + exp(-r * r * 25.0), 0.0, 1.0); c *= 0.8 + 0.7 * exp(-r * r * 40.0); }
  else if (s < 3.5) { a = smoothstep(0.66, 0.5, r); c *= mix(1.05, 0.45, smoothstep(0.15, 0.62, r)); }
  else if (s < 4.5) { a = exp(-pow((r - 0.65) * 7.0, 2.0)); }
  else if (s < 5.5) { float an = (vVar - 1.0) * 0.6; vec2 q = mat2(cos(an), sin(an), -sin(an), cos(an)) * p; float e = length(vec2(q.x * 0.85, q.y * 2.2)); a = smoothstep(0.75, 0.6, e); c *= 0.75 + 0.35 * smoothstep(0.1, -0.1, q.y) - 0.3 * exp(-q.y * q.y * 200.0); }
  else if (s < 6.5) { a = exp(-p.y * p.y * 60.0) * smoothstep(1.0, -0.6, p.x) * smoothstep(-1.0, -0.8, p.x); }
  else if (s < 7.5) { float g = vVar / 4.0; float top = -0.8 + 1.4 * g; float sx = p.x - sin(p.y * 4.0) * 0.06; float stalk = exp(-sx * sx * 700.0) * step(-0.85, p.y) * step(p.y, top);
    vec2 hd = p - vec2(0.0, top); float head = exp(-dot(hd, hd) * 60.0 / (0.3 + g)); float bx = p.x - (p.y - top * 0.5) * 0.6; float br = exp(-bx * bx * 900.0) * step(top * 0.3, p.y) * step(p.y, top * 0.8) * step(0.5, g);
    a = clamp(stalk * 0.9 + head + br * 0.7, 0.0, 1.0); }
  else if (s < 8.5) { vec2 bp = p + vec2(0.0, 0.05); float body = exp(-(bp.x * bp.x * 30.0 + bp.y * bp.y * 14.0)); float wy = vVar < 0.5 ? 0.3 : 0.05; vec2 w1 = p - vec2(-0.28, wy), w2 = p - vec2(0.28, wy);
    float wings = exp(-(w1.x * w1.x * 16.0 + w1.y * w1.y * 40.0)) + exp(-(w2.x * w2.x * 16.0 + w2.y * w2.y * 40.0)); a = clamp(body * 1.4 + wings * 0.55, 0.0, 1.0); c = mix(c * 0.95, vec3(0.05, 0.04, 0.04), clamp(body * 1.6, 0.0, 1.0)); }
  else if (s < 9.5) { float st = 1.0 + vVar * 0.6; float qy = (p.y + 0.25) * 1.2 / st; float tear = length(vec2(p.x * 1.6, max(qy, 0.0) * 0.45 + min(qy, 0.0))); a = smoothstep(0.5, 0.38, tear); vec2 hl = p - vec2(-0.1, -0.25); c *= 0.75 + 0.6 * exp(-dot(hl, hl) * 30.0); }
  else if (s < 10.5) { for (int i = 0; i < 5; i++) { float an = 3.14159 * (0.1 + 0.2 * float(i)); vec2 d = vec2(cos(an), sin(an) * 0.8) * (0.25 + 0.35 * vVar) - vec2(0.0, 0.3); a += exp(-dot(p - d, p - d) * 90.0); } a = clamp(a, 0.0, 1.0); }
  else { float k = vVar / 4.0; float e = r + sin(atan(p.y, p.x) * 5.0 + k * 3.0) * 0.08; a = smoothstep(0.35 + 0.5 * k, 0.1 + 0.35 * k, e) * (1.0 - k * 0.65) * smoothstep(0.0, 0.25 + 0.3 * k, e + 0.05); }
  a *= vColor.a; if (a < 0.01) discard; gl_FragColor = vec4(c, a); }`;

export class Motes {
  constructor(max = 600, { px = 3 } = {}) {
    this.max = max; this.n = 0; this.px = px;
    this.P = new Float32Array(max * 3); this.Vv = new Float32Array(max * 3); this.life = new Float32Array(max); this.life0 = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.wob = new Float32Array(max); this.col = new Float32Array(max * 4); this.seq = new Array(max); this.fps = new Float32Array(max); this.k = new Float32Array(max); this.ph = new Float32Array(max); this.tw = new Float32Array(max); this.fin = new Float32Array(max);
    this.home = new Float32Array(max * 3); this.bz = new Float32Array(max); this.floor = new Float32Array(max).fill(-1e9); this.once = new Uint8Array(max);
    const g = (this.geo = new THREE.BufferGeometry()); const dyn = (n, s) => new THREE.BufferAttribute(new Float32Array(n * s), s).setUsage(THREE.DynamicDrawUsage);
    this.aPos = dyn(max, 3); this.aFrame = dyn(max, 1); this.aVar = dyn(max, 1); this.aK = dyn(max, 1); this.aColor = dyn(max, 4);
    g.setAttribute('position', this.aPos); g.setAttribute('aFrame', this.aFrame); g.setAttribute('aVar', this.aVar); g.setAttribute('aK', this.aK); g.setAttribute('aColor', this.aColor); g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uBase: { value: 30 } }, transparent: true, depthWrite: false, toneMapped: false });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 6; this.points.userData.noInk = true; this.points.userData.noAO = true;
  }
  /** o: { pos:[x,y,z]|V3, vel, life, sprite | seq (name or array), fps, color ('#hex' | THREE.Color, may be > 1 for bloom), alpha, k (1|2), grav, drag, wobble, twinkle (alpha flicker Hz), fadeIn,
   *  buzz: { at:[x,y,z], k } (darts about a home point like a fly), floor: y (hits it and turns into a splash), once: true (the sequence plays once and holds its last frame) } */
  spawn(o) {
    if (this.n >= this.max) return -1; const i = this.n++; const p = o.pos, v = o.vel || [0, 0, 0];
    this.P[i * 3] = p.x ?? p[0]; this.P[i * 3 + 1] = p.y ?? p[1]; this.P[i * 3 + 2] = p.z ?? p[2]; this.Vv[i * 3] = v.x ?? v[0]; this.Vv[i * 3 + 1] = v.y ?? v[1]; this.Vv[i * 3 + 2] = v.z ?? v[2];
    this.life[i] = this.life0[i] = o.life ?? 1; this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.wob[i] = o.wobble ?? 0; this.k[i] = o.k ?? 1; this.ph[i] = Math.random() * 100; this.tw[i] = o.twinkle ?? 0; this.fin[i] = o.fadeIn ?? 0.12;
    const bz = o.buzz; this.bz[i] = bz ? bz.k ?? 1 : 0; if (bz) { const a = bz.at; this.home[i * 3] = a.x ?? a[0]; this.home[i * 3 + 1] = a.y ?? a[1]; this.home[i * 3 + 2] = a.z ?? a[2]; } this.floor[i] = o.floor ?? -1e9; this.once[i] = o.once ? 1 : 0;
    const c = o.color instanceof THREE.Color ? o.color : new THREE.Color(o.color || '#ffffff'); const m = o.bright ?? 1; this.col.set([c.r * m, c.g * m, c.b * m, o.alpha ?? 1], i * 4);
    const s = o.seq ? (Array.isArray(o.seq) ? o.seq : SEQ[o.seq]) : [o.sprite || 'm1']; this.seq[i] = s.map(idx); this.fps[i] = o.fps ?? (s.length > 1 ? s.length / (o.life ?? 1) : 0); return i;
  }
  update(dt, t, renderer = null) {
    if (renderer) { const sz = renderer.getDrawingBufferSize(this._v || (this._v = new THREE.Vector2())); this.mat.uniforms.uBase.value = sz.y / 1080 * 40; } // px is kept for old callers (ignored)
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt; if (this.life[i] <= 0) { this._mv(i, --n); i--; continue; }
      const d = Math.exp(-this.drag[i] * dt); const j = i * 3; this.Vv[j] *= d; this.Vv[j + 1] = this.Vv[j + 1] * d - this.grav[i] * dt; this.Vv[j + 2] *= d;
      if (this.wob[i]) { this.Vv[j] += Math.sin(t * 2.3 + this.ph[i]) * this.wob[i] * dt; this.Vv[j + 2] += Math.cos(t * 1.9 + this.ph[i] * 1.3) * this.wob[i] * dt; }
      if (this.bz[i]) { const b = this.bz[i], ph = this.ph[i]; // a fly: springs toward home, darting in sudden jinks
        for (let c = 0; c < 3; c++) { const jink = Math.sin(t * (7 + c * 2.3) + ph * (c + 1)) * Math.sin(t * 2.9 + ph * 3.1 + c) ; this.Vv[j + c] += ((this.home[j + c] - this.P[j + c]) * 6 * b + jink * 9 * b) * dt; }
        const sp = Math.hypot(this.Vv[j], this.Vv[j + 1], this.Vv[j + 2]), mx = 1.4 * b; if (sp > mx) for (let c = 0; c < 3; c++) this.Vv[j + c] *= mx / sp; }
      this.P[j] += this.Vv[j] * dt; this.P[j + 1] += this.Vv[j + 1] * dt; this.P[j + 2] += this.Vv[j + 2] * dt;
      if (this.P[j + 1] < this.floor[i]) { this.P[j + 1] = this.floor[i]; this.Vv[j] = this.Vv[j + 1] = this.Vv[j + 2] = 0; this.grav[i] = 0; this.floor[i] = -1e9; this.seq[i] = SEQ.splash.map(idx); this.life[i] = this.life0[i] = 0.3; this.fps[i] = 7; this.once[i] = 1; }
    }
    this.n = n; const P = this.aPos.array, F = this.aFrame.array, VA = this.aVar.array, K = this.aK.array, C = this.aColor.array;
    for (let i = 0; i < n; i++) {
      const age = this.life0[i] - this.life[i], u = age / this.life0[i]; const s = this.seq[i]; const fi = Math.floor(age * this.fps[i]); const f = s.length > 1 ? s[this.once[i] ? Math.min(s.length - 1, fi) : fi % s.length] : s[0];
      P[i * 3] = this.P[i * 3]; P[i * 3 + 1] = this.P[i * 3 + 1]; P[i * 3 + 2] = this.P[i * 3 + 2]; const sh = SH[f]; F[i] = sh[0]; VA[i] = sh[2] || 0; K[i] = this.k[i] * sh[1];
      let a = this.col[i * 4 + 3] * Math.min(1, age / Math.max(1e-3, this.fin[i] * this.life0[i])) * Math.min(1, (1 - u) * 4); if (this.tw[i]) a *= 0.55 + 0.45 * Math.sin(t * this.tw[i] + this.ph[i]);
      C[i * 4] = this.col[i * 4]; C[i * 4 + 1] = this.col[i * 4 + 1]; C[i * 4 + 2] = this.col[i * 4 + 2]; C[i * 4 + 3] = a;
    }
    this.geo.setDrawRange(0, n); for (const a of [this.aPos, this.aFrame, this.aVar, this.aK, this.aColor]) a.needsUpdate = true;
  }
  _mv(i, j) {
    for (let c = 0; c < 3; c++) { this.P[i * 3 + c] = this.P[j * 3 + c]; this.Vv[i * 3 + c] = this.Vv[j * 3 + c]; } for (let c = 0; c < 4; c++) this.col[i * 4 + c] = this.col[j * 4 + c];
    for (const A of [this.life, this.life0, this.grav, this.drag, this.wob, this.fps, this.k, this.ph, this.tw, this.fin, this.bz, this.floor, this.once]) A[i] = A[j]; this.seq[i] = this.seq[j];
    for (let c = 0; c < 3; c++) this.home[i * 3 + c] = this.home[j * 3 + c];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
