// Living battle instruments (replace the manometer and the pouch): an HOURGLASS for Integrity whose pixel sand really
// pours (a falling grain stream from the neck, a growing heap below, a shrinking funnel above; healing rewinds time and the
// grains climb back up), with a heater shield of Block hung on its pillar; and a glass JAR of gold coins that drop in one
// by one with a clink, slosh and settle, fly out when spent, and rattle when you shake it. Both are faceted low-poly
// (8 - 12 sided turnings), pixel-art textured (nearest), lit by the UI rig, tilt toward the pointer, squash when pressed.
import * as THREE from 'three';
import { Surf, SurfTex, RAMP, pxTex, wood, brass, leather, inscribe, measure, Body, inkHull } from './craft.js';
import { WardShield } from './hudparts.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';

const TAU = Math.PI * 2;
const texOf = (fn, w, h, repeat = true) => { const S = new Surf(w, h); fn(S); return pxTex(S.toCanvas(), { repeat }); };
const MATS = {};
function mats() {
  if (MATS.wood) return MATS;
  MATS.wood = new THREE.MeshStandardMaterial({ map: texOf((S) => wood(S, 0, 0, 16, 32, RAMP.walnut, { seed: 7, base: 2, vertical: true }), 16, 32), roughness: 0.72, metalness: 0, flatShading: true, toneMapped: false });
  MATS.brass = new THREE.MeshStandardMaterial({ map: texOf((S) => brass(S, 0, 0, 16, 16, { seed: 3, patina: 0.35 }), 16, 16), roughness: 0.38, metalness: 0.45, flatShading: true, toneMapped: false });
  MATS.glass = new THREE.MeshStandardMaterial({ color: 0xd8eef0, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide, flatShading: true, toneMapped: false });
  MATS.glassEdge = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.BackSide, toneMapped: false });
  const sand = (r, g, b) => texOf((S) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; S.pix(x, y, '#' + [r * (0.86 + h * 0.22), g * (0.86 + h * 0.2), b * (0.84 + h * 0.2)].map((c) => Math.min(255, Math.round(c)).toString(16).padStart(2, '0')).join('')); } }, 16, 16);
  MATS.sand = new THREE.MeshStandardMaterial({ map: sand(222, 178, 104), roughness: 0.95, flatShading: true, toneMapped: false, side: THREE.DoubleSide });
  MATS.sandLow = new THREE.MeshStandardMaterial({ map: sand(214, 110, 82), roughness: 0.95, flatShading: true, toneMapped: false, side: THREE.DoubleSide });
  MATS.gold = new THREE.MeshStandardMaterial({ map: texOf((S) => brass(S, 0, 0, 8, 8, { seed: 9, ramp: RAMP.gold, patina: 0.1 }), 8, 8), roughness: 0.3, metalness: 0.55, flatShading: true, toneMapped: false });
  MATS.cork = new THREE.MeshStandardMaterial({ map: texOf((S) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const h = Math.abs(Math.sin(x * 7.1 + y * 3.7) * 9137.1) % 1; S.pix(x, y, h > 0.85 ? '#5a3a20' : h > 0.4 ? '#a8784a' : '#c08e5a'); } }, 16, 16), roughness: 0.9, flatShading: true, toneMapped: false });
  MATS.grain = new THREE.PointsMaterial({ color: 0xe8c07a, size: 0.07, sizeAttenuation: true, toneMapped: false });
  MATS.spark = new THREE.PointsMaterial({ color: 0xfff0b0, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  return MATS;
}
const lathe = (pts, n) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), n); g.computeVertexNormals(); return g; };
const M = (geo, mat, parent, ink = 0) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (ink) inkHull(m, ink); return m; };

// ================================================================ HOURGLASS: Integrity (sand above) and Block (the shield on the pillar)
const GH = 1.75; // half height of the glass
const bulbR = (u) => 0.075 + 0.8 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u)) * 0.97 + 0.04), 0.78); // u: 0 neck .. 1 cap
export class Hourglass extends Body {
  constructor() {
    super(); const p = this.pivot; const m = mats(); this.tiltK = 0.06; this.hoverLift = 0.25;
    this.frame = new THREE.Group(); p.add(this.frame);
    // caps: octagonal walnut discs with brass rims; three turned walnut pillars with brass collars
    for (const s of [1, -1]) {
      const cap = M(lathe([[0.001, 0], [1.18, 0], [1.24, 0.06], [1.24, 0.2], [1.1, 0.26], [0.001, 0.26]], 8), m.wood, this.frame, 0.03); cap.position.y = s > 0 ? GH : -GH - 0.26; cap.rotation.y = Math.PI / 8;
      const rim = M(lathe([[0.95, 0], [1.02, 0.02], [1.02, 0.08], [0.95, 0.1]], 8), m.brass, this.frame); rim.position.y = s > 0 ? GH - 0.06 : -GH + 0.0; rim.rotation.y = Math.PI / 8;
      const knob = M(lathe([[0.001, 0], [0.18, 0.02], [0.22, 0.1], [0.12, 0.2], [0.001, 0.24]], 8), m.brass, this.frame); knob.position.y = s > 0 ? GH + 0.26 : -GH - 0.5; if (s < 0) knob.scale.y = -1, knob.position.y = -GH - 0.26;
    }
    this.pillars = [];
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI / 2; const g = M(lathe([[0.07, -GH], [0.11, -GH + 0.12], [0.075, -GH + 0.3], [0.09, -0.6], [0.06, 0], [0.09, 0.6], [0.075, GH - 0.3], [0.11, GH - 0.12], [0.07, GH]], 8), m.wood, this.frame, 0.02); g.position.set(Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02 - 0.05); this.pillars.push(g);
      for (const y of [-GH + 0.12, GH - 0.12]) { const c = M(lathe([[0.12, -0.04], [0.14, 0], [0.12, 0.04]], 8), m.brass, g); c.position.y = y; } }
    // the glass: two bulbs and a waist, faceted
    const gp = []; for (let i = 0; i <= 14; i++) { const u = 1 - i / 14; gp.push([bulbR(u) + 0.02, -u * GH]); } for (let i = 1; i <= 14; i++) { const u = i / 14; gp.push([bulbR(u) + 0.02, u * GH]); }
    const gg = lathe(gp, 12);
    this.glass = M(gg, m.glass, p); this.glass.castShadow = false; const edge = new THREE.Mesh(gg, m.glassEdge); edge.scale.setScalar(1.015); p.add(edge);
    // glare: two hard vertical strips (a window reflection), pixel-edged
    const gl = new Surf(8, 32); for (let y = 2; y < 30; y++) { gl.pix(2, y, '#ffffff'); if (y % 5) gl.pix(3, y, '#d8f0f8'); if (y > 8 && y < 20) gl.pix(5, y, '#e8f8ff'); }
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.6), new THREE.MeshBasicMaterial({ map: pxTex(gl.toCanvas()), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); glare.position.set(-0.42, 0.75, 0.82); p.add(glare);
    const glare2 = glare.clone(); glare2.position.set(-0.42, -0.85, 0.82); p.add(glare2);
    // sand (rebuilt as the level moves)
    this.topS = M(new THREE.BufferGeometry(), m.sand, p); this.botS = M(new THREE.BufferGeometry(), m.sand, p);
    // the falling stream + the bouncing grains (and climbing sparks when healing)
    this.NS = 70; this.sp = new Float32Array(this.NS * 3); this.sv = Array.from({ length: this.NS }, () => ({ y: 0, vy: 0, x: 0, z: 0, vx: 0, vz: 0, on: false, up: false }));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(this.sp, 3)); this.grains = new THREE.Points(sg, m.grain); this.grains.frustumCulled = false; p.add(this.grains);
    this.SP = new Float32Array(30 * 3); this.spv = Array.from({ length: 30 }, () => ({ t: 9, a: 0, y0: 0 })); const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(this.SP, 3)); this.sparks = new THREE.Points(kg, m.spark); this.sparks.frustumCulled = false; p.add(this.sparks);
    // the reading: an engraved brass plate on the base
    this.plate = new SurfTex(48, 14); const pm = new THREE.MeshStandardMaterial({ map: this.plate.tex, roughness: 0.4, metalness: 0.35, toneMapped: false }); this.plateM = M(new THREE.BoxGeometry(48 / 16, 14 / 16, 0.08), [m.brass, m.brass, m.brass, m.brass, pm, m.brass], p, 0.02); this.plateM.position.set(0, -GH - 0.62, 1.05);
    // Block: the heater shield hangs on the front-right pillar
    this.shield = new WardShield(); this.shield.group.position.set(1.35, 0.55, 0.5); this.shield.group.scale.setScalar(0.62); p.add(this.shield.group);
    this.hp = null; this.max = 1; this.shown = 1; this.target = 1; this.lastBuild = -1; this.shake = new Spring(0, 30, 0.2); this.spin = new Spring(0, 7, 0.35); this.flow = 0; this.low = false; this.hit = this.glass;
  }
  rebuild(f) {
    const n = 10, m = mats(); const uT = 0.06 + 0.86 * Math.pow(Math.max(0, f), 0.85), uB = 0.06 + 0.82 * Math.pow(Math.max(0, 1 - f), 0.85);
    // top: from the axis at the surface (dipping into a funnel above the neck) out to the wall, down the wall to the neck
    const tp = [[0.0005, uT * GH - 0.12 * Math.min(1, f * 3)], [bulbR(uT) * 0.55, uT * GH - 0.03], [bulbR(uT) * 0.93, uT * GH]]; for (let i = 6; i >= 0; i--) { const u = (uT * i) / 6; tp.push([bulbR(u) * 0.93, u * GH]); } tp.push([0.0005, 0.01]);
    this.topS.geometry.dispose(); this.topS.geometry = f > 0.004 ? lathe(tp.reverse(), n) : new THREE.BufferGeometry();
    // bottom: a heap (cone on top), resting on the base of the lower bulb
    const yb = (u) => -u * GH; const top = 1 - uB; const bp = [[0.0005, yb(top) + 0.22 * Math.min(1, (1 - f) * 2.5)], [bulbR(top) * 0.5, yb(top) + 0.08], [bulbR(top) * 0.93, yb(top)]]; for (let i = 1; i <= 6; i++) { const u = top + (0.985 - top) * (i / 6); bp.push([bulbR(u) * 0.93, yb(u)]); } bp.push([0.0005, yb(0.985)]);
    this.botS.geometry.dispose(); this.botS.geometry = lathe(bp, n);
    for (const s of [this.topS, this.botS]) s.material = this.low ? m.sandLow : m.sand;
  }
  paint(hp, max) {
    this.plate.paint((S) => { brass(S, 0, 0, 48, 14, { seed: 5, patina: 0.3 }); S.bevel(null, { lit: 2, dark: -2 }); const t = `${Math.max(0, hp)}/${max}`; const w = measure(t, 'num'); inscribe(S, t, Math.round(24 - w / 2), 11, 'num', 'enamel', { fill: hp <= max * 0.3 ? RAMP.lacquer : RAMP.walnut }); });
  }
  set(hp, max, block = 0) {
    if (hp !== this.hp || max !== this.max) {
      if (this.hp != null && hp < this.hp) { this.shake.kick(16); this.kick(0.7); audio.play('glass_clink', { vol: 0.45, minGap: 0.1 }); }
      if (this.hp != null && hp > this.hp) { this.pop.kick(1.5); audio.play('magic_sparkle', { vol: 0.4, minGap: 0.2 }); }
      this.hp = hp; this.max = max; this.target = Math.max(0, Math.min(1, hp / max)); this.low = hp <= max * 0.3; this.paint(hp, max); this.lastBuild = -1;
    }
    this.shield.set(block);
  }
  flip() { this.spin.target += Math.PI * 2; audio.play('wood_creak', { vol: 0.5 }); audio.play('paper_rustle', { vol: 0.3, delay: 0.15 }); this.squash(0.6); }
  update(dt, ptr, t = performance.now() / 1000) {
    this.updateBody(dt, ptr); this.shake.update(dt); this.spin.update(dt); this.shield.update(dt, null, t);
    this.pivot.rotation.z += this.shake.value * 0.012 + Math.sin(t * 0.8) * 0.006; this.pivot.rotation.y += this.spin.value; this.pivot.position.x = this.shake.value * 0.008;
    // the level eases toward the reading at a pouring pace (draining) or a rewinding pace (healing)
    const d = this.target - this.shown; const rate = d < 0 ? 0.32 : 0.55; this.shown += Math.sign(d) * Math.min(Math.abs(d), rate * dt); const draining = d < -0.002, filling = d > 0.002;
    this.flow += ((draining ? 1 : this.target > 0.002 && this.target < 0.999 ? 0.08 : 0) - this.flow) * Math.min(1, dt * 6);
    if (Math.abs(this.shown - this.lastBuild) > 0.004) { this.lastBuild = this.shown; this.rebuild(this.shown); }
    // grains: a thin column from the neck to the heap (plus a trickle always, like a real glass), bouncing a little
    const heapY = -(1 - (0.06 + 0.82 * Math.pow(Math.max(0, 1 - this.shown), 0.85))) * GH + 0.12;
    for (let i = 0; i < this.NS; i++) { const g = this.sv[i];
      if (!g.on && Math.random() < this.flow * dt * 60 * 0.35) { g.on = true; g.up = false; g.x = (Math.random() - 0.5) * 0.03; g.z = (Math.random() - 0.5) * 0.03; g.y = -0.02; g.vy = -0.6 - Math.random() * 0.4; g.vx = 0; g.vz = 0; }
      if (!g.on && filling && Math.random() < dt * 25) { g.on = true; g.up = true; const a = Math.random() * TAU, r = Math.random() * 0.4; g.x = Math.cos(a) * r; g.z = Math.sin(a) * r; g.y = heapY; g.vy = 1.6 + Math.random(); }
      if (g.on) { if (g.up) { g.y += g.vy * dt; g.x *= 1 - dt * 3; g.z *= 1 - dt * 3; if (g.y > 0.02) { g.y = 0.02 + Math.random() * 0.3; g.on = Math.random() < 0.0; } }
        else { g.vy -= 9.8 * dt; g.y += g.vy * dt; g.x += g.vx * dt; g.z += g.vz * dt; if (g.y < heapY) { if (Math.abs(g.vy) > 1.2 && Math.random() < 0.4) { g.vy = -g.vy * 0.22; g.vx = (Math.random() - 0.5) * 0.8; g.vz = (Math.random() - 0.5) * 0.8; g.y = heapY; } else g.on = false; } } }
      this.sp.set(g.on ? [g.x, g.y, g.z] : [0, -99, 0], i * 3); }
    this.grains.geometry.attributes.position.needsUpdate = true; this.grains.material.color.set(this.low ? 0xe0886a : 0xe8c07a);
    // healing sparks climbing round the glass (time rewinds)
    for (let i = 0; i < 30; i++) { const s = this.spv[i]; s.t += dt; if (s.t > 1 && filling && Math.random() < dt * 20) { s.t = 0; s.a = Math.random() * TAU; s.y0 = -GH * 0.9; } const on = s.t < 1; const y = on ? s.y0 + s.t * GH * 1.7 : -99; const r = on ? bulbR(Math.abs(y) / GH) + 0.06 : 0; this.SP.set([Math.cos(s.a + s.t * 4) * r, y, Math.sin(s.a + s.t * 4) * r], i * 3); }
    this.sparks.geometry.attributes.position.needsUpdate = true;
    if (this.low) this.glass.material.opacity = 0.1 + Math.max(0, Math.sin(t * 6)) * 0.08;
  }
}

// ================================================================ JAR: gold coins in a corked glass jar
const JR = 0.95, JH = 2.1;
const jarR = (y) => (y < 0.12 ? 0.82 + y * 1.2 : y < JH * 0.72 ? JR : y < JH * 0.86 ? JR - (y - JH * 0.72) / (JH * 0.14) * 0.42 : 0.53); // base, belly, shoulder, neck
export class CoinJar extends Body {
  constructor() {
    super(); const p = this.pivot; const m = mats(); this.tiltK = 0.07; this.hoverLift = 0.25;
    this.body = new THREE.Group(); this.body.position.y = -JH / 2; p.add(this.body);
    const prof = []; for (let i = 0; i <= 16; i++) { const y = (i / 16) * (JH + 0.05); prof.push([jarR(y) + 0.03, y]); } prof.push([0.6, JH + 0.08], [0.6, JH + 0.16], [0.52, JH + 0.18]);
    const gg = lathe(prof, 10); this.glass = M(gg, m.glass, this.body); this.glass.castShadow = false; const edge = new THREE.Mesh(gg, m.glassEdge); edge.scale.setScalar(1.015); this.body.add(edge);
    const base = M(lathe([[0.001, -0.02], [0.84, -0.02], [0.86, 0.04], [0.001, 0.04]], 10), m.glass, this.body); base.castShadow = false;
    this.cork = M(lathe([[0.001, 0], [0.46, 0], [0.52, 0.3], [0.56, 0.42], [0.001, 0.44]], 8), m.cork, this.body, 0.02); this.cork.position.y = JH + 0.02;
    const twine = M(lathe([[0.62, 0], [0.65, 0.03], [0.62, 0.06]], 10), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true, toneMapped: false }), this.body); twine.position.y = JH + 0.04;
    const gl = new Surf(8, 32); for (let y = 3; y < 29; y++) { gl.pix(2, y, '#ffffff'); if (y % 4) gl.pix(3, y, '#d8f0f8'); }
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.4), new THREE.MeshBasicMaterial({ map: pxTex(gl.toCanvas()), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false })); glare.position.set(-0.5, JH * 0.45, 0.9); this.body.add(glare);
    // coins: faceted octagonal discs, one instanced mesh
    this.CMAX = 44; this.coinGeo = lathe([[0.001, 0], [0.22, 0], [0.24, 0.02], [0.24, 0.05], [0.22, 0.07], [0.001, 0.07]], 8);
    this.coins = new THREE.InstancedMesh(this.coinGeo, m.gold, this.CMAX); this.coins.castShadow = true; this.coins.frustumCulled = false; this.body.add(this.coins);
    this.cs = Array.from({ length: this.CMAX }, (_, i) => this.rest(i)); this.n = 0; this.want = 0;
    // the label: a leather tag tied to the neck, the count burnt in
    this.tagTex = new SurfTex(36, 18); this.tag = M(new THREE.BoxGeometry(36 / 16, 18 / 16, 0.06), [m.cork, m.cork, m.cork, m.cork, new THREE.MeshStandardMaterial({ map: this.tagTex.tex, roughness: 0.85, toneMapped: false }), m.cork], p, 0.02); this.tag.position.set(1.35, -0.25, 0.6); this.tag.rotation.z = -0.1;
    this.gold = -1; this.slosh = new Spring(0, 9, 0.18); this.sloshX = new Spring(0, 9, 0.2); this.hit = this.glass; this.clinkT = 0; this._d = new THREE.Object3D();
  }
  rest(i) { const layer = Math.floor(i / 7), k = i % 7; const a = k / 7 * TAU + layer * 0.9, r = k === 6 ? 0.05 : 0.48 + (layer % 2) * 0.06; return { x: Math.cos(a) * r * (k === 6 ? 0 : 1), z: Math.sin(a) * r * (k === 6 ? 0 : 1), y: 0.06 + layer * 0.075 + (k % 2) * 0.02, rx: (Math.sin(i * 3.7) * 0.35), rz: Math.cos(i * 2.3) * 0.3, cy: 0, vy: 0, on: false, out: 0, ox: 0, oz: 0, ovx: 0, ovz: 0 }; }
  set(gold) {
    if (gold === this.gold) return; const up = this.gold >= 0 && gold > this.gold, down = this.gold >= 0 && gold < this.gold; this.gold = gold;
    this.want = Math.min(this.CMAX, Math.max(gold > 0 ? 1 : 0, Math.round(Math.sqrt(Math.max(0, gold)) * 2.4)));
    if (up) { this.slosh.kick(4); this.kick(0.4); } if (down) { this.slosh.kick(-5); this.squash(0.5); audio.play('coins_handful', { vol: 0.5 }); }
    if (this.n === 0 && this.gold >= 0 && !up && !down) { for (let i = 0; i < this.want; i++) { const c = this.cs[i]; c.on = true; c.cy = c.y; c.vy = 0; } this.n = this.want; }
    this.tagTex.paint((S) => { leather(S, 0, 0, 36, 18, { seed: 3, base: 3, stitch: 2, ramp: RAMP.oak }); const t = String(gold); inscribe(S, t, Math.round(18 - measure(t, 'num') / 2), 13, 'num', 'burn'); });
  }
  shakeIt() { this.slosh.kick(9); this.sloshX.kick(-7); this.squash(0.8); for (let i = 0; i < this.n; i++) this.cs[i].vy += 1.2 + Math.random() * 1.6; audio.play('coins_handful', { vol: 0.55 }); audio.play('coin_single', { vol: 0.4, delay: 0.12 }); }
  update(dt, ptr, t = performance.now() / 1000) {
    this.updateBody(dt, ptr); this.slosh.update(dt); this.sloshX.update(dt); this.clinkT -= dt;
    this.pivot.rotation.z += this.slosh.value * 0.03 + Math.sin(t * 0.7) * 0.005; this.pivot.rotation.x += this.sloshX.value * 0.02;
    // one coin at a time drops in from the mouth (or leaves it)
    if (this.n < this.want && this.clinkT <= 0) { const c = this.cs[this.n]; c.on = true; c.cy = JH + 0.6; c.vy = -1; c.out = 0; this.n++; this.clinkT = 0.07; }
    if (this.n > this.want && this.clinkT <= 0) { const c = this.cs[this.n - 1]; c.out = 1; c.vy = 5 + Math.random() * 2; c.ovx = (Math.random() - 0.5) * 3; c.ovz = 1.5; c.ox = 0; c.oz = 0; this.n--; this.clinkT = 0.05; }
    const D = this._d; const tilt = this.slosh.value * 0.05;
    for (let i = 0; i < this.CMAX; i++) { const c = this.cs[i];
      if (c.out > 0) { c.vy -= 14 * dt; c.cy += c.vy * dt; c.ox += c.ovx * dt; c.oz += c.ovz * dt; c.out -= dt * 0.8; if (c.out <= 0) c.on = false; }
      else if (c.on) { c.vy -= 14 * dt; c.cy += c.vy * dt; if (c.cy < c.y) { if (c.vy < -1.5) { if (this.clinkT < 0.04) audio.play('coin_single', { vol: 0.3 + Math.random() * 0.2, minGap: 0.04 }); c.vy = -c.vy * 0.28; c.cy = c.y; } else { c.vy = 0; c.cy = c.y; } } }
      if (!c.on) { D.position.set(0, -99, 0); D.scale.setScalar(0.001); }
      else { D.position.set(c.x + tilt * (c.cy) + c.ox, c.cy, c.z + c.oz); D.rotation.set(c.rx + (c.out > 0 ? t * 9 : 0), i, c.rz + tilt); D.scale.setScalar(1); }
      D.updateMatrix(); this.coins.setMatrixAt(i, D.matrix); }
    this.coins.instanceMatrix.needsUpdate = true; this.tag.rotation.z = -0.1 + this.slosh.value * 0.06 + Math.sin(t * 1.2) * 0.02;
  }
}
