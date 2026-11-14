// Pixel-perfect 2D pixel-art particles: tiny hand-placed sprites (stardust motes, 4-point twinkles in three sizes,
// diamond glints, rot spores, seed glitter, firefly glows, falling leaflets) drawn as GL points whose size is an exact
// integer multiple of the art-pixel size and whose centres snap to the art-pixel grid, so every texel is a crisp
// k x k block on screen (never a blurred or uneven pixel). Fading is ordered (Bayer) dithering, not transparency, so the
// particles stay pixel art all the way out. Twinkles step through frame sequences (3 -> 5 -> 7 -> 5 -> 3 px).
//   const m = new Motes(600, { px: 3 }); scene.add(m.points); m.spawn({ pos, vel, life, seq: 'twinkle', color, k: 1 });
//   m.update(dt, t, renderer)   (call every frame; px = screen pixels per art pixel)
import * as THREE from 'three';

const CELL = 11; // atlas cell (px); sprites are centred in their cell
// '#' brightest (white-hot core), 'w' 0.92, 'l' 0.7, 'm' 0.48, 'd' 0.3 of the particle colour; 'k' = dark rim (0.12)
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
};
const NAMES = Object.keys(SPR);
const SEQ = { twinkle: ['t3', 't5', 't7', 't9', 't7', 't5', 't3'], glint: ['m1', 't3', 't5', 't3', 'm1'], pulse: ['m1', 'm2', 'glow', 'm2'], leaf: ['leafA', 'leafB', 'leafC', 'leafB'] };
const TONE = { '#': 1.0, w: 0.92, l: 0.7, m: 0.48, d: 0.3, k: 0.12 };
let ATLAS = null;
function atlas() {
  if (ATLAS) return ATLAS; const cols = 8, rows = Math.ceil(NAMES.length / cols); const c = document.createElement('canvas'); c.width = cols * CELL; c.height = rows * CELL; const g = c.getContext('2d');
  NAMES.forEach((n, i) => { const rowsS = SPR[n]; const h = rowsS.length, w = rowsS[0].length; const x0 = (i % cols) * CELL + ((CELL - w) >> 1), y0 = Math.floor(i / cols) * CELL + ((CELL - h) >> 1);
    rowsS.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; const v = Math.round(TONE[ch] * 255); g.fillStyle = `rgba(${v},${ch === '#' ? 255 : v},${ch === 'k' ? 1 : 255},1)`; g.fillRect(x0 + x, y0 + y, 1, 1); } }); });
  // channel use: r = tone, g = 255 marks the white-hot core, b = 1 marks the dark rim
  const tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.colorSpace = THREE.NoColorSpace;
  ATLAS = { tex, cols, rows }; return ATLAS;
}
const idx = (n) => Math.max(0, NAMES.indexOf(n));

const VS = `attribute float aFrame; attribute float aK; attribute vec4 aColor; uniform vec2 uRes; uniform float uPx; varying float vFrame; varying vec4 vColor;
void main(){ vFrame = aFrame; vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 cp = projectionMatrix * mv;
  float size = ${CELL}.0 * aK * uPx; gl_PointSize = size;
  vec2 sp = (cp.xy / cp.w * 0.5 + 0.5) * uRes; sp = floor(sp / uPx + 0.5) * uPx + (mod(size, 2.0) > 0.5 ? 0.5 : 0.0); // snap to the art-pixel grid
  cp.xy = (sp / uRes * 2.0 - 1.0) * cp.w; gl_Position = cp; }`;
const FS = `uniform sampler2D uAtlas; uniform vec2 uGrid; varying float vFrame; varying vec4 vColor;
float bayer(vec2 p){ p = mod(p, 4.0); float b = 0.0; int x = int(p.x), y = int(p.y);
  if (y == 0) b = x == 0 ? 0.0 : x == 1 ? 8.0 : x == 2 ? 2.0 : 10.0; else if (y == 1) b = x == 0 ? 12.0 : x == 1 ? 4.0 : x == 2 ? 14.0 : 6.0;
  else if (y == 2) b = x == 0 ? 3.0 : x == 1 ? 11.0 : x == 2 ? 1.0 : 9.0; else b = x == 0 ? 15.0 : x == 1 ? 7.0 : x == 2 ? 13.0 : 5.0; return (b + 0.5) / 16.0; }
void main(){ vec2 t = floor(gl_PointCoord * ${CELL}.0); vec2 cell = vec2(mod(vFrame, uGrid.x), floor(vFrame / uGrid.x));
  vec4 a = texture2D(uAtlas, (cell * ${CELL}.0 + t + 0.5) / (uGrid * ${CELL}.0)); if (a.a < 0.5) discard;
  if (bayer(t + vec2(vFrame * 3.0, vFrame)) > vColor.a) discard; // dithered fade
  vec3 c = a.b > 0.002 && a.b < 0.01 ? vColor.rgb * 0.12 * 0.5 + vec3(0.012, 0.01, 0.02) : vColor.rgb * a.r; if (a.g > 0.99 && a.r > 0.99) c = mix(vColor.rgb, vec3(1.0) * max(1.0, max(vColor.r, max(vColor.g, vColor.b))), 0.55);
  gl_FragColor = vec4(c, 1.0); }`;

export class Motes {
  constructor(max = 600, { px = 3 } = {}) {
    const A = atlas(); this.max = max; this.n = 0; this.px = px;
    this.P = new Float32Array(max * 3); this.Vv = new Float32Array(max * 3); this.life = new Float32Array(max); this.life0 = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.wob = new Float32Array(max); this.col = new Float32Array(max * 4); this.seq = new Array(max); this.fps = new Float32Array(max); this.k = new Float32Array(max); this.ph = new Float32Array(max); this.tw = new Float32Array(max); this.fin = new Float32Array(max);
    const g = (this.geo = new THREE.BufferGeometry()); const dyn = (n, s) => new THREE.BufferAttribute(new Float32Array(n * s), s).setUsage(THREE.DynamicDrawUsage);
    this.aPos = dyn(max, 3); this.aFrame = dyn(max, 1); this.aK = dyn(max, 1); this.aColor = dyn(max, 4);
    g.setAttribute('position', this.aPos); g.setAttribute('aFrame', this.aFrame); g.setAttribute('aK', this.aK); g.setAttribute('aColor', this.aColor); g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uAtlas: { value: A.tex }, uGrid: { value: new THREE.Vector2(A.cols, A.rows) }, uRes: { value: new THREE.Vector2(1280, 720) }, uPx: { value: px } }, depthWrite: false, toneMapped: false });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 6; this.points.userData.noInk = true; this.points.userData.noAO = true;
  }
  /** o: { pos:[x,y,z]|V3, vel, life, sprite | seq (name or array), fps, color ('#hex' | THREE.Color, may be > 1 for bloom), alpha, k (1|2), grav, drag, wobble, twinkle (alpha flicker Hz), fadeIn } */
  spawn(o) {
    if (this.n >= this.max) return -1; const i = this.n++; const p = o.pos, v = o.vel || [0, 0, 0];
    this.P[i * 3] = p.x ?? p[0]; this.P[i * 3 + 1] = p.y ?? p[1]; this.P[i * 3 + 2] = p.z ?? p[2]; this.Vv[i * 3] = v.x ?? v[0]; this.Vv[i * 3 + 1] = v.y ?? v[1]; this.Vv[i * 3 + 2] = v.z ?? v[2];
    this.life[i] = this.life0[i] = o.life ?? 1; this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.wob[i] = o.wobble ?? 0; this.k[i] = o.k ?? 1; this.ph[i] = Math.random() * 100; this.tw[i] = o.twinkle ?? 0; this.fin[i] = o.fadeIn ?? 0.12;
    const c = o.color instanceof THREE.Color ? o.color : new THREE.Color(o.color || '#ffffff'); const m = o.bright ?? 1; this.col.set([c.r * m, c.g * m, c.b * m, o.alpha ?? 1], i * 4);
    const s = o.seq ? (Array.isArray(o.seq) ? o.seq : SEQ[o.seq]) : [o.sprite || 'm1']; this.seq[i] = s.map(idx); this.fps[i] = o.fps ?? (s.length > 1 ? s.length / (o.life ?? 1) : 0); return i;
  }
  update(dt, t, renderer = null) {
    if (renderer) { const s = renderer.getDrawingBufferSize(this._v || (this._v = new THREE.Vector2())); this.mat.uniforms.uRes.value.copy(s); } this.mat.uniforms.uPx.value = this.px;
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt; if (this.life[i] <= 0) { this._mv(i, --n); i--; continue; }
      const d = Math.exp(-this.drag[i] * dt); const j = i * 3; this.Vv[j] *= d; this.Vv[j + 1] = this.Vv[j + 1] * d - this.grav[i] * dt; this.Vv[j + 2] *= d;
      if (this.wob[i]) { this.Vv[j] += Math.sin(t * 2.3 + this.ph[i]) * this.wob[i] * dt; this.Vv[j + 2] += Math.cos(t * 1.9 + this.ph[i] * 1.3) * this.wob[i] * dt; }
      this.P[j] += this.Vv[j] * dt; this.P[j + 1] += this.Vv[j + 1] * dt; this.P[j + 2] += this.Vv[j + 2] * dt;
    }
    this.n = n; const P = this.aPos.array, F = this.aFrame.array, K = this.aK.array, C = this.aColor.array;
    for (let i = 0; i < n; i++) {
      const age = this.life0[i] - this.life[i], u = age / this.life0[i]; const s = this.seq[i]; const f = s.length > 1 ? s[Math.min(s.length - 1, Math.floor(age * this.fps[i]) % s.length)] : s[0];
      P[i * 3] = this.P[i * 3]; P[i * 3 + 1] = this.P[i * 3 + 1]; P[i * 3 + 2] = this.P[i * 3 + 2]; F[i] = f; K[i] = this.k[i];
      let a = this.col[i * 4 + 3] * Math.min(1, age / Math.max(1e-3, this.fin[i] * this.life0[i])) * Math.min(1, (1 - u) * 4); if (this.tw[i]) a *= 0.55 + 0.45 * Math.sin(t * this.tw[i] + this.ph[i]);
      C[i * 4] = this.col[i * 4]; C[i * 4 + 1] = this.col[i * 4 + 1]; C[i * 4 + 2] = this.col[i * 4 + 2]; C[i * 4 + 3] = a;
    }
    this.geo.setDrawRange(0, n); for (const a of [this.aPos, this.aFrame, this.aK, this.aColor]) a.needsUpdate = true;
  }
  _mv(i, j) {
    for (let c = 0; c < 3; c++) { this.P[i * 3 + c] = this.P[j * 3 + c]; this.Vv[i * 3 + c] = this.Vv[j * 3 + c]; } for (let c = 0; c < 4; c++) this.col[i * 4 + c] = this.col[j * 4 + c];
    for (const A of [this.life, this.life0, this.grav, this.drag, this.wob, this.fps, this.k, this.ph, this.tw, this.fin]) A[i] = A[j]; this.seq[i] = this.seq[j];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
