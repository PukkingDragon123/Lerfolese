// The prologue's people, on the Limbo Phobia human engine (src/models/limbo, as professor.js builds the adult hero):
//  - createKidIsaac(): Isaac at about ten: big curious eyes, tousled chestnut hair, a brown wool doublet over a linen
//    shirt, breeches and buckled shoes; child proportions (a larger head on a 1.4 m frame).
//  - createMaster(): his old master, a scholar-mage: a long silver beard in combed locks, long silver hair, an indigo
//    robe falling to the ground with a gold rune hem, a turned walnut staff crowned with a brass armillary.
//  - createCosmicSelf(): the grown Isaac made of night: the hero's body filled with a moving galaxy (nebula, stars,
//    a gold rim), translucent, huge; used in the white space beyond the world.
// Shared API (Film / dialogue friendly): root, headWorld(out), handWorld(i, out), talk(sec), setExpr(name),
// act(mode: present|explain|point|nod|alarm|reach|cast|cheer|hurt|bow|think), lookAtWorld(v|null), walkTo(v, speed),
// update(dt). Ink outlines and cel bands come from the engine (MeshToon + InkPass).
import * as THREE from 'three';
import * as K from '../charkit.js';
import { LimboBody, LimboAnim } from '../limbo/rig.js';
import { createProfessor } from '../professor.js';
import { turned, plainMat } from '../../ui3d/craft.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const GDUR = { present: 2.6, explain: 2.2, point: 2.0, nod: 1.0, alarm: 2.4, reach: 1.8, bow: 1.8, think: 2.4, wave: 1.8, cast: 1.1, cheer: 1.4, hurt: 0.8 };

// ---------------------------------------------------------------- a story human: Limbo body + gestures, gaze and a walk
function storyHuman({ app, outfit, height, headScale = 1, hook = null, overrides = {}, sway = 0.5, stance = null }) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const L = new LimboBody(app, outfit, { hook, overrides }); const sc = height / L.P.crown; L.root.scale.setScalar(sc); body.add(L.root);
  const B = L.bones; if (headScale !== 1) { B.head.scale.setScalar(headScale); B.neck.scale.setScalar(1 + (headScale - 1) * 0.3); }
  const anim = new LimboAnim(L, { sway });
  const head = new THREE.Group(); B.head.add(head); head.position.set(0, 0.11, 0.03);
  const hands = [new THREE.Group(), new THREE.Group()]; B.handL.add(hands[0]); B.handR.add(hands[1]); for (const h of hands) h.position.set(0, -0.08, 0.02);
  const st = { gest: null, gt: 0, look: null, yaw: 0, pitch: 0, walk: 0, ph: 0, target: null, speed: 1, expr: 'smile', hold: 0, lean: 0 };
  const inv = new THREE.Matrix4(), tmp = V();
  anim.extra = (add, t) => {
    stance?.(add, t, st);
    const g = st.gest, m = st.gt, d = GDUR[g] || 1.5; const k = g ? ss(0, 0.25, m) * (1 - ss(d - 0.4, d, m)) : 0;
    switch (g) {
      case 'present': add('uarmR', -1.15 * k, 0, -0.12 * k); add('farmR', -0.45 * k); add('handR', 0.25 * k); add('chest', 0.06 * k); add('head', 0.12 * k); break;
      case 'explain': add('uarmL', -0.75 * k, 0, 0.55 * k); add('farmL', -1.0 * k + Math.sin(m * 5) * 0.08 * k); add('handL', -0.3 * k); add('uarmR', -0.5 * k, 0, -0.35 * k); add('farmR', -0.9 * k); add('chest', 0, 0.12 * Math.sin(m * 2) * k); break;
      case 'point': add('uarmR', -2.55 * k, 0, -0.15 * k); add('farmR', -0.15 * k); add('head', -0.35 * k); add('chest', -0.06 * k); break;
      case 'nod': add('head', 0.32 * Math.sin(Math.min(1, m / d) * Math.PI * 2) * (1 - m / d)); break;
      case 'alarm': add('uarmL', -0.95 * k, 0, 0.45 * k); add('uarmR', -0.95 * k, 0, -0.45 * k); add('farmL', -0.7 * k); add('farmR', -0.7 * k); add('head', -0.22 * k); add('chest', -0.12 * k); add('spine', -0.08 * k); break;
      case 'reach': add('uarmR', -1.35 * k, 0, -0.08 * k); add('farmR', -0.25 * k); add('handR', 0.1 * k); add('chest', 0.12 * k); add('spine', 0.08 * k); break;
      case 'bow': add('spine', 0.45 * k); add('chest', 0.2 * k); add('head', 0.25 * k); add('uarmL', 0.15 * k); add('uarmR', 0.15 * k); break;
      case 'think': add('uarmR', -0.5 * k, 0, -1.1 * k); add('farmR', -2.1 * k); add('handR', -0.4 * k); add('head', 0.15 * k, -0.15 * k, -0.08 * k); add('uarmL', -0.3 * k, 0, 0.3 * k); add('farmL', -1.3 * k); break;
      case 'wave': add('uarmR', -0.3 * k, 0, -2.4 * k); add('farmR', 0, 0, -0.5 * k + Math.sin(m * 12) * 0.35 * k); break;
      default: break;
    }
    // a walk: legs scissor, arms counter-swing, the head bobs
    const w = st.walk; if (w > 0.01) { const s = Math.sin(st.ph), c = Math.cos(st.ph); add('thighL', -0.5 * s * w); add('thighR', 0.5 * s * w); add('shinL', Math.max(0, c) * 0.7 * w); add('shinR', Math.max(0, -c) * 0.7 * w); add('uarmL', 0.35 * s * w); add('uarmR', -0.35 * s * w); add('farmL', -0.3 * w); add('farmR', -0.3 * w); add('chest', 0, 0.08 * s * w); }
    add('head', st.pitch, st.yaw, 0); add('neck', st.pitch * 0.3, st.yaw * 0.3, 0); add('spine', st.lean);
  };
  const api = {
    root, body, L, bones: B, head, anim, height,
    headWorld(out = V()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    handWorld(i = 1, out = V()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    hand(i = 1) { return hands[i]; },
    talk(sec = 1.2) { L.talk(sec); },
    setExpr(e, hold = 0) { st.expr = e; L.setExpression(e); st.hold = hold; },
    lookAtWorld(v) { st.look = v ? (v.isVector3 ? v.clone() : v) : null; },
    act(mode) { if (mode === 'cast' || mode === 'cheer') anim.play(mode); else if (mode === 'hurt') anim.play('hit'); st.gest = mode; st.gt = 0; if (mode === 'alarm') L.setExpression('fear', 2); if (mode === 'cheer') L.setExpression('happy', 1.6); if (mode === 'think') L.setExpression('think', 2.2); },
    walkTo(v, speed = 1.2) { st.target = v.clone(); st.speed = speed; },
    get walking() { return !!st.target; },
    update(dt) {
      dt = Math.min(dt, 0.05); if (st.gest) { st.gt += dt; if (st.gt > (GDUR[st.gest] || 1.5)) st.gest = null; }
      // gaze: turn head toward a world point (or a function returning one)
      let yaw = 0, pitch = 0; const lk = typeof st.look === 'function' ? st.look() : st.look;
      if (lk) { root.updateMatrixWorld(true); tmp.copy(lk).applyMatrix4(inv.copy(root.matrixWorld).invert()); const hy = height * 0.92; yaw = Math.max(-0.9, Math.min(0.9, Math.atan2(tmp.x, tmp.z))); pitch = Math.max(-0.5, Math.min(0.5, -Math.atan2(tmp.y - hy, Math.hypot(tmp.x, tmp.z)))) ; }
      st.yaw += (yaw - st.yaw) * Math.min(1, dt * 4); st.pitch += (pitch - st.pitch) * Math.min(1, dt * 4);
      // walking toward a target
      if (st.target) { const to = tmp.copy(st.target).sub(root.position); to.y = 0; const dd = to.length(); if (dd < 0.05) { st.target = null; } else { const h = Math.atan2(to.x, to.z); let dr = h - root.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; root.rotation.y += dr * Math.min(1, dt * 6); const sp = Math.min(st.speed, dd * 2.5); root.position.addScaledVector(to.normalize(), sp * dt); st.ph += dt * sp * 5.2; } }
      st.walk += ((st.target ? 1 : 0) - st.walk) * Math.min(1, dt * 6);
      if (st.hold > 0) { st.hold -= dt; if (st.hold <= 0) L.setExpression('smile'); }
      anim.update(dt);
    },
  };
  root.userData.api = api;
  return api;
}

// ---------------------------------------------------------------- kid Isaac (about ten)
const KID_APP = { skin: 0xf4cfae, hair: 0x6a3e22, hairStyle: 'curly', build: 'slim', bodyShape: 0.22, age: 0, face: 3, nose: 0, brows: 2, mouth: 1, ears: 1, eyeColor: 0x4a86c0, facialHair: 'none', height: 1 };
const KID_OUT = { torso: { tex: 'c_shirt_button', color: 0xf4eee0 }, torsoOuter: { tex: 'c_jacket', color: 0x3e5a34 }, legs: { tex: 'c_slacks', color: 0x3a2c24 }, feet: { tex: 'c_shoes', color: 0x24160e } }; // olive wool doublet, linen shirt, dark breeches
function tousle(P, seed = 5) { // short chestnut tufts over the Limbo cap: a boy's untidy fringe and crown
  const g = new THREE.Group(); let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const m = K.uvMat('kid-locks', 32, 128, (u, v, o) => { const lit = Math.cos(u * TAU); const c = lit > 0.45 && v > 0.15 && v < 0.3 ? [178, 116, 66] : lit < -0.2 ? [62, 34, 20] : [112, 64, 36]; o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; });
  const c = V(0, (P.hairY + P.eyeY) / 2 + 0.018, P.hcz - 0.005);
  for (let i = 0; i < 30; i++) {
    const az = (rnd() - 0.5) * 2 * Math.PI, el = 0.25 + rnd() * 1.1; const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    if (dir.z > 0.55 && dir.y < 0.5) continue; // keep the face clear
    const p0 = c.clone().add(V(dir.x * P.hw * 1.0, dir.y * 0.09, dir.z * P.hd * 0.95)); const out = V(dir.x, dir.y * 0.4 + 0.25, dir.z).normalize();
    const len = 0.03 + rnd() * 0.035, r0 = 0.011 + rnd() * 0.006, curl = (rnd() - 0.5) * 0.04;
    const pts = [0, 0.5, 1].map((t) => p0.clone().addScaledVector(out, t * len).add(V(curl * t, -t * t * len * 0.8, 0)));
    K.mesh(new K.Loft(6, 6).set(K.curve(pts), (t) => r0 * (1 - t * 0.8)).geo, m, g);
  }
  return g;
}
export function createKidIsaac() {
  const api = storyHuman({ app: KID_APP, outfit: KID_OUT, height: 1.34, headScale: 1.42, overrides: { hairVolume: 1.0, blush: 0.5 }, sway: 0.7 });
  api.L.attach(tousle(api.L.P), 'head');
  api.setExpr('smile'); api.update(0.016); return api;
}

// ---------------------------------------------------------------- the Master
const M_APP = { skin: 0xe8b894, hair: 0xd8d4cc, hairStyle: 'receding', build: 'slim', bodyShape: 0.05, age: 1, face: 1, nose: 2, brows: 3, mouth: 0, ears: 1, eyeColor: 0x6a8aa0, facialHair: 'beard', height: 1 };
const M_OUT = { torso: { tex: 'c_shirt_button', color: 0xe8e0cc }, torsoOuter: { tex: 'c_coat', color: 0x2e2a5a }, legs: { tex: 'c_slacks', color: 0x2a2440 }, feet: { tex: 'c_shoes_boot', color: 0x2a1a14 } };
const SILVER = (u, v, o, dark = false) => { const lit = Math.cos(u * TAU); const streak = Math.sin(u * 60 + v * 8) > 0.7; const c = lit > 0.5 && streak ? [252, 250, 244] : lit > 0.1 ? [222, 218, 210] : lit > -0.4 ? [176, 172, 168] : [120, 118, 126]; if (dark && v > 0.85) c.forEach((x, i) => (c[i] = x * 0.85)); o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; };
function longBeard(P) { // a long combed beard: a broad tapering mass from the chin to the chest, with locks over it and a moustache
  const g = new THREE.Group(); const m = K.uvMat('master-beard', 64, 128, (u, v, o) => SILVER(u, v, o, true));
  const chin = V(0, P.chin + 0.004, P.zf - 0.018); const H = P.H;
  const path = K.curve([chin.clone().add(V(0, 0.03, -0.02)), chin.clone().add(V(0, -0.06 * H / 1.8, 0.035)), chin.clone().add(V(0, -0.16 * H / 1.8, 0.06)), chin.clone().add(V(0.005, -0.27 * H / 1.8, 0.045)), chin.clone().add(V(0.012, -0.36 * H / 1.8, 0.02))]);
  K.mesh(new K.Loft(18, 14).set(path, (t) => { const w = 0.07 * Math.sin(Math.min(1, 0.25 + t) * Math.PI * 0.85) * (1 - t * 0.55); return [w, w * 0.42]; }, { ref: () => V(0, 0, 1), shape: (a, t) => 1 + 0.08 * Math.sin(a * 7 + t * 9) }).geo, m, g);
  let s = 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) { const x = (rnd() - 0.5) * 0.11, len = 0.12 + rnd() * 0.16; const a = chin.clone().add(V(x, 0.02 - Math.abs(x) * 0.3, 0.03 - Math.abs(x) * 0.25)); const pts = [0, 0.33, 0.66, 1].map((t) => a.clone().add(V(x * 0.25 * t + Math.sin(t * 5 + i) * 0.008, -t * len * H / 1.8, 0.03 * Math.sin(t * Math.PI) + 0.01))); K.mesh(new K.Loft(10, 6).set(K.curve(pts), (t) => 0.011 * (1 - t * 0.8) + 0.002).geo, m, g); }
  for (const sd of [-1, 1]) { const a = V(0.006 * sd, P.mouthY + 0.012, P.zf + 0.004); const pts = [a, a.clone().add(V(0.03 * sd, -0.006, -0.004)), a.clone().add(V(0.05 * sd, -0.03, -0.012)), a.clone().add(V(0.056 * sd, -0.06, -0.016))]; K.mesh(new K.Loft(10, 6).set(K.curve(pts), (t) => 0.009 * (1 - t * 0.6)).geo, m, g); } // moustache sweeping into the beard
  for (let i = 0; i < 22; i++) { const sd = i % 2 ? 1 : -1; const az = sd * (0.9 + rnd() * 2.1); const p0 = V(Math.sin(az) * P.hw, P.hairY - 0.02 - rnd() * 0.05, P.hcz + Math.cos(az) * P.hd); if (Math.cos(az) > 0.3) continue; const out = V(Math.sin(az), 0, Math.min(0, Math.cos(az)) - 0.25).normalize(); const fall = 0.28 + rnd() * 0.12; const pts = [0, 0.3, 0.65, 1].map((t) => p0.clone().addScaledVector(out, 0.01 + t * 0.03).add(V(0, -t * fall, 0))); K.mesh(new K.Loft(10, 6).set(K.curve(pts), (t) => 0.013 * (1 - t * 0.65)).geo, K.uvMat('master-hair', 64, 128, (u, v, o) => SILVER(u, v, o)), g); }
  return g;
}
function robeSkirt(P) { // the robe falls from the waist to the ground in deep folds, a gold rune band above the hem
  const m = K.uvMat('master-robe', 256, 128, (u, v, o) => {
    const fold = Math.cos(u * TAU * 11); const base = [46, 42, 92]; let L = fold > 0.55 ? 0.62 : fold < -0.5 ? 0.34 : 0.48; const hem = v > 0.86;
    K.tone(base, L, o.col);
    if (v > 0.8 && v < 0.84) K.tone([232, 184, 72], 0.62, o.col); if (v > 0.9) K.tone([232, 184, 72], 0.55, o.col);
    if (v > 0.84 && v < 0.9) { const gx = (u * 64) % 1, gl = Math.floor(u * 64); const on = (Math.abs(gx - 0.5) < 0.12) || (Math.abs(Math.sin(gl * 12.9) * 43758.5 % 1) > 0.5 && Math.abs((v - 0.84) / 0.06 - gx) < 0.15); if (on) K.tone([240, 200, 90], 0.7, o.col); }
  });
  const top = P.waistY, bot = 0.0; const H = P.H;
  const geo = new K.Loft(14, 48).set((t, out) => out.set(0, top + (bot - top) * t, 0.005), (t) => { const r = 0.13 * H / 1.8 + t * t * 0.17 * H / 1.8 + t * 0.03; return [r * 1.05, r * 0.95]; }, { ref: () => V(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 11) * 0.07 * t }).geo;
  const mesh = K.mesh(geo, m); mesh.material.side = THREE.DoubleSide; return mesh;
}
function staff() { // a turned walnut staff with brass collars, crowned with a small brass armillary (three engraved bands round a crystal)
  const g = new THREE.Group();
  const prof = [[0.0, 0], [0.018, 0.01], [0.02, 0.2], [0.017, 0.8], [0.019, 1.2], [0.024, 1.25], [0.02, 1.3], [0.018, 1.62], [0.026, 1.66], [0.03, 1.7], [0.022, 1.74], [0.012, 1.78], [0, 1.79]];
  const shaft = new THREE.Mesh(turned(prof.map(([r, y]) => [r, y]), 18), plainMat('walnut')); shaft.castShadow = true; g.add(shaft);
  const brass = plainMat('brass');
  for (const [r, w, rx, rz] of [[0.11, 0.006, Math.PI / 2, 0], [0.1, 0.006, 0, 0], [0.105, 0.005, Math.PI / 2, Math.PI / 3]]) { const prof2 = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; prof2.push([r + Math.cos(a) * w, Math.sin(a) * w * 2.2]); } const ring = new THREE.Mesh(turned(prof2, 48, { smooth: true }), brass); ring.rotation.set(rx, 0, rz); ring.position.y = 1.9; ring.castShadow = true; g.add(ring); }
  const gem = new THREE.Mesh(turned([[0, -0.055], [0.014, -0.04], [0.026, -0.01], [0.027, 0.012], [0.018, 0.04], [0.006, 0.06], [0, 0.064]], 24), new THREE.MeshToonMaterial({ color: 0x9fe8ff, emissive: 0x3a90c0, emissiveIntensity: 0.8 })); gem.position.y = 1.9; g.add(gem); g.userData.gem = gem;
  for (const y of [1.79, 1.86]) { const c = new THREE.Mesh(turned([[0, 0], [0.02, 0], [0.024, 0.02], [0.012, 0.05], [0, 0.05]], 16), brass); c.position.y = y; g.add(c); }
  return g;
}
export function createMaster() {
  const api = storyHuman({ app: M_APP, outfit: M_OUT, height: 1.82, overrides: { hairVolume: 1.1 }, sway: 0.35,
    stance: (add, t, st) => { add('uarmL', -0.42, 0, 0.18); add('farmL', -1.05); add('handL', 0.2); add('chest', 0.05 + Math.sin(t * 1.1) * 0.01); add('head', 0.04); st.lean = 0.04; } }); // a slight stoop, his left hand on the staff
  const P = api.L.P; api.L.attach(longBeard(P), 'head'); api.L.attach(robeSkirt(P), 'hips');
  const sf = staff(); sf.position.set(0.36, 0, 0.22); api.root.add(sf); api.staff = sf; // planted beside him, under his left hand
  const up = api.update; let t = 0; api.update = (dt) => { up(dt); t += dt; sf.userData.gem.rotation.y += dt * 1.2; sf.children.forEach((c, i) => { if (i > 0 && i < 4) c.rotation.y += dt * (0.4 + i * 0.2); }); };
  api.setExpr('smile'); api.update(0.016); return api;
}

// ---------------------------------------------------------------- the cosmic self: the hero's body, filled with a galaxy
const GALAXY_FRAG = `
  uniform float uTime; uniform float uAlpha; uniform vec2 uRes;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fb(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += n2(p) * a; p = p * 2.03 + 17.1; a *= .5; } return s; }
  vec3 galaxy(vec2 uv, float t) {
    vec2 q = uv * 3.0; float r = length(q - vec2(0.3, 0.1)); float ang = atan(q.y - 0.1, q.x - 0.3);
    float arm = sin(ang * 2.0 - r * 5.0 + t * 0.15) * 0.5 + 0.5; float neb = fb(q * 1.3 + vec2(t * 0.02, -t * 0.015));
    vec3 c = mix(vec3(0.02, 0.03, 0.12), vec3(0.18, 0.08, 0.38), neb);
    c += vec3(0.55, 0.3, 0.85) * pow(neb, 3.0) * 1.2 + vec3(0.25, 0.55, 1.0) * pow(arm * neb, 4.0) * 1.6;
    c += vec3(1.0, 0.85, 0.55) * exp(-r * 2.4) * 0.9; // a bright core
    // stars: three layers, crisp, a few that twinkle
    for (int L = 0; L < 3; L++) { float sc = 40. + float(L) * 55.; vec2 g = uv * sc; vec2 id = floor(g); vec2 f = fract(g) - .5; float s = h21(id + float(L) * 7.1);
      if (s > .93) { float tw = .6 + .4 * sin(t * (2. + s * 6.) + s * 40.); float d = length(f - (vec2(h21(id + 3.), h21(id + 9.)) - .5) * .6); c += vec3(1., .95, .85) * smoothstep(.09, 0., d) * tw * (1.4 - float(L) * .35); } }
    return c;
  }`;
export function createCosmicSelf() {
  const api = createProfessor();
  const U = { uTime: { value: 0 }, uAlpha: { value: 0.9 }, uRes: { value: new THREE.Vector2(1, 1) } };
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: true, side: THREE.FrontSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vVN; varying vec3 vVP;').replace('#include <project_vertex>', '#include <project_vertex>\nvVP = -mvPosition.xyz; vVN = normalize(normalMatrix * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vVN; varying vec3 vVP;\n' + GALAXY_FRAG)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec2 suv = gl_FragCoord.xy / max(uRes.y, 1.0); float fr = pow(1.0 - abs(dot(normalize(vVN), normalize(vVP))), 2.2); vec3 gc = galaxy(suv - vec2(0.5 * uRes.x / uRes.y, 0.5), uTime); gc = mix(gc, vec3(1.0, 0.86, 0.5), smoothstep(0.55, 0.95, fr) * 0.85); vec4 diffuseColor = vec4(gc, uAlpha * mix(0.82, 1.0, fr));');
  };
  mat.customProgramCacheKey = () => 'cosmic-self';
  const hide = new Set();
  api.root.traverse((o) => { if (o.isPoints) { o.visible = false; hide.add(o); return; } if (o.isMesh || o.isSkinnedMesh) { if (o.geometry?.type === 'PlaneGeometry') { o.visible = false; return; } o.material = mat; o.userData.noInk = true; } });
  api.galaxy = U; const up = api.update; api.update = (dt) => { up(dt); U.uTime.value += dt; for (const o of hide) o.visible = false; };
  api.setAlpha = (a) => { U.uAlpha.value = a; };
  api.setRes = (w, h) => U.uRes.value.set(w, h);
  return api;
}
