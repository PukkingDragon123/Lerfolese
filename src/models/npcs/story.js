// The prologue's people, on the Limbo Phobia human engine (src/models/limbo, as professor.js builds the adult hero),
// realistic low poly (octagon rings, flat shaded, physical light on the hand-painted page), with REAL CLOTH: the page
// is woven (limbo/cloth.js) and the loose garments are verlet ClothPanels that swing with the body.
//  - createKidIsaac(): Isaac at about eleven: slim, long-limbed, a real child's head (not a chibi one); a mop of messy
//    chestnut hair, a scruffy linen shirt with the sleeves rolled to the elbow and its tail hanging out, an unbuttoned
//    brown wool waistcoat with a darned pocket, patched breeches buttoned at the knee, slouched wool stockings, buckled
//    shoes, a madder-red neckerchief whose tails flap when he runs. A proper run cycle.
//  - createTeacher() (= createMaster): his old teacher: frail, stooped, thin and bony, a long wispy beard, a faded indigo
//    robe falling to the ground, a hooded capelet, deep bell sleeves, a rope belt, a gnarled cane he leans on (IK: the
//    tip stays planted and is lifted and set down again as he shuffles); he trembles slightly; he can sit and read.
//  - createGod(): the white god-entity for the painted cutscene (a pure white radiant figure, long hair and beard).
//  - createCosmicSelf(): the grown Isaac made of night (kept for the gallery / end scenes).
// Shared API: root, headWorld(out), handWorld(i, out), hand(i), talk(sec), setExpr(name, hold), act(mode), lookAtWorld(v|fn|null),
// walkTo(v, speed) -> Promise (speed > 1.8 runs), stop(), hAt (ground height fn), pose (custom additive pose fn), sit(seatH)|stand(),
// update(dt). Gestures: present explain point pointUp nod alarm reach bow think wave cast cheer hurt throw grab scream lookup shrug.
import * as THREE from 'three';
import * as K from '../charkit.js';
import { LimboBody, LimboAnim } from '../limbo/rig.js';
import { ClothPanel, clothTex, legCapsules, boneRest } from '../limbo/cloth.js';
import { limboMat } from '../beasts/look.js';
import { createProfessor } from '../professor.js';
import { lowpolyify } from '../../gfx/lowpoly.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const nz = (t, s = 0) => Math.sin(t * 1.7 + s) * 0.5 + Math.sin(t * 2.9 + s * 1.3) * 0.3 + Math.sin(t * 5.3 + s * 2.1) * 0.2; // smooth noise -1..1
const GDUR = { present: 2.6, explain: 2.4, point: 2.0, pointUp: 2.2, nod: 1.0, alarm: 2.4, reach: 1.8, bow: 1.8, think: 2.4, wave: 1.8, cast: 1.1, cheer: 1.4, hurt: 0.8, throw: 1.15, grab: 1.1, scream: 3.2, lookup: 2.2, shrug: 1.4 };
export const THROW_RELEASE = 0.44; // s after act('throw') when the hand lets go
const lum = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
const put = (o, c, k = 1) => { o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; };
const hexc = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
function pxTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); const o = [0, 0, 0, 255]; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { o[3] = 255; fn(x, y, o); const q = (y * w + x) * 4; id.data[q] = o[0]; id.data[q + 1] = o[1]; id.data[q + 2] = o[2]; id.data[q + 3] = o[3]; } g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const h2 = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const stdMat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0, flatShading: true, envMapIntensity: 0.3, ...o });

// ---------------------------------------------------------------- a story human: Limbo body, gestures, gaze, a walk / run / shuffle, cloth
function storyHuman({ app, outfit, height, headScale = 1, hook = null, overrides = {}, sway = 0.5, stance = null, main = 'R', step = 0.5, runStep = 1.0, material = null }) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const L = new LimboBody(app, outfit, { hook, overrides, lowpoly: true }); L.mesh.material = material || limboMat(L.tex);
  const sc = height / L.P.crown; L.root.scale.setScalar(sc); body.add(L.root);
  const B = L.bones; if (headScale !== 1) { B.head.scale.setScalar(headScale); B.neck.scale.setScalar(1 + (headScale - 1) * 0.25); }
  const anim = new LimboAnim(L, { sway });
  const head = new THREE.Group(); B.head.add(head); head.position.set(0, 0.11, 0.03);
  const hands = [new THREE.Group(), new THREE.Group()]; B.handL.add(hands[0]); B.handR.add(hands[1]); for (const h of hands) h.position.set(0, -0.08, 0.02);
  const st = { gest: null, gt: 0, look: null, yaw: 0, pitch: 0, target: null, speed: 1, arrive: null, ph: 0, walk: 0, run: 0, v: 0, expr: 'smile', hold: 0, lean: 0, sit: 0, sitT: 0, seatH: 0.45, tremble: 0, read: 0, readT: 0 };
  const M = main, O = main === 'R' ? 'L' : 'R'; const mz = main === 'R' ? 1 : -1; // mirror y / z for a left-handed gesture
  const arm = (add, sd, part, x, y = 0, z = 0) => add(part + sd, x, sd === 'R' ? y : -y, sd === 'R' ? z : -z);
  const inv = new THREE.Matrix4(), tmp = V(), last = V(); let lastOk = false;
  anim.extra = (add, t) => {
    stance?.(add, t, st);
    const g = st.gest, m = st.gt, d = GDUR[g] || 1.5; const k = g ? ss(0, 0.25, m) * (1 - ss(d - 0.4, d, m)) : 0;
    switch (g) {
      case 'present': arm(add, M, 'uarm', -1.15 * k, 0, -0.12 * k); arm(add, M, 'farm', -0.45 * k); arm(add, M, 'hand', 0.25 * k); add('chest', 0.06 * k); add('head', 0.12 * k); break;
      case 'explain': arm(add, O, 'uarm', -0.7 * k, 0, -0.5 * k); arm(add, O, 'farm', -1.0 * k + Math.sin(m * 5) * 0.08 * k); arm(add, M, 'uarm', -0.55 * k, 0, -0.35 * k); arm(add, M, 'farm', -0.95 * k + Math.sin(m * 4 + 1) * 0.1 * k); arm(add, M, 'hand', -0.2 * k); add('chest', 0, 0.1 * Math.sin(m * 2) * k); break;
      case 'point': arm(add, M, 'uarm', -1.5 * k, 0, -0.18 * k); arm(add, M, 'farm', -0.12 * k); add('chest', 0, -0.12 * k * mz); add('head', -0.05 * k); break;
      case 'pointUp': arm(add, M, 'uarm', -2.6 * k, 0, -0.15 * k); arm(add, M, 'farm', -0.15 * k); add('head', -0.35 * k); add('chest', -0.06 * k); break;
      case 'nod': add('head', 0.32 * Math.sin(Math.min(1, m / d) * Math.PI * 2) * (1 - m / d)); break;
      case 'alarm': arm(add, 'L', 'uarm', -0.95 * k, 0, -0.45 * k); arm(add, 'R', 'uarm', -0.95 * k, 0, -0.45 * k); add('farmL', -0.7 * k); add('farmR', -0.7 * k); add('head', -0.22 * k); add('chest', -0.12 * k); add('spine', -0.08 * k); break;
      case 'reach': arm(add, M, 'uarm', -1.35 * k, 0, -0.08 * k); arm(add, M, 'farm', -0.25 * k); arm(add, M, 'hand', 0.1 * k); add('chest', 0.12 * k); add('spine', 0.08 * k); break;
      case 'grab': { const r = ss(0, 0.35, m) * (1 - ss(0.6, 1.05, m)); arm(add, M, 'uarm', -0.85 * r, 0, -0.1 * r); arm(add, M, 'farm', -0.35 * r); add('spine', 0.4 * r); add('chest', 0.18 * r); add('head', 0.15 * r); add('thighL', -0.35 * r); add('thighR', -0.35 * r); add('shinL', 0.6 * r); add('shinR', 0.6 * r); st.drop = 0.08 * r; break; }
      case 'throw': { // an overhand throw: wind back, step, whip through, follow through
        const a = ss(0, 0.36, m) * (1 - ss(0.36, 0.46, m)), w = ss(0.36, 0.46, m) * (1 - ss(0.6, 1.1, m));
        arm(add, M, 'uarm', 1.0 * a - 1.9 * w, 0, -0.55 * a - 0.15 * w); arm(add, M, 'farm', -1.7 * a - 0.15 * w); arm(add, M, 'hand', 0.5 * a - 0.4 * w);
        arm(add, O, 'uarm', -1.1 * a + 0.3 * w, 0, -0.3 * a); arm(add, O, 'farm', -0.6 * a - 0.8 * w);
        add('chest', -0.15 * a + 0.3 * w, (0.55 * a - 0.5 * w) * mz); add('spine', -0.08 * a + 0.22 * w, (0.2 * a - 0.2 * w) * mz); add('head', 0.05 * a, (-0.4 * a + 0.2 * w) * mz);
        add('thigh' + O, -0.45 * a - 0.2 * w); add('shin' + O, 0.3 * a + 0.2 * w); add('thigh' + M, 0.25 * a + 0.3 * w); add('shin' + M, 0.25 * a + 0.35 * w); break; }
      case 'bow': add('spine', 0.45 * k); add('chest', 0.2 * k); add('head', 0.25 * k); break;
      case 'think': arm(add, M, 'uarm', -0.5 * k, 0, -1.1 * k); arm(add, M, 'farm', -2.1 * k); arm(add, M, 'hand', -0.4 * k); add('head', 0.15 * k, -0.15 * k, -0.08 * k); break;
      case 'wave': arm(add, M, 'uarm', -0.3 * k, 0, -2.4 * k); arm(add, M, 'farm', 0, 0, -0.5 * k + Math.sin(m * 12) * 0.35 * k); break;
      case 'shrug': arm(add, 'L', 'uarm', -0.2 * k, 0, -0.35 * k); arm(add, 'R', 'uarm', -0.2 * k, 0, -0.35 * k); add('farmL', -1.2 * k); add('farmR', -1.2 * k); add('head', 0, 0, 0.15 * k * Math.sin(m * 3)); break;
      case 'lookup': add('head', -0.45 * k); add('neck', -0.25 * k); add('chest', -0.12 * k); add('spine', -0.1 * k); break;
      case 'scream': { const q = ss(0, 0.2, m) * (1 - ss(d - 0.5, d, m)); const sh = Math.sin(m * 38) * 0.04 * q; arm(add, 'L', 'uarm', -1.3 * q, 0, -1.2 * q); arm(add, 'R', 'uarm', -1.3 * q, 0, -1.2 * q); add('farmL', -1.5 * q + sh); add('farmR', -1.5 * q - sh); add('head', -0.42 * q + sh, sh); add('neck', -0.2 * q); add('chest', -0.25 * q); add('spine', -0.14 * q); break; }
      default: break;
    }
    // locomotion: walk / shuffle / run blended by speed, phase advanced by distance covered
    const w = st.walk * (1 - st.run), r = st.run;
    if (w + r > 0.01) for (const [sd, off] of [['L', 0], ['R', Math.PI]]) {
      const ph = st.ph + off, s = Math.sin(ph), c = Math.cos(ph);
      add('thigh' + sd, -(st.wAmp * s) * w - (0.82 * s + 0.2) * r); add('shin' + sd, (0.06 + st.wKnee * Math.pow(Math.max(0, c), 1.2)) * w + (0.32 + 1.3 * Math.pow(Math.max(0, c), 1.3)) * r);
      add('uarm' + sd, 0.32 * s * w * st.wArm + 0.8 * s * r); add('farm' + sd, -0.25 * w - (1.35 - 0.25 * s) * r);
    }
    if (w + r > 0.01) { const s = Math.sin(st.ph); add('hips', 0, -0.06 * s * w - 0.16 * s * r, 0.03 * s * w * st.wRoll); add('chest', 0.0, 0.08 * s * w + 0.2 * s * r); add('spine', 0.03 * w + 0.22 * r); add('head', -0.04 * w - 0.16 * r, -0.05 * s * r); }
    if (st.sit > 0.01) { const q = st.sit; add('thighL', -1.5 * q); add('thighR', -1.5 * q); add('shinL', 1.5 * q); add('shinR', 1.5 * q); add('spine', -0.04 * q); }
    if (st.read > 0.01) { const q = st.read; arm(add, 'L', 'uarm', -0.5 * q, 0, -0.18 * q); arm(add, 'R', 'uarm', -0.5 * q, 0, -0.18 * q); add('farmL', -1.55 * q); add('farmR', -1.55 * q); add('handL', 0.25 * q, 0, -0.5 * q); add('handR', 0.25 * q, 0, 0.5 * q); add('head', 0.32 * q + Math.sin(t * 0.7) * 0.03 * q, Math.sin(t * 0.45) * 0.12 * q); }
    if (st.tremble > 0) { const q = st.tremble; add('head', nz(t * 7.1, 1) * 0.014 * q, nz(t * 6.3, 2) * 0.016 * q); add('handL', nz(t * 9, 3) * 0.05 * q, 0, nz(t * 8, 4) * 0.04 * q); add('handR', nz(t * 8.7, 5) * 0.05 * q, 0, nz(t * 9.4, 6) * 0.04 * q); add('farmL', nz(t * 7.7, 7) * 0.02 * q); add('farmR', nz(t * 7.3, 8) * 0.02 * q); }
    api.pose?.(add, t, st);
    add('head', st.pitch, st.yaw, 0); add('neck', st.pitch * 0.3, st.yaw * 0.3, 0); add('spine', st.lean);
  };
  st.wAmp = 0.42; st.wKnee = 0.6; st.wArm = 1; st.wRoll = 1; st.step = step; st.runStep = runStep;
  const api = {
    root, body, L, bones: B, head, anim, height, st, cloth: [], hAt: null, pose: null, sc,
    headWorld(out = V()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    handWorld(i = 1, out = V()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    hand(i = 1) { return hands[i]; },
    talk(sec = 1.2) { L.talk(sec); },
    setExpr(e, hold = 0) { st.expr = e; L.setExpression(e); st.hold = hold; },
    lookAtWorld(v) { st.look = v ? (v.isVector3 ? v.clone() : v) : null; },
    act(mode) { if (mode === 'cast' || mode === 'cheer') anim.play(mode); else if (mode === 'hurt') anim.play('hit'); st.gest = mode; st.gt = 0; if (mode === 'alarm') L.setExpression('fear', 2); if (mode === 'scream') L.setExpression('fear', 3.2); if (mode === 'cheer') L.setExpression('happy', 1.6); if (mode === 'think') L.setExpression('think', 2.2); if (mode === 'scream') L.talk(2.6); },
    /** walk / run to a world point (y is taken from hAt); resolves on arrival */
    walkTo(v, speed = 1.2) { st.target = v.clone(); st.speed = speed; return new Promise((res) => { st.arrive?.(); st.arrive = res; }); },
    stop() { st.target = null; st.arrive?.(); st.arrive = null; },
    face(yaw) { st.faceYaw = yaw; },
    sit(h = 0.45) { st.seatH = h; st.sitT = 1; }, stand() { st.sitT = 0; },
    read(on = true) { st.readT = on ? 1 : 0; },
    get walking() { return !!st.target; },
    update(dt) {
      dt = Math.min(dt, 0.05); if (st.gest) { st.gt += dt; if (st.gt > (GDUR[st.gest] || 1.5)) st.gest = null; }
      let yaw = 0, pitch = 0; const lk = typeof st.look === 'function' ? st.look() : st.look;
      if (lk) { root.updateMatrixWorld(true); tmp.copy(lk).applyMatrix4(inv.copy(root.matrixWorld).invert()); const hy = height * 0.92; yaw = Math.max(-1.0, Math.min(1.0, Math.atan2(tmp.x, tmp.z))); pitch = Math.max(-0.55, Math.min(0.55, -Math.atan2(tmp.y - hy, Math.hypot(tmp.x, tmp.z)))); }
      st.yaw += (yaw - st.yaw) * Math.min(1, dt * 4); st.pitch += (pitch - st.pitch) * Math.min(1, dt * 4);
      if (st.target) {
        const to = tmp.copy(st.target).sub(root.position); to.y = 0; const dd = to.length();
        if (dd < 0.04) { st.target = null; const a = st.arrive; st.arrive = null; a?.(); }
        else { const h = Math.atan2(to.x, to.z); let dr = h - root.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; root.rotation.y += dr * Math.min(1, dt * (st.speed > 1.8 ? 7 : 5)); const sp = Math.min(st.speed, dd * 3 + 0.25) * Math.max(0.2, Math.cos(Math.min(1.4, Math.abs(dr)))); root.position.addScaledVector(to.normalize(), Math.min(dd, sp * dt)); }
      } else if (st.faceYaw != null) { let dr = st.faceYaw - root.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; root.rotation.y += dr * Math.min(1, dt * 4); if (Math.abs(dr) < 0.01) st.faceYaw = null; }
      // speed from the actual motion (so the gait matches whatever moves the root)
      if (lastOk && dt > 0) { const v = Math.hypot(root.position.x - last.x, root.position.z - last.z) / dt; st.v += (Math.min(v, 8) - st.v) * Math.min(1, dt * 10); } last.copy(root.position); lastOk = true;
      if (api.hAt) root.position.y = api.hAt(root.position.x, root.position.z);
      const runK = ss(1.5, 2.4, st.v), walkK = ss(0.04, 0.35, st.v);
      st.run += (runK - st.run) * Math.min(1, dt * 6); st.walk += (walkK - st.walk) * Math.min(1, dt * 7);
      st.ph += (dt * st.v / (st.step + (st.runStep - st.step) * st.run)) * Math.PI;
      st.sit += (st.sitT - st.sit) * Math.min(1, dt * 3); st.read += (st.readT - st.read) * Math.min(1, dt * 3);
      const s = Math.abs(Math.sin(st.ph)); const hipH = L.dims.off.hips[1] * sc;
      body.position.y = st.run * (0.05 * s - 0.03) - st.walk * (1 - st.run) * 0.012 * s * st.wBob - (st.drop || 0) * height - st.sit * Math.max(0, hipH - st.seatH - 0.05) + (st.bodyY || 0); st.drop = 0;
      if (st.hold > 0) { st.hold -= dt; if (st.hold <= 0) L.setExpression(st.expr === 'fear' ? 'smile' : st.expr); }
      anim.update(dt);
      root.updateMatrixWorld(true); for (const c of api.cloth) c.step(dt);
      api.after?.(dt);
    },
  };
  st.wBob = 1;
  root.userData.api = api;
  return api;
}
/** capsule colliders of the torso / arms / legs for cloth panels */
function bodyCaps(L, which) {
  const B = L.bones; const out = []; const s = () => L.root.getWorldScale(V()).x;
  return () => {
    let i = 0; const k = s(); const seg = (a, b, r) => { const c = out[i] || (out[i] = { a: V(), b: V(), r: 0 }); B[a].getWorldPosition(c.a); B[b].getWorldPosition(c.b); c.r = r * k; i++; };
    if (which.includes('legs')) { const lc = legCapsules(L); for (const c of lc) { const o = out[i] || (out[i] = { a: V(), b: V(), r: 0 }); o.a.copy(c.a); o.b.copy(c.b); o.r = c.r * 1.08; i++; } }
    if (which.includes('torso')) { seg('spine', 'neck', 0.13); seg('hips', 'chest', 0.15); }
    if (which.includes('arms')) { seg('uarmL', 'farmL', 0.055); seg('uarmR', 'farmR', 0.055); seg('uarmL', 'uarmR', 0.065); }
    out.length = i; return out;
  };
}

// ---------------------------------------------------------------- KID ISAAC (about eleven)
const KID_SKIN = 0xf0c8a4;
const KID_APP = { skin: KID_SKIN, hair: 0x5a3420, hairStyle: 'short', build: 'slim', bodyShape: 0.18, age: 0, face: 3, nose: 0, brows: 2, mouth: 1, ears: 1, eyeColor: 0x4a7aa8, facialHair: 'none', height: 1 };
const KID_OUT = { torso: { tex: 'c_shirt_button', color: 0xe6dcc6 }, legs: { tex: 'c_slacks', color: 0x4a3626 }, feet: { tex: 'c_shoes', color: 0x2a1a10 } };
const SHIRT = [230, 220, 198], WAIST = [96, 66, 42], BREECH = [74, 54, 38], STOCK = [206, 196, 172], PEWTER = [168, 166, 156], KSKIN = hexc(KID_SKIN);
function kidHook(paint, P) {
  const H = P.H; const base = lum(SHIRT), bb = lum([74, 54, 38]);
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ax = Math.abs(c.x), arm = c.part === 'uarm' || c.part === 'farm' || c.part === 'cuff', leg = c.part === 'thigh' || c.part === 'calf' || c.part === 'shin'; const sd = Math.sign(c.x) || 1;
    const shirtish = o[0] > o[2] + 10 && lum(o) > 105 && !leg;
    if (arm && (c.part === 'cuff' || (c.part === 'farm' && c.y < P.elbowY - 0.03 * H))) { if (shirtish || c.part === 'cuff') put(o, KSKIN, Math.min(1.08, lum(o) / base + 0.05)); return; } // sleeves rolled up: bare forearms
    if (arm && c.part === 'farm' && c.y < P.elbowY + 0.012 * H) { const k = lum(o) / base; const roll = Math.floor((c.y - (P.elbowY - 0.03 * H)) / (0.011 * H)); put(o, SHIRT, k * (roll % 2 ? 0.86 : 1.04) * (Math.abs(((c.y - P.elbowY) / (0.011 * H)) % 1) < 0.18 ? 0.8 : 1)); return; } // the bunched roll
    if (!arm && !leg && shirtish && c.y > P.waistY - 0.07 * H && c.y < P.shoulderY + 0.004 * H) { // the waistcoat over the shirt (open at the neck and at the bottom)
      const vY = P.bustY + 0.01 * H; const open = c.nz > 0.15 && ((c.y > vY && ax < 0.008 * H + (c.y - vY) * 0.7) || (c.y < P.waistY - 0.012 * H && ax < 0.014 * H + (P.waistY - c.y) * 0.5));
      if (!open) {
        const k = lum(o) / base; put(o, WAIST, k > 0.97 ? 1.06 : k > 0.85 ? 0.94 : 0.74);
        if (c.nz > 0.3 && Math.abs(ax - 0.011 * H) < 0.0045 * H && c.y > P.waistY - 0.01 * H && c.y < vY) { const b = (c.y - P.waistY) / (0.03 * H); if (Math.abs(b - Math.round(b)) < 0.16) put(o, PEWTER, 1.05); } // pewter buttons, the lower ones undone
        if (c.nz > 0.35 && Math.abs(c.y - (P.waistY + 0.012 * H)) < 0.0028 * H && ax > 0.03 * H && ax < 0.058 * H) put(o, WAIST, 0.55); // welt pockets
        if (c.nz > 0.35 && c.x > 0.034 * H && c.x < 0.05 * H && c.y > P.waistY + 0.016 * H && c.y < P.waistY + 0.03 * H) { put(o, [120, 92, 60], ((Math.floor(c.y * 900) + Math.floor(c.x * 900)) & 1) ? 1 : 0.86); } // a darned patch
        if (c.nz < -0.4 && Math.abs(c.y - P.waistY) < 0.006 * H) put(o, WAIST, 0.66); // back belt
      }
      return;
    }
    if (leg) {
      if (c.y < P.kneeY - 0.035 * H) { const k = lum(o) / bb; const sl = Math.sin(c.y * 220 / H + Math.sin(Math.atan2(c.x, c.z) * 3) * 2.2) > 0.78; put(o, STOCK, Math.min(1.15, k * 0.95) * (sl ? 0.8 : 1)); return; } // slouched wool stockings
      const k = lum(o) / bb; put(o, BREECH, k);
      if (c.y < P.kneeY - 0.012 * H) { put(o, BREECH, k * 0.8); if (c.nx * sd > 0.5 && Math.abs(c.y - (P.kneeY - 0.024 * H)) < 0.004 * H) put(o, PEWTER, 0.95); } // the knee band with a button
      if (c.x > 0 && c.nz > 0.45 && c.y > P.kneeY + 0.004 * H && c.y < P.kneeY + 0.05 * H && Math.abs(c.x - P.hipX) < 0.03 * H) { const edge = c.y < P.kneeY + 0.007 * H || c.y > P.kneeY + 0.047 * H || Math.abs(c.x - P.hipX) > 0.027 * H; put(o, [104, 80, 52], edge ? 0.7 : k * 1.02); } // a patch on the left knee
    }
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
}
function messyHair(P, seed = 7) { // a boy's mop: locks that fall from the crown over the skull in every direction, a long fringe, a few cowlicks
  const g = new THREE.Group(); let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const m = K.uvMat('kid-mop2', 64, 256, (u, v, o) => { const lit = Math.cos(u * TAU); const strand = Math.sin(u * 50 + v * 3) > 0.6; const c = lit > 0.55 && strand ? [176, 116, 68] : lit > 0.1 ? [122, 76, 42] : lit > -0.4 ? [86, 52, 30] : [54, 32, 18]; o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; });
  const c = V(0, (P.hairY + P.eyeY) / 2 + 0.012, P.hcz - 0.008); const rx = P.hw * 1.04, ry = (P.hairY - c.y) + 0.012, rz = P.hd * 1.02;
  const surf = (az, el, out = V()) => out.set(Math.sin(az) * Math.cos(el) * rx, Math.sin(el) * ry, Math.cos(az) * Math.cos(el) * rz).add(c);
  const nrm = (az, el) => V(Math.sin(az) * Math.cos(el) / rx, Math.sin(el) / ry, Math.cos(az) * Math.cos(el) / rz).normalize();
  const lock = (az, el, len, r0, curl = 0, lift = 0.008) => {
    const pts = []; let a = az, e = el; const p = V();
    for (let j = 0; j <= 5; j++) { const t = j / 5; surf(a, e, p); pts.push(p.clone().addScaledVector(nrm(a, e), lift + Math.sin(t * Math.PI) * 0.008 + t * 0.004 + curl * t * t)); e -= len / ry / 5; a += (rnd() - 0.5) * 0.12; }
    K.mesh(new K.Loft(6, 5).set(K.curve(pts), (t) => { const r = r0 * (1 - t * 0.7) * (t < 0.1 ? 0.7 + t * 3 : 1); return [r * 1.35, r * 0.6]; }, { ref: () => nrm(az, el) }).geo, m, g);
  };
  for (let i = 0; i < 26; i++) lock((i / 26) * TAU + rnd() * 0.2, 1.3 + rnd() * 0.25, 0.055 + rnd() * 0.03, 0.017 + rnd() * 0.006); // from the crown outward
  for (let i = 0; i < 30; i++) { const az = (rnd() < 0.5 ? -1 : 1) * (0.75 + rnd() * 2.4); lock(az, 0.55 + rnd() * 0.6, 0.075 + rnd() * 0.05, 0.015 + rnd() * 0.006); } // sides and back, over the ears to the nape
  for (let i = 0; i < 12; i++) { const az = (rnd() - 0.5) * 1.3; lock(az, 0.95 + rnd() * 0.3, 0.07 + rnd() * 0.02 - Math.abs(az) * 0.01, 0.014 + rnd() * 0.005, 0.01, 0.01); } // a long fringe over the brow
  for (let i = 0; i < 4; i++) lock(rnd() * TAU, 1.45, 0.025, 0.012, 0.018, 0.012); // cowlicks
  return g;
}
function buckle() { const g = new THREE.Group(); const m = stdMat(null, { color: 0xb4b2a8, metalness: 0.7, roughness: 0.4 }); for (const [x, y, w, h] of [[0, 0.012, 0.03, 0.005], [0, -0.012, 0.03, 0.005], [0.013, 0, 0.005, 0.03], [-0.013, 0, 0.005, 0.03]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), m); b.position.set(x, y, 0); g.add(b); } return g; }
export function createKidIsaac() {
  const api = storyHuman({ app: KID_APP, outfit: KID_OUT, height: 1.46, headScale: 1.1, hook: kidHook, overrides: { hairVolume: 0.9, blush: 0.45, eyeW: 0.92, eyeH: 0.82 }, sway: 0.75, step: 0.42, runStep: 0.95,
    stance: (add, t, st) => { add('hips', 0, 0, Math.sin(t * 0.6) * 0.03 * (1 - st.walk)); add('thighL', -0.04 * Math.max(0, Math.sin(t * 0.6))); add('uarmL', 0, 0, 0.04); } });
  const L = api.L, P = L.P, B = L.bones; L.attach(messyHair(P), 'head');
  for (const [bone, sd] of [['footL', 1], ['footR', -1]]) { const b = buckle(); b.position.set(L.restOf(bone).x + 0.0 * sd, P.ankleY - 0.035 * P.H, L.restOf(bone).z + 0.075 * P.H); b.rotation.x = -0.9; L.attach(b, bone); }
  // the neckerchief: a knot at the throat and two tails that flap
  const red = clothTex({ w: 16, h: 32, base: [150, 42, 34], weave: 'plain', hem: 3, fray: 1, wear: 0.3, dust: 0.1, seed: 3, top: false });
  const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), stdMat(red)); knot.scale.set(1.3, 0.9, 0.8); knot.position.set(0.004, P.neckBase - 0.012 * P.H, L.restOf('neck').z + 0.055 * P.H); L.attach(knot, 'chest');
  const caps = bodyCaps(L, ['torso']); const kn = L.restOf('chest');
  for (const sd of [1, -1]) {
    const x0 = knot.position.x + 0.012 * sd, y0 = knot.position.y - 0.008, z0 = knot.position.z + 0.01; const o = V();
    api.cloth.push(new ClothPanel({ cols: 2, rows: 5, parent: api.root, map: red, colliders: caps, shape: [0.3, 0.05], windK: 1.6, rest: (i, j, out) => boneRest(B.chest, x0 - kn.x + (i - 0.5) * 0.026 + sd * j * 0.006, y0 - kn.y - j * 0.028, z0 - kn.z + 0.004 * j, out) }));
    void o;
  }
  // the shirt tail hanging out at the back, under the waistcoat
  const lin = clothTex({ w: 32, h: 16, base: SHIRT, weave: 'plain', hem: 3, fray: 1.4, wear: 0.4, dust: 0.25, seed: 5, top: false });
  const hp = L.restOf('hips'); const yT = P.waistY - 0.07 * P.H;
  api.cloth.push(new ClothPanel({ cols: 5, rows: 3, parent: api.root, map: lin, colliders: bodyCaps(L, ['legs']), shape: [0.35, 0.06], windK: 1.2, rest: (i, j, out) => { const a = Math.PI + (i / 4 - 0.5) * 1.5; return boneRest(B.hips, Math.sin(a) * P.waistX * 1.08, yT - hp.y - j * 0.035, Math.cos(a) * P.hipsZ * 1.2 - hp.z, out); } }));
  api.kind = 'kid'; api.setExpr('smile'); api.update(0.016); return api;
}

// ---------------------------------------------------------------- THE OLD TEACHER
const T_APP = { skin: 0xdcb496, hair: 0xe8e4dc, hairStyle: 'bald', build: 'wiry', bodyShape: 0.02, age: 1, face: 1, nose: 2, brows: 3, mouth: 0, ears: 1, eyeColor: 0x7890a0, facialHair: 'beard', height: 1 };
const ROBE = [62, 66, 98], ROBE_HEX = 0x3e4262, OCHRE = [176, 132, 62], LINEN = [208, 196, 170];
const T_OUT = { torso: { tex: 'c_shirt', color: ROBE_HEX, sleeve: 'long' }, legs: { tex: 'c_slacks', color: 0x2e2a28 }, feet: { tex: 'c_shoes', color: 0x3a2618 } };
function teacherHook(paint, P) {
  const H = P.H; const base = lum(ROBE);
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ax = Math.abs(c.x); const arm = c.part === 'uarm' || c.part === 'farm' || c.part === 'cuff', leg = c.part === 'thigh' || c.part === 'calf' || c.part === 'shin';
    const robe = Math.abs(o[2] - o[0]) > 14 && o[2] > o[0] && lum(o) < 140; if (!robe || leg) return;
    const k = lum(o) / base;
    if (!arm && c.nz > 0.2 && c.y > P.bustY - 0.02 * H && ax < (c.y - (P.bustY - 0.02 * H)) * 0.5) { put(o, LINEN, Math.min(1.1, k * 0.95)); return; } // the linen undershirt at the V of the neck
    if (!arm && c.nz > 0.2 && c.y > P.bustY - 0.035 * H && Math.abs(ax - (c.y - (P.bustY - 0.035 * H)) * 0.5) < 0.008 * H) { const kk = ((Math.floor(c.y * 600) + Math.floor(ax * 600)) % 4) < 2; put(o, OCHRE, kk ? 1.05 : 0.8); return; } // ochre embroidered collar band
    if (arm && c.y < P.wristY + 0.03 * H && c.y > P.wristY + 0.012 * H) { put(o, OCHRE, 0.85); return; } // cuffs
    put(o, ROBE, k * (0.94 + h2(Math.floor(c.y * 200), Math.floor(c.x * 200)) * 0.08) * (1 - Math.max(0, (P.shoulderY - c.y) / H - 0.15) * 0.15)); // faded, sun-bleached wool
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
}
const SILVER = (u, v, o, dark = false) => { const lit = Math.cos(u * TAU); const streak = Math.sin(u * 60 + v * 8) > 0.7; const c = lit > 0.5 && streak ? [246, 244, 238] : lit > 0.1 ? [214, 210, 202] : lit > -0.4 ? [168, 164, 160] : [112, 110, 118]; if (dark && v > 0.85) c.forEach((x, i) => (c[i] = x * 0.85)); o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; };
function wispyBeard(P, { len = 1.25, white = false } = {}) { // a long thin beard of separate wisps, a drooping moustache, long thin hair at the back and sides
  const g = new THREE.Group(); const m = white ? new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e4, emissiveIntensity: 0.4, flatShading: true, roughness: 0.7 }) : K.uvMat('teacher-beard', 64, 128, (u, v, o) => SILVER(u, v, o, true));
  const chin = V(0, P.chin + 0.004, P.zf - 0.02); const H = P.H; let s = 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const path = K.curve([chin.clone().add(V(0, 0.03, -0.02)), chin.clone().add(V(0, -0.07 * len * H / 1.8, 0.03)), chin.clone().add(V(0, -0.17 * len * H / 1.8, 0.045)), chin.clone().add(V(0.004, -0.26 * len * H / 1.8, 0.03)), chin.clone().add(V(0.01, -0.33 * len * H / 1.8, 0.012))]);
  K.mesh(new K.Loft(14, 10).set(path, (t) => { const w = 0.055 * Math.sin(Math.min(1, 0.25 + t) * Math.PI * 0.85) * (1 - t * 0.7); return [w, w * 0.4]; }, { ref: () => V(0, 0, 1), shape: (a, t) => 1 + 0.1 * Math.sin(a * 7 + t * 9) }).geo, m, g);
  for (let i = 0; i < 22; i++) { const x = (rnd() - 0.5) * 0.1, l = (0.12 + rnd() * 0.2) * len; const a = chin.clone().add(V(x, 0.02 - Math.abs(x) * 0.3, 0.03 - Math.abs(x) * 0.25)); const pts = [0, 0.33, 0.66, 1].map((t) => a.clone().add(V(x * 0.3 * t + Math.sin(t * 5 + i) * 0.01, -t * l * H / 1.8, 0.03 * Math.sin(t * Math.PI) + 0.01))); K.mesh(new K.Loft(8, 5).set(K.curve(pts), (t) => 0.008 * (1 - t * 0.85) + 0.001).geo, m, g); }
  for (const sd of [-1, 1]) { const a = V(0.006 * sd, P.mouthY + 0.012, P.zf + 0.004); const pts = [a, a.clone().add(V(0.03 * sd, -0.008, -0.004)), a.clone().add(V(0.048 * sd, -0.04, -0.012)), a.clone().add(V(0.052 * sd, -0.085, -0.016))]; K.mesh(new K.Loft(8, 5).set(K.curve(pts), (t) => 0.008 * (1 - t * 0.7)).geo, m, g); }
  for (let i = 0; i < 26; i++) { const sd = i % 2 ? 1 : -1; const az = sd * (1.0 + rnd() * 2.0); const p0 = V(Math.sin(az) * P.hw, P.hairY - 0.03 - rnd() * 0.05, P.hcz + Math.cos(az) * P.hd); if (Math.cos(az) > 0.25) continue; const out = V(Math.sin(az), 0, Math.min(0, Math.cos(az)) - 0.25).normalize(); const fall = (0.2 + rnd() * 0.16) * len; const pts = [0, 0.3, 0.65, 1].map((t) => p0.clone().addScaledVector(out, 0.01 + t * 0.02).add(V(Math.sin(t * 4 + i) * 0.008, -t * fall, 0))); K.mesh(new K.Loft(8, 5).set(K.curve(pts), (t) => 0.009 * (1 - t * 0.75)).geo, m, g); }
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const a = V((0.022 + i * 0.006) * sd, P.browY + 0.006, P.zf - 0.004 - i * 0.003); const pts = [a, a.clone().add(V(0.01 * sd, 0.008 + i * 0.002, 0.008)), a.clone().add(V(0.018 * sd, 0.004, 0.012))]; K.mesh(new K.Loft(5, 4).set(K.curve(pts), (t) => 0.004 * (1 - t * 0.6)).geo, m, g); } // bushy brows
  return g;
}
/** a gnarled walking stick: a crooked, knotted, faceted shaft with a worn grip and an iron ferrule (along +Y, tip at 0) */
export function cane(len = 0.98) {
  const tex = pxTex(16, 64, (x, y, o) => { const g = Math.sin(y * 0.9 + Math.sin(x * 0.7) * 2) > 0.6; const knot = Math.hypot((x % 16) - 8, (y % 21) - 10) < 2.2; const c = knot ? [70, 46, 28] : g ? [96, 66, 40] : [124, 88, 54]; const k = 0.9 + h2(x, y) * 0.16; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
  const pts = [V(0, 0, 0), V(0.01, len * 0.25, 0.004), V(-0.008, len * 0.5, -0.006), V(0.012, len * 0.75, 0.006), V(0.0, len * 0.92, 0), V(-0.03, len, 0.01)];
  const geo = new K.Loft(14, 6).set(K.curve(pts), (t) => { const r = 0.013 + Math.sin(t * 31) * 0.0018 + (Math.abs(t - 0.38) < 0.03 || Math.abs(t - 0.66) < 0.025 ? 0.004 : 0) + (t > 0.86 ? 0.004 : 0); return [r, r * 0.92]; }).geo;
  const g = new THREE.Group(); const sh = new THREE.Mesh(geo, stdMat(tex)); sh.castShadow = true; g.add(sh);
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.04, 6), stdMat(null, { color: 0x3a3a40, metalness: 0.6, roughness: 0.5 })); fer.position.y = 0.02; g.add(fer);
  return g;
}
/** an old book: leather boards, a rounded spine, a block of yellowed pages with tiny script; open() splays it */
export function book({ w = 0.16, h = 0.22, t = 0.04, color = [92, 40, 30], open = false, seed = 1 } = {}) {
  const g = new THREE.Group();
  const lea = pxTex(32, 32, (x, y, o) => { const e = x < 2 || y < 2 || x > 29 || y > 29; const tool = (x === 4 || x === 27 || y === 4 || y === 27) && x > 3 && x < 28 && y > 3 && y < 28; const k = (e ? 0.7 : 1) * (0.9 + h2(x, y, seed) * 0.15); const c = tool ? [196, 150, 70] : color; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
  const pg = pxTex(32, 48, (x, y, o) => { const line = y > 5 && y < 44 && y % 3 === 0 && x > 3 && x < 29 && h2(x >> 2, y, seed) > 0.2; const k = 0.95 + h2(x, y, seed + 1) * 0.07; const c = line ? [92, 70, 52] : [222, 206, 170]; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
  const edge = pxTex(8, 32, (x, y, o) => { const k = (y % 2 ? 0.88 : 1) * (0.92 + h2(x, y) * 0.1); o[0] = 214 * k; o[1] = 196 * k; o[2] = 156 * k; });
  const cover = stdMat(lea), pages = stdMat(pg), edges = stdMat(edge);
  if (!open) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, t, h), [cover, cover, cover, cover, edges, cover]); b.castShadow = b.receiveShadow = true; g.add(b); const pb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, t * 0.82, h * 0.96), edges); pb.position.x = 0.004; g.add(pb); return g; }
  for (const sd of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(w, h, 6, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + w / 2; p.setZ(i, Math.sin((x / w) * Math.PI * 0.9) * 0.018); }
    geo.rotateX(-Math.PI / 2); geo.translate(w / 2, 0, 0); const leaf = new THREE.Mesh(geo, pages); leaf.scale.x = sd; leaf.rotation.z = sd * 0.12; leaf.castShadow = leaf.receiveShadow = true; leaf.position.y = 0.012; g.add(leaf);
    const cv = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.006, h * 1.04), cover); cv.position.set(sd * w * 0.52, 0, 0); cv.rotation.z = sd * 0.1; g.add(cv);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.012, h * 0.98), edges); blk.position.set(sd * w * 0.5, 0.006, 0); blk.rotation.z = sd * 0.11; g.add(blk);
  }
  return g;
}
export function createTeacher() {
  const api = storyHuman({ app: T_APP, outfit: T_OUT, height: 1.68, hook: teacherHook, overrides: { hairVolume: 1.0, eyeW: 0.85, eyeH: 0.7 }, sway: 0.3, main: 'L', step: 0.2, runStep: 0.3,
    stance: (add, t, st) => { // stooped, rounded shoulders, soft knees; the right hand grips the cane; heavy breathing
      const k = 1 - st.sit * 0.5; add('spine', 0.2 * k); add('chest', 0.24 * k + Math.sin(t * 1.35) * 0.025); add('neck', -0.12 * k); add('head', -0.18 * k);
      add('thighL', -0.1 * (1 - st.sit)); add('thighR', -0.1 * (1 - st.sit)); add('shinL', 0.2 * (1 - st.sit)); add('shinR', 0.2 * (1 - st.sit));
      add('uarmL', -0.08, 0, 0.06); add('farmL', -0.3); if (!api.caneFree && st.read < 0.5) { add('uarmR', -0.4, 0, -0.1); add('farmR', -0.5); add('handR', 0.15); }
    } });
  const L = api.L, P = L.P, B = L.bones, H = P.H; api.st.tremble = 1; api.st.wAmp = 0.26; api.st.wKnee = 0.32; api.st.wArm = 0.35; api.st.wRoll = 2.2; api.st.wBob = 0.6;
  L.attach(wispyBeard(P), 'head');
  // the robe: a faded indigo tube from the waist to the ground, flaring, embroidered hem, dusty and frayed (verlet, collides with the legs)
  const robeT = clothTex({ w: 96, h: 96, base: ROBE, weave: 'twill', seams: [0, 47], hem: 5, band: { kind: 'key', c: OCHRE, bg: [70, 52, 34] }, bandH: 7, fray: 1.3, patches: 2, wear: 0.55, dust: 0.6, seed: 11 });
  const hp = L.restOf('hips'); const wy = P.waistY - hp.y, gy = 0.03 - hp.y; const legCaps = bodyCaps(L, ['legs']);
  const robe = new ClothPanel({ cols: 14, rows: 7, closed: true, parent: api.root, map: robeT, colliders: legCaps, ground: () => api.root.position.y, shape: [0.3, 0.012], windK: 0.8, uvX: 2,
    rest: (i, j, out) => { const a = (i / 14) * TAU; const u = j / 6; const rr = 1 + u * 1.25 + u * u * 0.4; return boneRest(B.hips, Math.sin(a) * P.waistX * 1.12 * rr, wy + (gy - wy) * u, Math.cos(a) * P.waistZ * 1.15 * rr + 0.01 * u - hp.z * 0, out); } });
  api.cloth.push(robe); api.robe = robe;
  // the rope belt with hanging ends
  { const rope = pxTex(16, 8, (x, y, o) => { const tw = ((x + y * 2) % 4) < 2; const k = tw ? 1.05 : 0.78; o[0] = 170 * k; o[1] = 142 * k; o[2] = 96 * k; });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012 / P.waistX, 5, 16), stdMat(rope)); ring.scale.set(P.waistX * 1.18, P.waistZ * 1.22, P.waistX * 1.18); ring.rotation.x = Math.PI / 2; ring.position.set(0, P.waistY - 0.004, 0); L.attach(ring, 'hips');
    const ends = clothTex({ w: 8, h: 32, base: [170, 142, 96], weave: 'twill', hem: 0, fray: 2, wear: 0.2, dust: 0.3, seed: 4, top: false });
    for (const sd of [-1, 1]) api.cloth.push(new ClothPanel({ cols: 2, rows: 5, parent: api.root, map: ends, colliders: legCaps, shape: [0.25, 0.03], windK: 1.4, rest: (i, j, out) => boneRest(B.hips, P.waistX * 0.55 + sd * 0.012 + (i - 0.5) * 0.012, wy - 0.01 - j * 0.05, P.waistZ * 1.2 - hp.z * 0 + 0.012, out) })); }
  // deep bell sleeves hanging from the forearms
  const slT = clothTex({ w: 48, h: 32, base: ROBE, weave: 'twill', seams: [23], hem: 4, band: { kind: 'key', c: OCHRE, bg: [70, 52, 34] }, bandH: 6, fray: 1, wear: 0.5, dust: 0.25, seed: 7 });
  const armCaps = bodyCaps(L, ['arms', 'torso']);
  for (const sd of ['L', 'R']) { const fb = B['farm' + sd]; const sgn = sd === 'L' ? 1 : -1;
    api.cloth.push(new ClothPanel({ cols: 8, rows: 4, closed: true, parent: api.root, map: slT, colliders: armCaps, shape: [0.35, 0.02], windK: 0.7,
      rest: (i, j, out) => { const a = (i / 8) * TAU; const u = j / 3; const r = 0.05 + u * 0.075; return boneRest(fb, Math.sin(a) * r * 1.05 + 0.004 * sgn, -0.04 - u * 0.24, Math.cos(a) * r - 0.025 * u, out); } })); }
  // a hooded capelet over the shoulders
  const cpT = clothTex({ w: 96, h: 24, base: [84, 72, 58], weave: 'twill', seams: [24, 72], hem: 3, fray: 1.2, patches: 1, wear: 0.6, dust: 0.15, seed: 9 });
  const ch = L.restOf('chest'); const ny = P.neckBase - 0.005 - ch.y, sy = P.shoulderY - 0.1 * H / 1.8 - ch.y;
  api.cloth.push(new ClothPanel({ cols: 14, rows: 4, closed: true, parent: api.root, map: cpT, colliders: armCaps, shape: [0.4, 0.06], windK: 0.6, uvX: 1,
    rest: (i, j, out) => { const a = (i / 14) * TAU; const u = j / 3; const rx = 0.07 + u * 0.17, rz = 0.065 + u * 0.08; return boneRest(B.chest, Math.sin(a) * rx, ny + (sy - ny) * u, Math.cos(a) * rz - 0.012 - (Math.cos(a) < 0 ? 0.03 * u : 0), out); } }));
  // the hood, gathered in folds at the nape (rigid, low poly)
  { const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, TAU, Math.PI * 0.45, Math.PI * 0.4), stdMat(cpT, { side: THREE.DoubleSide })); hood.scale.set(0.085, 0.07, 0.06); hood.position.set(0, P.neckBase + 0.01, L.restOf('neck').z - 0.06); hood.rotation.x = 0.6; L.attach(hood, 'chest'); }
  // the cane: IK in root space, the tip planted on the ground and re-planted as he shuffles
  const cn = cane(0.98); api.root.add(cn); api.cane = cn; const cs = { tip: null, from: V(), to: V(), t: 1 }; const _h = V(), _t = V(), _i = V(), _q = new THREE.Quaternion(), UP = V(0, 1, 0);
  api.after = (dt) => {
    const r = api.root; r.updateMatrixWorld(true);
    if (api.caneFree) { const f = api.caneFree; _h.copy(f.top); _t.copy(f.tip); }
    else {
      api.handWorld(1, _h); _i.set(0.3, 0, 0.4).applyMatrix4(r.matrixWorld); _i.y = api.hAt ? api.hAt(_i.x, _i.z) : r.position.y;
      if (!cs.tip) { cs.tip = _i.clone(); cs.to.copy(_i); }
      if (cs.t >= 1 && cs.tip.distanceTo(_i) > 0.24) { cs.from.copy(cs.tip); cs.to.copy(_i); cs.t = 0; }
      if (cs.t < 1) { cs.t = Math.min(1, cs.t + dt / 0.4); const u = ss(0, 1, cs.t); cs.tip.lerpVectors(cs.from, cs.to, u); cs.tip.y += Math.sin(u * Math.PI) * 0.07; if (cs.t >= 1) cs.planted = true; }
      _t.copy(cs.tip);
    }
    r.worldToLocal(_h); r.worldToLocal(_t); const d = _h.clone().sub(_t); const l = d.length(); cn.position.copy(_t); _q.setFromUnitVectors(UP, d.normalize()); cn.quaternion.copy(_q); cn.scale.setScalar(1); cn.userData.reach = l;
  };
  api.kind = 'teacher'; api.setExpr('smile'); api.update(0.016); return api;
}
export const createMaster = createTeacher; // the old 'Master' is now the frail teacher (end.js, the dome)

// ---------------------------------------------------------------- THE GOD-ENTITY (the painted cutscene): pure white, radiant
const G_APP = { skin: 0xf0ece4, hair: 0xffffff, hairStyle: 'bald', build: 'broad', bodyShape: 0.0, age: 1, face: 1, nose: 2, brows: 3, mouth: 0, ears: 1, eyeColor: 0xd8e4f0, facialHair: 'beard', height: 1 };
export function createGod() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xfffcf6, emissive: 0xfff1dc, emissiveIntensity: 0.42, roughness: 0.65, flatShading: true });
  const api = storyHuman({ app: G_APP, outfit: { torso: { tex: 'c_shirt', color: 0xffffff, sleeve: 'long' }, legs: { tex: 'c_slacks', color: 0xffffff } }, height: 2.1, sway: 0.2, material: mat, overrides: { clothTex: false } });
  api.L.attach(wispyBeard(api.L.P, { len: 1.15, white: true }), 'head');
  api.L.mesh.userData.noInk = false; api.kind = 'god'; api.update(0.016); return api;
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
    vec3 c = mix(vec3(0.006, 0.01, 0.05), vec3(0.1, 0.03, 0.26), neb);
    c += vec3(0.62, 0.22, 0.9) * pow(neb, 3.2) * 1.4 + vec3(0.18, 0.5, 1.0) * pow(arm * neb, 3.0) * 1.8;
    c += vec3(1.0, 0.82, 0.5) * exp(-r * 7.0) * 0.8; // a small bright core
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
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vVN; varying vec3 vVP;').replace('#include <project_vertex>', '#include <project_vertex>\nvVP = -mvPosition.xyz; vVN = normalize(normalMatrix * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vVN; varying vec3 vVP;\n' + GALAXY_FRAG)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec2 suv = gl_FragCoord.xy / max(uRes.y, 1.0); float fr = pow(1.0 - abs(dot(normalize(vVN), normalize(vVP))), 2.2); vec3 gc = galaxy(suv - vec2(0.5 * uRes.x / uRes.y, 0.5), uTime); gc = mix(gc, vec3(1.0, 0.86, 0.5), smoothstep(0.78, 1.0, fr) * 0.7); vec4 diffuseColor = vec4(gc, uAlpha);');
  };
  mat.customProgramCacheKey = () => 'cosmic-self';
  const hide = new Set();
  api.root.traverse((o) => { if (o.isPoints) { o.visible = false; hide.add(o); return; } if (o.isMesh || o.isSkinnedMesh) { if (o.geometry?.type === 'PlaneGeometry') { o.visible = false; return; } o.material = mat; o.userData.noInk = true; } });
  // two small star-eyes in the dark of the face
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const star = new THREE.Shape(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * TAU, r = i % 2 ? 0.006 : 0.022; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const eyes = [-1, 1].map((sd) => { const e = new THREE.Mesh(new THREE.ShapeGeometry(star), eyeM); e.position.set(sd * 0.034, -0.035, 0.1); e.userData.noInk = true; api.head.add(e); return e; });
  api.galaxy = U; const up = api.update; api.update = (dt) => { up(dt); U.uTime.value += dt; for (const o of hide) o.visible = false; };
  api.setAlpha = (a) => { U.uAlpha.value = a; eyeM.opacity = a; for (const e of eyes) e.rotation.z += 0.02; };
  api.setRes = (w, h) => U.uRes.value.set(w, h);
  return api;
}
