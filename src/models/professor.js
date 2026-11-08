// Sir Isaac Plumb: an old, slim, stooped Newton-like natural philosopher whose body is a varnished wooden marionette.
// Built on the Limbo Phobia low-poly people (src/models/limbo, ported from the user's own game): a plum frock coat with
// tails, mustard waistcoat, breeches and buckled dress shoes from its garment system, wild white curly hair, an old
// face with expressions; a paint hook turns the skin into carved, grain-streaked wood with joint grooves and brass
// pins, and adds the lace cravat, cream stockings and shoe buckles. He hangs from a floating control cross held by
// his own faint glowing ghost; 6 glowing strings to wrists, head, back and knees.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import { LimboBody, LimboAnim } from './limbo/rig.js';
import * as K from './charkit.js';

const HEIGHT = 2.2;
const APP = { skin: 0xdba468, hair: 0xf2eee6, hairStyle: 'curly', build: 'slim', bodyShape: 0, age: 1, face: 5, nose: 5, brows: 1, mouth: 1, ears: 2, eyeColor: 0x3a8aa8, facialHair: 'none', height: 1 };
const OUTFIT = { torso: { tex: 'c_shirt_button', color: 0xd9a22c }, torsoOuter: { tex: 'c_labcoat', color: 0x6e2a80 }, legs: { tex: 'c_slacks', color: 0x4a2a5e }, legsKind: 'shorts', feet: { tex: 'c_shoes_dress', color: 0x2a1c2a } };
const EXPR_MAP = { smug: 'smile', delight: 'happy', annoyed: 'angry', hurt: 'pain', shock: 'surprised', think: 'think' };
const WOOD = [[248, 196, 128], [214, 146, 82], [160, 92, 52], [96, 48, 44]]; // varnish light → violet-brown shadow
const BRASS = [244, 198, 84], INK = [52, 26, 34], LACE = [250, 246, 238], STOCK = [238, 228, 206];

/** paint hook: carved wood skin + joint grooves and pins, lace cravat, stockings, shoe buckles (Limbo painter override) */
function woodHook(paint, P, spec) {
  const H = P.H, sk = spec.skin; const sl = sk[0] * 0.3 + sk[1] * 0.59 + sk[2] * 0.11;
  const isSkin = (o) => Math.abs(o[0] / (sk[0] + 1) - o[1] / (sk[1] + 1)) + Math.abs(o[1] / (sk[1] + 1) - o[2] / (sk[2] + 1)) < 0.09;
  const set = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
  const lit = (o) => (o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11) / sl;
  const joints = [P.wristY, P.elbowY, P.kneeY, P.neckBase - 0.004 * H, P.knuckY];
  const wood = (c, o) => {
    const k = lit(o); let i = k > 1.06 ? 0 : k > 0.88 ? 1 : k > 0.7 ? 2 : 3;
    const g = (c.x * 90 + c.z * 64 + Math.sin(c.y * 9 + c.x * 20) * 1.4 + 10) % 1; if (g < 0.09 && i < 3) i++;
    for (const J of joints) { const d = Math.abs(c.y - J); if (d < 0.0032 * H) { set(o, INK); return; } if (d < 0.007 * H) { i = Math.max(0, i - 1); if (Math.abs(c.nx) > 0.85 && d < 0.006 * H) { set(o, BRASS); return; } } }
    set(o, WOOD[i]);
  };
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ax = Math.abs(c.x);
    // lace cravat / jabot cascading down the shirt front
    const y0 = P.bustY + 0.01 * H; if (c.nz > 0.3 && c.y > y0 && c.y < P.neckBase + 0.03 * H && ax < 0.008 * H + (c.y - y0) * 0.32) { const f = Math.sin(ax * 900 + c.y * 300); set(o, f > 0.55 ? [214, 206, 214] : c.ny < -0.3 ? [222, 214, 222] : LACE); return; }
    if (!isSkin(o)) return;
    if (c.y < P.kneeY - 0.012 * H && c.y > P.ankleY - 0.01 * H) { const k = lit(o); set(o, k > 0.95 ? STOCK : k > 0.75 ? [206, 192, 186] : [150, 132, 150]); if ((Math.atan2(c.x - Math.sign(c.x) * P.hipX, c.z) * 7 + 20) % 1 < 0.12) { o[0] *= 0.92; o[1] *= 0.92; o[2] *= 0.95; } return; }
    wood(c, o);
  };
  const shoe = (c, o) => { paint.shoe(c, o); const bx = Math.abs(Math.abs(c.x) - P.hipX), bz = c.z - 0.075; if (c.ny > 0.35 && bx < 0.022 && Math.abs(bz) < 0.016) set(o, bx > 0.014 || Math.abs(bz) > 0.009 ? BRASS : [40, 26, 40]); };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand), head: wrap(paint.head), ear: wrap(paint.ear), nose: wrap(paint.nose), shoe };
}

function turnedBar(len, r, mat) { // a lathe-turned dowel with knobs and grooves, along +X
  const l = new K.Loft(28, 9).set((t, p) => p.set((t - 0.5) * len, 0, 0), (t) => { const e = Math.min(t, 1 - t) * len; return r * (e < 0.035 ? 0.4 + e / 0.035 * 1.1 : e < 0.06 ? 1.5 - (e - 0.035) * 22 : e < 0.075 ? 0.85 : 1 + Math.sin(e * 40) * 0.04); });
  return K.mesh(l.geo, mat);
}

export function createProfessor() {
  const root = new THREE.Group(); root.name = 'professor';
  const body = new THREE.Group(); body.name = 'puppet'; root.add(body);
  const head = new THREE.Group(), jaw = new THREE.Group(), torso = new THREE.Group(); head.add(jaw);
  const hands = [new THREE.Group(), new THREE.Group()], knees = [new THREE.Group(), new THREE.Group()];
  const arms = [], legs = [];
  // ---------------- the puppet (Limbo base)
  const L = new LimboBody(APP, OUTFIT, { hook: woodHook }); const sc = HEIGHT / L.height; L.root.scale.setScalar(sc); body.add(L.root);
  const B = L.bones;
  B.head.add(head); head.position.set(0, 0.12, 0.02); B.head.add(jaw); jaw.position.set(0, 0, 0.08); B.chest.add(torso); torso.position.set(0, 0.12, -0.1);
  B.handR.add(hands[0]); B.handL.add(hands[1]); hands[0].position.set(0, -0.07, 0); hands[1].position.set(0, -0.07, 0);
  B.shinR.add(knees[0]); B.shinL.add(knees[1]);
  for (const [s, k] of [[-1, 'R'], [1, 'L']]) { arms.push({ sh: B['uarm' + k], el: B['farm' + k], wr: B['hand' + k], hand: B['hand' + k], s }); legs.push({ hip: B['thigh' + k], kn: B['shin' + k], an: B['foot' + k], s }); }
  const anim = new LimboAnim(L, { sway: 0.7 });
  // ---------------- control cross (turned wood), ghost and strings
  const ctrl = new THREE.Group(); ctrl.position.set(0, 3.55, 0); root.add(ctrl);
  const cross = new THREE.Group(); ctrl.add(cross);
  const woodMat = K.uvMat('cross-wood', 64, 256, (u, v, o) => K.woodTone(o, K.hex('#c07a3e'), K.hex('#5e2e1c'), v * 4, u, v, 0.5 + Math.cos(u * Math.PI * 2) * 0.22));
  { const a = turnedBar(1.04, 0.032, woodMat); cross.add(a); const b = turnedBar(0.66, 0.03, woodMat); b.rotation.y = Math.PI / 2; cross.add(b); }
  const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7cff).multiplyScalar(1.4), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const ghost = new THREE.Group(); ghost.position.set(0, 0.3, -0.32); ctrl.add(ghost);
  const G = new LimboBody(APP, OUTFIT, { paint: false, material: ghostMat, hd: false }); G.mesh.castShadow = false; const gs = sc * 0.78;
  G.root.scale.setScalar(gs); G.root.position.y = -G.dims.rest.uarmL[1] * gs + 0.05; G.root.rotation.x = 0.25; ghost.add(G.root);
  const strPos = new Float32Array(6 * 3 * 2); const strGeo = new THREE.BufferGeometry(); strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  strings.frustumCulled = false; root.add(strings);
  const anchors = [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, 0.3], [0, 0, -0.3], [-0.25, 0, 0], [0.25, 0, 0]].map((p) => new THREE.Vector3(...p));
  const attach = [hands[0], hands[1], head, torso, knees[0], knees[1]];

  const st = {
    t: 0, mode: 'idle', modeT: 0, talk: 0, look: new THREE.Vector2(), expr: 'smug', hold: 0, blink: 0, shown: '',
    bar: { x: new Spring(0, 7, 0.45), y: new Spring(0, 7, 0.45), tilt: new Spring(0, 9, 0.4), roll: new Spring(0, 9, 0.4) },
    slump: new Spring(0, 8, 0.5), lean: new Spring(0, 8, 0.5), jaw: new Spring(0, 30, 0.5),
  };
  // old man's stoop and loose marionette limbs on top of every pose
  anim.extra = (add, t) => {
    add('chest', 0.2 + st.slump.value * 0.05); add('neck', 0.18); add('head', -0.3 - st.look.y * 0.25 + st.jaw.value * 0.2, st.look.x * 0.45, Math.sin(t * 0.8) * 0.05);
    add('uarmL', Math.sin(t * 1.7) * 0.06, 0, Math.sin(t * 1.3) * 0.04); add('uarmR', Math.sin(t * 1.7 + 1) * 0.06, 0, -Math.sin(t * 1.3 + 2) * 0.04);
    add('handL', Math.sin(t * 2.3) * 0.15); add('handR', Math.sin(t * 2.3 + 1) * 0.15);
    add('shinL', Math.max(0, Math.sin(t * 1.4)) * 0.08); add('shinR', Math.max(0, Math.sin(t * 1.4 + 1)) * 0.08); add('thighL', -Math.max(0, Math.sin(t * 1.4)) * 0.04); add('thighR', -Math.max(0, Math.sin(t * 1.4 + 1)) * 0.04);
  };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), grip = new THREE.Vector3(), elbow = new THREE.Vector3(), rq = new THREE.Quaternion();
  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost,
    handWorld(i = 1, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    setExpr(e) { st.expr = EXPR_MAP[e] ? e : 'smug'; st.hold = 0; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); L.talk(sec); },
    lookAt(x, y) { st.look.set(x, y); },
    act(mode) {
      st.mode = mode; st.modeT = 0;
      if (mode === 'throw') { anim.play('throw'); st.bar.x.kick(4); st.lean.kick(3); }
      if (mode === 'hurt') { anim.play('hit'); st.slump.kick(6); st.bar.y.kick(-2); st.expr = 'hurt'; st.hold = 1.0; }
      if (mode === 'cast') { anim.play('cast'); st.bar.y.kick(3); st.expr = st.expr === 'smug' ? 'think' : st.expr; }
      if (mode === 'cheer') { anim.play('cheer'); st.bar.y.kick(5); st.expr = 'delight'; st.hold = 1.4; }
    },
    update(dt) {
      st.t += dt; st.modeT += dt; const t = st.t;
      st.bar.x.target = Math.sin(t * 0.9) * 0.08; st.bar.y.target = Math.sin(t * 1.6) * 0.06; st.bar.tilt.target = Math.sin(t * 1.3) * 0.08; st.bar.roll.target = Math.sin(t * 0.7) * 0.06;
      for (const k in st.bar) st.bar[k].update(dt); st.slump.update(dt); st.lean.update(dt);
      ctrl.position.set(st.bar.x.value * 0.6, 3.55 + st.bar.y.value, 0); cross.rotation.set(st.bar.tilt.value, 0, st.bar.roll.value);
      ghost.position.y = 0.3 + Math.sin(t * 2.1) * 0.05; ghost.rotation.y = Math.sin(t * 0.5) * 0.12;
      ghostMat.opacity = 0.16 + Math.sin(t * 3.3) * 0.04 + (st.mode === 'cast' ? 0.14 : 0);
      body.position.set(st.bar.x.value * 0.35, Math.max(0, st.bar.y.value * 0.5) + Math.abs(Math.sin(t * 1.6)) * 0.02, 0);
      body.rotation.set(st.lean.value * 0.05 + st.slump.value * 0.03, 0, -st.bar.roll.value * 0.6 + Math.sin(t * 1.1) * 0.025);
      if (st.hold > 0) st.hold -= dt; else if (st.expr === 'hurt' || st.expr === 'delight') st.expr = 'smug';
      if (st.mode !== 'idle' && st.modeT > 1.6) st.mode = 'idle';
      st.jaw.target = st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.35 : 0; st.jaw.update(dt); jaw.rotation.x = st.jaw.value; if (st.talk > 0) st.talk -= dt;
      if (st.shown !== st.expr) { st.shown = st.expr; L.setExpression(EXPR_MAP[st.expr] || 'smile'); }
      st.blink -= dt; if (st.blink < -3.6) st.blink = 0.12; L.gg.blink = st.blink > 0 ? 1 : 0;
      anim.update(dt);
      // ghost: hands on the cross ends (two-bone aim), head bowed towards the puppet
      root.updateMatrixWorld(true); const gb = G.bones; root.getWorldQuaternion(rq);
      for (const k of ['L', 'R']) { const s = k === 'L' ? 1 : -1;
        gb['uarm' + k].rotation.set(0, 0, 0); gb['farm' + k].rotation.set(0, 0, 0); gb.head.rotation.set(0.35 + Math.sin(t * 0.9) * 0.05, 0, 0);
        grip.set(s * 0.46, 0.02, 0).applyMatrix4(cross.matrixWorld); gb['uarm' + k].getWorldPosition(tmp);
        elbow.lerpVectors(tmp, grip, 0.5); tmp2.set(s * 0.18, -0.12, -0.05).applyQuaternion(rq); elbow.add(tmp2);
        K.aimBone(gb['uarm' + k], gb['farm' + k], elbow); K.aimBone(gb['farm' + k], gb['hand' + k], grip);
      }
      root.updateMatrixWorld(true); const invM = root.matrixWorld.clone().invert();
      for (let i = 0; i < 6; i++) {
        tmp.copy(anchors[i]).applyMatrix4(cross.matrixWorld).applyMatrix4(invM);
        attach[i].getWorldPosition(tmp2); tmp2.applyMatrix4(invM); if (i === 2) tmp2.y += 0.12;
        strPos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], i * 6);
      }
      strGeo.attributes.position.needsUpdate = true; strings.material.opacity = 0.7 + Math.sin(t * 7) * 0.12;
    },
  };
  root.userData.api = api;
  api.update(0.016);
  return api;
}
