// Battle instruments as physical objects: brass manometer (Integrity), oak heater shield (Ward), stitched leather
// pouch with a tag (Gold), brass desk bell (End Turn), wicker waste basket of crumpled theories (Second Thoughts),
// wax-sealed law tags, enemy tally boards with wax HP channels, parchment intent flags, wooden number chips.
import * as THREE from 'three';
import { PX, PXP, LK, RAMP, Surf, SurfTex, pxTex, frontMat, sideMat, plainMat, paperMat, slab, sheet, mesh, turned, TACK, Body,
  wood, brass, screw, rivet, groove, parchment, leather, waxSeal, wicker, inscribe, inscribeLines, measure, FONT } from './craft.js';
import { sprite } from '../gfx/sprites.js';
import { hash2 } from '../gfx/art/core.js';
import { Spring } from '../core/tween.js';
import { ink } from './objects.js';

const round = Math.round;
const faceZ = (m) => { m.rotation.x = Math.PI / 2; return m; }; // lathe axis (Y) -> toward the camera
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
export const roman = (n) => ROMAN[n] || String(n);

// ================================================================ MANOMETER: Integrity
const DIAL_R = 1.62, DIAL_T = round(DIAL_R * 2 * PXP);
export class Manometer extends Body {
  constructor() {
    super(); this.tiltK = 0.05; this.hoverLift = 0.2; const p = this.pivot;
    // case + faceted turned bezel (16 facets) + hex stem with flange
    const brassM = plainMat('brass');
    faceZ(mesh(turned([[0, -0.32], [DIAL_R + 0.12, -0.32], [DIAL_R + 0.2, -0.22], [DIAL_R + 0.2, -0.04], [0, -0.04]], 16), brassM, p));
    this.bezel = faceZ(mesh(turned([[DIAL_R - 0.02, 0.1], [DIAL_R + 0.06, 0.22], [DIAL_R + 0.26, 0.2], [DIAL_R + 0.36, 0.06], [DIAL_R + 0.34, -0.1], [DIAL_R + 0.2, -0.16]], 16), brassM, p));
    const stem = mesh(turned([[0.2, 0], [0.2, 0.42], [0.32, 0.46], [0.32, 0.62], [0.24, 0.66], [0.24, 0.9]], 6), brassM, p); stem.position.set(0, -DIAL_R - 1.22, -0.18);
    const nut = mesh(turned([[0.001, 0], [0.42, 0], [0.42, 0.3], [0.001, 0.3]], 6), brassM, p); nut.position.set(0, -DIAL_R - 0.95, -0.18);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const s = faceZ(mesh(turned([[0, 0.06], [0.07, 0.05], [0.09, 0], [0, 0]], 6), brassM, p)); s.position.set(Math.cos(a) * (DIAL_R + 0.22), Math.sin(a) * (DIAL_R + 0.22), 0.18); }
    // printed dial card (redrawn when the HP counter changes)
    this.dial = new SurfTex(DIAL_T, DIAL_T); const dm = frontMat(this.dial.tex, { rough: 0.85, alphaTest: 0.5 });
    this.dialMesh = mesh(new THREE.CircleGeometry(DIAL_R, 32), dm, p); this.dialMesh.position.z = 0.02; this.dialMesh.receiveShadow = true;
    // needle (blued steel blade + counterweight) on a brass hub
    const ns = new THREE.Shape([[-0.05, -0.3], [0.05, -0.3], [0.035, 0.0], [0.012, DIAL_R * 0.84], [-0.012, DIAL_R * 0.84], [-0.035, 0.0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const ng = new THREE.ExtrudeGeometry(ns, { depth: 0.04, bevelEnabled: false }); this.needle = new THREE.Group(); this.needle.position.z = 0.12; p.add(this.needle);
    const nm = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8a1a22).multiplyScalar(LK), metalness: 0.3, roughness: 0.4, toneMapped: false }); mesh(ng, nm, this.needle);
    const hub = faceZ(mesh(turned([[0, 0.12], [0.1, 0.1], [0.16, 0.04], [0.15, 0], [0, 0]], 8), brassM, this.needle)); hub.position.z = 0.02;
    // domed glass with two hard glare strips (a reflection, not a glow)
    const gm = new THREE.MeshStandardMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, toneMapped: false, envMapIntensity: 1.6, depthWrite: false });
    faceZ(mesh(turned([[DIAL_R + 0.02, 0.12], [DIAL_R * 0.8, 0.26], [DIAL_R * 0.4, 0.32], [0, 0.33]], 16), gm, p, { cast: false }));
    const gl = new Surf(24, 24); for (let i = 0; i < 24; i++) for (let k = 0; k < 3; k++) { if (i + k < 22 && i > 3) gl.pix(i, 19 - i + k, k === 1 ? '#ffffff' : '#d8f0f4'); if (i > 9 && i < 17) gl.pix(i + 4, 24 - i + k - 2, '#e8f8fa'); }
    const glare = mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: pxTex(gl.toCanvas()), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), p, { cast: false }); glare.position.set(-0.45, 0.4, 0.36);
    this.nS = new Spring(1, 7, 0.38); this.shake = new Spring(0, 30, 0.18); this.hp = null; this.max = 1; this.hitMesh = this.dialMesh;
  }
  paintDial(hp, max) {
    const C = DIAL_T / 2; const R = RAMP.ivory;
    this.dial.paint((S) => {
      for (let y = 0; y < DIAL_T; y++) for (let x = 0; x < DIAL_T; x++) { const d = Math.hypot(x + 0.5 - C, y + 0.5 - C); if (d > C) continue; S.set(x, y, R, d > C - 3 ? 2 : (hash2(x, y, 3) > 0.93 ? 3 : 4) - (d > C - 6 && (x + y) % 2 ? 0 : 0)); }
      for (let a = 0; a < Math.PI * 2; a += 0.01) { S.setT(round(C + Math.cos(a) * (C - 5)), round(C + Math.sin(a) * (C - 5)), 1); }
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5;
      for (let i = 0; i <= 40; i++) { const a = A0 + (i / 40) * SW; const major = i % 10 === 0, mid = i % 5 === 0; const r0 = C - (major ? 15 : mid ? 12 : 10), r1 = C - 7; const red = i <= 8;
        S.line(round(C + Math.cos(a) * r0), round(C + Math.sin(a) * r0), round(C + Math.cos(a) * r1), round(C + Math.sin(a) * r1), (x, y) => (red ? S.set(x, y, RAMP.wax, 2) : S.setT(x, y, 0))); }
      for (let i = 0; i <= 80; i++) { const a = A0 + (i / 80) * SW * 0.2; for (const r of [C - 8, C - 9]) S.set(round(C + Math.cos(a) * r), round(C + Math.sin(a) * r), RAMP.wax, r === C - 8 ? 3 : 2); }
      for (let i = 0; i <= 60; i++) { const a = A0 + SW * (0.8 + (i / 60) * 0.2); for (const r of [C - 8, C - 9]) S.set(round(C + Math.cos(a) * r), round(C + Math.sin(a) * r), RAMP.verd, r === C - 8 ? 3 : 2); }
      inscribeLines(S, ['INTEGRITY'], { x: 0, y: round(C - 19), w: DIAL_T, h: 8 }, 'tiny', 'ink', { color: '#3a2420' });
      // brass counter window with the reading on ivory number wheels
      const txt = `${Math.max(0, hp)}/${max}`; const tw = measure(txt, 'num') + 8; const wx = round(C - tw / 2), wy = round(C + 9);
      for (let y = wy - 2; y < wy + 15; y++) for (let x = wx - 2; x < wx + tw + 2; x++) S.set(x, y, RAMP.brass, y === wy - 2 || x === wx - 2 ? 5 : y === wy + 14 || x === wx + tw + 1 ? 1 : 3);
      for (let y = wy; y < wy + 13; y++) for (let x = wx; x < wx + tw; x++) S.set(x, y, R, y === wy ? 1 : y === wy + 1 ? 3 : y > wy + 10 ? 3 : 5);
      inscribe(S, txt, wx + 4, wy + 11, 'num', 'paint', { color: hp <= max * 0.3 ? '#9e1a14' : '#1a1012' });
      inscribeLines(S, ['PLUMB & CO'], { x: 0, y: round(C + 24), w: DIAL_T, h: 8 }, 'tiny', 'ink', { color: '#7a5a46' });
    });
  }
  set(hp, max) {
    if (hp === this.hp && max === this.max) return;
    if (this.hp != null && hp < this.hp) { this.shake.kick(14); this.kick(0.6); }
    this.hp = hp; this.max = max; this.paintDial(hp, max); this.nS.target = Math.max(0, Math.min(1, hp / max));
  }
  update(dt, p, t = performance.now() / 1000) {
    this.nS.update(dt); this.shake.update(dt); this.updateBody(dt, p);
    const low = this.hp != null && this.hp < this.max * 0.3;
    this.needle.rotation.z = Math.PI * 0.75 - this.nS.value * Math.PI * 1.5 + Math.sin(t * (low ? 40 : 18)) * (low ? 0.025 : 0.006);
    this.pivot.rotation.z += this.shake.value * 0.012; this.pivot.position.x = this.shake.value * 0.01;
  }
}

// ================================================================ WARD: oak heater shield hung on a nail, painted number
const SH_W = 1.9, SH_H = 2.2;
export class WardShield extends Body {
  constructor() {
    super(); this.tiltK = 0.04; this.tex = new SurfTex(round(SH_W * PX), round(SH_H * PX));
    this.mesh = mesh(slab(SH_W, SH_H, 0.22, { shape: 'shield', cut: 0, bevel: 0.06 }), [frontMat(this.tex.tex), sideMat('oak')], this.pivot); this.mesh.position.y = -SH_H / 2 + 0.15;
    const nail = mesh(turned([[0, 0.12], [0.1, 0.1], [0.12, 0.05], [0.03, 0], [0.03, -0.2], [0, -0.22]], 6), plainMat('iron'), this.pivot); nail.rotation.x = Math.PI / 2; nail.position.set(0, 0.05, 0.2);
    this.show = new Spring(0, 14, 0.45); this.n = -1; this.swing = new Spring(0, 5, 0.12);
  }
  paint(n) {
    const W = this.tex.w, H = this.tex.h;
    this.tex.paint((S) => {
      wood(S, 0, 0, W, H, RAMP.oak, { seed: 4, base: 2, vertical: true, seams: 1, knots: 0, quiet: true });
      const inS = (x, y) => { const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / H; const half = v < 0.62 ? 1 : Math.sqrt(Math.max(0, 1 - ((v - 0.62) / 0.4) ** 2)); return Math.abs(u) <= half * 0.97; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inS(x, y)) continue; let e = 0; for (let k = 1; k <= 3; k++) if (!inS(x - k, y) || !inS(x + k, y) || !inS(x, y - k) || !inS(x, y + k)) { e = k; break; } if (e) S.set(x, y, RAMP.iron, e === 1 ? 1 : e === 2 ? (y < H * 0.5 ? 4 : 3) : 2); }
      for (const [x, y] of [[5, 6], [W - 7, 6], [4, round(H * 0.5)], [W - 6, round(H * 0.5)], [round(W / 2) - 1, H - 6]]) rivet(S, x, y, RAMP.iron);
      // painted number (white lead paint, chipped)
      const txt = String(n); const f = txt.length > 2 ? 'num' : 'num2'; const tw = measure(txt, f); inscribe(S, txt, round(W / 2 - tw / 2), round(H * 0.5) + (f === 'num2' ? 9 : 4), f, 'paint', { ramp: RAMP.ivory });
      inscribeLines(S, ['WARD'], { x: 0, y: 4, w: W, h: 8 }, 'tiny', 'paint', { ramp: RAMP.ivory });
    });
  }
  set(block) { if (block === this.n) return; if (block > 0) { this.paint(block); if (block > this.n) { this.kick(0.8); this.swing.kick(6); } } this.n = block; this.show.target = block > 0 ? 1 : 0; }
  update(dt, p, t = performance.now() / 1000) { this.show.update(dt); this.swing.update(dt); this.updateBody(dt, p); const s = Math.max(0.001, this.show.value); this.group.scale.setScalar(s); this.group.visible = s > 0.02; this.pivot.rotation.z += this.swing.value * 0.04 + Math.sin(t * 1.3) * 0.015; }
}

// ================================================================ POUCH: stitched leather pouch with a cinched neck and a leather count tag
const pouchTex = (() => { let t = null; return () => { if (t) return t; const S = new Surf(64, 40); leather(S, 0, 0, 64, 40, { seed: 9, base: 3, stitch: 0 });
  for (let y = 0; y < 40; y++) { for (const x of [0, 63]) S.setT(x, y, 1); if (y % 3 === 0) { S.set(31, y, RAMP.rope, 5); S.set(32, y, RAMP.rope, 4); } else S.setT(31, y, 1); }
  for (let x = 0; x < 64; x++) for (let y = 28; y < 33; y++) S.set(x, y, RAMP.rope, y === 28 ? 5 : y === 32 ? 1 : (x + y) % 4 < 2 ? 4 : 3);
  for (let x = 0; x < 64; x += 4) for (let y = 18; y < 28; y++) if ((x + y) % 7 < 2) S.shift(x + ((y * 0.3) | 0), y, -1);
  t = pxTex(S.toCanvas()); return t; }; })();
export class Pouch extends Body {
  constructor() {
    super(); this.tiltK = 0.06; const p = this.pivot;
    const prof = [[0.001, 0], [0.45, 0.04], [0.8, 0.26], [0.95, 0.62], [0.9, 1.0], [0.62, 1.3], [0.36, 1.44], [0.3, 1.52], [0.44, 1.64], [0.56, 1.8], [0.4, 1.86], [0.001, 1.8]];
    const g = turned(prof, 10); const m = new THREE.MeshStandardMaterial({ map: pouchTex(), roughness: 0.8, toneMapped: false, flatShading: true, color: new THREE.Color().setScalar(LK) });
    this.bag = mesh(g, m, p); this.bag.scale.set(1, 1, 0.72); this.bag.position.y = -0.95;
    // coins peeking from the neck
    for (const [x, z, r] of [[-0.12, 0.08, 0.3], [0.14, -0.02, -0.4]]) { const c = mesh(turned([[0.001, 0], [0.2, 0], [0.2, 0.05], [0.001, 0.05]], 8), plainMat('gold'), p); c.position.set(x, 0.86, z); c.rotation.set(1.2, 0, r); }
    // leather tag on a thong, coin count burnt in
    this.tagTex = new SurfTex(36, 20); this.tag = mesh(slab(36 / PX, 20 / PX, 0.08, { shape: 'tag', cut: 0.1, bevel: 0.025 }), [frontMat(this.tagTex.tex), sideMat('leather')], p);
    this.tag.position.set(1.15, -0.2, 0.42); this.tag.rotation.z = -0.12;
    const th = mesh(turned([[0.025, 0], [0.025, 1]], 4), plainMat('rope'), p); th.position.set(0.32, 0.5, 0.3); th.rotation.z = Math.PI * 0.68; th.scale.y = 0.95;
    this.gold = -1; this.jig = new Spring(0, 22, 0.16); this.hit = this.bag;
  }
  set(n) {
    if (n === this.gold) return; if (this.gold >= 0) { this.jig.kick(n > this.gold ? 9 : -7); this.kick(0.4); } this.gold = n;
    this.tagTex.paint((S) => { leather(S, 0, 0, 36, 20, { seed: 3, base: 3, stitch: 2, ramp: RAMP.oak }); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) S.set(30 + dx, 9 + dy, RAMP.ink, 0); const t = String(n); inscribe(S, t, round(15 - measure(t, 'num') / 2) + 1, 14, 'num', 'burn'); });
  }
  update(dt, p) { this.jig.update(dt); this.updateBody(dt, p); this.pivot.rotation.z += this.jig.value * 0.05; this.bag.scale.y = 1 - this.jig.value * 0.01; }
}

// ================================================================ BELL: brass desk bell on a walnut base with an engraved nameplate
export class Bell extends Body {
  constructor() {
    super(); this.tiltK = 0.05; this.hoverLift = 0.25; const p = this.pivot;
    const bw = 3.2, bh = 0.78; const bt = new SurfTex(round(bw * PX), round(bh * PX)); bt.paint((S) => { wood(S, 0, 0, bt.w, bt.h, RAMP.walnut, { seed: 8, base: 2, knots: 1 }); S.bevel(null, { lit: 2, dark: -2 }); });
    this.base = mesh(slab(bw, bh, 1.3, { shape: 'rect', cut: 0.1, bevel: 0.1 }), [frontMat(bt.tex), sideMat('walnut')], p); this.base.position.y = -0.95;
    const foot = mesh(slab(bw + 0.25, 0.16, 1.5, { cut: 0.04, bevel: 0.05 }), [sideMat('walnut'), sideMat('walnut')], p); foot.position.y = -1.32;
    this.plate = new SurfTex(round(2.9 * PX), 11); this.plateMesh = mesh(slab(2.9, 11 / PX, 0.06, { shape: 'rect', cut: 0.06, bevel: 0.02 }), [frontMat(this.plate.tex, { metal: 0.3, rough: 0.5, env: 0.8 }), sideMat('brass')], p); this.plateMesh.position.set(0, -0.92, 0.68);
    this.dome = new THREE.Group(); this.dome.position.y = -0.64; p.add(this.dome);
    const dm = plainMat('brass').clone(); this.domeMat = dm;
    mesh(turned([[1.12, 0], [1.16, 0.06], [1.08, 0.16], [0.95, 0.42], [0.74, 0.7], [0.46, 0.9], [0.18, 0.98], [0.001, 1.0]], 14), dm, this.dome);
    mesh(turned([[0.001, 0], [0.9, 0], [0.9, 0.04], [0.001, 0.04]], 14), plainMat('iron'), this.dome);
    this.plunger = new THREE.Group(); this.plunger.position.y = 0.98; this.dome.add(this.plunger);
    mesh(turned([[0.06, 0], [0.06, 0.28], [0.2, 0.3], [0.24, 0.38], [0.18, 0.48], [0.001, 0.5]], 8), dm, this.plunger);
    this.press = new Spring(0, 30, 0.28); this.wob = new Spring(0, 9, 0.08); this.enabled = true; this.label = '';
    this.base.userData.bell = this; this.hit = [this.base, this.plateMesh]; this.dome.traverse((o) => { if (o.isMesh) { o.userData.bell = this; this.hit.push(o); } });
    this.setLabel('End Turn', 'SPACE');
  }
  setLabel(t, sub) { const k = t + sub; if (k === this.label) return; this.label = k; this.plate.paint((S) => { brass(S, 0, 0, this.plate.w, this.plate.h, { seed: 2, patina: 0.25 }); S.bevel(null, { lit: 2, dark: -2 }); screw(S, 3, 3); screw(S, this.plate.w - 7, 3, RAMP.brass, 1); inscribeLines(S, [t.toUpperCase()], { x: 0, y: 1, w: this.plate.w, h: this.plate.h - 1 }, measure(t.toUpperCase(), 'caps') <= this.plate.w - 18 ? 'caps' : 'tiny', 'enamel', { fill: RAMP.night }); }); }
  setEnabled(on) { if (on === this.enabled) return; this.enabled = on; this.domeMat.color.setScalar(LK * (on ? 1 : 0.62)); this.restRz = on ? 0 : 0.5; }
  ring() { this.press.kick(-16); this.wob.kick(14); this.squash(0.6); }
  update(dt, p, t = performance.now() / 1000) {
    this.press.update(dt); this.wob.update(dt); this.updateBody(dt, this.enabled ? p : null);
    this.plunger.position.y = 0.98 + Math.max(-0.2, this.press.value * 0.012); this.dome.rotation.z = this.wob.value * 0.02 * Math.sin(t * 40); this.dome.rotation.x = this.wob.value * 0.01 * Math.cos(t * 37);
  }
}

// ================================================================ BIN: wicker waste basket, a burnt leather tag, crumpled theories
const wickerTex = (() => { let t = null; return () => { if (t) return t; const S = new Surf(48, 30); wicker(S, 0, 0, 48, 30); t = pxTex(S.toCanvas(), { repeat: true }); t.repeat.set(3, 1); return t; }; })();
function crumple(seed) { // 14x14 crumpled paper ball, faceted creases, tinted outline
  const S = new Surf(14, 14); const R = RAMP.parch; const c = 6.5;
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) { const a = Math.atan2(y - c, x - c), d = Math.hypot(x - c, y - c); const rr = 6 + Math.sin(a * 5 + seed) * 0.7 + Math.cos(a * 3 + seed * 2) * 0.5; if (d > rr) continue; const facet = Math.floor((a + Math.PI) / (Math.PI / 3.5) + seed) % 3; const lit = (-(x - c) - (y - c)) / 9; S.set(x, y, R, Math.max(1, Math.min(6, 4 + (lit > 0.25 ? 1 : 0) + (lit < -0.35 ? -1 : 0) + (facet === 1 ? -1 : facet === 2 && lit > 0 ? 1 : 0)))); if (d > rr - 1) S.setT(x, y, lit > 0.2 ? 3 : 1); }
  for (let i = 0; i < 4; i++) { const a = seed + i * 1.7; S.line(round(c), round(c), round(c + Math.cos(a) * 5), round(c + Math.sin(a) * 5), (x, y) => S.shift(x, y, -1)); }
  for (const [x, y] of [[4, 3], [9, 4], [5, 9]]) if (hash2(x, y, seed) > 0.3) S.pix(x, y, '#3a2a30');
  return pxTex(S.toCanvas());
}
export class Bin extends Body {
  constructor() {
    super(); this.tiltK = 0.05; const p = this.pivot;
    this.basket = new THREE.Group(); this.basket.rotation.x = 0.3; this.basket.position.y = -0.1; this.basket.scale.setScalar(1.12); p.add(this.basket);
    const wm = new THREE.MeshStandardMaterial({ map: wickerTex(), roughness: 0.85, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color().setScalar(LK) });
    this.body = mesh(turned([[0.8, -0.9], [0.86, -0.6], [0.98, 0.0], [1.12, 0.62], [1.18, 0.86]], 12), wm, this.basket);
    mesh(turned([[0.001, -0.9], [0.8, -0.9], [0.8, -0.86], [0.001, -0.86]], 12), plainMat('walnut'), this.basket);
    const rim = mesh(turned([[1.14, 0.8], [1.3, 0.84], [1.32, 0.94], [1.2, 1.0], [1.1, 0.96]], 12), plainMat('rope'), this.basket); void rim;
    const inner = mesh(new THREE.CircleGeometry(1.12, 12), new THREE.MeshStandardMaterial({ color: new THREE.Color(0x1c100c).multiplyScalar(LK), roughness: 1, toneMapped: false }), this.basket); inner.rotation.x = -Math.PI / 2; inner.position.y = 0.55;
    this.tokens = [0, 1, 2].map((i) => { const m = mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshStandardMaterial({ map: crumple(i * 2.3 + 1), alphaTest: 0.5, roughness: 0.9, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color().setScalar(LK) }), p); m.userData.home = new THREE.Vector3(-0.55 + i * 0.55, 0.55 + (i === 1 ? 0.18 : 0), 0.35 + i * 0.02); m.position.copy(m.userData.home); m.rotation.z = i * 1.3; return m; });
    this.tagTex = new SurfTex(48, 24); this.tagTex.paint((S) => { leather(S, 0, 0, 48, 24, { seed: 2, base: 2, stitch: 2 }); inscribeLines(S, ['SECOND', 'THOUGHTS'], { x: 0, y: 4, w: 48, h: 16 }, 'tiny', 'paint', { lineH: 8, ramp: RAMP.ivory }); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) S.set(23 + dx, 1 + dy, RAMP.ink, 0); });
    this.tag = mesh(slab(48 / PX, 24 / PX, 0.07, { shape: 'tag', cut: 0.1, bevel: 0.02 }), [frontMat(this.tagTex.tex), sideMat('leather')], p); this.tag.position.set(0.05, -0.75, 1.0); this.tag.rotation.z = 0.05;
    this.hot = new Spring(0, 12, 0.4); this.jig = new Spring(0, 18, 0.2); this.count = 3; this.fly = [];
    this.hit = [this.body, this.tag, ...this.tokens];
  }
  set(n) {
    if (n === this.count) return; if (n < this.count) { this.jig.kick(10); for (let i = n; i < this.count; i++) { const tk = this.tokens[i]; if (tk) this.fly.push({ m: tk, v: new THREE.Vector3((Math.random() - 0.5) * 3, 6, 2), t: 0 }); } }
    else this.tokens.forEach((tk, i) => { if (i < n) { tk.visible = true; tk.position.copy(tk.userData.home); } });
    this.count = n;
  }
  setHot(b) { this.hot.target = b ? 1 : 0; }
  update(dt, p, t = performance.now() / 1000) {
    this.hot.update(dt); this.jig.update(dt); this.updateBody(dt, p);
    const h = this.hot.value; this.basket.rotation.x = 0.3 + h * 0.25; this.pivot.scale.multiplyScalar(1 + h * 0.08); this.pivot.rotation.z += this.jig.value * 0.03 + h * Math.sin(t * 18) * 0.03;
    for (const tk of this.tokens) if (!this.fly.some((f) => f.m === tk) && tk.visible) tk.position.y = tk.userData.home.y + h * 0.25 + Math.sin(t * 3 + tk.userData.home.x * 4) * 0.02;
    for (const f of this.fly) { f.t += dt; f.v.y -= 22 * dt; f.m.position.addScaledVector(f.v, dt); f.m.rotation.z += dt * 8; if (f.t > 1.2) f.m.visible = false; }
    this.fly = this.fly.filter((f) => f.t <= 1.2);
  }
}

// ================================================================ LAW TAG: parchment tag on a string, wax seal, inked name
export class LawTag extends Body {
  constructor(name, tip) {
    super(); this.name = name; this.tip = tip; this.tiltK = 0.04; this.hoverLift = 0.25; this.seed = (hash2(name.length, name.charCodeAt(0), 2) * 99) | 0;
    const f = measure(name, 'handS') > 70 ? 'tiny' : 'handS'; const Wt = Math.max(36, measure(name, f) + 12), Ht = 34; const S = new Surf(Wt, Ht);
    parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: 1, tone: 4, mask: (x, y) => !(y < 6 && (x < 6 - y || x > Wt - 7 + y)) });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) S.shift(round(Wt / 2) + dx, 4 + dy, dx || dy ? -1 : -3);
    inscribeLines(S, [name], { x: 2, y: 8, w: Wt - 4, h: 14 }, f, 'ink', { color: '#3a1c3a' }); waxSeal(S, round(Wt / 2), Ht - 7, 5, { seed: this.seed });
    this.sheet = mesh(sheet(Wt / PXP, Ht / PXP, { curl: 0.06, sag: 0.02, segX: 3, segY: 3 }), paperMat(), this.pivot); this.sheet.material.map = pxTex(S.toCanvas()); this.sheet.position.y = -Ht / PXP / 2 - 0.25;
    const str = mesh(turned([[0.018, 0], [0.018, 0.42]], 4), plainMat('rope'), this.pivot); str.position.y = -0.42; void str;
    const nail = mesh(TACK(), plainMat('iron'), this.pivot); nail.rotation.x = Math.PI / 2; nail.position.z = 0.05;
    this.w = Wt / PXP; this.h = Ht / PXP + 0.3; this.sheet.userData.law = this; this.hit = this.sheet; this.ph = Math.random() * 6; this.pop.value = 0.01; this.pop.target = 1; this.rz.kick(8);
  }
  update(dt, p, t = performance.now() / 1000) { this.updateBody(dt, p); this.pivot.rotation.z += Math.sin(t * 1.4 + this.ph) * 0.03; }
}

// ================================================================ ENEMY BOARD: walnut tally board under a foe + parchment intent flag above it
const ST_INK = { burn: '#a83a10', wet: '#1e5a8a', venom: '#3e6a22', weak: '#5a3a8a', vulnerable: '#9e2218', strength: '#8a1a1c', stun: '#8a6a10', prone: '#8a6a10', evade: '#1e6a5a', blind: '#4e2e7e', dizzy: '#9e2218' };
export class EnemyBoard {
  constructor(name) {
    this.name = name; this.group = new THREE.Group(); this.board = new Body(); this.board.tiltK = 0; this.group.add(this.board.group);
    this.tex = new SurfTex(80, 26); this.mesh = mesh(slab(5, 26 / PX, 0.2, { cut: 0.12, bevel: 0.05 }), [frontMat(this.tex.tex), sideMat('walnut')], this.board.pivot);
    for (const s of [-1, 1]) { const r = mesh(turned([[0.025, 0], [0.025, 0.5]], 4), plainMat('rope'), this.board.pivot); r.position.set(s * 1.9, 26 / PX / 2 - 0.1, -0.06); }
    this.flag = new Body(); this.flag.tiltK = 0; this.group.add(this.flag.group); this.flagTex = new SurfTex(68, 26);
    this.flagGeo = new THREE.PlaneGeometry(68 / PX, 26 / PX, 8, 2); this.flagMesh = mesh(this.flagGeo, paperMat(), this.flag.pivot); this.flagMesh.material.map = this.flagTex.tex; this.flagMesh.position.x = 68 / PX / 2 + 0.06; this.flagBase = Float32Array.from(this.flagGeo.attributes.position.array);
    const pole = mesh(turned([[0.05, -1.25], [0.05, 0.85], [0.1, 0.9], [0.1, 1.0], [0.001, 1.06]], 6), plainMat('walnut'), this.flag.pivot); pole.position.y = -0.05; void pole;
    this.flag.group.visible = false; this.hpKey = ''; this.key = ''; this.vis = true; this.bob = Math.random() * 6; this.show = new Spring(0, 12, 0.5); this.show.target = 1;
  }
  setHP(hp, max, block, st) {
    const keys = Object.keys(st || {}).filter((k) => st[k] && typeof st[k] !== 'object'); const key = `${hp}/${max}/${block}/${keys.map((k) => k + st[k]).join(',')}`; if (key === this.hpKey) return;
    const hurt = this.hp != null && hp < this.hp; this.hpKey = key; this.hp = hp; if (hurt) { this.board.kick(0.7); }
    const H = keys.length ? 36 : 26; if (this.tex.h !== H) { this.tex.dispose(); this.tex = new SurfTex(80, H); this.mesh.material[0].map = this.tex.tex; this.mesh.material[0].needsUpdate = true; this.mesh.geometry = slab(5, H / PX, 0.2, { cut: 0.12, bevel: 0.05 }); this.mesh.position.y = -(H - 26) / PX / 2; }
    this.tex.paint((S) => {
      wood(S, 0, 0, 80, H, RAMP.walnut, { seed: this.name.length, base: 2, knots: 1, quiet: true }); S.bevel(null, { lit: 2, dark: -2 });
      inscribe(S, this.name.toUpperCase(), 4, 9, 'tiny', 'paint', { ramp: RAMP.ivory });
      // HP channel: carved groove with red wax poured to the current value, notches every tenth
      const X0 = 4, X1 = 41, Y0 = 12, Y1 = 22; const f = Math.max(0, hp / max); const xf = X0 + round((X1 - X0) * f);
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const edge = y === Y0 || y === Y1 || x === X0 || x === X1; if (edge) { S.setT(x, y, y === Y1 || x === X1 ? 4 : 0); continue; } if (x < xf) S.set(x, y, RAMP.wax, y === Y0 + 1 ? 4 : y === Y1 - 1 ? 1 : (x + y) % 9 === 0 ? 4 : 3); else S.setT(x, y, y === Y0 + 1 ? 0 : 1); }
      for (let i = 1; i < 10; i++) { const x = X0 + round((X1 - X0) * i / 10); S.setT(x, Y0, 0); S.setT(x, Y1, 1); if (x >= xf) S.setT(x, Y0 + 1, 0); }
      if (xf > X0 + 1 && xf < X1) for (let y = Y0 + 1; y < Y1; y++) S.set(xf, y, RAMP.wax, y < Y1 - 2 ? 2 : 1);
      const txt = `${Math.max(0, hp)}/${max}`; const nf = measure(txt, 'num') > 35 ? 'tiny' : 'num'; inscribe(S, txt, 43 + Math.max(0, round((35 - measure(txt, nf)) / 2)), nf === 'num' ? 22 : 20, nf, 'paint', { ramp: RAMP.ivory });
      if (block > 0) { const bx = 64, by = 1; for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) { const u = Math.abs(x - 6.5) / 7, v = y / 10; if (u > 1 - Math.max(0, v - 0.55) * 1.6) continue; S.set(bx + x, by + y, RAMP.iron, y === 0 || u > 0.82 ? 4 : 2); } inscribe(S, String(block), bx + 7 - round(measure(String(block), 'tiny') / 2), by + 8, 'tiny', 'paint', { color: '#f2ecd8' }); }
      let x = 4; for (const k of keys) { const t = `${k.slice(0, 4).toUpperCase()} ${st[k] === true ? '' : st[k]}`.trim(); const w = measure(t, 'tiny') + 6; if (x + w > 78) break;
        for (let y = 25; y < 34; y++) for (let xx = x; xx < x + w; xx++) S.set(xx, y, RAMP.parch, y === 25 ? 6 : y === 33 ? 3 : xx === x || xx === x + w - 1 ? 4 : 5); inscribe(S, t, x + 3, 32, 'tiny', 'ink', { color: ST_INK[k] || '#2a1a14' }); x += w + 2; }
    });
  }
  setIntent(it, value, hits) {
    const key = it ? `${it.icon}:${value}:${hits}:${it.label}:${it.kind}` : ''; if (key === this.key) return; this.key = key;
    if (!it) { this.flag.group.visible = false; return; } const was = this.flag.group.visible; this.flag.group.visible = true; if (!was) { this.flag.pop.value = 0.05; } this.flag.kick(0.6);
    const atk = it.kind === 'attack' || it.dmg; const col = atk ? '#8a1a1c' : it.kind === 'buff' ? '#3e6a22' : '#4e2e7e';
    this.flagTex.paint((S) => {
      parchment(S, 0, 0, 68, 26, { seed: 3, torn: 1, tone: 4, mask: (x, y) => x < 60 + Math.abs(y - 12.5) * 0.65 });
      for (let y = 0; y < 26; y++) { S.shift(0, y, -1); S.shift(1, y, -1); }
      try { S.blit(sprite(it.icon || 'question'), 4, 5); } catch { /* icon missing */ }
      const txt = value != null ? `${value}${hits > 1 ? '×' + hits : ''}` : ''; if (txt) inscribe(S, txt, 23, 15, 'bold', 'ink', { color: col });
      if (it.label) { const lt = measure(it.label, 'tiny') > 46 ? it.label.slice(0, 12) : it.label; inscribe(S, lt, 23, 23, 'tiny', 'ink', { color: '#4e2e1a' }); }
      for (let x = 2; x < 56; x++) if (hash2(x, 1, 9) > 0.5) S.pix(x, 1, atk ? '#9e2218' : col);
    });
  }
  update(dt, x, y, yTop, t = performance.now() / 1000) {
    if (!this.vis) return; this.bob += dt; this.show.update(dt); this.board.updateBody(dt, null); this.flag.updateBody(dt, null);
    this.board.group.position.set(x, y - 26 / PX / 2, 1); this.board.pivot.rotation.z += Math.sin(t * 1.1 + this.bob) * 0.012;
    this.flag.group.position.set(x - 2.0, yTop + 0.35 + Math.sin(this.bob * 2.2) * 0.08, 1.5);
    const a = this.flagGeo.attributes.position; const b = this.flagBase; for (let i = 0; i < a.count; i++) { const u = (b[i * 3] + 68 / PX / 2) / (68 / PX); a.setZ(i, Math.sin(t * 5 + u * 4 + this.bob) * 0.12 * u); a.setY(i, b[i * 3 + 1] - u * u * 0.08); } a.needsUpdate = true;
  }
  setVisible(b) { if (this.vis === b) return; this.vis = b; this.group.visible = b; }
  dispose() { this.tex.dispose(); this.flagTex.dispose(); this.group.parent?.remove(this.group); }
}

// ================================================================ NUMBER CHIPS: painted wooden chips that pop out and tumble (damage / heal)
const chipTex = new Map();
function chipFor(ch, kind) {
  const key = ch + kind; if (chipTex.has(key)) return chipTex.get(key);
  const S = new Surf(12, 14); wood(S, 0, 0, 12, 14, RAMP.ivory, { seed: ch.charCodeAt(0), base: 4, knots: 0, quiet: true }); S.bevel(null, { lit: 1, dark: -2 });
  const col = { dmg: '#9e1a14', heal: '#2e6a1a', hurt: '#7a0c18', crit: '#9e1a14', gold: '#8a5a08' }[kind] || '#2a1a14';
  const m = measure(ch, 'num'); inscribe(S, ch, round(6 - m / 2), 11, 'num', 'ink', { color: col });
  const t = pxTex(S.toCanvas()); chipTex.set(key, t); return t;
}
const chipGeo = () => slab(12 / PX, 14 / PX, 0.22, { cut: 0.08, bevel: 0.04 });
export class NumberChips {
  constructor(scene) { this.scene = scene; this.list = []; this.mats = new Map(); }
  mat(ch, kind) { const k = ch + kind; let m = this.mats.get(k); if (!m) { m = [frontMat(chipFor(ch, kind)), sideMat('ivory')]; this.mats.set(k, m); } return m; }
  spawn(text, x, y, { color = '#fff6cf', size = 1.4, vx = (Math.random() - 0.5) * 4, vy = 7, life = 1.5, floor = null, kind = null } = {}) {
    const k = kind || (/^#(f6b3|e870|c844)/i.test(color) ? 'hurt' : /^#(9cb8|cfe0|7cb4)/i.test(color) ? 'heal' : 'dmg');
    const g = new THREE.Group(); g.position.set(x, y, 8); this.scene.add(g); const s = size / 1.4; const chars = String(text).split(''); const sp = 12 / PX * 0.98 * s;
    const chips = chars.map((ch, i) => { const m = mesh(chipGeo(), this.mat(ch, k), g); m.position.x = (i - (chars.length - 1) / 2) * sp; m.scale.setScalar(s); m.userData.spin = (Math.random() - 0.5) * 3; return m; });
    this.list.push({ g, chips, vx, vy, life, max: life, floor: floor ?? y - 1.2, rot: (Math.random() - 0.5) * 2 });
  }
  update(dt) {
    for (const n of this.list) {
      n.life -= dt; n.vy -= 22 * dt; n.g.position.x += n.vx * dt; n.g.position.y += n.vy * dt; n.g.rotation.z += n.rot * dt * (n.vy > 0 ? 1 : 0.3);
      if (n.g.position.y < n.floor) { n.g.position.y = n.floor; n.vy = Math.abs(n.vy) * 0.38; n.vx *= 0.6; n.rot *= 0.5; for (const c of n.chips) c.userData.spin *= -0.6; }
      for (const c of n.chips) { c.rotation.y += c.userData.spin * dt; c.rotation.x = Math.sin(n.life * 9 + c.position.x) * 0.15; }
      const k = n.max - n.life; const s = k < 0.12 ? 0.4 + k * 5 : n.life < 0.25 ? Math.max(0.01, n.life * 4) : 1; n.g.scale.setScalar(s);
    }
    this.list = this.list.filter((n) => { if (n.life <= 0) { this.scene.remove(n.g); return false; } return true; });
  }
  clear() { for (const n of this.list) this.scene.remove(n.g); this.list = []; }
}
