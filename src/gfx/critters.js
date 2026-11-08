// HD-2D life: detailed 2D pixel-art birds, butterflies, grazing sheep and goats, and lizards living in the 3D world.
// Sprites are painted procedurally from anatomy (src/gfx/art/birds.js, bugs.js, beasts.js) into one 64px-cell atlas
// and drawn as camera-facing instanced quads (one draw call). Birds flock, flap with real key poses, glide or bound,
// land on perches, breathe, blink, peck, look around and hop, and scatter on impacts. Grazers walk, graze and idle on
// the ground plane; lizards sun themselves on rocks and do push-ups.
import * as THREE from 'three';
import { PixelCanvas } from './pixel.js';
import { mulberry32 } from '../core/util.js';
import { SPECIES, FRAMES as BIRD_FRAMES, paintBird } from './art/birds.js';
import { BUTTERFLIES, paintButterfly } from './art/bugs.js';
import { BEASTS, paintBeast } from './art/beasts.js';

const CELL = 64, COLS = 8;
const B = Object.fromEntries(BIRD_FRAMES.map((n, i) => [n, i])); // frame name -> index within a species block
const FLY = [0, 1, 2, 3, 4, 5, 6, 7];

// ---------------------------------------------------------------- atlas
let ATLAS = null; const ROW = {}; const LAYOUT = { cell: CELL, cols: COLS, groups: [] };
function atlas() {
  if (ATLAS) return ATLAS;
  const sp = Object.keys(SPECIES); const bflies = Object.keys(BUTTERFLIES); const beasts = Object.keys(BEASTS);
  let row = 0; const plan = [];
  for (const s of sp) { ROW[s] = row; plan.push({ name: s, row, frames: BIRD_FRAMES.map((f) => [f, () => paintBird(s, f)]) }); row += Math.ceil(BIRD_FRAMES.length / COLS); }
  ROW.butterfly = row; { const frames = []; bflies.forEach((h) => { for (let f = 0; f < 4; f++) frames.push([h + f, () => paintButterfly(h, f)]); }); plan.push({ name: 'butterflies', row, frames }); row += Math.ceil(frames.length / COLS); }
  for (const k of beasts) { ROW[k] = row; const frames = BEASTS[k].frames.map((f) => [f, () => paintBeast(k, f)]); plan.push({ name: k, row, frames }); row += Math.ceil(frames.length / COLS); }
  const pc = new PixelCanvas(CELL * COLS, CELL * row);
  for (const g of plan) {
    const grp = { name: g.name, frames: [] };
    g.frames.forEach(([fname, fn], i) => { const idx = g.row * COLS + i; const spr = fn(); pc.blit(spr, (idx % COLS) * CELL + ((CELL - spr.w) >> 1), Math.floor(idx / COLS) * CELL + (CELL - spr.h)); grp.frames.push({ name: fname, index: idx }); });
    LAYOUT.groups.push(grp);
  }
  const tex = new THREE.CanvasTexture(pc.commit()); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  ATLAS = { tex, rows: row, canvas: pc.canvas }; return ATLAS;
}
export function critterAtlasCanvas() { return atlas().canvas; }
export const CRITTER_LAYOUT = new Proxy(LAYOUT, { get(t, k) { atlas(); return t[k]; } });

// ---------------------------------------------------------------- rendering
const VS = `attribute vec4 iData; attribute vec3 iPos; varying vec2 vUv; uniform vec2 uGrid;
void main(){ float frame = iData.x; float scale = iData.y; float flip = iData.z;
  vec2 cell = vec2(mod(frame, uGrid.x), floor(frame / uGrid.x));
  vec2 uv0 = vec2(flip > 0.5 ? 1.0 - uv.x : uv.x, uv.y);
  vUv = (cell + vec2(uv0.x, 1.0 - uv0.y)) / uGrid; vUv.y = 1.0 - vUv.y;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += position.xy * scale; gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D uMap; uniform vec3 uTint; varying vec2 vUv; void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb * uTint, 1.0); }`;
// soft contact shadows for ground critters (flat quads on y = 0)
const SVS = `attribute vec3 iPos; attribute float iSize; varying vec2 vP; void main(){ vP = position.xy * 2.0; vec3 p = iPos + vec3(position.x * iSize, 0.0, position.y * iSize * 0.45); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const SFS = `varying vec2 vP; uniform float uAlpha; void main(){ float d = dot(vP, vP); if (d > 1.0) discard; float a = (d < 0.45 ? 1.0 : d < 0.75 ? 0.66 : 0.33) * uAlpha; gl_FragColor = vec4(0.10, 0.07, 0.09, a); }`;

export class Critters {
  constructor(max = 120, { tint = 0xffffff } = {}) {
    const A = atlas(); this.max = max; this.list = [];
    const geo = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); geo.index = q.index; geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage); this.iData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos); geo.setAttribute('iData', this.iData); geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uMap: { value: A.tex }, uGrid: { value: new THREE.Vector2(COLS, A.rows) }, uTint: { value: new THREE.Color(tint) } } });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; this.geo = geo;
    // contact shadows (child of the critter mesh so scenes only need to add one object)
    const sg = new THREE.InstancedBufferGeometry(); const sq = new THREE.PlaneGeometry(1, 1); sg.index = sq.index; sg.setAttribute('position', sq.attributes.position);
    this.sPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage); this.sSize = new THREE.InstancedBufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('iPos', this.sPos); sg.setAttribute('iSize', this.sSize); sg.instanceCount = 0;
    this.shadowMesh = new THREE.Mesh(sg, new THREE.ShaderMaterial({ vertexShader: SVS, fragmentShader: SFS, uniforms: { uAlpha: { value: 0.32 } }, transparent: true, depthWrite: false }));
    this.shadowMesh.frustumCulled = false; this.shadowMesh.renderOrder = 2; this.sGeo = sg; this.mesh.add(this.shadowMesh);
    this.perches = []; this.rng = mulberry32(7); this.bounds = { x: [-14, 14], y: [1, 9], z: [-10, 4] };
  }
  addPerches(points) { for (const p of points) this.perches.push({ p: p.clone(), taken: false }); }
  // collect perch points from the upper parts of an object (tree canopies, columns, rocks)
  perchesFrom(obj, n = 6, minRel = 0.55) {
    obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj); const pts = []; const v = new THREE.Vector3();
    obj.traverse((o) => { if (!o.isMesh || !o.geometry?.attributes?.position) return; const p = o.geometry.attributes.position; for (let k = 0; k < 40; k++) { v.fromBufferAttribute(p, Math.floor(this.rng() * p.count)).applyMatrix4(o.matrixWorld); if ((v.y - box.min.y) / (box.max.y - box.min.y + 1e-6) > minRel) pts.push(v.clone()); } });
    for (let i = 0; i < n && pts.length; i++) this.perches.push({ p: pts.splice(Math.floor(this.rng() * pts.length), 1)[0], taken: false });
  }
  spawnBirds(n, species = ['sparrow', 'swallow', 'hoopoe', 'dove']) {
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      const sp = species[Math.floor(this.rng() * species.length)]; if (!SPECIES[sp]) continue;
      const b = { kind: 'bird', sp, pos: new THREE.Vector3(), vel: new THREE.Vector3(), state: 'fly', t: this.rng() * 5, frame: 0, flip: false, perch: null, timer: 2 + this.rng() * 6, size: SPECIES[sp].size * (0.9 + this.rng() * 0.18), phase: this.rng() * 8, idle: 0, hopT: 0 };
      this.randomPos(b.pos); this.list.push(b);
      const free = this.perches.filter((p) => !p.taken); if (free.length && this.rng() < 0.6) { const pr = free[Math.floor(this.rng() * free.length)]; pr.taken = true; b.perch = pr; b.state = 'perch'; b.pos.copy(pr.p); b.flip = this.rng() < 0.5; }
    }
  }
  spawnButterflies(n, around = new THREE.Vector3(0, 0.6, 0), spread = 10) {
    const kinds = Object.keys(BUTTERFLIES);
    for (let i = 0; i < n && this.list.length < this.max; i++) this.list.push({ kind: 'fly', hue: i % kinds.length, pos: new THREE.Vector3(around.x + (this.rng() - 0.5) * spread, around.y + this.rng() * 1.2, around.z + (this.rng() - 0.5) * spread * 0.5), home: around.clone(), spread, t: this.rng() * 10, size: 0.5 + this.rng() * 0.12, rest: 0 });
  }
  // grazing sheep and goats walking on the ground plane (y = 0) inside area {x:[a,b], z:[c,d]} (or a THREE.Box3)
  spawnGrazers(n, area = { x: [-8, 8], z: [-8, 0] }, kinds = ['sheep', 'sheep', 'sheep', 'goat']) {
    const ar = area.isBox3 ? { x: [area.min.x, area.max.x], z: [area.min.z, area.max.z] } : area;
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      const k = kinds[Math.floor(this.rng() * kinds.length)]; if (!BEASTS[k]) continue;
      const g = { kind: 'grazer', sp: k, area: ar, pos: new THREE.Vector3(ar.x[0] + this.rng() * (ar.x[1] - ar.x[0]), 0, ar.z[0] + this.rng() * (ar.z[1] - ar.z[0])), goal: null, state: 'graze', timer: 1 + this.rng() * 5, t: this.rng() * 10, flip: this.rng() < 0.5, size: BEASTS[k].size * (0.92 + this.rng() * 0.16), frame: 0 };
      this.list.push(g);
    }
  }
  // lizards basking on rock tops: spots = [Vector3...] (or an area like spawnGrazers)
  spawnLizards(n, spots) {
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      let p; if (Array.isArray(spots) && spots.length) p = spots[i % spots.length].clone(); else { const ar = spots || { x: [-6, 6], z: [-6, 0] }; p = new THREE.Vector3(ar.x[0] + this.rng() * (ar.x[1] - ar.x[0]), 0, ar.z[0] + this.rng() * (ar.z[1] - ar.z[0])); }
      this.list.push({ kind: 'lizard', sp: 'lizard', pos: p, base: p.clone(), t: this.rng() * 10, timer: 2 + this.rng() * 4, state: 'bask', flip: this.rng() < 0.5, size: BEASTS.lizard.size, frame: 0 });
    }
  }
  randomPos(v) { const B = this.bounds; return v.set(B.x[0] + this.rng() * (B.x[1] - B.x[0]), B.y[0] + this.rng() * (B.y[1] - B.y[0]), B.z[0] + this.rng() * (B.z[1] - B.z[0])); }
  // big impacts scare nearby birds off their perches (and make grazers bolt, lizards dash)
  scare(at, radius = 8) {
    for (const b of this.list) {
      const d = b.pos.distanceTo(at); if (d > radius) continue;
      if (b.kind === 'bird' && b.state !== 'fly') { if (b.perch) { b.perch.taken = false; b.perch = null; } b.state = 'flee'; b.vel.set((this.rng() - 0.5) * 6, 4 + this.rng() * 3, (this.rng() - 0.5) * 3); b.timer = 3 + this.rng() * 4; }
      if (b.kind === 'grazer') { b.state = 'walk'; b.run = 1.4; b.timer = 1.5 + this.rng(); const away = b.pos.clone().sub(at).setY(0).normalize().multiplyScalar(3); b.goal = b.pos.clone().add(away); this.clampArea(b.goal, b.area); }
      if (b.kind === 'lizard') { b.state = 'dash'; b.timer = 0.6; }
    }
  }
  clampArea(v, ar) { v.x = Math.min(ar.x[1], Math.max(ar.x[0], v.x)); v.z = Math.min(ar.z[1], Math.max(ar.z[0], v.z)); return v; }
  update(dt, t) {
    const tmp = new THREE.Vector3(); let n = 0, ns = 0;
    for (const b of this.list) {
      b.t += dt; let px = b.pos.x, py = b.pos.y, pz = b.pos.z;
      if (b.kind === 'fly') {
        // butterflies: erratic flutter with short rests (wings closed) in the air
        const a = b.t * 0.7; b.pos.x += Math.sin(a * 1.3 + b.hue) * dt * 0.9; b.pos.z += Math.cos(a * 0.9) * dt * 0.5; b.pos.y = b.home.y + 0.4 + Math.sin(b.t * 2.1) * 0.35 + Math.sin(b.t * 5.3) * 0.06;
        if (b.pos.distanceTo(b.home) > b.spread) b.pos.lerp(b.home, dt * 0.5);
        const cyc = [0, 1, 2, 3, 2, 1]; b.frame = ROW.butterfly * COLS + b.hue * 4 + cyc[Math.floor(b.t * 16) % 6]; b.flip = Math.cos(a * 1.3) < 0;
        px = b.pos.x; py = b.pos.y; pz = b.pos.z;
      } else if (b.kind === 'grazer') {
        const D = BEASTS[b.sp]; b.timer -= dt;
        if (b.state === 'walk') {
          if (!b.goal) { b.goal = new THREE.Vector3(b.pos.x + (this.rng() - 0.5) * 4, 0, b.pos.z + (this.rng() - 0.5) * 2.5); this.clampArea(b.goal, b.area); }
          tmp.copy(b.goal).sub(b.pos).setY(0); const d = tmp.length(); const sp = (b.run ? 1.1 : 0.42) * D.speed;
          if (d < 0.05 || b.timer < -6) { b.state = this.rng() < 0.7 ? 'graze' : 'idle'; b.timer = 2 + this.rng() * 5; b.goal = null; b.run = 0; }
          else { b.pos.addScaledVector(tmp.normalize(), Math.min(d, sp * dt)); if (Math.abs(tmp.x) > 0.05) b.flip = tmp.x < 0; }
          b.frame = D.walk[Math.floor(b.t * (b.run ? 10 : 6)) % D.walk.length];
        } else if (b.state === 'graze') { b.frame = D.graze[Math.floor(b.t * 2.2) % D.graze.length]; if (b.timer < 0) { b.state = this.rng() < 0.55 ? 'walk' : 'idle'; b.timer = 2 + this.rng() * 4; } }
        else { const c = b.t % 5; b.frame = c < 0.18 ? D.idle[1] : c > 3 && c < 3.5 ? D.idle[2] ?? D.idle[0] : D.idle[0]; if (b.timer < 0) { b.state = this.rng() < 0.6 ? 'walk' : 'graze'; b.timer = 2 + this.rng() * 4; } }
        b.frame += ROW[b.sp] * COLS; px = b.pos.x; pz = b.pos.z; py = b.size * (0.5 - D.foot / CELL);
        this.sPos.setXYZ(ns, b.pos.x, 0.015, b.pos.z); this.sSize.setX(ns, b.size * D.shadow); ns++;
      } else if (b.kind === 'lizard') {
        const D = BEASTS.lizard; b.timer -= dt; const c = b.t % 6;
        if (b.state === 'dash') { b.pos.x += (b.flip ? -1 : 1) * dt * 2.2; b.frame = D.dash[Math.floor(b.t * 14) % D.dash.length]; if (b.timer < 0) { b.state = 'bask'; b.timer = 3; } }
        else { b.frame = c < 0.5 ? D.pushup[1] : c < 1.0 ? D.pushup[0] : c > 3 && c < 3.3 ? D.look : D.bask; if (b.timer < 0 && this.rng() < 0.3) { b.flip = !b.flip; b.timer = 3 + this.rng() * 5; } }
        if (b.pos.distanceTo(b.base) > 1.2) b.pos.lerp(b.base, dt);
        b.frame += ROW.lizard * COLS; px = b.pos.x; pz = b.pos.z; py = b.pos.y + b.size * (0.5 - D.foot / CELL);
      } else {
        const S = SPECIES[b.sp]; b.timer -= dt;
        if (b.state === 'perch') {
          // idle on a perch: breathe, blink, peck, look around, and an occasional crouch + hop that turns the bird
          const cyc = (b.t + b.phase) % 6.3; let f = Math.floor((b.t + b.phase) * 1.6) % 2 ? B.breathe : B.perch;
          if (cyc < 0.13) f = B.blink; else if (cyc > 2.1 && cyc < 2.32) f = B.peck; else if (cyc > 2.32 && cyc < 2.5) f = B.perch; else if (cyc > 2.5 && cyc < 2.7) f = B.peck; else if (cyc > 3.6 && cyc < 4.4) f = B.look;
          if (b.hopT > 0) { b.hopT -= dt; f = b.hopT > 0.28 ? B.peck : B.hop; py += Math.max(0, Math.sin((0.28 - b.hopT) / 0.28 * Math.PI)) * 0.12 * (b.hopT <= 0.28 ? 1 : 0); if (b.hopT <= 0) b.flip = !b.flip; }
          else if (cyc > 5.0 && cyc < 5.02 + dt) b.hopT = 0.42;
          b.frame = f;
          // feet on the perch point (the sprite's foot row is 51 of 64)
          py = b.pos.y + b.size * (51 / CELL - 0.5) + (py - b.pos.y);
          if (b.timer < 0) { b.perch.taken = false; b.perch = null; b.state = 'fly'; b.vel.set((this.rng() - 0.5) * 4, 2.5, (this.rng() - 0.5) * 2); b.timer = 3 + this.rng() * 5; }
        } else {
          // flying: steer towards a goal (a free perch when tired, else a wander point)
          if (!b.goal || b.pos.distanceTo(b.goal) < 0.6) { b.goal = this.randomPos(new THREE.Vector3()); }
          if (b.state === 'fly' && b.timer < 0) { const free = this.perches.filter((p) => !p.taken); if (free.length) { const pr = free[Math.floor(this.rng() * free.length)]; pr.taken = true; b.perch = pr; b.goal = pr.p; b.state = 'land'; } else b.timer = 3; }
          if (b.state === 'flee' && b.timer < 0) b.state = 'fly';
          tmp.copy(b.goal).sub(b.pos); const d = tmp.length(); tmp.normalize();
          const speed = b.state === 'flee' ? 7 : b.state === 'land' ? Math.min(5, 1 + d * 1.5) : 4.2;
          b.vel.lerp(tmp.multiplyScalar(speed), Math.min(1, dt * (b.state === 'land' ? 3 : 1.5)));
          // flight style: flapping bursts, glides (soarers) or tucked bounds (small birds); body rises on the downstroke
          const fps = S.flapFps * (b.state === 'flee' ? 1.5 : 1); const ph = (b.t + b.phase);
          const coast = b.state === 'fly' && Math.sin(ph * 0.9 + b.phase) > 1 - S.glide * 1.2;
          let f;
          if (coast) { f = S.bound ? B.tuck : B.glide; b.vel.y -= dt * (S.bound ? 2.2 : 0.4); }
          else { const k = Math.floor(ph * fps) % FLY.length; f = FLY[k]; b.vel.y += (k >= 1 && k <= 4 ? 1.6 : -0.9) * dt; }
          if (b.state === 'land' && d < 1.2) f = FLY[[0, 1, 0, 7][Math.floor(ph * fps * 0.7) % 4]]; // braking flaps, wings high
          b.pos.addScaledVector(b.vel, dt);
          if (b.state === 'land' && d < 0.12) { b.state = 'perch'; b.pos.copy(b.perch.p); b.timer = 4 + this.rng() * 10; }
          b.frame = f; if (Math.abs(b.vel.x) > 0.2) b.flip = b.vel.x < 0;
          px = b.pos.x; py = b.pos.y; pz = b.pos.z;
        }
        b.frame += ROW[b.sp] * COLS;
      }
      this.iPos.setXYZ(n, px, py, pz); this.iData.setXYZW(n, b.frame, b.size, b.flip ? 1 : 0, 0); n++;
    }
    this.geo.instanceCount = n; this.iPos.needsUpdate = true; this.iData.needsUpdate = true;
    this.sGeo.instanceCount = ns; this.sPos.needsUpdate = true; this.sSize.needsUpdate = true;
  }
}
