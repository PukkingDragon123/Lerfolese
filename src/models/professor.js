// Sir Isaac: a cool YOUNG Isaac Newton who LEVITATES and fights with an orbiting APPLE.
// Body: the Limbo Phobia people port (src/models/limbo, from the user's own game), anime cel-shaded (MeshToon, the
// engine adds ink outlines): long wavy 17th-century hair, a long dark scholar-battlemage coat with brass buttons and
// gold rune trim, burgundy waistcoat, white lace cravat, boots. He floats with a gentle bob, coat tails drifting, a
// faint gravity-rune shimmer and a dust ring on the ground under him. A glossy red apple (stem + leaf) orbits him:
// he launches it (and it can split into several for multi-hits), it returns; he can bite it to heal.
// API (unchanged for the scenes): root, head, jaw, ctrl, arms, legs, torso, body, ghost, handWorld, headWorld,
// setExpr, talk, lookAt, act, update, impactTime; plus appleWorld(out). ctrl/ghost = the apple-orbit group.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';
import { LimboBody, LimboAnim, IMPACT } from './limbo/rig.js';

const { hex } = K;
const TAU = Math.PI * 2;
const HEIGHT = 1.88, FLOAT = 0.32;
const COAT = [30, 34, 56], SHIRT = [242, 236, 224], VEST = [122, 30, 48], BRASS = [240, 196, 84], GOLD = [232, 184, 72];
const APP = { skin: 0xf2caa6, hair: 0x3e2618, hairStyle: 'wavy', build: 'slim', bodyShape: 0.12, age: 0, face: 3, nose: 0, brows: 2, mouth: 1, ears: 1, eyeColor: 0x5a86b0, facialHair: 'none', height: 1 };
const OUTFIT = { torso: { tex: 'c_shirt_button', color: 0xf2ece0 }, torsoOuter: { tex: 'c_labcoat', color: 0x1e2238 }, legs: { tex: 'c_slacks', color: 0x2a2028 }, feet: { tex: 'c_shoes_boot', color: 0x1a1418 } };
const EXPR_MAP = { smug: 'smile', delight: 'happy', annoyed: 'angry', hurt: 'pain', shock: 'surprised', think: 'think' };

// ---------------------------------------------------------------- Limbo paint hook: waistcoat, cravat, coat buttons and rune trim
const near = (o, c, tol = 0.1) => Math.abs(o[0] / (c[0] + 1) - o[1] / (c[1] + 1)) + Math.abs(o[1] / (c[1] + 1) - o[2] / (c[2] + 1)) < tol;
const lum = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
const put = (o, c, k = 1) => { o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; };
const glyph = (gx, gy) => { const c = Math.floor(gx), x = gx - c; if (x < 0.2 || x > 0.8) return false; const h = Math.abs(Math.sin(c * 12.99) * 437.58) % 1; return Math.abs(x - 0.5) < 0.08 || (h > 0.3 && Math.abs((x - 0.5) - (gy - 0.5) * 0.6) < 0.08) || (h > 0.6 && Math.abs(gy - 0.5) < 0.1 && Math.abs(x - 0.5) < 0.25); };
function heroHook(paint, P, spec) {
  const H = P.H;
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ax = Math.abs(c.x), arm = c.part === 'uarm' || c.part === 'farm';
    if (near(o, SHIRT, 0.08) && lum(o) > 120) {
      const yc = P.bustY - 0.01 * H; if (c.nz > 0.2 && c.y > yc && ax < 0.011 * H + (c.y - yc) * 0.45) { if (Math.sin(ax * 900 + c.y * 260) > 0.55) put(o, [214, 210, 222]); return; } // lace cravat
      if (!arm && c.y > P.pelvisY - 0.012 * H && c.y < P.shoulderY) { const k = lum(o) / 236; put(o, VEST, k > 0.97 ? 1.05 : k > 0.85 ? 0.92 : 0.72); const b = Math.round((c.y - P.waistY) / (0.032 * H)); if (ax < 0.005 * H && c.nz > 0.3 && Math.abs(c.y - P.waistY - b * 0.032 * H) < 0.0045 * H) put(o, BRASS); return; } // waistcoat + buttons
    }
    if (near(o, COAT, 0.13) && lum(o) < 90) {
      const hem = P.kneeY + 0.035 * H; if (c.y < hem + 0.03 * H && c.y > hem) { put(o, [20, 22, 36]); if (glyph((Math.atan2(c.x, c.z) + 3.2) * 9, (c.y - hem) / (0.03 * H))) put(o, GOLD); if (c.y > hem + 0.026 * H || c.y < hem + 0.004 * H) put(o, GOLD); return; } // rune band above the hem
      if (c.part === 'farm' && c.y < P.wristY + 0.05 * H) { put(o, c.y < P.wristY + 0.045 * H && c.y > P.wristY + 0.04 * H ? GOLD : [44, 48, 76]); return; } // turned-back cuffs
      if (!arm && c.nz > 0.3 && ax > 0.045 * H && ax < 0.06 * H && c.y > P.waistY - 0.02 * H && c.y < P.bustY + 0.04 * H) { const k = (c.y - P.waistY) / (0.045 * H); if (Math.abs(k - Math.round(k)) < 0.18) put(o, BRASS); } // brass buttons down the coat front
      if (!arm && c.nz > 0.25 && ax > 0.03 * H && ax < 0.036 * H && c.y > P.crotchY) put(o, GOLD); // gold piping on the front edges
    }
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
}

// ---------------------------------------------------------------- the apple (glossy red, stem and leaf) — a lofted apple shape, not a sphere
let APPLE = null;
function appleParts() {
  if (APPLE) return APPLE;
  const R = 0.072;
  const path = (t, p) => p.set(0, (t - 0.5) * 2 * R * 0.92 - (t > 0.9 ? (t - 0.9) * R * 1.6 : 0) + (t < 0.1 ? (0.1 - t) * R * 1.2 : 0), 0);
  const rad = (t) => { const r = R * Math.sin(Math.PI * Math.min(1, Math.max(0, 0.04 + t * 0.92))) * (1 + 0.1 * Math.sin(t * Math.PI * 1.15) - 0.06 * t); return [r, r]; };
  const shape = (a) => 1 + 0.025 * Math.cos(a * 5);
  const geo = new K.Loft(26, 28).set(path, rad, { ref: (t, n) => n.set(0, 0, 1), shape }).geo;
  const bitten = geo.clone(); { const p = bitten.attributes.position; const d = new THREE.Vector3(1, 0.1, 0.25).normalize(); for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = v.clone().normalize().dot(d); if (k > 0.55) { v.multiplyScalar(1 - (k - 0.55) * 1.1); p.setXYZ(i, v.x, v.y, v.z); } } bitten.computeVertexNormals(); }
  const skin = (bite) => K.uvMat(bite ? 'apple-bitten' : 'apple', 128, 128, (u, v, o) => {
    const lit = Math.cos((u - 0.12) * TAU); const streak = Math.abs(((u * 23 + Math.sin(v * 5) * 0.4) % 1) - 0.5) < 0.12 && v > 0.55;
    K.tone(streak ? [238, 120, 52] : [214, 28, 44], lit > 0.55 ? 0.66 : lit < -0.35 ? 0.32 : 0.5, o.col);
    if (v > 0.9) K.tone([150, 160, 40], 0.45, o.col); else if (v < 0.07) K.tone([120, 30, 30], 0.35, o.col);
    if (K.vnoise(u * 60, v * 40, 3) > 0.84) K.tone([252, 210, 160], 0.6, o.col); // lenticel speckles
    if (Math.hypot((u - 0.08) * 2.4, v - 0.66) < 0.06) { o.col[0] = 255; o.col[1] = 248; o.col[2] = 250; } // crisp anime gloss
    if (bite && Math.hypot((u - 0.22) * 2, v - 0.5) < 0.2) { K.tone([250, 238, 200], 0.6, o.col); if (Math.hypot((u - 0.22) * 2, v - 0.5) > 0.18) K.tone([200, 30, 40], 0.4, o.col); }
  });
  const stem = new K.Loft(8, 8).set(K.curve([[0, R * 0.62, 0], [0.006, R * 0.95, 0.002], [0.016, R * 1.2, 0.004]]), (t) => 0.0055 * (1 - t * 0.4), { ref: (t, n) => n.set(0, 0, 1) }).geo;
  const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.022, 0.012, 0.05, 0.004); ls.quadraticCurveTo(0.03, -0.014, 0, 0);
  const leaf = new THREE.ShapeGeometry(ls, 6); { const p = leaf.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / 0.05 * Math.PI) * 0.006 - Math.abs(p.getY(i)) * 0.3); leaf.computeVertexNormals(); }
  APPLE = { geo, bitten, mat: skin(false), matB: skin(true), stem, leaf, stemMat: K.uvMat('apple-stem', 16, 16, (u, v, o) => K.tone([110, 70, 40], 0.5, o.col)), leafMat: K.uvMat('apple-leaf', 32, 32, (u, v, o) => { K.tone([76, 168, 64], Math.abs(v - 0.5) < 0.04 ? 0.7 : u > 0.5 ? 0.42 : 0.56, o.col); }, { side: THREE.DoubleSide }) };
  return APPLE;
}
function makeApple() {
  const A = appleParts(); const g = new THREE.Group(); const body = K.mesh(A.geo, A.mat, g); K.mesh(A.stem, A.stemMat, g);
  const leaf = K.mesh(A.leaf, A.leafMat, g); leaf.position.set(0.008, 0.07, 0); leaf.rotation.set(0.3, 0.6, 0.5);
  g.userData = { body, bite: (on) => { body.geometry = on ? A.bitten : A.geo; body.material = on ? A.matB : A.mat; } }; return g;
}
// long wavy 17th-century locks over the Limbo hair cap: cel tubes (chestnut, crisp highlight band, darker underside)
function wavyLocks(P) {
  const g = new THREE.Group(); let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const m = K.uvMat('hero-locks', 64, 256, (u, v, o) => { const lit = Math.cos(u * TAU); const ring = lit > 0.4 && v > 0.12 && v < 0.2; const c = ring ? [176, 112, 72] : lit < -0.2 ? [46, 26, 20] : [92, 56, 36]; o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; });
  const c = new THREE.Vector3(0, (P.hairY + P.eyeY) / 2 + 0.012, P.hcz - 0.012);
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1; const az = side * (0.75 + rnd() * 2.3), el = -0.15 + rnd() * 1.25; if (Math.cos(az) > 0.25 && el < 1.0) continue;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const p0 = c.clone().add(new THREE.Vector3(dir.x * P.hw * 1.02, dir.y * 0.095, dir.z * P.hd * 0.98));
    const out = new THREE.Vector3(dir.x * 1.2, 0, Math.min(0, dir.z) - 0.2).normalize(); const fall = Math.max(0.08, p0.y - P.shoulderY + 0.02 + rnd() * 0.06); const ph = rnd() * 6.28, amp = 0.008 + rnd() * 0.01, r0 = 0.012 + rnd() * 0.007;
    const pts = []; for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push(p0.clone().addScaledVector(out, 0.008 + t * 0.03 + Math.sin(t * 8 + ph) * amp).add(new THREE.Vector3(0, -t * fall, 0))); }
    K.mesh(new K.Loft(12, 8).set(K.curve(pts), (t) => { const r = r0 * (1 - t * 0.6) * (t < 0.1 ? 0.6 + t * 4 : 1); return [r * 1.25, r * 0.8]; }, { ref: () => out }).geo, m, g);
  }
  return g;
}
// gravity shimmer: a faint rotating rune ring on the ground + a ring of drifting dust motes
function shimmerTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.lineWidth = 2.5;
  for (const r of [110, 92]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
  for (let i = 0; i < 24; i++) { g.save(); g.rotate((i / 24) * TAU); g.beginPath(); g.moveTo(0, -97); g.lineTo(0, -106); if (i % 3 === 0) { g.moveTo(-4, -100); g.lineTo(4, -104); } g.stroke(); g.restore(); }
  g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i * 2 / 6) * TAU; g.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); } g.stroke();
  return new THREE.CanvasTexture(c);
}

export function createProfessor() {
  const root = new THREE.Group(); root.name = 'professor';
  const body = new THREE.Group(); body.name = 'hero'; root.add(body);
  const L = new LimboBody(APP, OUTFIT, { hook: heroHook, overrides: { hairVolume: 1.25, blush: 0.15 } }); const sc = HEIGHT / L.P.crown; L.root.scale.setScalar(sc); body.add(L.root);
  const B = L.bones; const anim = new LimboAnim(L, { sway: 0.6 });
  L.attach(wavyLocks(L.P), 'head');
  const head = new THREE.Group(); B.head.add(head); head.position.set(0, 0.12, 0.03); const jaw = new THREE.Group(); head.add(jaw); jaw.position.set(0, -0.06, 0.06);
  const torso = B.chest;
  const hands = [new THREE.Group(), new THREE.Group()]; B.handL.add(hands[0]); B.handR.add(hands[1]); hands[0].position.set(0, -0.08, 0.01); hands[1].position.set(0, -0.08, 0.01); // handWorld(1) = the throwing (right) hand
  const arms = [{ sh: B.uarmR, el: B.farmR, wr: B.handR, hand: B.handR, s: -1 }, { sh: B.uarmL, el: B.farmL, wr: B.handL, hand: B.handL, s: 1 }];
  const legs = [{ hip: B.thighR, kn: B.shinR, an: B.footR, s: -1 }, { hip: B.thighL, kn: B.shinL, an: B.footL, s: 1 }];
  // the apple orbit (ctrl / ghost) and its apple(s)
  const ctrl = new THREE.Group(); ctrl.name = 'apple-orbit'; root.add(ctrl); const ghost = ctrl;
  const apple = makeApple(); ctrl.add(apple); const extras = [];
  // ground shimmer + dust ring
  const shim = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: shimmerTex(), color: new THREE.Color(0x9fe8ff).multiplyScalar(1.4), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  shim.rotation.x = -Math.PI / 2; shim.position.y = 0.02; shim.castShadow = false; root.add(shim);
  const ND = 36; const dp = new Float32Array(ND * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xe8dcc0, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false })); dust.frustumCulled = false; root.add(dust);
  const dseed = Array.from({ length: ND }, () => [Math.random() * TAU, Math.random(), 0.6 + Math.random() * 0.8]);

  const sp = (v, w = 7, z = 0.5) => new Spring(v, w, z);
  const st = { t: Math.random() * 5, mode: 'idle', modeT: 9, talk: 0, look: new THREE.Vector2(), expr: 'smug', shown: '', hold: 0, blink: 0, orbit: 0, orbitSpd: 1.3, dead: 0, count: 1,
    lift: sp(FLOAT, 5, 0.45), kx: sp(0, 6, 0.5), kz: sp(0, 6, 0.5), spin: sp(0, 6, 0.6), tilt: sp(0, 7, 0.4), bitten: 0 };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), inv = new THREE.Matrix4();
  const localOf = (obj, out) => { obj.getWorldPosition(out); root.updateMatrixWorld(true); return out.applyMatrix4(inv.copy(root.matrixWorld).invert()); };
  const EXPR = new Set(Object.keys(EXPR_MAP));
  const pose = (add, t) => { // per-mode poses layered over the Limbo animator (the Limbo modes handle hit / cheer / death / throw)
    const md = st.mode, m = st.modeT;
    add('thighL', -0.14 + Math.sin(t * 1.6) * 0.04); add('thighR', -0.06 + Math.sin(t * 1.6 + 1) * 0.04); add('shinL', 0.36); add('shinR', 0.18); add('footL', 0.55); add('footR', 0.45); // floating legs, toes down
    add('chest', -0.04); add('head', -0.06 + st.look.y * -0.25, st.look.x * 0.45, 0.05);
    if (md === 'think' && m < 2.2) { const k = Math.min(1, m * 4); add('uarmR', -0.5 * k, 0, -1.2 * k); add('farmR', -2.1 * k); add('handR', -0.4 * k); add('head', 0.15 * k, -0.15 * k, -0.08 * k); }
    if (md === 'cast' && m < 1.3) { const k = Math.min(1, m * 5) * (1 - Math.max(0, (m - 1.0) / 0.3)); add('uarmL', -1.45 * k, 0, 0.1 * k); add('farmL', -0.15 * k); add('handL', 0.75 * k); add('chest', -0.08 * k, 0.2 * k); }
    if (md === 'eat' && m < 2.0) { const k = Math.min(1, m * 3) * (1 - Math.max(0, (m - 1.6) / 0.4)); add('uarmR', -0.95 * k, 0, -0.25 * k); add('farmR', -1.75 * k); add('head', 0.12 * k); }
  };
  anim.extra = (add, t) => pose(add, t);

  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost, impactTime: IMPACT,
    handWorld(i = 1, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    appleWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return apple.getWorldPosition(out); },
    setExpr(e) { st.expr = EXPR.has(e) ? e : 'smug'; st.hold = 0; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); L.talk(sec); },
    lookAt(x, y) { st.look.set(x, y); },
    /** throw (opts.count > 1 splits the apple for multi-hits) | cast | think | eat | hurt | cheer | die. throw/attack return impactTime. */
    act(mode, opts = {}) {
      if (mode === 'attack') mode = 'throw';
      st.mode = mode; st.modeT = 0;
      if (mode === 'throw') { anim.play('throw'); st.count = Math.max(1, opts.count | 0 || 1); st.expr = 'smug'; st.hold = 1; return IMPACT; }
      if (mode === 'cast') { L.setExpression('surprised', 0.4); st.hold = 0; }
      if (mode === 'think') { st.expr = 'think'; st.hold = 2.2; }
      if (mode === 'eat') { st.expr = 'delight'; st.hold = 2.4; }
      if (mode === 'hurt') { anim.play('hit'); st.kz.kick(-6); st.kx.kick(3); st.spin.kick(-4); st.lift.kick(-2); st.expr = 'hurt'; st.hold = 1.0; }
      if (mode === 'cheer') { anim.play('cheer'); st.spin.target += TAU; st.lift.kick(4); st.expr = 'delight'; st.hold = 1.5; }
      if (mode === 'die') { anim.play('death', { hold: true }); st.dead = 1; }
      return undefined;
    },
    update(dt) {
      dt = Math.min(dt, 0.05); st.t += dt; st.modeT += dt; const t = st.t, md = st.mode, m = st.modeT;
      if (md !== 'idle' && md !== 'die' && m > (md === 'think' ? 2.3 : md === 'eat' ? 2.1 : 1.6)) st.mode = 'idle';
      // levitation: bob, knockback drift, spins; dying drops him to the ground
      st.lift.target = st.dead ? -0.02 : FLOAT + Math.sin(t * 1.6) * 0.05; for (const k of ['lift', 'kx', 'kz', 'spin', 'tilt']) st[k].update(dt);
      st.tilt.target = md === 'hurt' && m < 0.6 ? -0.35 : 0;
      body.position.set(st.kx.value * 0.1, st.lift.value, st.kz.value * 0.1); body.rotation.set(st.tilt.value, st.spin.value, Math.sin(t * 0.9) * 0.03);
      if (st.spin.value > TAU * 0.98 && st.spin.target >= TAU) { st.spin.value -= TAU; st.spin.target -= TAU; }
      anim.update(dt);
      if (B.coat) { B.coat.rotation.x = 0.12 + Math.sin(t * 1.3) * 0.06 + Math.max(0, st.lift.vel) * 0.05; B.coat.rotation.z = Math.sin(t * 0.9) * 0.04; } // coat tails drifting
      // face
      if (st.talk > 0) st.talk -= dt; if (st.hold > 0) st.hold -= dt; else if (st.expr !== 'smug' && st.expr !== 'annoyed') st.expr = 'smug';
      if (st.shown !== st.expr) { st.shown = st.expr; L.setExpression(EXPR_MAP[st.expr] || 'smile'); }
      st.blink -= dt; if (st.blink < -3.3) st.blink = 0.12; L.gg.blink = st.blink > 0 || (md === 'think' && m > 0.3 && m < 2.0) ? 1 : 0;
      // the apple: orbit, slows while thinking; launched on throw (split for multi-hits); held in the palm on cast; bitten on eat
      st.orbitSpd += ((md === 'think' ? 0.25 : 1.3) - st.orbitSpd) * Math.min(1, dt * 3); st.orbit += dt * st.orbitSpd;
      const a = st.orbit; const orbitPos = tmp.set(Math.cos(a) * 0.62, FLOAT + 1.22 + Math.sin(a * 2) * 0.08 + Math.sin(t * 1.6) * 0.05, Math.sin(a) * 0.55);
      let pos = orbitPos.clone(); apple.rotation.y += dt * 2; apple.rotation.z = Math.sin(t * 1.3) * 0.2;
      if (md === 'throw' && m < 1.4) {
        const hand = localOf(hands[1], tmp2); const fwd = new THREE.Vector3(0.25, 1.35, 3.2);
        if (m < 0.3) pos.lerp(hand, Math.min(1, m / 0.25)); else if (m < IMPACT) pos.copy(hand).lerp(fwd, (m - 0.3) / (IMPACT - 0.3)); else if (m < 1.0) pos.copy(fwd).lerp(orbitPos, (m - IMPACT) / (1.0 - IMPACT)).add(new THREE.Vector3(0, Math.sin((m - IMPACT) / (1 - IMPACT) * Math.PI) * 0.6, 0));
        apple.rotation.x += dt * 18;
        while (extras.length < st.count - 1) { const e = makeApple(); ctrl.add(e); extras.push(e); }
        extras.forEach((e, i) => { e.visible = m > 0.3 && m < 1.0; const sp2 = (i + 1) * (i % 2 ? -1 : 1) * 0.55; e.position.copy(pos).add(new THREE.Vector3(sp2, Math.abs(sp2) * 0.3, -Math.abs(sp2) * 0.2).multiplyScalar(Math.sin(Math.min(1, Math.max(0, (m - 0.3) / 0.25)) * Math.PI / 2) * (m < IMPACT ? 1 : Math.max(0, 1 - (m - IMPACT) * 2)))); e.rotation.x += dt * 18; });
      } else extras.forEach((e) => (e.visible = false));
      if (md === 'cast' && m < 1.3) { const palm = localOf(hands[0], tmp2); pos.lerp(palm.add(new THREE.Vector3(0.0, 0.08, 0.18)), Math.min(1, m * 4) * (1 - Math.max(0, (m - 1.0) / 0.3))); apple.rotation.y += dt * 6; }
      if (md === 'eat' && m < 2.0) { const hd = localOf(head, tmp2).add(new THREE.Vector3(0, -0.07, 0.12)); const k = Math.min(1, m * 2.5) * (1 - Math.max(0, (m - 1.6) / 0.4)); pos.lerp(hd, k); if (m > 0.6 && !st.bitten) { st.bitten = 1; apple.userData.bite(true); L.talk(0.7); } }
      if (st.bitten && md !== 'eat') { st.bitten += dt; if (st.bitten > 2.5) { st.bitten = 0; apple.userData.bite(false); } }
      if (st.dead) pos.y = Math.max(0.08, pos.y - st.modeT * 1.2);
      ctrl.position.set(0, 0, 0); apple.position.copy(pos);
      // ground shimmer and dust under the levitation (fade when he lands)
      const f = st.dead ? Math.max(0, 1 - st.modeT) : 1; shim.rotation.z = t * 0.3; shim.material.opacity = (0.16 + Math.sin(t * 2.2) * 0.05) * f; shim.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04);
      for (let i = 0; i < ND; i++) { const [a0, r0, s0] = dseed[i]; const ph = (t * 0.25 * s0 + r0) % 1; const r = 0.25 + ph * 0.5; dp.set([Math.cos(a0 + t * 0.2) * r, 0.03 + Math.sin(ph * Math.PI) * 0.12, Math.sin(a0 + t * 0.2) * r], i * 3); }
      dg.attributes.position.needsUpdate = true; dust.material.opacity = 0.55 * f;
    },
  };
  root.userData.api = api;
  api.update(0.016);
  return api;
}
