// Mythical Wilderness creatures, sculpted from faceted organic parts with procedural animation.
import * as THREE from 'three';
import * as S from './sculpt.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, ...o });
const glow = (c, i = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m; }
function piv(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const MATS = {
  bronze: () => F({ color: 0xc08a3a, metalness: 0.85, roughness: 0.35 }), gold: () => F({ color: 0xf0c050, metalness: 0.9, roughness: 0.25 }),
  bone: () => F({ color: 0xe8dcc0, roughness: 0.6 }), leather: () => F({ color: 0x6e4024, roughness: 0.8 }), dark: () => F({ color: 0x1a1220, roughness: 0.5 }),
};

// generic animation rig state shared by all creatures
function rig(root, height) {
  const st = { t: Math.random() * 10, mode: 'idle', modeT: 0, hit: new Spring(0, 14, 0.35), lunge: new Spring(0, 9, 0.45), lift: new Spring(0, 10, 0.4), dead: 0, talk: 0 };
  return {
    root, height, st,
    act(mode) {
      st.mode = mode; st.modeT = 0;
      if (mode === 'hurt') st.hit.kick(10);
      if (mode === 'attack') st.lunge.kick(9);
      if (mode === 'cast') st.lift.kick(6);
      if (mode === 'die') st.dead = 0.001;
    },
    talk(s = 1) { st.talk = s; },
    common(dt) {
      st.t += dt; st.modeT += dt; for (const k of ['hit', 'lunge', 'lift']) st[k].update(dt);
      if (st.talk > 0) st.talk -= dt;
      if (st.dead > 0) { st.dead = Math.min(1, st.dead + dt * 1.4); root.rotation.z = -st.dead * 1.35; root.position.y = -st.dead * 0.3; root.scale.setScalar(1 - st.dead * 0.08); }
      if (st.mode !== 'idle' && st.mode !== 'die' && st.modeT > 1.3) st.mode = 'idle';
    },
  };
}

// ------------------------------------------------------------------ Drunk Satyr
function satyr() {
  const root = new THREE.Group(); const body = piv(root, 0, 1.0, 0);
  const fur = F({ map: TEX.fur('satyr', R.fur, { seed: 3 }), roughness: 0.95 });
  const skin = F({ color: 0xc98a5a, roughness: 0.65 }); const blush = F({ color: 0xd85a4a, roughness: 0.6 });
  const hairM = F({ map: TEX.fur('curl', ['#1c0f08', '#2f1a0e', '#4a2c18', '#5e3a20'], { seed: 7, len: 3 }), roughness: 1 });
  const legs = [];
  for (const s of [-1, 1]) { // goat legs: thigh forward, shin back, cannon, hoof
    const hip = piv(body, s * 0.15, 0, 0); mesh(S.limb(0.42, 0.13, 0.08, { sides: 6, seed: 3 + s, bulge: 0.3 }), fur, hip);
    hip.rotation.x = -0.35; const kn = piv(hip, 0, -0.42, 0); kn.rotation.x = 0.9; mesh(S.limb(0.36, 0.07, 0.045, { sides: 5, seed: 5 + s }), fur, kn);
    const an = piv(kn, 0, -0.36, 0); an.rotation.x = -0.55; mesh(S.limb(0.22, 0.045, 0.04, { sides: 5, seed: 6 }), fur, an);
    mesh(S.slab(0.1, 0.08, 0.13, { seed: 7 + s, taper: 0.3 }), MATS.dark(), an, 0, -0.24, 0.02); legs.push({ hip, kn, s });
  }
  const torso = piv(body, 0, 0.05, 0);
  mesh(S.turn([[0.001, 0], [0.24, 0.02], [0.3, 0.18], [0.28, 0.38], [0.3, 0.55], [0.18, 0.66], [0.001, 0.68]], { sides: 8, seed: 11, amt: 0.06 }), skin, torso).scale.set(1, 1, 0.85);
  mesh(S.blob(0.26, 0.22, 0.24, { detail: 1, seed: 12 }), skin, torso, 0, 0.18, 0.08); // pot belly
  mesh(S.blob(0.16, 0.14, 0.06, { detail: 0, seed: 13 }), hairM, torso, 0, 0.5, 0.2);
  mesh(S.slab(0.62, 0.16, 0.4, { seed: 14, taper: -0.2 }), fur, torso, 0, 0.0, 0); // furry hips
  const head = piv(torso, 0, 0.72, 0.04);
  mesh(S.turn([[0.001, -0.05], [0.13, -0.02], [0.17, 0.1], [0.17, 0.22], [0.12, 0.3], [0.001, 0.33]], { sides: 8, seed: 15 }), skin, head);
  mesh(S.blob(0.065, 0.05, 0.06, { detail: 0, seed: 16 }), blush, head, 0, 0.1, 0.17); // the nose. it has seen things.
  for (const s of [-1, 1]) { mesh(S.blob(0.04, 0.025, 0.02, { detail: 0, seed: 17 }), blush, head, s * 0.1, 0.07, 0.13); mesh(S.gem(0.022, 0, 18), F({ color: 0x1a1220 }), head, s * 0.06, 0.17, 0.15).scale.y = 0.55; }
  for (const s of [-1, 1]) { const b = mesh(S.slab(0.07, 0.02, 0.02, { seed: 19 + s }), hairM, head, s * 0.065, 0.215, 0.15); b.rotation.z = s * -0.35; }
  for (let i = 0; i < 9; i++) { const a = -0.8 + (i / 8) * 1.6; mesh(S.horn([[Math.sin(a) * 0.12, 0.02, 0.1 + Math.cos(a) * 0.04], [Math.sin(a) * 0.13, -0.12, 0.13], [Math.sin(a) * 0.08, -0.26 + (i % 2) * 0.04, 0.12]], 0.045, 0.006, { sides: 4, segs: 3, seed: 20 + i }), hairM, head); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; if (Math.sin(a) > 0.6) continue; mesh(S.blob(0.06, 0.06, 0.06, { detail: 0, seed: 30 + i }), hairM, head, Math.cos(a) * 0.15, 0.27 + Math.sin(i) * 0.03, Math.sin(a) * 0.15); }
  for (const s of [-1, 1]) { mesh(S.horn([[s * 0.08, 0.3, 0.02], [s * 0.15, 0.42, -0.06], [s * 0.2, 0.44, -0.16]], 0.035, 0.005, { sides: 4, segs: 5, seed: 40 + s }), MATS.bone(), head); const e = mesh(S.slab(0.12, 0.05, 0.02, { seed: 42, taper: 0.8 }), skin, head, s * 0.2, 0.2, -0.02); e.rotation.set(0, s * 0.3, s * -0.5); }
  // ivy wreath with grapes
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const l = mesh(S.slab(0.07, 0.015, 0.045, { seed: 50 + i }), F({ color: 0x4f8a3a }), head, Math.cos(a) * 0.17, 0.28, Math.sin(a) * 0.17); l.rotation.y = -a; }
  for (let i = 0; i < 5; i++) mesh(S.gem(0.028, 0, 60 + i), F({ color: 0x6a2a6a, roughness: 0.3 }), head, 0.15 + (i % 2) * 0.03, 0.22 - i * 0.025, 0.08);
  const arms = [];
  for (const s of [-1, 1]) { const sh = piv(torso, s * 0.3, 0.56, 0); mesh(S.limb(0.32, 0.075, 0.06, { sides: 6, seed: 70 + s, bulge: 0.2 }), skin, sh); const el = piv(sh, 0, -0.32, 0); mesh(S.limb(0.28, 0.06, 0.045, { sides: 6, seed: 72 + s }), skin, el); const hand = piv(el, 0, -0.3, 0); mesh(S.blob(0.055, 0.06, 0.045, { detail: 0, seed: 74 + s }), skin, hand); sh.rotation.z = s * 0.25; el.rotation.x = -0.6; arms.push({ sh, el, hand, s }); }
  // wineskin (left) and pan flute (right)
  const skinBag = piv(arms[0].hand, 0, -0.1, 0.05); mesh(S.blob(0.13, 0.17, 0.1, { detail: 1, seed: 80 }), MATS.leather(), skinBag); mesh(S.limb(0.1, 0.03, 0.025, { sides: 5, seed: 81 }), MATS.leather(), skinBag, 0, 0.2, 0);
  const flute = piv(arms[1].hand, 0, -0.05, 0.06); for (let i = 0; i < 6; i++) mesh(S.facet(new THREE.CylinderGeometry(0.018, 0.018, 0.12 + i * 0.03, 5)), F({ color: 0xc9a050, roughness: 0.6 }), flute, -0.06 + i * 0.024, -(0.12 + i * 0.03) / 2 + 0.06, 0);
  const R_ = rig(root, 2.0);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    const sway = Math.sin(t * 1.3) * 0.12 + Math.sin(t * 0.47) * 0.06;
    body.rotation.z = sway; body.position.y = 1.0 + Math.abs(Math.sin(t * 2.6)) * 0.03 + st.lift.value * 0.05;
    torso.rotation.x = 0.1 + st.lunge.value * 0.06 - st.hit.value * 0.04; torso.rotation.y = Math.sin(t * 0.8) * 0.15;
    head.rotation.z = -sway * 1.2 + Math.sin(t * 2.1) * 0.05; head.rotation.x = Math.sin(t * 1.7) * 0.08;
    body.position.x = st.lunge.value * 0.08 - st.hit.value * 0.05;
    arms[0].sh.rotation.x = -0.3 + Math.sin(t * 1.3) * 0.2 - (st.mode === 'attack' ? 1.6 : 0) * Math.max(0, 1 - st.modeT);
    arms[1].sh.rotation.x = st.mode === 'cast' ? -2.2 : -0.2 + Math.sin(t * 1.1 + 1) * 0.15; arms[1].el.rotation.x = st.mode === 'cast' ? -1.4 : -0.6;
    for (const l of legs) l.hip.rotation.x = -0.35 + Math.sin(t * 1.3 + l.s) * 0.08;
    if (Math.sin(t * 0.37) > 0.995) R_.st.lift.kick(5); // hiccup
  };
  R_.head = head; return R_;
}

// ------------------------------------------------------------------ Medusa
function medusa() {
  const root = new THREE.Group();
  const scales = F({ map: TEX.scales('medusa', R.snake, { size: 5 }), roughness: 0.45 });
  const belly = F({ color: 0xc9c48a, roughness: 0.5 });
  const skin = F({ color: 0x7f9a6a, roughness: 0.55 }); const cloth = F({ map: TEX.cloth('chiton', ['#4a2a5a', '#6b3a7a', '#8a5a9a', '#b08ac0'], { trim: { ramp: R.gold, size: 3 } }), roughness: 0.8, side: THREE.DoubleSide });
  const gold = MATS.gold();
  // coiled tail: chain of segments
  const tail = []; let parent = root; const tailBase = piv(root, 0, 0.28, 0.1);
  parent = tailBase;
  for (let i = 0; i < 12; i++) { const r0 = 0.28 * (1 - i / 13) + 0.03, r1 = 0.28 * (1 - (i + 1) / 13) + 0.03; const seg = piv(parent, 0, i ? -0.3 : 0, 0); mesh(S.limb(0.32, r0, r1, { sides: 7, seed: 100 + i, bulge: 0.05 }), i % 2 ? scales : scales, seg); if (i === 0) seg.rotation.x = 1.45; else { seg.rotation.z = 0.52 + i * 0.03; seg.rotation.x = -0.05; } tail.push(seg); parent = seg; }
  const body = piv(root, 0, 0.62, 0.15);
  const torso = piv(body, 0, 0, 0);
  mesh(S.turn([[0.001, 0], [0.24, 0.02], [0.22, 0.25], [0.2, 0.42], [0.26, 0.58], [0.2, 0.74], [0.001, 0.76]], { sides: 8, seed: 110 }), skin, torso).scale.set(1, 1, 0.75);
  mesh(S.facet(new THREE.CylinderGeometry(0.27, 0.32, 0.42, 8, 1, true)), cloth, torso, 0, 0.42, 0).scale.set(1, 1, 0.8);
  mesh(S.facet(new THREE.TorusGeometry(0.24, 0.025, 3, 9)), gold, torso, 0, 0.24, 0).rotation.x = Math.PI / 2;
  mesh(S.facet(new THREE.TorusGeometry(0.15, 0.018, 3, 9)), gold, torso, 0, 0.7, 0.02).rotation.x = Math.PI / 2.4;
  const head = piv(torso, 0, 0.82, 0.02);
  mesh(S.turn([[0.001, -0.08], [0.1, -0.06], [0.15, 0.05], [0.16, 0.16], [0.13, 0.26], [0.001, 0.3]], { sides: 8, seed: 111 }), skin, head).scale.set(0.95, 1, 1.05);
  mesh(S.horn([[0, 0.14, 0.13], [0, 0.07, 0.17], [0, 0.05, 0.175]], 0.03, 0.015, { sides: 4, segs: 3, seed: 112 }), skin, head);
  const eyes = []; for (const s of [-1, 1]) { const e = mesh(S.gem(0.026, 0, 113), glow(0x7dff8a, 2), head, s * 0.06, 0.14, 0.13); e.scale.set(1.3, 0.7, 0.6); eyes.push(e); }
  mesh(S.slab(0.06, 0.015, 0.02, { seed: 114 }), F({ color: 0x3a0f2a }), head, 0, 0.0, 0.14);
  // snake hair: chains with heads
  const snakes = [];
  for (let i = 0; i < 9; i++) {
    const a = -1.3 + (i / 8) * 2.6 + Math.PI; const base = piv(head, Math.sin(a) * 0.1, 0.24, Math.cos(a) * 0.1 - 0.02);
    base.rotation.set(-0.6 + Math.cos(a) * 0.3, a, Math.sin(a) * 0.6); const segs = []; let p = base;
    for (let k = 0; k < 5; k++) { const sg = piv(p, 0, k ? 0.09 : 0, 0); mesh(S.limb(0.1, 0.03 - k * 0.004, 0.026 - k * 0.004, { sides: 5, seed: 120 + i * 5 + k }), scales, sg).rotation.x = Math.PI; segs.push(sg); p = sg; }
    const sh = piv(p, 0, 0.1, 0); mesh(S.slab(0.06, 0.04, 0.08, { seed: 170 + i, taper: 0.4 }), scales, sh, 0, 0.02, 0.02); mesh(S.gem(0.01, 0, 9), glow(0xffe040, 2), sh, 0.022, 0.04, 0.04); mesh(S.gem(0.01, 0, 9), glow(0xffe040, 2), sh, -0.022, 0.04, 0.04);
    snakes.push({ segs, ph: i * 0.9 });
  }
  const arms = [];
  for (const s of [-1, 1]) { const sh = piv(torso, s * 0.24, 0.66, 0); mesh(S.limb(0.3, 0.06, 0.045, { sides: 6, seed: 180 + s }), skin, sh); const el = piv(sh, 0, -0.3, 0); mesh(S.limb(0.28, 0.045, 0.035, { sides: 6, seed: 182 + s }), skin, el); mesh(S.facet(new THREE.TorusGeometry(0.05, 0.012, 3, 7)), gold, el, 0, -0.2, 0).rotation.x = Math.PI / 2; mesh(S.blob(0.04, 0.05, 0.03, { detail: 0, seed: 184 }), skin, el, 0, -0.3, 0); sh.rotation.z = s * 0.4; el.rotation.x = -0.5; arms.push({ sh, el, s }); }
  const R_ = rig(root, 2.3);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    tail.forEach((sg, i) => { if (i > 0) sg.rotation.z = 0.52 + i * 0.03 + Math.sin(t * 1.4 - i * 0.6) * 0.12; });
    body.position.y = 0.62 + Math.sin(t * 1.4) * 0.04 + st.lift.value * 0.06; body.rotation.z = Math.sin(t * 0.9) * 0.08; body.rotation.x = -0.05 + st.lunge.value * 0.08 - st.hit.value * 0.05;
    head.rotation.y = Math.sin(t * 0.5) * 0.25; head.rotation.x = st.mode === 'cast' ? 0.25 : Math.sin(t * 1.2) * 0.05;
    snakes.forEach((sn) => sn.segs.forEach((sg, k) => { sg.rotation.z = Math.sin(t * 3 + sn.ph + k * 0.8) * 0.35; sg.rotation.x = Math.cos(t * 2.3 + sn.ph + k) * 0.25; }));
    const g = st.mode === 'cast' ? 6 : 2 + Math.sin(t * 2) * 0.4; eyes.forEach((e) => e.material.color.setRGB(0.49 * g, 1 * g, 0.54 * g));
    arms[0].sh.rotation.x = -0.4 + Math.sin(t) * 0.1; arms[1].sh.rotation.x = st.mode === 'attack' ? -1.6 : -0.9 + Math.sin(t * 0.8) * 0.15;
  };
  R_.head = head; return R_;
}

// ------------------------------------------------------------------ Kobalos
function kobalos() {
  const root = new THREE.Group(); const body = piv(root, 0, 0.62, 0);
  const skin = F({ color: 0x7a8a4a, roughness: 0.6 }); const rag = F({ map: TEX.cloth('rag', ['#3a2a1a', '#5a4024', '#7a5a34', '#9a7a4a'], { seed: 4 }), roughness: 0.95, side: THREE.DoubleSide });
  mesh(S.blob(0.22, 0.26, 0.2, { detail: 1, seed: 200 }), skin, body, 0, 0.1, 0);
  mesh(S.facet(new THREE.CylinderGeometry(0.22, 0.3, 0.32, 7, 1, true)), rag, body, 0, -0.02, 0);
  const head = piv(body, 0, 0.42, 0.04);
  mesh(S.blob(0.26, 0.22, 0.22, { detail: 1, seed: 201 }), skin, head);
  mesh(S.horn([[0, 0.02, 0.18], [0, -0.04, 0.32], [0, -0.1, 0.36]], 0.06, 0.02, { sides: 5, segs: 4, seed: 202 }), skin, head);
  for (const s of [-1, 1]) { const ear = mesh(S.horn([[s * 0.2, 0.06, 0], [s * 0.42, 0.18, -0.04], [s * 0.58, 0.32, -0.1]], 0.07, 0.006, { sides: 4, segs: 4, seed: 203 + s }), skin, head); mesh(S.gem(0.04, 0, 205), glow(0xffd040, 2.4), head, s * 0.09, 0.07, 0.17).scale.set(1.2, 0.8, 0.5); }
  mesh(S.slab(0.24, 0.07, 0.05, { seed: 207, taper: 0.4 }), F({ color: 0x2a0f12 }), head, 0, -0.1, 0.16);
  for (let i = 0; i < 6; i++) mesh(S.facet(new THREE.ConeGeometry(0.014, 0.04, 3)), MATS.bone(), head, -0.09 + i * 0.036, -0.08, 0.18).rotation.x = Math.PI;
  const sack = piv(body, 0, 0.2, -0.24); mesh(S.blob(0.2, 0.22, 0.17, { detail: 1, seed: 210 }), F({ color: 0x8a6a40, roughness: 1 }), sack); mesh(S.gem(0.04, 0, 211), MATS.gold(), sack, 0.08, 0.18, 0.05);
  const limbs = [];
  for (const s of [-1, 1]) { const a = piv(body, s * 0.2, 0.2, 0); mesh(S.limb(0.36, 0.045, 0.03, { sides: 5, seed: 212 + s }), skin, a); a.rotation.z = s * 0.5; const l = piv(body, s * 0.11, -0.15, 0); mesh(S.limb(0.32, 0.05, 0.035, { sides: 5, seed: 214 + s }), skin, l); mesh(S.slab(0.08, 0.04, 0.14, { seed: 216 }), skin, l, 0, -0.32, 0.04); limbs.push({ a, l, s }); }
  const R_ = rig(root, 1.15);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    const hop = Math.abs(Math.sin(t * 4.2)) * 0.08; body.position.y = 0.62 + hop + st.lift.value * 0.1; body.position.x = st.lunge.value * 0.2 - st.hit.value * 0.08;
    head.rotation.z = Math.sin(t * 6) * 0.06 + (st.talk > 0 ? Math.sin(t * 20) * 0.1 : 0); head.rotation.y = Math.sin(t * 0.7) * 0.3;
    limbs.forEach((L) => { L.a.rotation.x = Math.sin(t * 4.2 + L.s) * 0.5 - (st.mode === 'attack' ? 1.2 : 0); L.l.rotation.x = Math.sin(t * 4.2 + L.s * 2) * 0.25; });
    sack.rotation.x = Math.sin(t * 4.2) * 0.1;
  };
  R_.head = head; R_.sack = sack; return R_;
}

// ------------------------------------------------------------------ Minotaur
function minotaur() {
  const root = new THREE.Group(); const body = piv(root, 0, 1.25, 0);
  const fur = F({ map: TEX.fur('mino', R.fur, { seed: 11, len: 5 }), roughness: 0.95 }); const furD = F({ map: TEX.fur('minod', ['#120804', '#1c0f08', '#2f1a0e', '#3e2414'], { seed: 12 }), roughness: 1 });
  const leather = MATS.leather(); const bronze = MATS.bronze(); const bone = MATS.bone();
  const legs = [];
  for (const s of [-1, 1]) { const hip = piv(body, s * 0.22, 0, 0); mesh(S.limb(0.55, 0.17, 0.11, { sides: 7, seed: 300 + s, bulge: 0.3 }), fur, hip); hip.rotation.x = -0.2; const kn = piv(hip, 0, -0.55, 0); kn.rotation.x = 0.45; mesh(S.limb(0.5, 0.1, 0.06, { sides: 6, seed: 302 + s, bulge: 0.25 }), furD, kn); const an = piv(kn, 0, -0.5, 0); an.rotation.x = -0.25; mesh(S.slab(0.16, 0.12, 0.2, { seed: 304 + s, taper: 0.3 }), MATS.dark(), an, 0, -0.06, 0.03); legs.push({ hip, kn, s }); }
  const torso = piv(body, 0, 0.08, 0);
  mesh(S.turn([[0.001, 0], [0.34, 0.02], [0.36, 0.25], [0.44, 0.55], [0.5, 0.78], [0.3, 0.95], [0.001, 0.97]], { sides: 9, seed: 310, amt: 0.05 }), fur, torso).scale.set(1, 1, 0.78);
  for (const s of [-1, 1]) mesh(S.blob(0.2, 0.15, 0.1, { detail: 1, seed: 311 + s }), fur, torso, s * 0.17, 0.66, 0.26);
  mesh(S.slab(0.7, 0.12, 0.48, { seed: 313 }), leather, torso, 0, 0.04, 0); for (let i = 0; i < 5; i++) mesh(S.slab(0.12, 0.32, 0.03, { seed: 314 + i, taper: -0.3 }), leather, torso, -0.26 + i * 0.13, -0.14, 0.24);
  mesh(S.slab(0.16, 0.12, 0.03, { seed: 320 }), bronze, torso, 0, 0.04, 0.25);
  const head = piv(torso, 0, 1.0, 0.12);
  mesh(S.blob(0.26, 0.24, 0.3, { detail: 1, seed: 321 }), furD, head);
  const snout = mesh(S.slab(0.26, 0.2, 0.28, { seed: 322, taper: 0.2 }), F({ color: 0x3a2418, roughness: 0.7 }), head, 0, -0.08, 0.28);
  for (const s of [-1, 1]) mesh(S.gem(0.025, 0, 323), MATS.dark(), head, s * 0.06, -0.1, 0.43);
  mesh(S.facet(new THREE.TorusGeometry(0.06, 0.014, 3, 8)), MATS.gold(), head, 0, -0.17, 0.42);
  const eyes = []; for (const s of [-1, 1]) eyes.push(mesh(S.gem(0.03, 0, 324), glow(0xff3020, 2.2), head, s * 0.15, 0.06, 0.2));
  for (const s of [-1, 1]) { mesh(S.horn([[s * 0.18, 0.14, 0], [s * 0.42, 0.22, 0.05], [s * 0.58, 0.42, 0.14], [s * 0.55, 0.62, 0.26]], 0.07, 0.008, { sides: 5, segs: 8, seed: 325 + s }), bone, head); const ear = mesh(S.slab(0.16, 0.06, 0.04, { seed: 327, taper: 0.6 }), furD, head, s * 0.27, 0.04, -0.04); ear.rotation.z = s * -0.4; }
  for (let i = 0; i < 9; i++) mesh(S.horn([[(i - 4) * 0.05, 0.2, -0.1], [(i - 4) * 0.06, 0.18, -0.3], [(i - 4) * 0.07, 0.0, -0.4]], 0.05, 0.005, { sides: 4, segs: 3, seed: 330 + i }), furD, head);
  const arms = [];
  for (const s of [-1, 1]) { const sh = piv(torso, s * 0.52, 0.8, 0); mesh(S.blob(0.2, 0.18, 0.18, { detail: 1, seed: 340 + s }), fur, sh); mesh(S.limb(0.5, 0.15, 0.11, { sides: 7, seed: 342 + s, bulge: 0.35 }), fur, sh); const el = piv(sh, 0, -0.5, 0); mesh(S.limb(0.45, 0.11, 0.08, { sides: 6, seed: 344 + s, bulge: 0.3, bulgeAt: 0.25 }), furD, el); mesh(S.facet(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 7)), bronze, el, 0, -0.3, 0); const hand = piv(el, 0, -0.48, 0); mesh(S.blob(0.1, 0.11, 0.09, { detail: 0, seed: 346 }), furD, hand); sh.rotation.z = s * 0.2; el.rotation.x = -0.3; arms.push({ sh, el, hand, s }); }
  // labrys: double-headed axe
  const axe = piv(arms[1].hand, 0, 0, 0.05); axe.rotation.x = Math.PI / 2;
  mesh(S.limb(1.6, 0.035, 0.03, { sides: 5, seed: 350 }), MATS.leather(), axe, 0, 0.6, 0);
  const blade = new THREE.Shape(); blade.moveTo(0, -0.18); blade.lineTo(0.18, -0.3); blade.quadraticCurveTo(0.42, 0, 0.18, 0.3); blade.lineTo(0, 0.18); blade.closePath();
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 4 });
  for (const s of [-1, 1]) { const b = mesh(S.facet(bg.clone()), bronze, axe, 0, 0.5, 0); b.rotation.y = s > 0 ? 0 : Math.PI; }
  const R_ = rig(root, 3.0);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    const breath = Math.sin(t * 1.8) * 0.03; torso.scale.set(1 + breath, 1, 1 + breath); body.position.y = 1.25 + breath * 0.5;
    const charge = st.mode === 'attack' ? Math.max(0, 1 - st.modeT * 0.8) : 0;
    body.rotation.x = 0.1 + charge * 0.5 + st.lunge.value * 0.05 - st.hit.value * 0.04; body.position.x = st.lunge.value * 0.25 - st.hit.value * 0.06;
    head.rotation.x = -0.1 + (st.mode === 'cast' ? Math.sin(st.modeT * 18) * 0.25 : Math.sin(t * 1.8) * 0.05); head.rotation.y = Math.sin(t * 0.6) * 0.15;
    arms[1].sh.rotation.x = st.mode === 'attack' ? -2.4 + st.modeT * 3 : -0.3 + Math.sin(t * 1.2) * 0.1; arms[0].sh.rotation.x = -0.2 + Math.sin(t * 1.2 + 1) * 0.1;
    for (const l of legs) l.hip.rotation.x = -0.2 + (st.mode === 'cast' && l.s > 0 ? Math.sin(st.modeT * 14) * 0.3 : 0);
    eyes.forEach((e) => e.material.color.setRGB(2.2 + charge * 3, 0.4, 0.3));
  };
  R_.head = head; return R_;
}

// ------------------------------------------------------------------ Hydra body + heads
function hydra() {
  const root = new THREE.Group(); const sc = F({ map: TEX.scales('hydra', R.swamp, { size: 6 }), roughness: 0.5 }); const belly = F({ color: 0x9cb87a, roughness: 0.6 });
  const body = piv(root, 0, 0.75, -0.3);
  mesh(S.blob(0.95, 0.62, 0.75, { detail: 2, seed: 400, amt: 0.1 }), sc, body);
  mesh(S.blob(0.7, 0.4, 0.5, { detail: 1, seed: 401 }), belly, body, 0, -0.25, 0.25);
  for (let i = 0; i < 7; i++) mesh(S.horn([[-0.6 + i * 0.2, 0.5, -0.1], [-0.6 + i * 0.2, 0.75, -0.25], [-0.62 + i * 0.2, 0.85, -0.45]], 0.07, 0.005, { sides: 3, segs: 3, seed: 402 + i }), F({ color: 0x8a2a3a, roughness: 0.6 }), body);
  const legs = []; for (const [x, z] of [[-0.6, 0.35], [0.6, 0.35], [-0.55, -0.4], [0.55, -0.4]]) { const l = piv(body, x, -0.35, z); mesh(S.limb(0.45, 0.16, 0.1, { sides: 6, seed: 410 + legs.length, bulge: 0.3 }), sc, l); mesh(S.slab(0.2, 0.08, 0.24, { seed: 414 }), sc, l, 0, -0.45, 0.06); legs.push(l); }
  const tail = []; let p = piv(body, 0, -0.1, -0.7); for (let i = 0; i < 6; i++) { const sg = piv(p, 0, 0, i ? -0.32 : 0); mesh(S.limb(0.36, 0.24 * (1 - i / 7), 0.24 * (1 - (i + 1) / 7) + 0.02, { sides: 6, seed: 420 + i }), sc, sg).rotation.x = Math.PI / 2; tail.push(sg); p = sg; }
  const anchors = [new THREE.Vector3(-0.45, 0.4, 0.45), new THREE.Vector3(0, 0.5, 0.55), new THREE.Vector3(0.45, 0.4, 0.45), new THREE.Vector3(-0.25, 0.55, 0.3), new THREE.Vector3(0.25, 0.55, 0.3), new THREE.Vector3(-0.6, 0.3, 0.3), new THREE.Vector3(0.6, 0.3, 0.3)];
  const R_ = rig(root, 2.2);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    body.position.y = 0.75 + Math.sin(t * 1.5) * 0.04; body.scale.set(1 + Math.sin(t * 1.5) * 0.02, 1, 1); body.rotation.y = Math.sin(t * 0.4) * 0.08 - st.hit.value * 0.03;
    tail.forEach((sg, i) => { sg.rotation.y = Math.sin(t * 1.2 - i * 0.5) * 0.2; });
  };
  R_.anchor = (i, out = new THREE.Vector3()) => { body.updateMatrixWorld(true); return out.copy(anchors[i % anchors.length]).applyMatrix4(body.matrixWorld); };
  R_.head = body; return R_;
}
function hydraHead(seed = 1) {
  const root = new THREE.Group(); const sc = F({ map: TEX.scales('hydra', R.swamp, { size: 6 }), roughness: 0.5 });
  const head = piv(root, 0, 0, 0);
  mesh(S.slab(0.32, 0.22, 0.42, { seed: 450 + seed, taper: 0.3, jitter: 0.12 }), sc, head);
  const jaw = piv(head, 0, -0.08, 0.05); mesh(S.slab(0.26, 0.08, 0.38, { seed: 452 + seed, taper: 0.2 }), sc, jaw, 0, -0.03, 0.1);
  for (let i = 0; i < 5; i++) { mesh(S.facet(new THREE.ConeGeometry(0.018, 0.06, 3)), MATS.bone(), head, -0.1 + i * 0.05, -0.12, 0.18).rotation.x = Math.PI; mesh(S.facet(new THREE.ConeGeometry(0.016, 0.05, 3)), MATS.bone(), jaw, -0.08 + i * 0.04, 0.03, 0.24); }
  const eyes = []; for (const s of [-1, 1]) eyes.push(mesh(S.gem(0.03, 0, 456), glow(0xd4ff40, 2.3), head, s * 0.13, 0.06, 0.1));
  for (let i = 0; i < 4; i++) mesh(S.horn([[(i - 1.5) * 0.06, 0.1, -0.1], [(i - 1.5) * 0.1, 0.25, -0.22], [(i - 1.5) * 0.12, 0.3, -0.36]], 0.04, 0.004, { sides: 3, segs: 3, seed: 460 + i }), F({ color: 0x8a2a3a }), head);
  // neck segments positioned each frame along a curve from the body anchor to this head
  const neckSegs = []; const neckGroup = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = mesh(S.blob(0.13 - i * 0.008, 0.13 - i * 0.008, 0.16, { detail: 0, seed: 470 + i }), sc, neckGroup); neckSegs.push(m); }
  const R_ = rig(root, 0.6); R_.neckGroup = neckGroup; R_.anchorPos = null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t + seed, st = R_.st;
    head.position.set(Math.sin(t * 1.3) * 0.08 + st.lunge.value * 0.05, Math.sin(t * 1.7) * 0.1 + st.lift.value * 0.05, st.lunge.value * 0.2 - st.hit.value * 0.1);
    head.rotation.set(Math.sin(t * 1.1) * 0.15 - st.hit.value * 0.05, Math.sin(t * 0.7) * 0.25, Math.sin(t * 0.9) * 0.1);
    jaw.rotation.x = st.mode === 'attack' ? Math.max(0, Math.sin(st.modeT * 10)) * 0.6 : 0.12 + Math.sin(t * 2.3) * 0.08 + (st.talk > 0 ? Math.abs(Math.sin(t * 18)) * 0.3 : 0);
    neckGroup.visible = !!R_.anchorPos && st.dead < 0.5;
    if (R_.anchorPos) {
      root.updateMatrixWorld(true); head.getWorldPosition(tmpB); tmpA.copy(R_.anchorPos);
      tmpC.copy(tmpA).lerp(tmpB, 0.5); tmpC.y += 0.35;
      const curve = new THREE.QuadraticBezierCurve3(tmpA, tmpC, tmpB); const inv = neckGroup.parent ? neckGroup.parent.matrixWorld.clone().invert() : null;
      neckSegs.forEach((m, i) => { const p = curve.getPoint(i / 7); if (inv) p.applyMatrix4(inv); m.position.copy(p); const q = curve.getPoint(Math.min(1, i / 7 + 0.05)); if (inv) q.applyMatrix4(inv); m.lookAt(q); });
    }
  };
  R_.head = head; return R_;
}

const BUILDERS = { satyr, medusa, kobalos, minotaur, minotaur_king: minotaur, hydra, hydra_elder: hydra, hydra_head: hydraHead };
export function createCreature(id, seed = 1) {
  const api = (BUILDERS[id] || satyr)(seed);
  api.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  api.update(0.016); return api;
}
