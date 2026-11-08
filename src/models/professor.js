// Sir Isaac Plumb: a wooden marionette (hinged jaw, monocle, wild white hair, plum frock coat)
// hung from a floating control cross held by his own glowing ghost. Everything is procedural.
import * as THREE from 'three';
import { MAT } from './props3d.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';
import * as S from './sculpt.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

export function createProfessor() {
  const root = new THREE.Group(); root.name = 'professor';
  const F = (o) => std({ flatShading: true, ...o });
  const wood = F({ map: TEX.wood('marionette', R.oak, { seed: 4, rings: 7 }), roughness: 0.55 });
  const woodFace = F({ map: TEX.wood('face', ['#6e4024', '#a8713a', '#c99254', '#dcae74', '#ecc490', '#f7dcb5'], { seed: 9, rings: 5, knots: 0 }), roughness: 0.5 });
  const coat = F({ map: TEX.cloth('coat', ['#1a0f2a', '#2a1840', '#3e2459', '#553276', '#6b4c9a'], { trim: { ramp: R.gold, size: 3 } }), roughness: 0.8, side: THREE.DoubleSide });
  const vest = F({ map: TEX.cloth('vest', R.mustard, { stripes: { size: 3, ramp: R.gold } }), roughness: 0.7 });
  const lace = F({ color: 0xf6f0e2, roughness: 0.9, side: THREE.DoubleSide });
  const brass = F({ color: 0xd9a64a, metalness: 0.85, roughness: 0.32 }); const dark = F({ color: 0x1a1220, roughness: 0.6 });
  const stock = F({ map: TEX.cloth('stock', R.cream, { weave: true }), roughness: 0.9 });
  const shoe = F({ color: 0x2a1a18, roughness: 0.35, metalness: 0.1 });

  const body = pivot(root, 0, 1.0, 0); // pelvis
  mesh(S.slab(0.46, 0.22, 0.3, { seed: 11, taper: 0.15 }), coat, body);
  const torso = pivot(body, 0, 0.1, 0);
  // waistcoat chest: barrel-shaped, slightly hunched
  const chest = mesh(S.turn([[0.001, 0], [0.22, 0.02], [0.25, 0.2], [0.27, 0.42], [0.22, 0.6], [0.001, 0.62]], { sides: 7, seed: 12, amt: 0.03 }), vest, torso, 0, 0, 0.02); chest.scale.set(1, 1, 0.82);
  // frock coat shell, open at the front
  const coatG = new THREE.CylinderGeometry(0.3, 0.27, 0.62, 8, 2, true, 0.75, Math.PI * 2 - 1.5); S.warp(coatG, { amt: 0.025, seed: 13 }); mesh(S.facet(coatG), coat, torso, 0, 0.31, 0).scale.set(1, 1, 0.86);
  for (let i = 0; i < 4; i++) mesh(S.gem(0.026, 0, 20 + i), brass, torso, 0.0, 0.48 - i * 0.12, 0.22);
  for (const s of [-1, 1]) { const l = mesh(S.slab(0.11, 0.38, 0.035, { seed: 14 + s, taper: 0.4 }), coat, torso, s * 0.13, 0.42, 0.21); l.rotation.set(-0.15, 0, s * 0.35); }
  const colG = new THREE.CylinderGeometry(0.2, 0.28, 0.17, 8, 1, true); S.warp(colG, { amt: 0.02, seed: 15 }); mesh(S.facet(colG), coat, torso, 0, 0.66, -0.02);
  for (let i = 0; i < 4; i++) { const j = mesh(S.facet(new THREE.ConeGeometry(0.075 + i * 0.012, 0.085, 6, 1, true)), lace, torso, 0, 0.6 - i * 0.055, 0.22); j.rotation.x = -0.25; j.rotation.y = i * 0.4; }
  const tails = [];
  for (const s of [-1, 1]) { const t = pivot(body, s * 0.13, 0.02, -0.1); const m = mesh(S.slab(0.24, 0.62, 0.04, { seed: 16 + s, taper: -0.3 }), coat, t, 0, -0.3, 0); m.rotation.z = s * 0.06; tails.push(t); }
  // neck + carved head: lathe skull with a proud nose, brow ridge, cheekbones and a hinged jaw
  const neck = pivot(torso, 0, 0.66, 0); mesh(S.limb(0.16, 0.065, 0.055, { sides: 6, seed: 17 }), wood, neck, 0, 0.14, 0);
  const head = pivot(neck, 0, 0.14, 0);
  const skull = mesh(S.turn([[0.001, -0.01], [0.12, 0.0], [0.18, 0.07], [0.205, 0.17], [0.2, 0.28], [0.17, 0.36], [0.09, 0.415], [0.001, 0.425]], { sides: 9, seed: 18, amt: 0.05 }), woodFace, head, 0, 0.04, 0); skull.scale.set(0.95, 1, 1.08);
  const brow = mesh(S.slab(0.3, 0.05, 0.08, { seed: 19, taper: 0.2 }), woodFace, head, 0, 0.31, 0.15); brow.rotation.x = 0.2;
  const nose = mesh(S.horn([[0, 0.29, 0.17], [0, 0.22, 0.25], [0, 0.15, 0.3], [0, 0.13, 0.31]], 0.05, 0.022, { sides: 4, segs: 4, seed: 20 }), woodFace, head);
  const cheekMat = F({ color: 0xd8826a, roughness: 0.6 });
  for (const s of [-1, 1]) { mesh(S.blob(0.05, 0.035, 0.03, { detail: 0, seed: 21 + s }), cheekMat, head, s * 0.13, 0.15, 0.15); mesh(S.blob(0.045, 0.06, 0.05, { detail: 0, seed: 23 + s }), woodFace, head, s * 0.19, 0.22, 0.02); }
  const eyes = []; const lids = []; const brows = [];
  for (const s of [-1, 1]) {
    const e = pivot(head, s * 0.085, 0.26, 0.165);
    mesh(S.blob(0.046, 0.042, 0.04, { detail: 1, amt: 0.03, seed: 25 + s }), F({ color: 0xfbf4de, roughness: 0.25 }), e);
    const iris = mesh(S.gem(0.024, 0, 27 + s), F({ color: 0x2d6e6a, roughness: 0.2 }), e, 0, 0, 0.032);
    mesh(S.gem(0.012, 0, 29), dark, iris, 0, 0, 0.016); eyes.push(iris);
    const lid = pivot(e, 0, 0, 0); const lg = new THREE.SphereGeometry(0.05, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5); const lm = mesh(S.facet(lg), woodFace, lid); lm.rotation.x = -0.2; lids.push(lid);
    const b = pivot(head, s * 0.09, 0.335, 0.185); mesh(S.slab(0.11, 0.028, 0.035, { seed: 30 + s, taper: 0.5 }), F({ color: 0xeeeef4, roughness: 0.9 }), b).rotation.z = s * 0.15; brows.push(b);
  }
  const monoG = new THREE.TorusGeometry(0.055, 0.009, 4, 10); const mono = mesh(S.facet(monoG), brass, head, 0.085, 0.26, 0.215);
  mesh(new THREE.CircleGeometry(0.052, 10), MAT.glass(), mono);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.13, 0.23, 0.21), new THREE.Vector3(0.2, 0.05, 0.18), new THREE.Vector3(0.18, -0.25, 0.26)]), 8, 0.005, 3), brass); head.add(chain);
  const jaw = pivot(head, 0, 0.1, 0.02);
  mesh(S.slab(0.23, 0.1, 0.21, { seed: 32, taper: 0.35 }), woodFace, jaw, 0, -0.045, 0.06);
  mesh(S.slab(0.13, 0.014, 0.02, { seed: 33 }), F({ color: 0x5a1a22 }), jaw, 0, 0.0, 0.16);
  for (const s of [-1, 1]) mesh(S.gem(0.015, 0, 34), brass, jaw, s * 0.118, 0, 0);
  // wild white hair: faceted curved tufts swept back and up
  const hairMat = F({ color: 0xf2f2f8, roughness: 0.85 }); const hairShade = F({ color: 0xbcbcd6, roughness: 0.9 });
  const rnd = mulberry32(17); const hair = pivot(head, 0, 0.3, -0.02); const tufts = [];
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2; const up = rnd(); if (Math.sin(a) > 0.5 && up < 0.65) continue;
    const r = 0.16 + rnd() * 0.06; const bx = Math.cos(a) * r, bz = Math.sin(a) * r * 0.9 - 0.02, by = (up - 0.35) * 0.22;
    const len = 0.16 + rnd() * 0.24; const dir = new THREE.Vector3(bx * 2.2, 0.35 + up * 0.5, bz * 2.2 - 0.12).normalize();
    const mid = new THREE.Vector3(bx, by, bz).addScaledVector(dir, len * 0.5).add(new THREE.Vector3((rnd() - 0.5) * 0.08, 0.04, (rnd() - 0.5) * 0.08));
    const tip = new THREE.Vector3(bx, by, bz).addScaledVector(dir, len).add(new THREE.Vector3((rnd() - 0.5) * 0.12, -0.03 + rnd() * 0.06, -0.06));
    tufts.push(mesh(S.horn([[bx, by, bz], mid, tip], 0.045 + rnd() * 0.03, 0.004, { sides: 4, segs: 4, seed: 40 + i }), rnd() < 0.3 ? hairShade : hairMat, hair));
  }
  const gog = pivot(head, 0, 0.38, 0.1); gog.rotation.x = -0.5;
  for (const s of [-1, 1]) { const ring = mesh(S.facet(new THREE.CylinderGeometry(0.045, 0.052, 0.05, 7)), brass, gog, s * 0.06, 0, 0); ring.rotation.x = Math.PI / 2; mesh(new THREE.CircleGeometry(0.038, 7), F({ color: 0x8fe3ff, emissive: 0x2a6a8a, emissiveIntensity: 0.6, roughness: 0.1 }), ring, 0, 0.026, 0).rotation.x = -Math.PI / 2; }
  mesh(S.facet(new THREE.TorusGeometry(0.21, 0.012, 3, 10, Math.PI)), dark, gog, 0, 0, -0.08).rotation.x = Math.PI / 2;
  // arms: faceted sleeves over carved forearms, brass-pinned joints, lace cuffs, jointed hands
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, s * 0.3, 0.55, 0); mesh(S.blob(0.085, 0.075, 0.08, { detail: 0, seed: 50 + s }), coat, sh);
    mesh(S.limb(0.36, 0.075, 0.062, { sides: 6, seed: 52 + s, bulge: 0.12 }), coat, sh, 0, -0.02, 0);
    const el = pivot(sh, 0, -0.38, 0); mesh(S.gem(0.05, 0, 54 + s), wood, el); mesh(S.limb(0.31, 0.048, 0.036, { sides: 6, seed: 56 + s, bulge: 0.25, bulgeAt: 0.25 }), wood, el);
    mesh(S.facet(new THREE.ConeGeometry(0.08, 0.085, 7, 1, true)), lace, el, 0, -0.28, 0).rotation.x = Math.PI;
    const wr = pivot(el, 0, -0.33, 0); mesh(S.gem(0.035, 0, 58), brass, wr);
    const hand = pivot(wr, 0, -0.07, 0); mesh(S.slab(0.09, 0.11, 0.05, { seed: 59 + s, taper: 0.15 }), wood, hand, 0, -0.03, 0);
    for (let f = 0; f < 4; f++) mesh(S.slab(0.019, 0.072, 0.022, { seed: 61 + f }), wood, hand, -0.03 + f * 0.02, -0.11, 0.005).rotation.x = 0.15 + f * 0.05;
    mesh(S.slab(0.021, 0.06, 0.021, { seed: 66 }), wood, hand, s * -0.05, -0.05, 0.02).rotation.z = s * 0.5;
    sh.rotation.z = s * 0.12; arms.push({ sh, el, wr, hand, s });
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = pivot(body, s * 0.12, -0.08, 0); mesh(S.blob(0.075, 0.07, 0.075, { detail: 0, seed: 70 + s }), coat, hip);
    mesh(S.limb(0.38, 0.09, 0.07, { sides: 6, seed: 72 + s, bulge: 0.2 }), coat, hip, 0, -0.01, 0);
    const kn = pivot(hip, 0, -0.4, 0); mesh(S.gem(0.056, 0, 74 + s), wood, kn);
    mesh(S.limb(0.38, 0.06, 0.042, { sides: 6, seed: 76 + s, bulge: 0.35, bulgeAt: 0.3 }), stock, kn);
    const an = pivot(kn, 0, -0.4, 0); mesh(S.gem(0.04, 0, 78), wood, an);
    mesh(S.slab(0.12, 0.075, 0.26, { seed: 79 + s, taper: 0.2 }), shoe, an, 0, -0.05, 0.05);
    mesh(S.slab(0.065, 0.042, 0.014, { seed: 81 }), brass, an, 0, -0.03, 0.18);
    legs.push({ hip, kn, an, s });
  }
  // ---------------- control cross, strings and the ghost ----------------
  const ctrl = new THREE.Group(); ctrl.position.set(0, 3.55, 0); root.add(ctrl);
  const cross = new THREE.Group(); ctrl.add(cross);
  const dw = F({ map: TEX.wood('cross', R.wood, { seed: 21 }), roughness: 0.7 });
  mesh(S.slab(1.0, 0.075, 0.075, { seed: 90, jitter: 0.12 }), dw, cross); mesh(S.slab(0.075, 0.075, 0.62, { seed: 91, jitter: 0.12 }), dw, cross);
  for (const [x, z] of [[-0.5, 0], [0.5, 0], [0, 0.3], [0, -0.3]]) mesh(S.gem(0.04, 0, 92), brass, cross, x, 0, z);
  const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7cff).multiplyScalar(1.4), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ghost = new THREE.Group(); ghost.position.set(0, 0.55, -0.15); ctrl.add(ghost);
  const gHead = mesh(S.blob(0.24, 0.27, 0.25, { detail: 1, seed: 93 }), ghostMat, ghost, 0, 0.5, 0); gHead.castShadow = false;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const t = mesh(S.horn([[0, 0, 0], [Math.cos(a) * 0.15, 0.12, Math.sin(a) * 0.1], [Math.cos(a) * 0.3, 0.2 + Math.sin(i * 2) * 0.06, Math.sin(a) * 0.2]], 0.07, 0.004, { sides: 4, segs: 3, seed: 94 + i }), ghostMat, gHead, Math.cos(a) * 0.15, 0.12, Math.sin(a) * 0.12); t.castShadow = false; }
  const gBody = mesh(S.facet(new THREE.CylinderGeometry(0.34, 0.1, 0.8, 7, 1, true)), ghostMat, ghost, 0, 0.0, 0); gBody.castShadow = false;
  const gArms = [];
  for (const s of [-1, 1]) { const a = pivot(ghost, s * 0.3, 0.25, 0); const m = mesh(S.limb(0.62, 0.065, 0.04, { sides: 5, seed: 110 + s }), ghostMat, a); m.castShadow = false; a.rotation.z = s * 0.6; gArms.push(a); }
  for (const s of [-1, 1]) { const e = mesh(S.gem(0.035, 0, 112), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8fbff).multiplyScalar(3) }), gHead, s * 0.08, 0.02, 0.23); e.castShadow = false; }
  const strPos = new Float32Array(6 * 3 * 2); const strGeo = new THREE.BufferGeometry(); strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  strings.frustumCulled = false; root.add(strings);
  const anchors = [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, 0.3], [0, 0, -0.3], [-0.25, 0, 0], [0.25, 0, 0]].map((p) => new THREE.Vector3(...p));
  const attach = () => [arms[0].wr, arms[1].wr, head, torso, legs[0].kn, legs[1].kn];

  // ---------------- expression + animation state ----------------
  const st = {
    t: 0, mode: 'idle', modeT: 0, talk: 0, look: new THREE.Vector2(), expr: 'smug',
    bar: { x: new Spring(0, 7, 0.45), y: new Spring(0, 7, 0.45), tilt: new Spring(0, 9, 0.4), roll: new Spring(0, 9, 0.4) },
    armL: new Spring(0, 10, 0.35), armR: new Spring(0, 10, 0.35), elL: new Spring(0.3, 12, 0.4), elR: new Spring(0.3, 12, 0.4),
    slump: new Spring(0, 8, 0.5), squash: new Spring(1, 16, 0.3), jaw: new Spring(0, 30, 0.5), lean: new Spring(0, 8, 0.5), legK: new Spring(0, 10, 0.4),
  };
  const EXPR = {
    smug: { brow: [0.0, 0.25], lid: [0.35, 0.15] }, delight: { brow: [0.35, 0.35], lid: [-0.1, -0.1] }, annoyed: { brow: [-0.35, -0.3], lid: [0.45, 0.45] },
    hurt: { brow: [0.4, -0.4], lid: [0.6, 0.2] }, shock: { brow: [0.5, 0.5], lid: [-0.3, -0.3] }, think: { brow: [0.2, -0.15], lid: [0.25, 0.25] },
  };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost,
    handWorld(i = 1, out = new THREE.Vector3()) { return arms[i].hand.getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { return head.getWorldPosition(out); },
    setExpr(e) { st.expr = e; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); },
    lookAt(x, y) { st.look.set(x, y); },
    act(mode) { st.mode = mode; st.modeT = 0; if (mode === 'throw') { st.armR.kick(-14); st.bar.x.kick(4); st.lean.kick(3); st.squash.kick(-2); } if (mode === 'hurt') { st.slump.kick(6); st.bar.y.kick(-2); st.setExprHold = 0.8; st.expr = 'hurt'; } if (mode === 'cast') { st.armL.kick(-10); st.armR.kick(-10); st.bar.y.kick(3); } if (mode === 'cheer') { st.armL.kick(-16); st.armR.kick(-16); st.bar.y.kick(5); st.expr = 'delight'; } },
    update(dt) {
      st.t += dt; st.modeT += dt; const t = st.t;
      // idle hang: control bar bobs, rolls; the puppet dangles after it
      const bob = Math.sin(t * 1.6) * 0.06, sway = Math.sin(t * 0.9) * 0.08;
      st.bar.x.target = sway; st.bar.y.target = bob; st.bar.tilt.target = Math.sin(t * 1.3) * 0.08; st.bar.roll.target = Math.sin(t * 0.7) * 0.06;
      for (const k in st.bar) st.bar[k].update(dt);
      ctrl.position.set(st.bar.x.value * 0.6, 3.55 + st.bar.y.value, 0); cross.rotation.set(st.bar.tilt.value, 0, st.bar.roll.value);
      ghost.position.y = 0.55 + Math.sin(t * 2.1) * 0.05; ghost.rotation.y = Math.sin(t * 0.5) * 0.15;
      ghostMat.opacity = 0.18 + Math.sin(t * 3.3) * 0.04 + (st.mode === 'cast' ? 0.15 : 0);
      gArms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.6 + Math.sin(t * 1.6 + i) * 0.08) - st.bar.roll.value));
      // body follows bar with lag
      st.slump.target = 0; st.slump.update(dt); st.squash.update(dt); st.lean.update(dt); st.legK.update(dt);
      body.position.set(st.bar.x.value * 0.35, 1.0 + st.bar.y.value * 0.6 - st.slump.value * 0.05 + Math.sin(t * 3.2) * 0.012, 0);
      body.rotation.z = -st.bar.roll.value * 0.8 + Math.sin(t * 1.1) * 0.03; body.rotation.x = st.lean.value * 0.06 + st.slump.value * 0.04;
      torso.rotation.z = Math.sin(t * 1.1 + 0.5) * 0.04; torso.scale.y = st.squash.value;
      // arms: dangle with springs; mode overrides
      st.armL.target = -0.1 + Math.sin(t * 1.7) * 0.08; st.armR.target = -0.1 + Math.sin(t * 1.7 + 1) * 0.08; st.elL.target = 0.35; st.elR.target = 0.35;
      if (st.mode === 'talk' || st.talk > 0) { st.armR.target = -0.9 + Math.sin(t * 5) * 0.25; st.elR.target = 1.2; }
      for (const s of [st.armL, st.armR, st.elL, st.elR, st.jaw]) s.update(dt);
      arms[0].sh.rotation.x = st.armL.value; arms[1].sh.rotation.x = st.armR.value; arms[0].el.rotation.x = -st.elL.value; arms[1].el.rotation.x = -st.elR.value;
      arms[0].sh.rotation.z = -0.15 - st.slump.value * 0.05; arms[1].sh.rotation.z = 0.15 + st.slump.value * 0.05;
      for (const l of legs) { l.hip.rotation.x = Math.sin(t * 1.4 + l.s) * 0.06 - st.legK.value * 0.2; l.kn.rotation.x = 0.06 + Math.max(0, Math.sin(t * 1.4 + l.s)) * 0.08 + st.legK.value * 0.4; l.an.rotation.x = -0.05; }
      tails.forEach((tl, i) => { tl.rotation.x = 0.12 + Math.sin(t * 2 + i) * 0.06 + st.lean.value * 0.05; });
      // head + face
      head.rotation.y = st.look.x * 0.5 + Math.sin(t * 0.6) * 0.1; head.rotation.x = -st.look.y * 0.3 + Math.sin(t * 1.3) * 0.04 + st.slump.value * 0.08; head.rotation.z = Math.sin(t * 0.8) * 0.06;
      if (st.talk > 0) { st.talk -= dt; st.jaw.target = Math.abs(Math.sin(t * 17)) * 0.35; } else st.jaw.target = 0;
      jaw.rotation.x = st.jaw.value;
      const ex = EXPR[st.expr] || EXPR.smug; const blink = (t % 3.7) < 0.12 ? 1 : 0;
      brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * ex.brow[i] * 0.6; b.position.y = 0.33 + ex.brow[i] * 0.03; });
      lids.forEach((l, i) => { l.rotation.x = -1.2 + Math.max(blink * 1.2, ex.lid[i] * 1.0); });
      eyes.forEach((e) => { e.position.x = st.look.x * 0.012; e.position.y = st.look.y * 0.01; });
      hair.rotation.z = Math.sin(t * 2.3) * 0.04; hair.rotation.x = Math.sin(t * 1.9) * 0.03 - st.lean.value * 0.03;
      if (st.mode !== 'idle' && st.modeT > 1.2) { st.mode = 'idle'; if (st.expr === 'hurt' || st.expr === 'delight') st.expr = 'smug'; }
      // strings follow joints
      root.updateMatrixWorld(true);
      const at = attach(); const inv = root.matrixWorld.clone().invert();
      for (let i = 0; i < 6; i++) {
        tmp.copy(anchors[i]).applyMatrix4(cross.matrixWorld).applyMatrix4(inv);
        at[i].getWorldPosition(tmp2); tmp2.applyMatrix4(inv); if (i === 2) tmp2.y += 0.45;
        strPos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], i * 6);
      }
      strGeo.attributes.position.needsUpdate = true;
      strings.material.opacity = 0.7 + Math.sin(t * 7) * 0.12;
    },
  };
  root.userData.api = api;
  api.update(0.016);
  return api;
}
