// LOADING: the first moments of LERFOLESE. A detailed apple lives its whole life in a time-lapse adrift in pixel-art
// deep space, driven by the preload: it ripens, bruises, rots and wrinkles (spores, growing mould, fruit flies, juice
// drips, dust puffs as it slumps), collapses, worms wriggle out, then it shrinks back into one glossy seed that sprouts
// when loading completes, and the camera dives at the seedling into the tower-top menu. The index.html boot canvas
// (the same space and an apple, no text) covers the frames before this scene exists.
// MENU: re-exported from scenes/tower.js (Isaac on the clockwork tower at sunset, cloud buttons, the Hall of Memories).
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { appleTimelapse } from '../models/orchard.js';
import { spaceBackdrop } from '../gfx/spacebg.js';
import { Motes } from '../gfx/motes.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { save } from '../core/save.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

// ================================================================ LOADING: the apple time-lapse adrift in pixel-art deep space
// A pixel-art nebula (violet veils, teal streams, gold wisps), a turning spiral galaxy, ringed and cratered planets,
// three twinkling parallax starfields and shooting stars (gfx/spacebg.js); the nearby star rims the apple with warm
// light. Fine pixel particles (gfx/motes.js): drifting stardust, twinkles round the fresh apple, rot spores puffing as
// it decays, a glittering burst when it collapses back into a seed and again when the seed sprouts. When the preload is
// done and the sprout has unfolded, the camera dives at the seedling and an iris wipe carries us into the garden.
const DUST = ['#8fe8d8', '#c8a8ff', '#ffe2a8', '#e8ecff', '#a8c8ff'];
export class LoadingScene extends UIScreen {
  async enter({ preload = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x020106);
    this.bg = spaceBackdrop(); sc.add(this.bg.mesh);
    const A = (this.A = appleTimelapse()); A.group.scale.setScalar(0.62); A.group.position.y = 0.62; sc.add(A.group); A.set(0); A.rim(0.35);
    // LIGHT (a painting of a fruit in space): the warm nearby star (upper right, a little in front) is the key, with a
    // crisp gloss on the skin; the teal-violet nebula behind on the left throws a cool rim round the far flank; a low
    // violet sky fill keeps the shadow side coloured (never black); a faint warm kick from below-front shapes the base
    const KEY = V(2.4, 2.1, 1.5), COOL = V(-2.6, 0.9, -2.2);
    const star = new THREE.DirectionalLight(0xffd29a, 3.4); star.position.copy(KEY); star.target.position.set(0, 0.85, 0);
    const rim = new THREE.DirectionalLight(0x5ac4e6, 2.4); rim.position.copy(COOL); rim.target.position.set(0, 0.85, 0);
    const rim2 = new THREE.DirectionalLight(0xa070ff, 1.4); rim2.position.set(0.4, 2.6, -2.8); rim2.target.position.set(0, 0.85, 0); // violet top-back edge from the nebula's bright veil
    const kick = new THREE.DirectionalLight(0xff9a6a, 0.35); kick.position.set(0.3, -1.4, 2.6); kick.target.position.set(0, 0.85, 0);
    sc.add(star, star.target, rim, rim.target, rim2, rim2.target, kick, kick.target, new THREE.HemisphereLight(0x5a4a9a, 0x0a1022, 0.75));
    A.gloss(1, KEY, COOL); this.spin = { a: 0 };
    this.motes = new Motes(1100, { px: 3 }); sc.add(this.motes.points); this.rnd = mulberry32(1642);
    this.camera = new THREE.PerspectiveCamera(30, this.engine.aspect, 0.05, 60); this.camera.position.set(0, 1.05, 2.55); this.camera.lookAt(0, 0.86, 0);
    // the galaxy and space read as fine pixel art (the engine's slight pixel look: about 540 art rows); gentle bloom only
    // on the hottest lights (the star, the gloss), so the apple's colour stays true
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ pixel: 0.6, bloom: [0.7, 0.45, 0.78], tilt: false, exposure: 1.02, ao: false, grade: { sat: 1.1, vib: 0.22, contrast: 1.08, vignette: 0.46, warmth: 0.04, lift: [0.008, 0.004, 0.026], gain: [1.03, 1.0, 0.96], rolloff: 0.5, toe: 0.03 }, ink: { fade: [6, 20], strength: 0.7 } });
    for (let i = 0; i < 170; i++) this.dust(true);
    this.pre = preload; this.t0 = performance.now(); this.age = 0; this.acc = { dust: 0, spark: 0, spore: 0, glow: 0 }; this.engine.add(this); this.pushInput();
    // SPACE PHYSICS: the apple floats free (inertia, a slow drift and tumble, soft bounds); a click / tap pushes it from
    // the point you touched (impulse + torque about its heart), with a soft thump and a puff of star dust
    this.ph = { p: V(), v: V((Math.random() - 0.5) * 0.02, 0.01, 0), w: V(0.05, 0.12, 0.03), q: new THREE.Quaternion(), dq: new THREE.Quaternion() };
    window.__loading = { scene: this, push: (x = 0, y = 0) => this.push({ x, y }) };
  }
  /** the apple's heart in the world (where pushes act) */
  heart(o = V()) { return o.set(0, 0.86, 0).add(this.ph.p); }
  push(ndc = this.input.ndc) {
    const cam = this.camera, ph = this.ph; const ray = new THREE.Ray(); ray.origin.copy(cam.position); ray.direction.set(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize();
    const c = this.heart(); const R = 0.27 * Math.max(0.35, 1 - this.A.collapse * 0.6) * (this.age > 0.9 ? 0.45 : 1); const cl = ray.closestPointToPoint(c, V()); const miss = cl.distanceTo(c);
    let hit; if (miss < R) { const back = Math.sqrt(R * R - miss * miss); hit = cl.addScaledVector(ray.direction, -back); } else hit = c.clone().addScaledVector(cl.sub(c).normalize(), R); // a near miss still nudges its edge
    const near = Math.max(0, 1 - Math.max(0, miss - R) / (R * 2.5)); if (near <= 0) { audio.play('whoosh_soft', { vol: 0.15, rate: 1.4 }); return; } // a wave of the hand through empty space
    const arm0 = hit.clone().sub(c); const lat = arm0.clone().addScaledVector(ray.direction, -arm0.dot(ray.direction)); if (lat.length() < R * 0.25) lat.set(Math.random() - 0.5, Math.random() - 0.3, 0).addScaledVector(ray.direction, 0); const J = lat.normalize().negate().multiplyScalar(0.85).addScaledVector(ray.direction, 0.3).normalize().multiplyScalar(0.5 * near); // away from the touch across the view, a little into the screen
    ph.v.addScaledVector(J, 1.0); const arm = hit.clone().sub(c); ph.w.add(arm.cross(J).multiplyScalar(26)); if (ph.w.length() > 7) ph.w.setLength(7);
    audio.play('hit_light', { vol: 0.22 * near, rate: 0.7 }); audio.play('whoosh_soft', { vol: 0.3 * near, rate: 0.8 + Math.random() * 0.3 }); if (this.age < 0.34) audio.play('chime_soft', { vol: 0.12, rate: 1.5 + Math.random() * 0.3 }); else audio.play('apple_squish', { vol: 0.12 * near, rate: 1.3 });
    const r = this.rnd; for (let i = 0; i < 16; i++) { const d = hit.clone().sub(c).normalize().multiplyScalar(0.25 + r() * 0.4).add(V((r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3));
      this.motes.spawn({ pos: hit, vel: d, drag: 2.6, life: 0.5 + r() * 0.6, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 10, color: this.age > 0.34 ? (r() < 0.5 ? '#c8c4a0' : '#b4bc8a') : r() < 0.5 ? '#fff0c8' : '#ffd890', bright: 1.3, fadeIn: 0.02 }); }
    this.bg.U.uFlare.value = Math.max(this.bg.U.uFlare.value, 0.12 * near);
  }
  physics(dt, t) { // inertia, a slow drifting current, a gentle tumble, soft walls; little friction (it is space)
    const ph = this.ph; const d = V(Math.sin(t * 0.13) * 0.006 + Math.sin(t * 0.31 + 1) * 0.004, Math.cos(t * 0.17) * 0.005, Math.sin(t * 0.11 + 2) * 0.004);
    const lim = this.leaving ? 0.02 : 0.42; const L = ph.p.length(); if (L > lim) d.addScaledVector(ph.p, -(L - lim) * 2.4 / L); if (this.leaving) d.addScaledVector(ph.p, -3).addScaledVector(ph.v, -2);
    if (ph.p.z > 0.3) d.z -= (ph.p.z - 0.3) * 4; // never into the lens
    ph.v.addScaledVector(d, dt).multiplyScalar(Math.exp(-dt * 0.35)); ph.p.addScaledVector(ph.v, dt);
    ph.w.multiplyScalar(Math.exp(-dt * 0.22)); const wl = ph.w.length(); if (wl > 1e-5) { ph.dq.setFromAxisAngle(ph.w.clone().divideScalar(wl), wl * dt); ph.q.premultiply(ph.dq); }
    if (wl < 0.6) ph.q.slerp(this._qI || (this._qI = new THREE.Quaternion()), Math.min(1, dt * 0.08 * (this.age > 0.86 ? 6 : 1))); // it rights itself slowly, so the seed and sprout stand up
    if (!this.ambOn && audio.manifest?.amb?.cosmos) { this.ambOn = true; audio.setAmbSet(['cosmos']); } // the hum of deep space (starts on the first gesture: autoplay rules)
  }
  dust(initial = false) { // one drifting stardust mote somewhere in the volume around the apple (near ones are drawn 2x)
    const r = this.rnd; const z = -4 + r() * 5.6; const near = z > 0.9; const p = [(r() - 0.5) * (5 + (2 - z) * 1.2), -0.6 + r() * 3.2, z]; if (!initial) p[0] = (r() < 0.5 ? -1 : 1) * (2.4 + r() * 1.2);
    this.motes.spawn({ pos: p, vel: [(p[0] < 0 ? 1 : -1) * (0.03 + r() * 0.06), 0.015 + r() * 0.03, 0.02], life: 7 + r() * 7, sprite: r() < 0.75 ? 'm1' : r() < 0.6 ? 'dust' : 'm2', color: DUST[Math.floor(r() * DUST.length)], bright: 0.6 + r() * 0.9, k: near ? 2 : 1, twinkle: 1.5 + r() * 4, fadeIn: 0.15 });
  }
  get done() { return this.age >= 1 && (!this.pre || this.pre.progress() >= 1); }
  onClick() { this.push(); return true; } // push the apple; the menu opens by itself when loading is done (the first gesture starts the sound)
  burst(p, n, { colors = ['#fff2c0', '#ffd27a', '#ffffff', '#9ff0e0'], speed = 1, leaves = 0 } = {}) {
    const r = this.rnd;
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar((0.25 + r() * 0.75) * speed); d.y += 0.15 * speed;
      this.motes.spawn({ pos: p, vel: d, drag: 2.4, grav: -0.04, life: 0.7 + r() * 1.1, seq: r() < 0.6 ? 'twinkle' : r() < 0.5 ? 'glint' : ['dia', 'x5', 'dia', 't3'], fps: 7 + r() * 5, color: colors[Math.floor(r() * colors.length)], bright: 1.4 + r(), k: r() < 0.15 ? 2 : 1, fadeIn: 0.02 }); }
    for (let i = 0; i < leaves; i++) { const a = r() * Math.PI * 2; this.motes.spawn({ pos: p, vel: [Math.cos(a) * 0.5, 0.35 + r() * 0.4, Math.sin(a) * 0.5], drag: 1.6, grav: 0.18, wobble: 0.8, life: 1.6 + r(), seq: 'leaf', fps: 8, color: r() < 0.5 ? '#9ee070' : '#d8f0a0', k: 1, fadeIn: 0.02 }); }
  }
  // ROT: fine pixel particles as it decays. Spores puff off the bruises and wander up; mould hyphae sprout on the rot,
  // fork and fruit; fruit flies arrive and dart round it; juice drips from the slumping base and splashes; dust puffs
  // ring out each time it slumps another step and again when it shrinks to the seed.
  rotFx(dt, prev, age) {
    const A = this.A, r = this.rnd, ac = this.acc, M = this.motes; const C = V(0, 0.86, 0), base = V(0, 0.66, 0);
    const rot = Math.max(0, Math.min(1, (age - 0.34) / 0.3)) * (age < 0.88 ? 1 : 0); const col = A.collapse;
    if (rot <= 0 && age < 0.86) return;
    const SP = ['#b4bc8a', '#9aa874', '#c8c4a0', '#86906a', '#d8d8b0'];
    ac.spore += dt * rot * 20; while (ac.spore > 1) { ac.spore--; const p = A.skinPoint(V(), r); const o = p.clone().sub(C).normalize();
      M.spawn({ pos: p.addScaledVector(o, 0.01), vel: [o.x * 0.04 + (r() - 0.5) * 0.05, 0.05 + r() * 0.07, o.z * 0.04 + (r() - 0.5) * 0.05], drag: 0.9, grav: -0.02, wobble: 0.28, life: 2 + r() * 2.6, sprite: r() < 0.6 ? 'm1' : r() < 0.7 ? 'spore1' : 'spore2', color: SP[Math.floor(r() * SP.length)], bright: 0.7 + r() * 0.35, fadeIn: 0.3 }); }
    ac.mould = (ac.mould || 0) + dt * rot * 8; while (ac.mould > 1) { ac.mould--; const p = A.skinPoint(V(), r); if (p.y > 1.05) continue; p.addScaledVector(p.clone().sub(C).normalize(), 0.012);
      M.spawn({ pos: p, life: 2.2 + r() * 1.8, seq: 'mould', fps: 3 + r(), once: true, color: r() < 0.6 ? '#e2ead0' : '#b8c8a0', bright: 0.85, fadeIn: 0.04 });
      if (r() < 0.3) M.spawn({ pos: p.clone().add(V(0, 0.02, 0)), vel: [(r() - 0.5) * 0.03, 0.03, (r() - 0.5) * 0.03], delay: 1, wobble: 0.2, life: 2.5, sprite: 'm1', color: '#d8e0b8', bright: 0.7, fadeIn: 0.6 }); }
    if (age > 0.4 && age < 0.9) { ac.fly = (ac.fly || 0) + dt * 1.6; while (ac.fly > 1) { ac.fly--; const a = r() * Math.PI * 2; // a fruit fly lives a few seconds round the apple
      M.spawn({ pos: [Math.cos(a) * 0.9, 0.7 + r() * 0.5, Math.sin(a) * 0.6], vel: [0, 0, 0], life: 3 + r() * 2.5, seq: 'fly', fps: 24, buzz: { at: [C.x + (r() - 0.5) * 0.3, C.y + 0.12 + r() * 0.15, C.z + (r() - 0.5) * 0.3], k: 0.55 + r() * 0.3 }, color: '#e4e0d4', bright: 0.95, fadeIn: 0.25 }); } }
    if (col > 0.04 && age < 0.86) { ac.drip = (ac.drip || 0) + dt * (0.6 + col * 3.5); while (ac.drip > 1) { ac.drip--; let lo = null; for (let k = 0; k < 4; k++) { const q = A.skinPoint(V(), r); if (!lo || q.y < lo.y) lo = q; }
      M.spawn({ pos: lo, vel: [0, -0.02, 0], grav: 1.1, drag: 0.3, life: 2.2, seq: 'drip', fps: 5, once: true, color: r() < 0.5 ? '#9a6a2a' : '#7a4a1e', bright: 0.95, fadeIn: 0.05, floor: base.y - 0.34 - r() * 0.04 }); } }
    const cs = Math.floor(col * 4); if (cs > (this.cstep || 0)) { this.cstep = cs; this.puff(base, 12 + cs * 3, 0.8 + cs * 0.15); }
    if (prev < 0.87 && age >= 0.87) this.puff(base.clone().add(V(0, 0.1, 0)), 30, 1.4);
  }
  puff(p, n, s = 1) { // a ring of dust puffs and a few heavier grains
    const r = this.rnd; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.4, sp = (0.18 + r() * 0.22) * s;
      this.motes.spawn({ pos: [p.x + Math.cos(a) * 0.12, p.y + r() * 0.05, p.z + Math.sin(a) * 0.1], vel: [Math.cos(a) * sp, 0.05 + r() * 0.08, Math.sin(a) * sp * 0.8], drag: 2.6, grav: -0.03, life: 1.1 + r() * 0.8, seq: 'puff', fps: 3.2 + r(), once: true, color: r() < 0.5 ? '#9a8a74' : '#7a6c5e', bright: 0.7, k: r() < 0.25 ? 2 : 1, fadeIn: 0.02 });
      if (i % 3 === 0) this.motes.spawn({ pos: [p.x, p.y + 0.05, p.z], vel: [Math.cos(a) * sp * 1.6, 0.3 + r() * 0.3, Math.sin(a) * sp * 1.6], drag: 0.6, grav: 0.9, life: 0.9 + r() * 0.5, sprite: 'dust', color: '#6a5a4a', bright: 0.8, fadeIn: 0.02 }); }
  }
  update(dt, t) {
    const el = (performance.now() - this.t0) / 1000; const prog = this.pre ? Math.min(1, this.pre.progress()) : 1; const target = Math.min(prog, el / 9.5); const A = this.A; const r = this.rnd; const ac = this.acc;
    const prev = this.age; this.age += Math.max(0, target - this.age) * Math.min(1, dt * 3) + (target - this.age > 0 ? 0.0008 : 0); this.age = Math.min(1, this.age); A.set(this.age); const age = this.age;
    // particles: stardust always; twinkles while the apple is fresh; spores once the rot sets in; bursts at the seed and the sprout
    ac.dust += dt * 26; while (ac.dust > 1) { ac.dust--; this.dust(); }
    if (age < 0.32) { ac.spark += dt * (7 - age * 16); while (ac.spark > 1) { ac.spark--; const p = A.skinPoint(new THREE.Vector3(), r); const o = p.clone().sub(A.group.position).multiplyScalar(0.18); p.add(o); this.motes.spawn({ pos: p, vel: o.multiplyScalar(0.3), life: 0.55 + r() * 0.5, seq: r() < 0.7 ? 'twinkle' : 'glint', color: r() < 0.6 ? '#fff0c8' : '#ffd890', bright: 1.6, fadeIn: 0.02 }); } }
    this.rotFx(dt, prev, age);
    if (prev < 0.9 && age >= 0.9) { this.burst(A.seedWorld(), 70, { speed: 1.2 }); this.bg.U.uFlare.value = 0.6; audio.play('magic_shimmer', { vol: 0.35 }); }
    this.bg.U.uFlare.value = Math.max(0, this.bg.U.uFlare.value - dt * 0.8);
    if (age >= 0.999 && prog >= 1) {
      const st0 = this.sproutT || 0; this.sproutT = st0 + dt; A.sprout(this.sproutT / 1.6);
      if (st0 === 0) { this.burst(A.seedWorld(), 46, { colors: ['#e8ffb0', '#b8f080', '#fff4c0', '#ffffff'], speed: 0.9, leaves: 10 }); audio.play('chime_soft', { vol: 0.5 }); }
      ac.glow2 = (ac.glow2 || 0) + dt * 9; while (ac.glow2 > 1) { ac.glow2--; const p = A.sproutTip(); this.motes.spawn({ pos: [p.x + (r() - 0.5) * 0.08, p.y, p.z + (r() - 0.5) * 0.08], vel: [(r() - 0.5) * 0.08, 0.12 + r() * 0.12, 0], drag: 0.8, life: 0.9 + r() * 0.8, seq: 'glint', color: r() < 0.5 ? '#d8ff9a' : '#fff0b8', bright: 1.5, fadeIn: 0.05 }); }
      if (this.sproutT > 2.3 && !this.leaving) this.leave();
    }
    // the apple turns slowly in space on a gently tilted, precessing axis (the stem circles, light slides over the gloss),
    // easing off as it rots and slumps; the seed and the sprout turn too
    { const sp = this.spin; sp.a += dt * (0.62 - 0.3 * Math.min(1, A.collapse * 1.5)); const tilt = 0.24 * (1 - A.collapse * 0.6);
      const q = (this._q ??= new THREE.Quaternion()), qt = (this._qt ??= new THREE.Quaternion()); q.setFromAxisAngle(V(0, 1, 0), sp.a); qt.setFromAxisAngle(V(Math.cos(t * 0.21), 0, Math.sin(t * 0.21)), tilt + Math.sin(t * 0.47) * 0.05); q.premultiply(qt);
      this.physics(dt, t); q.premultiply(this.ph.q);
      const ap = A.apple; const c = V(0, 0.42, 0); ap.quaternion.copy(q); ap.position.copy(c).sub(c.clone().applyQuaternion(q)).multiplyScalar(ap.scale.x); // pivot round the apple's heart, not its base
      A.seed.rotation.y = sp.a * 0.8; A.group.position.set(this.ph.p.x, 0.62 + Math.sin(t * 0.8) * 0.012 + this.ph.p.y, this.ph.p.z); }
    // camera: a slow orbit-drift; dive at the seedling when leaving
    const zin = ease(this.age > 0.86 ? (this.age - 0.86) / 0.14 : 0); const lv = this.leaving ? ease5((performance.now() - this.leaving) / 1500) : 0;
    const tip = A.sproutTip(); const cp = V(Math.sin(t * 0.2) * 0.12 + this.ph.p.x * 0.35, 1.05 - zin * 0.18 + this.ph.p.y * 0.35, 2.75 - zin * 1.1); const look = V(this.ph.p.x * 0.6, 0.86 - zin * 0.12 + this.ph.p.y * 0.6, this.ph.p.z * 0.5); // the camera follows it a little
    if (lv > 0) { cp.lerp(tip.clone().add(V(0.02, 0.05, 0.42)), lv * 0.85); look.lerp(tip, lv); this.bg.U.uFlare.value = Math.max(this.bg.U.uFlare.value, lv * 0.8); }
    this.camera.position.copy(cp); this.camera.lookAt(look);
    this.bg.update(dt, t, this.engine.renderer, { x: cp.x * 60 + lv * 40, y: (cp.y - 1) * 60 }); this.motes.px = this.bg.px; this.motes.update(dt, t, this.engine.renderer); this.updateUI(dt);
  }
  leave() { // auto-enter: dive at the seedling, then an iris wipe from it into the garden
    this.leaving = performance.now(); audio.play('magic_shimmer', { vol: 0.55 }); this.burst(this.A.sproutTip(), 40, { colors: ['#fff6d0', '#ffe08a', '#d8ffb0'], speed: 0.7 });
    setTimeout(() => { if (this.left) return; this.left = true; const p = this.A.sproutTip().project(this.camera); const wipe = { color: 0x0b0716, center: [p.x * 0.5 + 0.5, 0.5 - p.y * 0.5], dur: 0.7, style: 'galaxy' };
      const j = this.game.journal; if (!j.seenPrologue && !j.loops && !save.loadRun() && !/[?&]noprologue\b/.test(location.search)) { this.game.playPrologue(); return; } // a FRESH boot: straight into the opening cinematic (the prologue ends in the tower menu)
      this.game.toMenu({ from: 'loading', wipe }); }, 1050);
  }
  dispose() { if (window.__loading?.scene === this) window.__loading = null; this.motes?.dispose(); super.dispose(); }
}

// ================================================================ THE MENU: the tower top at sunset (scenes/tower.js); the Hall of Memories is scenes/hall.js
export { MenuScene } from './tower.js';
