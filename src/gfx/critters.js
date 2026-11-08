// HD-2D life: detailed 2D pixel-art birds and butterflies living in the 3D world.
// Sprites are painted procedurally at 64x64 per frame (flap cycle, glide, perch idle, blink, peck, look),
// drawn as camera-facing instanced quads. Birds flock, land on branch perches, peck, and scatter on impacts.
import * as THREE from 'three';
import { PixelCanvas } from './pixel.js';
import { mulberry32 } from '../core/util.js';

const CELL = 64, COLS = 8;
// species palettes: [outline, dark, mid, light, highlight] per region
const SPECIES = {
  swallow: { back: ['#0c1028', '#1b2550', '#28407a', '#3d5fa8', '#6a8ad0'], belly: ['#8a8070', '#c9c0ae', '#efe8da', '#fbf8f0'], throat: ['#5a1a12', '#a8401e', '#d0703a'], beak: '#1a1414', fork: true, size: 0.85 },
  sparrow: { back: ['#2a1a0e', '#5a3a1e', '#8a5a30', '#b8844c', '#dcb07a'], belly: ['#8a7e6e', '#bdb2a0', '#e2dac8', '#f4eee2'], throat: ['#1a1410', '#3a2e24', '#5a4a3a'], beak: '#3a3030', streak: true, size: 0.8 },
  hoopoe: { back: ['#3a1a10', '#8a4a2a', '#c8784a', '#e8a070', '#f8c8a0'], belly: ['#8a5a40', '#d09070', '#f0b890', '#fbe0c8'], throat: ['#8a4a2a', '#c8784a', '#e8a070'], beak: '#2a2020', bars: true, crest: true, size: 1.0 },
  crow: { back: ['#06060c', '#14141e', '#24243a', '#3a3a5a', '#6a6a9a'], belly: ['#0a0a12', '#1a1a28', '#2a2a40', '#3a3a58'], throat: ['#06060c', '#14141e', '#24243a'], beak: '#2a2a32', size: 1.15 },
  dove: { back: ['#3a3a44', '#6a6a78', '#9a9aa8', '#c4c4d0', '#e8e8f0'], belly: ['#8a7a80', '#c0b0b8', '#e0d4dc', '#f4eef2'], throat: ['#4a6a6a', '#6a9a8a', '#9acab0'], beak: '#c87a6a', size: 0.95 },
};
const FLY = [0, 1, 2, 3, 2, 1], GLIDE = 4, PERCH = 5, BLINK = 6, PECK = 7, LOOK = 8;

function shadeRamp(pc, x, y, ramp, t) { pc.px(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))]); }
// paint one bird frame into pc at (ox, oy)
function paintBird(pc, ox, oy, sp, frame) {
  const P = new PixelCanvas(CELL, CELL); const S = SPECIES[sp]; const perch = frame >= PERCH;
  const cx = 30, cy = perch ? 36 : 32, bw = 15, bh = 9;
  const peck = frame === PECK, look = frame === LOOK;
  // tail
  const tail = perch ? [[cx - 10, cy + 2], [cx - 24, cy + 10], [cx - 22, cy + 13], [cx - 8, cy + 6]] : [[cx - 12, cy - 1], [cx - 27, cy - 2], [cx - 27, cy + 3], [cx - 12, cy + 4]];
  P.poly(tail, S.back[1]);
  if (S.fork && !perch) { P.poly([[cx - 22, cy - 1], [cx - 31, cy - 5], [cx - 27, cy]], S.back[1]); P.poly([[cx - 22, cy + 3], [cx - 31, cy + 7], [cx - 27, cy + 3]], S.back[1]); }
  // body: shaded ellipsoid with back/belly split
  for (let y = -bh; y <= bh; y++) for (let x = -bw; x <= bw; x++) {
    const nx = x / bw, ny = y / bh; const d = nx * nx + ny * ny; if (d > 1) continue;
    const X = cx + x + (perch ? 0 : 0), Y = cy + y;
    const light = 0.55 - nx * 0.15 - ny * 0.45 + (1 - d) * 0.25;
    const bellyZone = ny > 0.15 - nx * 0.25;
    if (bellyZone) shadeRamp(P, X, Y, S.belly, Math.min(1, light + 0.2)); else shadeRamp(P, X, Y, S.back, light);
    if (S.streak && bellyZone && ((X * 7 + Y * 3) % 9 === 0)) P.px(X, Y, S.back[2]);
    if (!bellyZone && ((X + (Y % 4 < 2 ? 0 : 2)) % 4 === 0) && (Y % 4 === 0)) P.px(X, Y, S.back[Math.max(0, Math.round(light * (S.back.length - 1)) - 1)]);
  }
  // head
  const hx = cx + 13 + (peck ? 3 : 0), hy = cy - 6 + (peck ? 9 : 0) + (perch ? -1 : 0), hr = 6.5;
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = (x * x + y * y) / (hr * hr); if (d > 1) continue; const X = hx + x, Y = hy + y; const light = 0.6 - x / hr * 0.05 - y / hr * 0.4 + (1 - d) * 0.2; const throat = y > 1 && x > -2; shadeRamp(P, X, Y, throat ? S.throat : S.back, light); }
  if (S.crest) { for (let i = 0; i < 6; i++) { const bx = hx - 4 + i * 1.6, by = hy - 6; P.line(bx, by, bx - 3 - i * 0.3, by - 6 - (i % 3), i % 2 ? S.back[3] : S.back[2]); P.px(bx - 3 - i * 0.3, by - 6 - (i % 3), '#1a1010'); } }
  // beak
  const bx = hx + (look ? -6 : 6), dir = look ? -1 : 1, by = hy + 1;
  const beakLen = sp === 'hoopoe' ? 10 : sp === 'crow' ? 7 : 5;
  for (let i = 0; i < beakLen; i++) { P.px(bx + dir * i, by - (i > beakLen - 3 && sp === 'hoopoe' ? 0 : 0) + (sp === 'hoopoe' ? Math.floor(i / 4) : 0), S.beak); if (i < beakLen - 2) P.px(bx + dir * i, by + 1 + (sp === 'hoopoe' ? Math.floor(i / 4) : 0), shade(S.beak, -0.2)); }
  // eye with catchlight (closed when blinking)
  const ex = hx + (look ? -2 : 2), ey = hy - 1;
  if (frame === BLINK) { P.px(ex - 1, ey, '#0a0a0a'); P.px(ex, ey, '#0a0a0a'); P.px(ex + 1, ey, '#0a0a0a'); }
  else { P.px(ex - 2, ey, S.back[4] || S.back[3]); P.px(ex + 2, ey, S.back[4] || S.back[3]); P.px(ex, ey - 2, S.back[4] || S.back[3]); P.px(ex, ey + 2, S.back[4] || S.back[3]); P.fillRect(ex - 1, ey - 1, 3, 3, '#0a0808'); P.px(ex, ey - 1, '#ffffff'); P.px(ex + 1, ey, '#3a3a4a'); }
  // wing: shape varies with frame
  const wingPhase = perch ? -1 : frame === GLIDE ? 1 : [3, 1, -1.2, 0][frame] ?? 0;
  const wx = cx + 2, wy = cy - 2;
  if (perch) {
    P.poly([[wx + 6, wy - 3], [wx - 12, wy - 2], [wx - 16, wy + 4], [wx + 2, wy + 4]], S.back[2]);
    for (let i = 0; i < 5; i++) P.line(wx - 4 - i * 2.4, wy - 1, wx - 7 - i * 2.4, wy + 4, S.back[1]);
    P.line(wx + 5, wy - 3, wx - 12, wy - 2, S.back[3]);
    if (S.bars) for (let i = 0; i < 4; i++) P.line(wx - 2 - i * 3.5, wy - 2, wx - 4 - i * 3.5, wy + 4, i % 2 ? '#f8f4ec' : '#1a1010');
  } else {
    // feathered wing rotating about the shoulder: up / mid / down / glide
    const ang = { 0: -2.05, 1: -2.75, 2: 2.55, 3: -2.75, 4: -2.95 }[frame === GLIDE ? 4 : frame] ?? -2.75;
    drawWing(P, wx + 4, wy - 1, ang, S, frame === GLIDE ? 1.15 : 1, frame === 2);
    if (frame === 0) drawWing(P, wx + 1, wy - 3, ang + 0.35, { ...S, back: S.back.map((c) => shade(c, -0.25)) }, 0.85, false);
  }
  // legs when perched
  if (perch) { for (const lx of [cx - 1, cx + 4]) { P.line(lx, cy + bh - 1, lx, cy + bh + 4, '#3a2a20'); P.line(lx - 1, cy + bh + 4, lx + 2, cy + bh + 4, '#3a2a20'); } }
  // selective coloured outline: darkest tone of the touching region
  P.outline(S.back[0]);
  pc.blit(P, ox, oy);
}
function drawWing(P, sx, sy, ang, S, span, under) {
  const L1 = 10 * span, L2 = 15 * span; const d = (a) => [Math.cos(a), Math.sin(a)];
  const [c1, s1] = d(ang), [c2, s2] = d(ang + 0.35); const wx = sx + c1 * L1, wy = sy + s1 * L1, tx = wx + c2 * L2, ty = wy + s2 * L2;
  const px = -Math.sin(ang + 0.2), py = Math.cos(ang + 0.2); // perpendicular (trailing side)
  const side = Math.sign(py) || 1; const tr = []; const n = 9;
  for (let k = 0; k <= n; k++) { const t = k / n; const bx = t < 0.45 ? sx + (wx - sx) * (t / 0.45) : wx + (tx - wx) * ((t - 0.45) / 0.55); const by = t < 0.45 ? sy + (wy - sy) * (t / 0.45) : wy + (ty - wy) * ((t - 0.45) / 0.55); const fl = 4 + Math.sin(t * Math.PI) * 6 * span - (t > 0.9 ? 3 : 0); tr.push([bx + px * fl * side, by + py * fl * side, bx, by]); }
  const poly = [[sx, sy], [wx, wy], [tx, ty], ...tr.slice().reverse().map((q) => [q[0], q[1]])];
  P.poly(poly, under ? S.belly[2] : S.back[2]);
  // coverts (inner third) lighter, primaries darker with separated feather tips
  for (let k = 0; k <= n; k++) { const q = tr[k]; const col = k < 4 ? (under ? S.belly[1] : S.back[3]) : (under ? S.belly[1] : S.back[1]); P.line(q[2], q[3], q[0], q[1], col); if (k > 3) P.px(q[0], q[1], S.back[0]); }
  P.line(sx, sy, wx, wy, under ? S.belly[3] : S.back[4] || S.back[3]); P.line(wx, wy, tx, ty, under ? S.belly[3] : S.back[3]);
  if (S.bars) for (let k = 2; k <= n; k += 2) { const q = tr[k]; P.line((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, q[0], q[1], k % 4 ? '#f8f4ec' : '#1a1010'); }
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + k)))); return '#' + ((1 << 24) | (f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).slice(1); }

// butterfly: 4 frames, painted at 32x32 inside the 64 cell
function paintButterfly(pc, ox, oy, hue, frame) {
  const P = new PixelCanvas(CELL, CELL); const open = [1, 0.6, 0.15, 0.6][frame];
  const cols = { orange: ['#3a1a08', '#c85a10', '#f08a2a', '#ffc070'], blue: ['#0a1a3a', '#2a5aa8', '#4f8fe0', '#a8d0ff'], lemon: ['#3a3008', '#c8a020', '#f2d24e', '#fff3a0'] }[hue];
  const cx = 32, cy = 32;
  for (const s of [-1, 1]) {
    const w = 13 * open; if (w < 1.5) { P.line(cx, cy - 8, cx + s * 2, cy - 10, cols[1]); continue; }
    P.ellipse(cx + s * w * 0.55, cy - 4, w * 0.6, 8, cols[2]); P.ellipse(cx + s * w * 0.45, cy + 6, w * 0.45, 5, cols[1]);
    P.ellipse(cx + s * w * 0.7, cy - 6, w * 0.22, 2.5, cols[3]); P.px(cx + s * w * 0.8, cy - 1, '#ffffff'); P.px(cx + s * w * 0.75, cy - 2, cols[0]);
  }
  P.fillRect(cx - 1, cy - 9, 2, 17, '#1a1010'); P.line(cx, cy - 9, cx - 3, cy - 14, '#1a1010'); P.line(cx, cy - 9, cx + 3, cy - 14, '#1a1010');
  P.outline(cols[0]); pc.blit(P, ox, oy);
}

let ATLAS = null; const ROW = {};
function atlas() {
  if (ATLAS) return ATLAS;
  const sp = Object.keys(SPECIES); const rows = sp.length * 2 + 1;
  const pc = new PixelCanvas(CELL * COLS, CELL * rows);
  sp.forEach((s, i) => { ROW[s] = i * 2; for (let f = 0; f <= LOOK; f++) paintBird(pc, (f % COLS) * CELL, (i * 2 + Math.floor(f / COLS)) * CELL, s, f); });
  ROW.butterfly = sp.length * 2; ['orange', 'blue'].forEach((h, k) => { for (let f = 0; f < 4; f++) paintButterfly(pc, (k * 4 + f) * CELL, ROW.butterfly * CELL, h, f); });
  const tex = new THREE.CanvasTexture(pc.commit()); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  ATLAS = { tex, rows, canvas: pc.canvas }; return ATLAS;
}
export function critterAtlasCanvas() { return atlas().canvas; }

const VS = `attribute vec4 iData; attribute vec3 iPos; varying vec2 vUv; uniform vec2 uGrid;
void main(){ float frame = iData.x; float scale = iData.y; float flip = iData.z;
  vec2 cell = vec2(mod(frame, uGrid.x), floor(frame / uGrid.x));
  vec2 uv0 = vec2(flip > 0.5 ? 1.0 - uv.x : uv.x, uv.y);
  vUv = (cell + vec2(uv0.x, 1.0 - uv0.y)) / uGrid; vUv.y = 1.0 - vUv.y;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += position.xy * scale; gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D uMap; uniform vec3 uTint; varying vec2 vUv; void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb * uTint, 1.0); }`;

export class Critters {
  constructor(max = 120, { tint = 0xffffff } = {}) {
    const A = atlas(); this.max = max; this.list = [];
    const geo = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); geo.index = q.index; geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage); this.iData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos); geo.setAttribute('iData', this.iData); geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uMap: { value: A.tex }, uGrid: { value: new THREE.Vector2(COLS, A.rows) }, uTint: { value: new THREE.Color(tint) } } });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; this.geo = geo;
    this.perches = []; this.rng = mulberry32(7); this.bounds = { x: [-14, 14], y: [1, 9], z: [-10, 4] };
  }
  addPerches(points) { for (const p of points) this.perches.push({ p: p.clone(), taken: false }); }
  // collect perch points from the upper parts of an object (tree canopies, columns, rocks)
  perchesFrom(obj, n = 6, minRel = 0.55) {
    obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj); const pts = []; const v = new THREE.Vector3();
    obj.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let k = 0; k < 40; k++) { v.fromBufferAttribute(p, Math.floor(this.rng() * p.count)).applyMatrix4(o.matrixWorld); if ((v.y - box.min.y) / (box.max.y - box.min.y + 1e-6) > minRel) pts.push(v.clone()); } });
    for (let i = 0; i < n && pts.length; i++) this.perches.push({ p: pts.splice(Math.floor(this.rng() * pts.length), 1)[0], taken: false });
  }
  spawnBirds(n, species = ['sparrow', 'swallow', 'hoopoe', 'dove']) {
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      const sp = species[Math.floor(this.rng() * species.length)]; const b = { kind: 'bird', sp, pos: new THREE.Vector3(), vel: new THREE.Vector3(), state: 'fly', t: this.rng() * 5, frame: 0, flip: false, perch: null, timer: 2 + this.rng() * 6, size: SPECIES[sp].size * (0.85 + this.rng() * 0.25) };
      this.randomPos(b.pos); this.list.push(b);
      const free = this.perches.filter((p) => !p.taken); if (free.length && this.rng() < 0.6) { const pr = free[Math.floor(this.rng() * free.length)]; pr.taken = true; b.perch = pr; b.state = 'perch'; b.pos.copy(pr.p); }
    }
  }
  spawnButterflies(n, around = new THREE.Vector3(0, 0.6, 0), spread = 10) {
    for (let i = 0; i < n && this.list.length < this.max; i++) this.list.push({ kind: 'fly', hue: i % 2, pos: new THREE.Vector3(around.x + (this.rng() - 0.5) * spread, around.y + this.rng() * 1.2, around.z + (this.rng() - 0.5) * spread * 0.5), home: around.clone(), spread, t: this.rng() * 10, size: 0.55 });
  }
  randomPos(v) { const B = this.bounds; return v.set(B.x[0] + this.rng() * (B.x[1] - B.x[0]), B.y[0] + this.rng() * (B.y[1] - B.y[0]), B.z[0] + this.rng() * (B.z[1] - B.z[0])); }
  // big impacts scare nearby birds off their perches
  scare(at, radius = 8) {
    for (const b of this.list) if (b.kind === 'bird' && b.state !== 'fly' && b.pos.distanceTo(at) < radius) { if (b.perch) { b.perch.taken = false; b.perch = null; } b.state = 'flee'; b.vel.set((this.rng() - 0.5) * 6, 4 + this.rng() * 3, (this.rng() - 0.5) * 3); b.timer = 3 + this.rng() * 4; }
  }
  update(dt, t) {
    const tmp = new THREE.Vector3(); let n = 0;
    for (const b of this.list) {
      b.t += dt;
      if (b.kind === 'fly') {
        const a = b.t * 0.7; b.pos.x += Math.sin(a * 1.3 + b.hue) * dt * 0.9; b.pos.z += Math.cos(a * 0.9) * dt * 0.5; b.pos.y = b.home.y + 0.4 + Math.sin(b.t * 2.1) * 0.35;
        if (b.pos.distanceTo(b.home) > b.spread) b.pos.lerp(b.home, dt * 0.5);
        b.frame = ROW.butterfly * COLS + b.hue * 4 + Math.floor(b.t * 14) % 4; b.flip = Math.cos(a * 1.3) < 0;
      } else {
        b.timer -= dt;
        if (b.state === 'perch') {
          b.frame = PERCH; const cyc = (b.t % 4.2); if (cyc < 0.15) b.frame = BLINK; else if (cyc > 2.2 && cyc < 2.6) b.frame = PECK; else if (cyc > 3.2 && cyc < 3.8) b.frame = LOOK;
          if (b.timer < 0) { b.perch.taken = false; b.perch = null; b.state = 'fly'; b.vel.set((this.rng() - 0.5) * 4, 2.5, (this.rng() - 0.5) * 2); b.timer = 3 + this.rng() * 5; }
        } else {
          // flying: steer towards a goal (a free perch when tired, else a wander point)
          if (!b.goal || b.pos.distanceTo(b.goal) < 0.6) { b.goal = this.randomPos(new THREE.Vector3()); }
          if (b.state === 'fly' && b.timer < 0) { const free = this.perches.filter((p) => !p.taken); if (free.length) { const pr = free[Math.floor(this.rng() * free.length)]; pr.taken = true; b.perch = pr; b.goal = pr.p; b.state = 'land'; } else b.timer = 3; }
          if (b.state === 'flee' && b.timer < 0) b.state = 'fly';
          tmp.copy(b.goal).sub(b.pos); const d = tmp.length(); tmp.normalize();
          const speed = b.state === 'flee' ? 7 : b.state === 'land' ? Math.min(5, 1 + d * 1.5) : 4.2;
          b.vel.lerp(tmp.multiplyScalar(speed), Math.min(1, dt * (b.state === 'land' ? 3 : 1.5))); b.vel.y += Math.sin(b.t * 3) * dt * 1.2;
          b.pos.addScaledVector(b.vel, dt);
          if (b.state === 'land' && d < 0.12) { b.state = 'perch'; b.pos.copy(b.perch.p); b.timer = 4 + this.rng() * 10; }
          const glide = Math.sin(b.t * 0.7 + b.size * 10) > 0.6 && b.state === 'fly';
          b.frame = glide ? GLIDE : FLY[Math.floor(b.t * (b.state === 'flee' ? 18 : 12)) % FLY.length]; b.flip = b.vel.x < 0;
        }
        b.frame += ROW[b.sp] * COLS;
      }
      this.iPos.setXYZ(n, b.pos.x, b.pos.y, b.pos.z); this.iData.setXYZW(n, b.frame, b.size, b.flip ? 1 : 0, 0); n++;
    }
    this.geo.instanceCount = n; this.iPos.needsUpdate = true; this.iData.needsUpdate = true;
  }
}
