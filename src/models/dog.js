// Halley, the old mop dog (a Komondor): a custom-rigged quadruped whose whole body is hung with hundreds of felted
// cords (tapered tubes, darker at the roots, sun-bleached at the tips) that swing with his motion; a fringe over the
// eyes, a black glossy nose, a pink tongue when he pants, a cord-tufted tail that wags. Procedural gait (diagonal
// pairs), sniffing, sitting, fetching (an object rides in his mouth) and being petted. Cel-shaded; ink from the engine.
import * as THREE from 'three';
import * as T from './toon.js';
import { turned } from '../ui3d/craft.js';
import { facet } from './libprops.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------------------------------------------------------------- felted cords
const ROOT = C('#a8956c'), MID = C('#e6dabd'), TIP = C('#f6efdc'), DIRT = C('#cdb88c');
function cords(list, seed = 1, { sides = 5, rings = 6 } = {}) { // list: [{ p, out, len, r }]
  const r = mulberry32(seed); const P = [], N = [], Cc = [], A = [], I = []; const c = new THREE.Color();
  for (const cd of list) {
    const pts = []; const out = cd.out.clone().normalize(); const curl = (r() - 0.5) * 0.5;
    for (let i = 0; i <= rings; i++) { const t = i / rings; const p = cd.p.clone().addScaledVector(out, Math.min(t, 0.25) * cd.len * 0.5); p.y -= Math.max(0, t - 0.12) * cd.len * (cd.hang ?? 1); p.x += Math.sin(t * 3 + curl * 6) * 0.012; p.z += Math.cos(t * 2.4 + curl * 5) * 0.012; pts.push(p); }
    const base = P.length / 3;
    for (let i = 0; i <= rings; i++) {
      const t = i / rings; const a = pts[Math.min(i + 1, rings)].clone().sub(pts[Math.max(i - 1, 0)]).normalize(); const n0 = V().crossVectors(a, Math.abs(a.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize(); const b0 = V().crossVectors(a, n0);
      const rad = cd.r * (1 - t * 0.55) * (t > 0.92 ? 0.7 : 1); c.copy(ROOT).lerp(MID, ease(t * 2.2)).lerp(t > 0.7 ? DIRT : TIP, ease((t - 0.45) * 2) * (cd.dirt ?? 0.5));
      for (let j = 0; j <= sides; j++) { const an = (j / sides) * Math.PI * 2; const nn = n0.clone().multiplyScalar(Math.cos(an)).addScaledVector(b0, Math.sin(an)); const q = pts[i].clone().addScaledVector(nn, rad); P.push(q.x, q.y, q.z); N.push(nn.x, nn.y, nn.z); Cc.push(c.r, c.g, c.b); A.push(t); }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) { const a = base + i * (sides + 1) + j, b = a + sides + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I); g.computeBoundingSphere(); return g;
}
// cords swing with the part they hang from: uSwing is that part's lagged motion in its own space
function cordMat() {
  const U = { uSwing: { value: V() }, uTime: T.WIND.time };
  const m = Object.assign(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: T.gradientMap([0.48, 0.76, 1.0]) }), { flatShading: true });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = 'uniform vec3 uSwing; uniform float uTime; attribute float aT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float k = aT * aT; transformed += uSwing * k + vec3(sin(uTime * 2.1 + position.x * 31.0 + position.z * 17.0), 0.0, cos(uTime * 1.7 + position.z * 23.0)) * 0.006 * k;'); };
  m.customProgramCacheKey = () => 'dogCords'; m.userData.U = U; return m;
}
const sphereDir = (r) => { let x, y, z, d; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; d = x * x + y * y + z * z; } while (d > 1 || d < 0.01); return V(x, y, z).multiplyScalar(1 / Math.sqrt(d)); };

export function createDog({ seed = 1687 } = {}) {
  const r = mulberry32(seed); const root = new THREE.Group(); root.name = 'dog'; root.userData.grassPush = true; root.userData.grassPushR = 0.7;
  const skin = Object.assign(new THREE.MeshToonMaterial({ color: '#cbb994', gradientMap: T.gradientMap([0.48, 0.76, 1.0]) }), { flatShading: true });
  const black = Object.assign(new THREE.MeshToonMaterial({ color: '#141010', gradientMap: T.gradientMap([0.3, 0.7, 1.0]) }), { flatShading: true });
  black.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += vec3(0.75) * step(0.9, dot(normal, normalize(vec3(-0.3, 0.8, 0.5))));\n#include <opaque_fragment>'); };
  const body = new THREE.Group(); body.position.y = 0.5; root.add(body);
  // torso: a long barrel under the coat
  const torso = new THREE.Mesh(turned([[0.001, -0.42], [0.14, -0.4], [0.21, -0.28], [0.23, 0.0], [0.22, 0.24], [0.17, 0.38], [0.001, 0.44]], 32), skin); torso.rotation.x = Math.PI / 2; body.add(torso);
  const tc = []; for (let i = 0; i < 300; i++) { const d = sphereDir(r); if (d.y < -0.35) continue; const p = V(d.x * 0.22, d.y * 0.2 + 0.02, d.z * 0.44); tc.push({ p, out: V(d.x, Math.max(0, d.y) * 0.4, d.z * 0.3), len: 0.36 + r() * 0.16 - Math.max(0, d.y) * 0.05 + (Math.abs(d.x) > 0.6 ? 0.06 : 0), r: 0.026 + r() * 0.01, dirt: 0.3 + r() * 0.5 }); }
  const torsoM = cordMat(); const torsoC = new THREE.Mesh(cords(tc, seed), torsoM); torsoC.castShadow = true; body.add(torsoC);
  // head on a neck pivot: skull, muzzle, a black nose, eyes under a fringe, ears of cords, a tongue
  const neck = new THREE.Group(); neck.position.set(0, 0.1, 0.42); body.add(neck); const head = new THREE.Group(); head.position.set(0, 0.12, 0.08); neck.add(head);
  const skull = new THREE.Mesh(turned([[0.001, -0.14], [0.11, -0.12], [0.15, -0.02], [0.14, 0.08], [0.09, 0.15], [0.001, 0.17]], 28), skin); skull.rotation.x = Math.PI / 2; head.add(skull);
  const muzzle = new THREE.Mesh(turned([[0.001, 0], [0.085, 0.02], [0.09, 0.1], [0.07, 0.17], [0.001, 0.19]], 24), skin); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, -0.04, 0.1); head.add(muzzle);
  const nose = new THREE.Mesh(turned([[0.001, 0], [0.04, 0.0], [0.05, 0.025], [0.035, 0.05], [0.001, 0.055]], 20), black); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.025, 0.28); head.add(nose);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(turned([[0.001, 0], [0.022, 0.004], [0.026, 0.014], [0.001, 0.022]], 16), black); eye.rotation.x = Math.PI / 2; eye.position.set(s * 0.07, 0.035, 0.12); head.add(eye); }
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.06, 4, 8), Object.assign(new THREE.MeshToonMaterial({ color: '#d86a7a', gradientMap: T.gradientMap([0.5, 0.8, 1.0]) }), { flatShading: true })); tongue.scale.set(1, 1, 0.4); tongue.position.set(0, -0.11, 0.2); tongue.rotation.x = 0.4; head.add(tongue);
  const mouth = new THREE.Group(); mouth.position.set(0, -0.09, 0.26); head.add(mouth);
  // old saggy jowls: heavy faceted flaps of lip hanging either side of the muzzle (they swing a little when she moves)
  const jowls = []; for (const s of [-1, 1]) { const j = new THREE.Mesh(facet([[0.001, 0], [0.034, 0.008], [0.046, 0.05], [0.04, 0.09], [0.022, 0.115], [0.001, 0.12]], 6), skin); j.scale.set(0.55, 1, 1); j.rotation.set(Math.PI, 0, s * 0.12); j.position.set(s * 0.062, -0.05, 0.2); j.castShadow = true; head.add(j); jowls.push(j); }
  const hc = []; for (let i = 0; i < 120; i++) { const d = sphereDir(r); if (d.y < -0.2 && d.z > 0.3) continue; const p = V(d.x * 0.15, d.y * 0.14 + 0.03, d.z * 0.15); const front = d.z > 0.45 && d.y > 0; tc.length; hc.push({ p, out: V(d.x, Math.max(0, d.y) * 0.3, Math.max(d.z, 0.1)), len: front ? 0.14 + r() * 0.06 : 0.2 + r() * 0.12, r: 0.02 + r() * 0.007, dirt: 0.25, hang: front ? 0.75 : 1 }); }
  for (const s of [-1, 1]) for (let i = 0; i < 14; i++) hc.push({ p: V(s * (0.13 + r() * 0.03), 0.05 + r() * 0.05, -0.02 + r() * 0.06), out: V(s, 0.1, 0), len: 0.28 + r() * 0.1, r: 0.022, dirt: 0.4 });
  const headM = cordMat(); const headC = new THREE.Mesh(cords(hc, seed + 1), headM); headC.castShadow = true; head.add(headC);
  // tail: a tufted pivot at the rump
  const tail = new THREE.Group(); tail.position.set(0, 0.08, -0.44); body.add(tail); const tlc = []; for (let i = 0; i < 34; i++) tlc.push({ p: V((r() - 0.5) * 0.08, r() * 0.06, -r() * 0.12), out: V((r() - 0.5) * 0.6, 0.2, -1), len: 0.22 + r() * 0.12, r: 0.022, dirt: 0.5 });
  const tailM = cordMat(); const tailC = new THREE.Mesh(cords(tlc, seed + 2), tailM); tailC.castShadow = true; tail.add(tailC);
  // legs: hip pivot -> upper -> knee -> lower -> paw, each sleeved in cords
  const legs = []; const legM = cordMat(); const pad = Object.assign(new THREE.MeshToonMaterial({ color: '#4a3a2e', gradientMap: T.gradientMap([0.4, 0.75, 1.0]) }), { flatShading: true });
  for (const [x, z, front] of [[0.12, 0.3, 1], [-0.12, 0.3, 1], [0.12, -0.3, 0], [-0.12, -0.3, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.08, z); body.add(hip);
    const up = new THREE.Mesh(turned([[0.001, -0.22], [0.05, -0.2], [0.06, -0.08], [0.055, 0.0], [0.001, 0.02]], 16), skin); hip.add(up);
    const knee = new THREE.Group(); knee.position.y = -0.21; hip.add(knee); const lo = new THREE.Mesh(turned([[0.001, -0.2], [0.04, -0.18], [0.045, -0.05], [0.05, 0.0], [0.001, 0.02]], 16), skin); knee.add(lo);
    const paw = new THREE.Mesh(turned([[0.001, 0], [0.05, 0.0], [0.055, 0.03], [0.035, 0.05], [0.001, 0.055]], 16), pad); paw.position.y = -0.21; paw.scale.set(1, 1, 1.3); knee.add(paw);
    const lc = []; for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2; lc.push({ p: V(Math.cos(a) * 0.05, -0.02 - r() * 0.16, Math.sin(a) * 0.05), out: V(Math.cos(a), 0, Math.sin(a)), len: 0.16 + r() * 0.08, r: 0.02, dirt: 0.6 }); }
    const sleeve = new THREE.Mesh(cords(lc, seed + 10 + legs.length), legM); sleeve.castShadow = true; hip.add(sleeve);
    legs.push({ hip, knee, front, side: x > 0 ? 1 : -1 });
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const mats = [torsoM, headM, tailM, legM];

  // ---------------------------------------------------------------- behaviour
  const st = { pos: root.position, heading: 0, speed: 0, want: 0, target: null, onArrive: null, phase: 0, sit: 0, sitT: 0, sniff: 0, wag: 0.2, pant: 0, look: V(), mode: 'idle', timer: 2, carry: null, hop: 0, hopV: 0, lastVel: V(), swing: V() };
  const api = {
    root, head, mouth, st, area: { x: [-5, 5], z: [-1, 6] }, hAt: () => 0, home: V(0.5, 0, 3.2),
    goTo(p, speed = 0.7, onArrive = null) { st.target = p.clone ? p : V(p.x, 0, p.z); st.want = speed; st.onArrive = onArrive; st.sitT = 0; },
    sitFor(sec = 3) { st.target = null; st.want = 0; st.sitT = sec; },
    sniffFor(sec = 2) { st.target = null; st.want = 0; st.sniff = sec; },
    pet() { if (st.mode === 'fetch' || st.mode === 'return') return; st.mode = 'pet'; api.sitFor(2.6); st.wag = 1.4; st.pant = 2.6; st.hopV = 1.6; st.timer = 2.6; },
    // fetch a thrown thing (obj.position is read every frame), carry it home, drop it, wag
    fetch(obj, onDone) { st.mode = 'fetch'; st.fetchObj = obj; st.onDone = onDone; st.wag = 0.9; st.sitT = 0; api.goTo(obj.position, 2.3); },
    update(dt, t) {
      dt = Math.min(dt, 0.05);
      // brain
      if (st.mode === 'fetch' && st.fetchObj) { st.target = st.fetchObj.position; if (st.pos.distanceTo(V(st.fetchObj.position.x, st.pos.y, st.fetchObj.position.z)) < 0.42 && st.fetchObj.position.y < st.pos.y + 0.35) { st.carry = st.fetchObj; st.carry.userData.carried = true; mouth.add(st.carry); st.carry.position.set(0, 0, 0); st.mode = 'return'; st.fetchObj = null; st.sniff = 0; api.goTo(api.home, 1.8); } }
      if (st.mode === 'return' && !st.target) { const it = st.carry; if (it) { it.getWorldPosition(it.position); mouth.remove(it); it.userData.carried = false; it.userData.dropped = true; root.parent?.add(it); } st.carry = null; st.mode = 'pet'; st.wag = 1.5; st.pant = 3; api.sitFor(2.8); st.timer = 3; st.onDone?.(it); }
      if (st.mode === 'pet' || st.mode === 'idle') {
        st.timer -= dt;
        if (st.timer <= 0 && !st.target) {
          if (st.mode === 'pet') st.mode = 'idle';
          const k = Math.random(); if (k < 0.45) { const A = api.area; api.goTo(V(A.x[0] + Math.random() * (A.x[1] - A.x[0]), 0, A.z[0] + Math.random() * (A.z[1] - A.z[0])), 0.55 + Math.random() * 0.25); st.timer = 3; }
          else if (k < 0.75) { api.sniffFor(1.6 + Math.random() * 2); st.timer = 2 + Math.random() * 2; } else { api.sitFor(3 + Math.random() * 3); st.timer = 3 + Math.random() * 3; }
        }
      }
      // locomotion: steer, accelerate, arrive
      if (st.target) { const to = V(st.target.x - st.pos.x, 0, st.target.z - st.pos.z); const d = to.length(); const h = Math.atan2(to.x, to.z); st.heading += angDiff(st.heading, h) * (1 - Math.exp(-dt * (st.want > 1.2 ? 7 : 4))); const arrive = clamp(d / 0.6, 0, 1); st.speed = damp(st.speed, st.want * arrive * (0.4 + 0.6 * Math.max(0, Math.cos(angDiff(st.heading, h)))), 5, dt);
        if (d < (st.mode === 'fetch' ? 0.2 : 0.12)) { st.target = null; st.want = 0; const cb = st.onArrive; st.onArrive = null; cb?.(); } }
      else st.speed = damp(st.speed, 0, 6, dt);
      const vx = Math.sin(st.heading) * st.speed, vz = Math.cos(st.heading) * st.speed; st.pos.x += vx * dt; st.pos.z += vz * dt; st.pos.y = api.hAt(st.pos.x, st.pos.z); root.rotation.y = st.heading;
      // gait, sitting, sniffing, wagging, panting, a happy hop
      const run = clamp(st.speed / 2.3, 0, 1); st.phase += dt * st.speed * (Math.PI * 2 / (0.55 + run * 0.4));
      st.sitT = Math.max(0, st.sitT - dt); st.sit = damp(st.sit, st.sitT > 0 && st.speed < 0.2 ? 1 : 0, 5, dt); st.sniff = Math.max(0, st.sniff - dt);
      const walk = clamp(st.speed / 0.4, 0, 1) * (1 - st.sit); const sn = st.sniff > 0 ? 1 : 0;
      for (const L of legs) { const off = (L.front ? 0 : Math.PI) + (L.side > 0 ? 0 : Math.PI) + (run > 0.5 ? (L.front ? 0 : 0.6) : 0); const s = Math.sin(st.phase + off), c = Math.cos(st.phase + off);
        const sitK = L.front ? 0 : st.sit; L.hip.rotation.x = s * 0.55 * walk * (0.7 + run * 0.6) - sitK * 1.25 + (L.front ? st.sit * 0.15 : 0); L.knee.rotation.x = Math.max(0, -c) * 0.8 * walk + sitK * 2.2; }
      st.hopV -= dt * 9; st.hop = Math.max(0, st.hop + st.hopV * dt); if (st.hop === 0) st.hopV = Math.max(0, st.hopV);
      body.position.y = 0.5 - st.sit * 0.12 + Math.abs(Math.sin(st.phase)) * 0.035 * walk * (1 + run) + Math.sin(t * 1.8) * 0.006 + st.hop; body.rotation.x = -st.sit * 0.42 + Math.sin(st.phase * 2) * 0.03 * walk + sn * 0.12; body.position.z = -st.sit * 0.06;
      body.rotation.z = Math.sin(st.phase) * 0.04 * walk;
      st.wag = damp(st.wag, Math.max((st.perk || 0) * 1.2, st.mode === 'pet' ? 1.4 : st.mode === 'return' || st.mode === 'fetch' ? 0.9 : 0.25), 1.2, dt); tail.rotation.y = Math.sin(t * (6 + st.wag * 10)) * 0.5 * st.wag; tail.rotation.x = -0.4 * st.wag - 0.1;
      st.pant = Math.max(0, st.pant - dt); const pant = st.pant > 0 || run > 0.5 ? 1 : 0; tongue.visible = pant > 0 && !st.carry; tongue.scale.y = 1 + Math.sin(t * 14) * 0.15 * pant;
      neck.rotation.x = sn * (0.75 + Math.sin(t * 9) * 0.06) - st.sit * 0.35 + (st.mode === 'pet' ? -0.35 : 0) - (st.carry ? 0.15 : 0) - (st.perkK = damp(st.perkK || 0, st.perk || 0, 6, dt)) * 0.32; /* perked up: head high, ears lifted with it */ head.rotation.y = damp(head.rotation.y, sn ? Math.sin(t * 2.3) * 0.35 : Math.sin(t * 0.5) * 0.2, 3, dt); head.rotation.z = st.mode === 'pet' ? Math.sin(t * 2) * 0.18 : 0;
      // the coat swings against the motion (a lagged spring on the body's velocity)
      const acc = V(vx, 0, vz).sub(st.lastVel).divideScalar(Math.max(dt, 1e-3)); st.lastVel.set(vx, 0, vz); const local = V(-(acc.x * Math.cos(st.heading) - acc.z * Math.sin(st.heading)), -st.hopV * 0.4, -(acc.x * Math.sin(st.heading) + acc.z * Math.cos(st.heading)));
      st.swing.lerp(local.multiplyScalar(0.012).clampLength(0, 0.08).add(V(0, 0, -st.speed * 0.02)), 1 - Math.exp(-dt * 6));
      for (const m of mats) m.userData.U.uSwing.value.copy(st.swing);
      root.updateMatrixWorld();
    },
  };
  return api;
}
