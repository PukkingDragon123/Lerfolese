// THE LAB PUZZLES (menu agent): eight small, hands-on physics puzzles for the Experiment Hall's bench, one per kind of
// study (game/studies.js PUZZLES). In each the EQUATION IS THE TOOL: the player sets one or two quantities on brass
// sliders, the chalkboard shows the law with those values plugged in (and a dotted ghost shows the first part of what
// will happen), then RUN plays the real physics, deterministic and scored against the target:
//   fall      h = 1/2 g t^2       drop the apple from height h so it lands in a basket rolling past at v
//   cradle    F = m a             push a cart (force, mass) so friction stops it exactly on the mark
//   pendulum  T = 2 pi sqrt(L/g)  set the length so the bell rings on the metronome's beat
//   orbit     R = v^2 sin 2a / g  lob the apple (angle, speed) over a stack of books into a cup
//   prism     n1 sin a = n2 sin b turn the prism so the red ray lands on a crystal on the protractor
//   top       L = I w             spin a top (mass, rate) so it runs down exactly at the first domino
//   flask     P V = n R T         heat a gas syringe (temperature, weights) so the plunger stops at the mark
//   spark     F = k q1 q2 / r^2   charge a Leyden jar (charge, distance) so the pith ball lights the lamp, no spark
// Bench coordinates: the slot's origin is the bench top centre; x along the bench (the brass rule at the front reads
// x + 1.00 m), +z toward the room.
//   const P = makePuzzle('fall', { seed });  slot.add(P.group);  P.params -> [{ id, label, unit, min, max, step, dp, value }]
//   P.set(id, v); P.board() -> [[text, colour], ...]; P.ghost() -> [Vector3]; P.run(); P.update(dt, t) -> result | null
//   result = { ok, bull, err, msg }
import * as THREE from 'three';
import { lathe, tube, cbox, extrude, shape } from '../models/lowprops.js';
import { makeApple } from '../models/orchard.js';
import { drawPixelText, measure } from '../ui3d/craft.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { put, smat, M, glassM, glowM, beam, aim, SPECTRUM } from './studydemos.js';
import { labProp } from './labassets.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const G = 9.81, D2R = Math.PI / 180, TAU = Math.PI * 2;
const f = (v, dp = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(dp);
const C = { eq: '#ffe8a0', ink: '#eef2ec', soft: '#b8ccbe', tgt: '#ffc8a8' };
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------- shared pieces
/** a small parchment tag with crisp pixel lettering (a reading the player can see on the apparatus) */
export function tag(text, { h = 0.04, color = '#2a160c', bg = '#ead7ae' } = {}) {
  const w = Math.ceil(measure(text, 'body')) + 8, K = 4; const c = document.createElement('canvas'); c.width = w * K; c.height = 16 * K; const g = c.getContext('2d');
  g.fillStyle = '#5a3a20'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = bg; g.fillRect(K, K, c.width - 2 * K, c.height - 2 * K); drawPixelText(g, text, (w / 2) * K, 12 * K, 'body', { color, k: K, align: 'center' });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((h * w) / 16, h), new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 })); m.userData.noInk = true; return m;
}
/** the brass rule along the bench's front edge: 0.00 at x = -1, a tick each centimetre, numbers each 10 cm */
export function ruler() {
  const W = 2.0, K = 2, px = 400; const c = document.createElement('canvas'); c.width = px * K; c.height = 20 * K; const g = c.getContext('2d');
  g.fillStyle = '#b88a3a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#e0b85a'; g.fillRect(0, 0, c.width, K); g.fillStyle = '#6a4a1a'; g.fillRect(0, c.height - K, c.width, K);
  for (let i = 0; i <= 200; i++) { const x = Math.round((i / 200) * (px - 1)) * K; const L = i % 10 === 0 ? 9 : i % 5 === 0 ? 6 : 3; g.fillStyle = '#3a2208'; g.fillRect(x, K, K, L * K); }
  for (let i = 0; i <= 20; i += 1) { if (i % 2 && i !== 1) continue; const x = (i / 20) * (px - 1) * K; drawPixelText(g, (i / 10).toFixed(1), Math.min(c.width - 30, Math.max(18, x + 2 * K)), 19 * K, 'body', { color: '#2a1606', k: 1, align: 'left' }); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  const grp = new THREE.Group(); const face = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.05), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.35 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.006; face.userData.noInk = true; grp.add(face);
  put(grp, cbox(W + 0.02, 0.005, 0.054, 0.001), M.brass(), 0, 0.0025, 0); return grp;
}
const GHOST = new THREE.PointsMaterial({ color: 0xf4f6ee, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
/** a flame: a faceted teardrop of hot light (no blob), with an optional warm light */
function flameMesh(s = 1) { const g = new THREE.Group(); const fl = new THREE.Mesh(lathe([[0.0005, 0], [0.012 * s, 0.014 * s], [0.014 * s, 0.035 * s], [0.008 * s, 0.06 * s], [0.0005, 0.08 * s]], 6), glowM('#ffb048', 1.8)); fl.userData.noInk = true; g.add(fl); return g; }
function rng(seed) { const r = mulberry32(seed); return { r, range: (a, b) => a + r() * (b - a), step: (v, s) => Math.round(v / s) * s }; }
const result = (err, tol, msgs) => ({ ok: Math.abs(err) <= tol, bull: Math.abs(err) <= tol / 3, err, msg: Math.abs(err) <= tol / 3 ? 'Bullseye!' : Math.abs(err) <= tol ? 'Solved!' : err > 0 ? msgs[1] : msgs[0] });

// ---------------------------------------------------------------- 1. the falling apple: h = 1/2 g t^2
function fall(seed) {
  const R = rng(seed); const g = new THREE.Group(); const XD = 0.3;
  const v = +R.range(0.32, 0.55).toFixed(2), tStar = R.range(0.26, 0.47); const d = +(v * tStar).toFixed(2); const XT = XD - d;
  for (const z of [-0.05, 0.05]) put(g, cbox(2.0, 0.012, 0.012, 0.002), M.brass(), 0, 0.006, z); // the basket's rails
  put(g, cbox(0.22, 0.04, 0.2, 0.01), M.walnut(), XD, 0.02, -0.34); put(g, cbox(0.045, 1.72, 0.045, 0.01), M.walnut(), XD, 0.88, -0.34); put(g, cbox(0.04, 0.04, 0.38, 0.008), M.walnut(), XD, 1.72, -0.17); // the gallows
  const clamp = new THREE.Group(); g.add(clamp); put(clamp, cbox(0.05, 0.03, 0.05, 0.006), M.brass(), 0, 0, 0); const thread = put(g, cbox(0.004, 1, 0.004, 0.001), smat(null, { color: 0xe8dcc0 }), XD, 1, 0);
  const apple = makeApple({ s: 0.075 }); g.add(apple);
  const B = labProp('wicker_basket_01', { w: 0.2 }); g.add(B); const RIM = (B.userData.size?.y || 0.1) * 0.9;
  const flag = new THREE.Group(); flag.position.set(XT, 0, 0.13); g.add(flag); put(flag, cbox(0.008, 0.26, 0.008, 0.002), M.iron(), 0, 0.13, 0); put(flag, extrude(shape([[0, 0], [0.09, -0.03], [0, -0.06]]), 0.004, 0.001), smat(null, { color: 0xb02a22, rough: 1 }), 0, 0.26, 0);
  const tg = tag(`${f(v)} m/s`); tg.position.set(0, 0.3, 0); g.add(tg); const tg2 = tag(`flag ${f(XT + 1)} m`); tg2.position.set(0.05, 0.31, 0); flag.add(tg2);
  const P = { h: 0.6 }; let st = 'idle', T = 0, bx = -0.98, ay = 0, vy = 0, landed = false, res = null, inB = false, rest = 0, ax = XD, avx = 0;
  const pose = () => { ay = RIM + P.h + 0.04; apple.position.set(XD, ay, 0); clamp.position.set(XD, ay + 0.05, 0); thread.scale.y = Math.max(0.01, 1.72 - ay - 0.05); thread.position.y = (1.72 + ay + 0.05) / 2; };
  const place = () => { B.position.set(bx, 0, 0); tg.position.set(bx, 0.3, 0); }; pose(); place();
  const tFall = () => Math.sqrt((2 * P.h) / G);
  return { group: g, params: [{ id: 'h', label: 'Drop height h', unit: 'm', min: 0.15, max: 1.4, step: 0.01, dp: 2, value: P.h }],
    set(id, x) { P[id] = x; if (st === 'idle') pose(); },
    board() { const t = tFall(); return [['h = 1/2 g t^2', C.eq], ['t = sqrt(2h / g)', C.soft], [`t = sqrt(2 x ${f(P.h)} / 9.81)`, C.ink], [`t = ${f(t, 3)} s`, C.ink], [`Basket ${f(v)} m/s, flag ${f(d)} m back`, C.tgt]]; },
    ghost() { const pts = []; const t = tFall(); for (let s = 0; s <= t + 1e-6; s += 0.02) pts.push(V(XD, RIM + P.h + 0.04 - 0.5 * G * s * s, 0)); return pts; },
    run() { st = 'roll'; T = 0; bx = Math.max(-0.98, XT - 0.4); landed = false; res = null; inB = false; rest = 0; ax = XD; avx = 0; pose(); place(); audio.play('wood_creak', { vol: 0.3 }); },
    update(dt) {
      if (st === 'idle') { apple.rotation.z = Math.sin(performance.now() * 0.0013) * 0.06; return null; }
      bx = Math.min(0.95, bx + v * dt); place();
      if (st === 'roll' && bx >= XT) { st = 'fall'; vy = 0; T = 0; audio.play('whoosh_soft', { vol: 0.35 }); clamp.position.y += 0.02; }
      if (st === 'fall') { T += dt; if (!landed) { vy -= G * dt; ay += vy * dt; ax += avx * dt;
          if (ay <= RIM + 0.03 && !inB) { const xb = XT + v * tFall(); const err = xb - XD; res = result(err, 0.05, ['The basket had not arrived yet', 'The basket had already passed']);
            if (res.ok) { inB = true; landed = true; audio.play('hit_wood', { vol: 0.4 }); audio.play('paper_rustle', { vol: 0.3 }); } else { avx = (Math.random() - 0.5) * 0.2; } }
          if (!inB && ay <= 0.04) { ay = 0.04; vy = -vy * 0.35; avx *= 0.7; if (Math.abs(vy) < 0.3) { landed = true; audio.play('apple_squish', { vol: 0.4 }); } else audio.play('hit_light', { vol: 0.3 }); } }
        if (inB) { apple.position.set(bx, RIM - 0.02, 0); } else apple.position.set(ax, ay, 0); apple.rotation.x += dt * (landed ? 0 : 3);
        if (landed) { rest += dt; if (rest > 0.9 || bx >= 0.95) { st = 'done'; return res; } } }
      return null; },
    reset() { st = 'idle'; bx = -0.98; inB = false; pose(); place(); }, answer: () => ({ h: 0.5 * G * (d / v) ** 2 }), focus: V(XD, 0.5, 0) };
}

// ---------------------------------------------------------------- 2. the cart and the mark: F = m a
function cradle(seed) {
  const R = rng(seed); const g = new THREE.Group(); const X0 = -0.82, MU = 0.2, TAUP = 0.2; const D = +R.range(0.35, 1.35).toFixed(2);
  put(g, cbox(2.0, 0.014, 0.16, 0.004), M.walnut(), 0, 0.007, 0); for (const z of [-0.06, 0.06]) put(g, cbox(2.0, 0.012, 0.01, 0.002), M.brass(), 0, 0.02, z);
  const plg = new THREE.Group(); plg.position.set(-0.98, 0.05, 0); g.add(plg); put(plg, cbox(0.06, 0.06, 0.08, 0.01), M.iron(), 0, 0, 0); const rod = put(plg, cbox(0.1, 0.014, 0.014, 0.003), M.brass(), 0.05, 0, 0);
  put(plg, tube(Array.from({ length: 24 }, (_, i) => [0.03 + i * 0.0035, Math.cos(i * 1.2) * 0.022, Math.sin(i * 1.2) * 0.022]), 0.003, { seg: 24, rad: 4 }), M.iron());
  const cart = new THREE.Group(); g.add(cart); put(cart, cbox(0.15, 0.045, 0.1, 0.008), M.oak(), 0, 0.055, 0); for (const x of [-0.05, 0.05]) for (const z of [-0.055, 0.055]) put(cart, lathe([[0.0005, -0.006], [0.02, -0.006], [0.02, 0.006], [0.0005, 0.006]], 8), M.brass(), x, 0.03, z, Math.PI / 2, 0, 0);
  const weights = new THREE.Group(); weights.position.y = 0.078; cart.add(weights);
  const mark = new THREE.Group(); mark.position.set(X0 + D, 0, 0); g.add(mark); put(mark, cbox(0.008, 0.002, 0.16, 0.001), smat(null, { color: 0xb02a22, rough: 1 }), 0, 0.015, 0); put(mark, cbox(0.006, 0.16, 0.006, 0.002), M.iron(), 0, 0.08, -0.09); put(mark, extrude(shape([[0, 0], [0.06, -0.02], [0, -0.04]]), 0.004, 0.001), smat(null, { color: 0xb02a22, rough: 1 }), 0, 0.16, -0.09);
  const tg = tag(`mark ${f(X0 + D + 1)} m`); tg.position.set(0.04, 0.2, -0.09); mark.add(tg);
  const P = { F: 8, m: 2 }; let st = 'idle', T = 0, x = 0, vel = 0, res = null, rest = 0;
  const stack = () => { weights.clear(); const n = Math.round(P.m * 2); for (let i = 0; i < n; i++) put(weights, lathe([[0.0005, 0], [0.032, 0], [0.032, 0.012], [0.012, 0.014], [0.0005, 0.014]], 8), M.iron(), 0, i * 0.0145, 0); };
  const a1 = () => P.F / P.m - MU * G; const travel = () => { const a = a1(); if (a <= 0) return 0; const v1 = a * TAUP; return 0.5 * a * TAUP * TAUP + (v1 * v1) / (2 * MU * G); };
  stack(); cart.position.x = X0;
  return { group: g, params: [{ id: 'F', label: 'Push force F', unit: 'N', min: 1, max: 40, step: 0.1, dp: 1, value: P.F }, { id: 'm', label: 'Cart mass m', unit: 'kg', min: 0.5, max: 4, step: 0.5, dp: 1, value: P.m }],
    set(id, v) { P[id] = v; if (id === 'm') stack(); },
    board() { const a = a1(), v1 = Math.max(0, a) * TAUP; return [['F = m a', C.eq], [`a = ${f(P.F, 1)}/${f(P.m, 1)} - 0.2 x 9.81`, C.ink], [`a = ${f(a)} m/s2 for 0.2 s`, C.ink], [`v = a t = ${f(v1)} m/s`, C.ink], [`Mark ${f(D)} m on; friction mu 0.2`, C.tgt]]; },
    ghost() { const s = travel(), pts = []; for (let k = 0; k <= 12; k++) pts.push(V(X0 + (s * 0.4 * k) / 12, 0.1, 0)); return pts; },
    run() { st = 'push'; T = 0; x = 0; vel = 0; res = null; rest = 0; cart.position.x = X0; audio.play('lever', { vol: 0.5 }); },
    update(dt) {
      if (st === 'idle' || st === 'done') return null;
      if (st === 'push') { T += dt; const a = a1(); rod.position.x = 0.05 + Math.min(0.08, ease(T / TAUP) * 0.08); if (a > 0) { vel += a * dt; x += vel * dt; } if (T >= TAUP) { st = 'slide'; if (a <= 0) vel = 0; audio.play('wood_knock', { vol: 0.3 }); } }
      else if (st === 'slide') { rod.position.x = Math.max(0.05, rod.position.x - dt * 0.3); if (vel > 0) { vel = Math.max(0, vel - MU * G * dt); x += vel * dt; } if (vel <= 0) { x = travel(); st = 'rest'; res = result(x - D, 0.04, ['It stopped short of the mark', 'It slid past the mark']); audio.play(res.ok ? 'bell_ding' : 'wood_knock', { vol: 0.4 }); } }
      else if (st === 'rest') { rest += dt; if (rest > 0.7) { st = 'done'; return res; } }
      cart.position.x = X0 + Math.min(x, 1.75); return null; },
    reset() { st = 'idle'; cart.position.x = X0; rod.position.x = 0.05; }, answer: () => { const qa = (TAUP * TAUP) / (2 * MU * G), qb = 0.5 * TAUP * TAUP; const a = (-qb + Math.sqrt(qb * qb + 4 * qa * D)) / (2 * qa); return { m: 2, F: (a + MU * G) * 2 }; }, focus: V(0, 0.2, 0) };
}

// ---------------------------------------------------------------- 3. the bell pendulum: T = 2 pi sqrt(L/g)
function pendulum(seed) {
  const R = rng(seed); const g = new THREE.Group(); const PX = -0.25, PY = 1.12, TH = 0.2; const bpm = Math.round(R.range(38, 70)); const TT = 60 / bpm;
  put(g, cbox(0.56, 0.04, 0.34, 0.01), M.walnut(), PX, 0.02, 0); for (const z of [-0.15, 0.15]) put(g, cbox(0.04, PY + 0.02, 0.04, 0.008), M.walnut(), PX, (PY + 0.02) / 2, z); put(g, cbox(0.05, 0.05, 0.36, 0.01), M.walnut(), PX, PY + 0.02, 0);
  const piv = new THREE.Group(); piv.position.set(PX, PY, 0); g.add(piv); const str = put(piv, cbox(0.004, 1, 0.004, 0.001), smat(null, { color: 0xe8dcc0 }), 0, -0.5, 0);
  const bob = put(piv, lathe([[0.0005, -0.04], [0.03, -0.03], [0.042, 0], [0.03, 0.03], [0.0005, 0.04]], 8), M.gold(), 0, -0.5, 0);
  const bell = new THREE.Group(); g.add(bell); put(bell, lathe([[0.0005, 0.06], [0.012, 0.058], [0.03, 0.04], [0.036, 0.0], [0.042, -0.006], [0.0005, -0.004]], 10), M.brass(), 0, 0, 0); const arm = put(g, cbox(0.006, 1, 0.006, 0.001), M.iron(), 0, 0, 0);
  // the metronome: a wooden pyramid with a swinging needle
  const met = new THREE.Group(); met.position.set(0.5, 0, -0.1); g.add(met); put(met, extrude(shape([[-0.08, 0], [0.08, 0], [0.035, 0.26], [-0.035, 0.26]]), 0.1, 0.006), M.walnut(), 0, 0, -0.05);
  const needle = new THREE.Group(); needle.position.set(0, 0.04, 0.06); met.add(needle); put(needle, cbox(0.006, 0.2, 0.004, 0.001), M.brass(), 0, 0.1, 0); put(needle, cbox(0.022, 0.016, 0.008, 0.003), M.brass(), 0, 0.15, 0);
  const tg = tag(`${bpm} beats a minute`); tg.position.set(0, 0.32, 0.02); met.add(tg);
  const P = { L: 0.4 }; let st = 'idle', T = 0, res = null, rings = 0, ticks = 0, metT = 0;
  const per = () => TAU * Math.sqrt(P.L / G);
  const pose = () => { str.scale.y = P.L; str.position.y = -P.L / 2; bob.position.y = -P.L; const bx = PX + Math.sin(TH) * P.L + 0.045, by = PY - Math.cos(TH) * P.L; bell.position.set(bx, by, 0); bell.rotation.z = -0.3; arm.scale.y = PY - by; arm.position.set(bx + 0.02, (PY + by) / 2, 0); piv.rotation.z = -TH; };
  pose();
  return { group: g, params: [{ id: 'L', label: 'Length L', unit: 'm', min: 0.1, max: 0.95, step: 0.005, dp: 3, value: P.L }],
    set(id, v) { P[id] = v; if (st === 'idle') pose(); },
    board() { return [['T = 2 pi sqrt(L/g)', C.eq], [`T = 6.283 x sqrt(${f(P.L, 3)}/9.81)`, C.ink], [`T = ${f(per(), 3)} s a swing`, C.ink], ['(there and back)', C.soft], [`Ring on each of ${bpm} beats/min`, C.tgt]]; },
    ghost() { const pts = []; for (let k = 0; k <= 16; k++) { const a = -TH + (2 * TH * k) / 16; pts.push(V(PX + Math.sin(a) * P.L, PY - Math.cos(a) * P.L, 0)); } return pts; },
    run() { st = 'swing'; T = 0; res = null; rings = 0; ticks = 0; pose(); audio.play('string_pluck', { vol: 0.3 }); },
    update(dt) {
      metT += dt; needle.rotation.z = 0.5 * Math.cos((Math.PI * (st === 'swing' ? T : metT) - Math.PI * TT / 2) / TT);
      if (st !== 'swing') return null; T += dt; const Tp = per(); piv.rotation.z = -TH * Math.cos((TAU * T) / Tp);
      const tickAt = TT / 2 + ticks * TT; if (T >= tickAt && ticks < 4) { ticks++; audio.play('wood_knock', { vol: 0.35, rate: 1.6 }); }
      const ringAt = Tp / 2 + rings * Tp; if (T >= ringAt && rings < 3) { rings++; audio.play('bell_ding', { vol: 0.35 + rings * 0.1 }); bell.rotation.z = -0.1; }
      bell.rotation.z += (-0.3 - bell.rotation.z) * Math.min(1, dt * 6);
      if (rings >= 3 && T > ringAt + 0.6) { st = 'done'; piv.rotation.z = -TH; return result(Tp - TT, 0.03, ['The bell rang early each beat', 'The bell rang late each beat']); }
      return null; },
    reset() { st = 'idle'; pose(); }, answer: () => ({ L: G * (TT / TAU) ** 2 }), focus: V(PX, 0.7, 0) };
}

// ---------------------------------------------------------------- 4. the apple catapult: R = v^2 sin 2a / g
function orbit(seed) {
  const R = rng(seed); const g = new THREE.Group(); const X0 = -0.9, Y0 = 0.12; const D = +R.range(0.8, 1.55).toFixed(2); const XC = X0 + D;
  const vs = Math.sqrt((D * G) / Math.sin(120 * D2R)); const ymid = (vs * vs * 0.75) / (2 * G); const HB = +Math.min(0.3, Math.max(0.12, ymid * 0.62)).toFixed(2); const XB = X0 + D * 0.5;
  put(g, cbox(0.14, 0.06, 0.16, 0.01), M.walnut(), X0 - 0.02, 0.03, 0); const mortar = new THREE.Group(); mortar.position.set(X0, 0.09, 0); g.add(mortar); put(mortar, lathe([[0.0005, -0.03], [0.035, -0.03], [0.04, 0.0], [0.03, 0.08], [0.034, 0.09], [0.0005, 0.09]], 8), M.brass(), 0, 0, 0, 0, 0, 0);
  const cup = new THREE.Group(); cup.position.set(XC, 0, 0); g.add(cup); put(cup, lathe([[0.0005, 0], [0.04, 0], [0.012, 0.012], [0.01, 0.06], [0.05, 0.08], [0.056, Y0], [0.05, Y0 - 0.004], [0.0005, 0.07]], 10), M.brass());
  const books = labProp('book_encyclopedia_set_01', { h: HB }); books.rotation.y = Math.PI / 2; books.position.set(XB, 0, 0); g.add(books); const BT = (books.userData.size?.z || 0.1) / 2;
  const tg = tag(`cup ${f(XC + 1)} m`); tg.position.set(XC, 0.2, -0.06); g.add(tg); const tb = tag(`${f(HB)} m high`); tb.position.set(XB, HB + 0.05, 0); g.add(tb);
  const apple = makeApple({ s: 0.06 }); g.add(apple); apple.position.set(X0, Y0, 0);
  const P = { a: 45, v: 3 }; let st = 'idle', T = 0, res = null, p = V(), vel = V(), rest = 0, inCup = false, hitBooks = false;
  const range = () => (P.v * P.v * Math.sin(2 * P.a * D2R)) / G; const yAt = (x) => { const c = Math.cos(P.a * D2R); const dx = x - X0; return Y0 + dx * Math.tan(P.a * D2R) - (G * dx * dx) / (2 * P.v * P.v * c * c); };
  const aimM = () => { mortar.rotation.z = -(90 - P.a) * D2R; }; aimM();
  return { group: g, params: [{ id: 'a', label: 'Angle a', unit: 'deg', min: 20, max: 75, step: 0.5, dp: 1, value: P.a }, { id: 'v', label: 'Speed v', unit: 'm/s', min: 1.5, max: 4.8, step: 0.02, dp: 2, value: P.v }],
    set(id, x) { P[id] = x; aimM(); },
    board() { const pk = (P.v * P.v * Math.sin(P.a * D2R) ** 2) / (2 * G); return [['R = v^2 sin 2a / g', C.eq], [`R = ${f(P.v)}^2 x sin ${f(2 * P.a, 0)} / 9.81`, C.ink], [`R = ${f(range(), 3)} m`, C.ink], [`peak = ${f(pk, 3)} m high`, C.ink], [`Cup ${f(D)} m; books ${f(HB)} m`, C.tgt]]; },
    ghost() { const pts = []; const R0 = range(); for (let k = 0; k <= 14; k++) { const x = X0 + (Math.max(0.05, R0) * 0.38 * k) / 14; pts.push(V(x, yAt(x), 0)); } return pts; },
    run() { st = 'fly'; T = 0; res = null; rest = 0; inCup = false; hitBooks = false; vel.set(0, 0, 0); audio.play('whoosh_heavy', { vol: 0.35 }); audio.play('wood_knock', { vol: 0.4 });
      // the flight is the exact parabola: where it would first touch the books, or else where it comes down at the cup's rim height
      const c = Math.cos(P.a * D2R), vx = P.v * c; let tHit = Infinity; for (let x = XB - BT - 0.03; x <= XB + BT + 0.03; x += 0.005) if (x > X0 && yAt(x) < HB + 0.03) { tHit = (x - X0) / vx; break; }
      const tLand = (2 * P.v * Math.sin(P.a * D2R)) / G; this._f = { vx, vy: P.v * Math.sin(P.a * D2R), tHit, tLand };
      res = tHit < tLand ? { ok: false, bull: false, err: -1, msg: 'It hit the books' } : result(range() - D, 0.035, ['It fell short of the cup', 'It flew past the cup']); },
    update(dt) {
      if (st === 'idle' || st === 'done') return null; const F = this._f;
      if (st === 'fly') { T += dt; const tt = Math.min(T, Math.min(F.tHit, F.tLand)); p.set(X0 + F.vx * tt, Y0 + F.vy * tt - 0.5 * G * tt * tt, 0); apple.position.copy(p); apple.rotation.z -= dt * 8;
        if (T >= F.tHit) { st = 'drop'; vel.set(-F.vx * 0.3, 0.3, 0); audio.play('hit_wood', { vol: 0.5 }); }
        else if (T >= F.tLand) { if (res.ok) { inCup = true; st = 'rest'; p.set(XC, Y0 - 0.04, 0); apple.position.copy(p); audio.play('glass_clink', { vol: 0.6 }); audio.play('metal_clang', { vol: 0.25, rate: 1.6 }); } else { st = 'drop'; vel.set(F.vx * 0.6, F.vy - G * F.tLand, 0); } } }
      else if (st === 'drop') { const n = 4; for (let i = 0; i < n; i++) { const h = dt / n; vel.y -= G * h; p.addScaledVector(vel, h); if (p.y <= 0.03) { p.y = 0.03; vel.y = -vel.y * 0.3; vel.x *= 0.6; if (Math.abs(vel.y) < 0.25) { st = 'rest'; audio.play('apple_squish', { vol: 0.35 }); break; } audio.play('hit_light', { vol: 0.25 }); } } apple.position.copy(p); apple.rotation.z -= dt * 6; }
      else if (st === 'rest') { if (!inCup) { p.x += vel.x * dt; vel.x *= Math.exp(-dt * 3); apple.position.copy(p); } rest += dt; if (rest > 0.8) { st = 'done'; return res; } }
      return null; },
    reset() { st = 'idle'; apple.position.set(X0, Y0, 0); apple.rotation.set(0, 0, 0); }, answer: () => ({ a: 60, v: Math.sqrt((D * G) / Math.sin(120 * D2R)) }), focus: V(-0.2, 0.3, 0) };
}

// ---------------------------------------------------------------- 5. the prism: n1 sin a = n2 sin b
const NS = [1.513, 1.515, 1.517, 1.52, 1.524, 1.528, 1.532];
function devOf(aDeg, n) { const a = aDeg * D2R; const b1 = Math.asin(Math.sin(a) / n); const b2 = 60 * D2R - b1; const s = n * Math.sin(b2); if (s >= 1) return null; return { b: b1 / D2R, dev: (a + Math.asin(s)) / D2R - 60 }; }
function prism(seed) {
  const R = rng(seed); const g = new THREE.Group(); const PC = V(-0.1, 0.16, 0.05), RAD = 0.62; const DS = +R.range(41.5, 50).toFixed(1);
  const lamp = new THREE.Group(); lamp.position.set(-0.95, 0, 0.05); g.add(lamp); put(lamp, cbox(0.1, 0.22, 0.12, 0.012), M.iron(), 0, 0.11, 0); put(lamp, cbox(0.01, 0.03, 0.006, 0.002), glowM('#fff4dc', 1.6), 0.052, 0.16, 0);
  const turn = new THREE.Group(); turn.position.set(PC.x, 0, PC.z); g.add(turn); put(turn, lathe([[0.0005, 0], [0.11, 0], [0.11, 0.03], [0.0005, 0.03]], 12), M.brass());
  const tri = extrude(shape([[0, 0.09], [-0.078, -0.045], [0.078, -0.045]]), 0.13, 0.004); tri.rotateX(-Math.PI / 2); const pr = put(turn, tri, glassM(0xd6ecff, 0.35), 0, 0.03, 0); pr.castShadow = false;
  // the brass protractor arc, ticks each 5 degrees, its numbers each 10, toward the back (-z)
  const arcPts = []; for (let d = 30; d <= 62; d += 1) { const a = -d * D2R; arcPts.push([PC.x + Math.cos(a) * RAD, 0.012, PC.z + Math.sin(a) * RAD]); } put(g, tube(arcPts, 0.008, { seg: 40, rad: 4 }), M.brass());
  for (let d = 30; d <= 60; d += 5) { const a = -d * D2R; put(g, cbox(0.006, 0.006, 0.04, 0.001), M.iron(), PC.x + Math.cos(a) * RAD, 0.02, PC.z + Math.sin(a) * RAD, 0, -a + Math.PI / 2, 0); if (d % 10 === 0) { const t = tag(`${d}`, { h: 0.035 }); t.position.set(PC.x + Math.cos(a) * (RAD + 0.06), 0.05, PC.z + Math.sin(a) * (RAD + 0.06)); g.add(t); } }
  const crystal = new THREE.Group(); const ca = -DS * D2R; crystal.position.set(PC.x + Math.cos(ca) * RAD, 0.02, PC.z + Math.sin(ca) * RAD); g.add(crystal);
  const cm = new THREE.MeshStandardMaterial({ color: 0xff9a9a, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85, flatShading: true, emissive: 0xff2a20, emissiveIntensity: 0 });
  put(crystal, lathe([[0.0005, 0], [0.026, 0.004], [0.026, 0.08], [0.0005, 0.12]], 6), cm); const ct = tag(`crystal ${f(DS, 1)} deg`, { h: 0.035 }); ct.position.set(0, 0.17, 0); crystal.add(ct);
  const white = put(g, beam(1, 0.01), glowM('#fff8e8', 2.0, 0.9)); white.castShadow = false; white.userData.noInk = true; white.visible = false;
  const rays = SPECTRUM.map((c) => { const r = put(g, beam(1, 0.007), glowM(c, 2.0, 0.85)); r.castShadow = false; r.userData.noInk = true; r.visible = false; return r; });
  const P = { a: 40 }; let st = 'idle', T = 0, res = null; const lit = new THREE.PointLight(0xff4a3a, 0, 0.8, 2); lit.position.copy(crystal.position).add(V(0, 0.08, 0)); g.add(lit);
  const SRC = V(-0.9, 0.16, 0.05);
  const pose = () => { turn.rotation.y = (P.a - 30) * D2R; };
  const rayDir = (dev) => V(Math.cos(-dev * D2R), 0, Math.sin(-dev * D2R));
  pose();
  return { group: g, params: [{ id: 'a', label: 'Incidence a', unit: 'deg', min: 30, max: 80, step: 0.1, dp: 1, value: P.a }],
    set(id, v) { P[id] = v; pose(); },
    board() { const o = devOf(P.a, NS[0]); return [['n1 sin a = n2 sin b', C.eq], [`sin ${f(P.a, 1)} = 1.513 sin b`, C.ink], [o ? `b = ${f(o.b, 1)} deg inside` : 'b: it reflects inside', C.ink], [o ? `red bends d = ${f(o.dev, 1)} deg` : 'no light comes out', C.ink], [`Crystal at ${f(DS, 1)} deg`, C.tgt]]; },
    ghost() { const pts = []; for (let k = 0; k <= 12; k++) pts.push(SRC.clone().lerp(PC, k / 12)); const o = devOf(P.a, NS[0]); if (o) { const d = rayDir((P.a - o.b) * 0.6); for (let k = 1; k <= 4; k++) pts.push(PC.clone().addScaledVector(d, k * 0.025)); } return pts; },
    run() { st = 'beam'; T = 0; res = null; white.visible = true; rays.forEach((r) => (r.visible = false)); cm.emissiveIntensity = 0; lit.intensity = 0; audio.play('magic_shimmer', { vol: 0.3 }); },
    update(dt) {
      if (st === 'idle') return null; if (st === 'done') { lit.intensity = cm.emissiveIntensity * 1.2; return null; } T += dt;
      aim(white, SRC, SRC.clone().lerp(PC, ease(T / 0.5))); if (T > 0.5) { const u = ease((T - 0.5) / 0.6); NS.forEach((n, i) => { const o = devOf(P.a, n); rays[i].visible = !!o; if (o) aim(rays[i], PC, PC.clone().addScaledVector(rayDir(o.dev), 0.75 * u)); }); }
      if (T > 1.15 && !res) { const o = devOf(P.a, NS[0]); res = o ? result(o.dev - DS, 0.8, ['The red ray fell short of the crystal', 'The red ray bent past the crystal']) : { ok: false, bull: false, err: 9, msg: 'The light reflected inside the glass' }; if (res.ok) { audio.play('chime_soft', { vol: 0.6 }); audio.play('glass_clink', { vol: 0.4 }); } }
      if (res?.ok) cm.emissiveIntensity = Math.min(1.6, cm.emissiveIntensity + dt * 3); lit.intensity = cm.emissiveIntensity * 1.2;
      if (T > 2.0) { st = 'done'; return res; } return null; },
    reset() { st = 'idle'; white.visible = false; rays.forEach((r) => (r.visible = false)); cm.emissiveIntensity = 0; lit.intensity = 0; pose(); }, answer: () => { let lo = 50, hi = 80; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; const o = devOf(m, NS[0]); if (o && o.dev < DS) lo = m; else hi = m; } return { a: (lo + hi) / 2 }; }, focus: V(0, 0.2, -0.2) };
}

// ---------------------------------------------------------------- 6. the spinning top: L = I w
function top(seed) {
  const R = rng(seed); const g = new THREE.Group(); const X0 = -0.85, U = 0.3, TQ = 0.012, RR = 0.04; const D = +R.range(0.45, 1.45).toFixed(2);
  for (const z of [-0.012, 0.012]) put(g, cbox(1.9, 0.008, 0.008, 0.002), M.brass(), -0.0, 0.004, z);
  const dom = []; for (let i = 0; i < 7; i++) { const d = new THREE.Group(); d.position.set(X0 + D + 0.012 + i * 0.045, 0, 0); g.add(d); put(d, cbox(0.016, 0.1, 0.06, 0.003), smat('oak', { rough: 0.95, color: 0xf0e6d0 }), 0.008, 0.05, 0); for (let k = 0; k < 2; k++) put(d, cbox(0.017, 0.008, 0.008, 0.001), smat(null, { color: 0x2a1a10 }), 0.008, 0.03 + k * 0.04, 0); dom.push(d); }
  const tg = tag(`domino ${f(X0 + D + 1)} m`); tg.position.set(X0 + D + 0.15, 0.16, -0.06); g.add(tg);
  const body = new THREE.Group(); g.add(body); const spin = new THREE.Group(); body.add(spin);
  put(spin, lathe([[0.0005, 0], [0.012, 0.015], [0.04, 0.045], [0.042, 0.055], [0.02, 0.07], [0.006, 0.075], [0.006, 0.1], [0.0005, 0.1]], 10), smat('brass', { metal: 0.6, rough: 0.5, color: 0xb04030 }));
  put(spin, cbox(0.084, 0.006, 0.006, 0.001), M.gold(), 0, 0.05, 0);
  const P = { m: 0.25, f: 15 }; let st = 'idle', T = 0, res = null, x = 0, tSpin = 0, fallT = 0, rest = 0, bounced = false;
  const L = () => 0.5 * P.m * RR * RR * TAU * P.f; const spinT = () => L() / TQ;
  body.position.set(X0, 0, 0); body.scale.setScalar(0.8 + P.m * 0.8);
  return { group: g, params: [{ id: 'm', label: 'Mass m', unit: 'kg', min: 0.1, max: 0.5, step: 0.01, dp: 2, value: P.m }, { id: 'f', label: 'Spin', unit: 'rev/s', min: 4, max: 40, step: 0.1, dp: 1, value: P.f }],
    set(id, v) { P[id] = v; if (id === 'm') body.scale.setScalar(0.8 + P.m * 0.8); },
    board() { return [['L = I w', C.eq], [`L = 0.5 x ${f(P.m)} x 0.04^2 x ${f(TAU * P.f, 1)}`, C.ink], [`L = ${f(L(), 4)}`, C.ink], [`spins t = L/0.012 = ${f(spinT())} s`, C.ink], [`Domino ${f(D)} m; drifts ${U} m/s`, C.tgt]]; },
    ghost() { const d = U * spinT(), pts = []; for (let k = 0; k <= 12; k++) pts.push(V(X0 + (Math.min(d, 1.8) * 0.4 * k) / 12, 0.02, 0)); return pts; },
    run() { st = 'spin'; T = 0; res = null; x = 0; tSpin = spinT(); fallT = 0; rest = 0; bounced = false; body.position.set(X0, 0, 0); body.rotation.set(0, 0, 0); dom.forEach((d) => d.rotation.set(0, 0, 0)); audio.play('spin_whoosh', { vol: 0.5 }); },
    update(dt) {
      if (st === 'idle' || st === 'done') { if (st === 'idle') spin.rotation.y += dt * 0.5; return null; }
      if (st === 'spin') { T += dt; const left = Math.max(0, 1 - T / tSpin); spin.rotation.y += dt * (6 + 40 * left); const wob = 0.04 + 0.4 * (1 - left) ** 3; body.rotation.z = Math.sin(T * 9) * wob; body.rotation.x = Math.cos(T * 9) * wob;
        x += U * dt; if (!bounced && X0 + x >= X0 + D - 0.005 && T < tSpin - 0.03) { bounced = true; res = result(U * tSpin - D, 0.03, ['It fell short', 'It was still spinning when it hit']); res.ok = false; res.bull = false; audio.play('wood_knock', { vol: 0.5 }); }
        if (bounced) x -= U * dt * 2.2; if (T >= tSpin || x > 1.75) { st = 'fall'; fallT = 0; if (!res) res = result(U * tSpin - D, 0.03, ['It fell short of the domino', 'It was still spinning when it hit']); audio.play('wood_knock', { vol: 0.4 }); } }
      else if (st === 'fall') { fallT += dt; body.rotation.z = -ease(fallT / 0.35) * 1.25; body.rotation.x *= 0.9; if (fallT > 0.35) { st = 'chain'; rest = 0; } }
      else if (st === 'chain') { rest += dt; if (res.ok) dom.forEach((d, i) => { d.rotation.z = -ease((rest - i * 0.09) / 0.18) * 1.2; }); if (res.ok && Math.floor(rest / 0.09) < 7 && Math.floor((rest - dt) / 0.09) !== Math.floor(rest / 0.09)) audio.play('wood_knock', { vol: 0.25, rate: 1.3 + Math.random() * 0.3 }); if (rest > (res.ok ? 1.1 : 0.6)) { st = 'done'; return res; } }
      body.position.x = X0 + x; return null; },
    reset() { st = 'idle'; body.position.set(X0, 0, 0); body.rotation.set(0, 0, 0); dom.forEach((d) => d.rotation.set(0, 0, 0)); }, answer: () => ({ m: 0.3, f: ((D / U) * TQ) / (0.5 * 0.3 * RR * RR * TAU) }), focus: V(0, 0.15, 0) };
}

// ---------------------------------------------------------------- 7. the gas syringe: P V = n R T
function flask(seed) {
  const R = rng(seed); const g = new THREE.Group(); const N = 0.004, RG = 8.314, A = 3e-4, P0 = 101300, Y0 = 0.24, X = 0.05;
  const hOf = (T, Mk) => (N * RG * T) / (P0 + (Mk * G) / A) / A; const TS = Math.round(R.range(390, 560)), MS = +R.step(R.range(0.6, 2.4), 0.05).toFixed(2); const HS = +hOf(TS, MS).toFixed(3);
  put(g, cbox(0.3, 0.03, 0.24, 0.008), M.walnut(), X, 0.015, 0); put(g, cbox(0.03, 0.95, 0.03, 0.006), M.iron(), X - 0.11, 0.48, -0.06); for (const y of [Y0 + 0.02, 0.62]) put(g, cbox(0.13, 0.016, 0.016, 0.003), M.iron(), X - 0.05, y, -0.03);
  const burner = new THREE.Group(); burner.position.set(X, 0.03, 0); g.add(burner); put(burner, lathe([[0.0005, 0], [0.05, 0], [0.04, 0.06], [0.012, 0.08], [0.0005, 0.085]], 8), glassM(0xe8f4ff, 0.4)); const fl = flameMesh(1); fl.position.y = 0.085; burner.add(fl); fl.scale.setScalar(0.4);
  const fire = new THREE.PointLight(0xffa048, 0, 1.5, 2); fire.position.set(X, 0.2, 0.05); g.add(fire);
  const tube_ = put(g, lathe([[0.034, Y0], [0.034, 0.86], [0.04, 0.87], [0.04, Y0 - 0.01], [0.0005, Y0 - 0.012]], 10), glassM(0xd8ecff, 0.28), X, 0, 0); tube_.castShadow = false;
  put(g, lathe([[0.0005, 0], [0.036, 0], [0.036, 0.02], [0.0005, 0.02]], 10), M.brass(), X, Y0 - 0.02, 0); // the sealed foot
  // the glass's centimetre scale, a strip beside it (0 at the foot), numbers each 5 cm
  { const K = 2, H = 64; const c = document.createElement('canvas'); c.width = 12 * K; c.height = H * K; const gg = c.getContext('2d'); gg.fillStyle = '#e8dcc0'; gg.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i <= 60; i++) { const y = c.height - 1 - Math.round((i / 60) * (H * K - 2)); gg.fillStyle = '#3a2410'; gg.fillRect(0, y, (i % 5 ? 3 : 7) * K, K); } const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.6), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); s.position.set(X + 0.052, Y0 + 0.3, 0.02); s.userData.noInk = true; g.add(s);
    for (let i = 10; i <= 60; i += 10) { const tg = tag(`${i}`, { h: 0.026 }); tg.position.set(X + 0.08, Y0 + i / 100, 0.02); g.add(tg); } }
  const plunger = new THREE.Group(); g.add(plunger); put(plunger, lathe([[0.0005, 0], [0.032, 0], [0.032, 0.02], [0.0005, 0.02]], 10), smat(null, { color: 0x3a2a24, rough: 0.9 })); put(plunger, cbox(0.012, 0.3, 0.012, 0.002), M.brass(), 0, 0.17, 0); put(plunger, lathe([[0.0005, 0.31], [0.05, 0.31], [0.05, 0.322], [0.0005, 0.322]], 10), M.brass());
  const wts = new THREE.Group(); wts.position.y = 0.322; plunger.add(wts);
  const mark = new THREE.Group(); mark.position.set(X + 0.04, Y0 + HS + 0.02, 0); g.add(mark); put(mark, extrude(shape([[0, 0], [0.05, 0.012], [0.05, -0.012]]), 0.006, 0.001), smat(null, { color: 0xb02a22, rough: 1 }), 0, 0, 0); put(mark, lathe([[0.0005, 0.03], [0.008, 0.028], [0.016, 0.01], [0.018, 0.0], [0.0005, 0.002]], 8), M.brass(), 0.06, -0.01, 0);
  const tg = tag(`mark ${f(HS * 100, 1)} cm`); tg.position.set(X + 0.2, Y0 + HS + 0.02, 0); g.add(tg); const tb = tag('bore 3.0 cm2', { h: 0.032 }); tb.position.set(X - 0.13, 0.12, 0.13); g.add(tb);
  const P = { T: 400, M: 1 }; let st = 'idle', t = 0, res = null, rest = 0, hNow = hOf(293, P.M);
  const stack = () => { wts.clear(); const n = Math.round(P.M / 0.25); for (let i = 0; i < n; i++) put(wts, lathe([[0.0005, 0], [0.04, 0], [0.04, 0.008], [0.014, 0.009], [0.0005, 0.009]], 8), M.iron(), 0, i * 0.0092, 0); };
  const place = () => { plunger.position.set(X, Y0 + hNow, 0); }; stack(); place();
  return { group: g, params: [{ id: 'T', label: 'Temperature T', unit: 'K', min: 280, max: 600, step: 1, dp: 0, value: P.T }, { id: 'M', label: 'Weights M', unit: 'kg', min: 0, max: 3, step: 0.05, dp: 2, value: P.M }],
    set(id, v) { P[id] = v; if (id === 'M') { stack(); if (st === 'idle') { hNow = hOf(293, P.M); place(); } } },
    board() { const Pk = (P0 + (P.M * G) / A) / 1000, Vml = ((N * RG * P.T) / (Pk * 1000)) * 1e6; return [['P V = n R T', C.eq], [`P = 101.3 + ${f(P.M)} x 9.81/3cm2`, C.ink], [`P = ${f(Pk, 1)} kPa`, C.ink], [`V = 0.004 x 8.314 x ${f(P.T, 0)}/P = ${f(Vml, 1)} mL`, C.ink], [`Mark ${f(HS * 100, 1)} cm; bore 3.0 cm2`, C.tgt]]; },
    ghost() { const h0 = hOf(293, P.M), h1 = hOf(P.T, P.M), pts = []; for (let k = 0; k <= 10; k++) pts.push(V(X - 0.05, Y0 + h0 + (h1 - h0) * 0.4 * (k / 10), 0.04)); return pts; },
    run() { st = 'heat'; t = 0; res = null; rest = 0; hNow = hOf(293, P.M); place(); audio.play('fire_ignite', { vol: 0.5 }); },
    update(dt, tt) {
      fl.scale.setScalar((st === 'heat' ? 1 : 0.4) * (0.9 + Math.sin(tt * 19) * 0.08)); fire.intensity = st === 'heat' ? 1.2 : 0.15;
      if (st !== 'heat' && st !== 'rest') return null;
      if (st === 'heat') { t += dt; const T = 293 + (P.T - 293) * ease(t / 2.2); hNow = hOf(T, P.M); place(); if (t >= 2.2) { const err = hOf(P.T, P.M) - HS; res = result(err, 0.006, ['The plunger stopped below the mark', 'The plunger rose past the mark']); st = 'rest'; rest = 0; audio.play(res.ok ? 'bell_ding' : 'steam_hiss', { vol: 0.45 }); } }
      else { rest += dt; if (rest > 0.8) { st = 'done'; return res; } } return null; },
    reset() { st = 'idle'; hNow = hOf(293, P.M); place(); }, answer: () => ({ M: MS, T: (HS * A * (P0 + (MS * G) / A)) / (N * RG) }), focus: V(X, 0.5, 0) };
}

// ---------------------------------------------------------------- 8. the Leyden jar: F = k q1 q2 / r^2
function spark(seed) {
  const R = rng(seed); const g = new THREE.Group(); const K = 8.99e9, Q2 = 10e-9, VMAX = 6.0, XJ = -0.35, KY = 0.42; const FN = +R.range(0.6, 1.5).toFixed(2); const TN = 0.42;
  const jar = new THREE.Group(); jar.position.set(XJ, 0, 0); g.add(jar); put(jar, lathe([[0.0005, 0], [0.07, 0], [0.072, 0.2], [0.05, 0.24], [0.0005, 0.245]], 10), glassM(0xd8ecff, 0.3)); put(jar, lathe([[0.071, 0.01], [0.074, 0.01], [0.074, 0.13], [0.071, 0.13]], 10), M.brass());
  put(jar, cbox(0.008, 0.2, 0.008, 0.002), M.brass(), 0, 0.33, 0); const knob = put(jar, new THREE.IcosahedronGeometry(0.026, 1), M.brass(), 0, KY, 0);
  const stand = new THREE.Group(); g.add(stand); put(stand, cbox(0.12, 0.02, 0.1, 0.004), M.walnut(), 0, 0.01, 0); put(stand, cbox(0.012, 0.66, 0.012, 0.002), M.walnut(), 0.05, 0.33, 0); put(stand, cbox(0.07, 0.012, 0.012, 0.002), M.walnut(), 0.02, 0.66, 0);
  const swing = new THREE.Group(); swing.position.set(0, 0.66, 0); stand.add(swing); put(swing, cbox(0.002, 0.24, 0.002, 0.001), smat(null, { color: 0xf0e8d8 }), 0, -0.12, 0); put(swing, new THREE.IcosahedronGeometry(0.014, 0), smat(null, { color: 0xf2e6c8, rough: 1 }), 0, -0.24, 0);
  const contact = put(stand, cbox(0.006, 0.05, 0.03, 0.002), M.brass(), Math.sin(TN) * 0.24 + 0.016, 0.66 - Math.cos(TN) * 0.24, 0);
  const lamp = new THREE.Group(); g.add(lamp); put(lamp, lathe([[0.0005, 0], [0.04, 0], [0.03, 0.03], [0.012, 0.04], [0.0005, 0.04]], 8), M.brass()); const bulb = put(lamp, lathe([[0.0005, 0.04], [0.03, 0.06], [0.034, 0.1], [0.018, 0.14], [0.0005, 0.15]], 8), new THREE.MeshStandardMaterial({ color: 0xfff0d0, roughness: 0.3, transparent: true, opacity: 0.7, flatShading: true, emissive: 0xffb050, emissiveIntensity: 0 }));
  const glow = new THREE.PointLight(0xffc070, 0, 1.6, 2); glow.position.set(0, 0.12, 0); lamp.add(glow); const wire = put(g, cbox(1, 0.004, 0.004, 0.001), M.iron(), 0, 0.006, 0.04);
  const bolt = new THREE.Group(); g.add(bolt); bolt.visible = false;
  const tg = tag(`lamp needs ${f(FN)} mN`); g.add(tg);
  const P = { q: 15, r: 6 }; let st = 'idle', t = 0, res = null, ang = 0;
  const F = () => (K * P.q * 1e-9 * Q2) / (P.r / 100) ** 2 * 1000; const Vk = () => (K * P.q * 1e-9) / (P.r / 100) / 1000;
  const sx = () => XJ + 0.026 + 0.014 + (P.r / 100) * 1.6; // the pith ball's rest x (a 1.6x scale model of the gap)
  const place = () => { stand.position.set(sx(), 0, 0); lamp.position.set(sx() + 0.2, 0, 0.02); wire.scale.x = 0.2; wire.position.set(sx() + 0.1, 0.006, 0.04); tg.position.set(sx() + 0.2, 0.22, 0.02); };
  const angFor = (Fm) => Math.atan(((Fm / FN) * Math.tan(TN)));
  place();
  return { group: g, params: [{ id: 'q', label: 'Charge q', unit: 'nC', min: 2, max: 60, step: 0.5, dp: 1, value: P.q }, { id: 'r', label: 'Distance r', unit: 'cm', min: 2, max: 15, step: 0.1, dp: 1, value: P.r }],
    set(id, v) { P[id] = v; place(); },
    board() { return [['F = k q1 q2 / r^2', C.eq], [`F = 8.99e9 x ${f(P.q, 1)}n x 10n / ${f(P.r, 1)}cm^2`, C.ink], [`F = ${f(F(), 3)} mN`, C.ink], [`V = kq/r = ${f(Vk(), 2)} kV (max 6)`, C.ink], [`Lamp needs ${f(FN)} mN (not +15%)`, C.tgt]]; },
    ghost() { const a = Math.min(1.2, angFor(F())) * 0.5, pts = []; for (let k = 0; k <= 10; k++) { const b = (a * k) / 10; pts.push(V(sx() + Math.sin(b) * 0.24, 0.66 - Math.cos(b) * 0.24, 0)); } return pts; },
    run() { st = 'charge'; t = 0; res = null; ang = 0; bolt.visible = false; bolt.clear(); bulb.material.emissiveIntensity = 0; glow.intensity = 0; audio.play('clockwork', { vol: 0.4 }); },
    update(dt, tt) {
      if (st === 'idle' || st === 'done') { swing.rotation.z = Math.sin(tt * 0.9) * 0.01 + (st === 'done' ? ang : 0); return null; } t += dt;
      knob.rotation.y += dt * 4; if (st === 'charge') { if (t > 1.0) { st = 'act'; t = 0;
          if (Vk() > VMAX) { res = { ok: false, bull: false, err: 9, msg: `It sparked across at ${f(Vk(), 1)} kV` }; bolt.visible = true; const a = knob.getWorldPosition(V()); g.worldToLocal(a); const b = V(sx(), 0.42, 0); let p = a.clone(); for (let i = 1; i <= 6; i++) { const q = a.clone().lerp(b, i / 6).add(V(0, (Math.random() - 0.5) * 0.04 * (i < 6 ? 1 : 0), (Math.random() - 0.5) * 0.02)); const s = put(bolt, beam(1, 0.006), glowM('#cfe4ff', 2.4)); aim(s, p, q); s.castShadow = false; s.userData.noInk = true; p = q; } audio.play('electric_zap', { vol: 0.7 }); audio.play('thunder', { vol: 0.15 }); }
          else { const Fm = F(); res = Fm < FN ? { ok: false, bull: false, err: Fm - FN, msg: `It swung, but ${f(FN - Fm, 3)} mN short` } : Fm > FN * 1.15 ? { ok: false, bull: false, err: Fm - FN, msg: 'It struck too hard and bounced off' } : { ok: true, bull: Fm <= FN * 1.04, err: Fm - FN, msg: Fm <= FN * 1.04 ? 'Bullseye!' : 'Solved!' }; audio.play('electric_zap', { vol: 0.2, rate: 1.8 }); } } }
      else if (st === 'act') { const target = res.err === 9 ? 0 : Math.min(TN, angFor(F())); const bounce = res.msg.includes('bounced'); ang += ((bounce && t > 0.35 ? TN * 0.4 : target) - ang) * Math.min(1, dt * 7); swing.rotation.z = ang;
        if (res.ok && t > 0.35) { bulb.material.emissiveIntensity = Math.min(2, bulb.material.emissiveIntensity + dt * 4); glow.intensity = bulb.material.emissiveIntensity * 0.9; if (t - dt <= 0.35) audio.play('fire_ignite', { vol: 0.35 }); }
        if (bolt.visible && t > 0.2) bolt.visible = Math.random() < 0.3 && t < 0.5; if (t > 1.3) { st = 'done'; return res; } }
      return null; },
    reset() { st = 'idle'; ang = 0; swing.rotation.z = 0; bolt.visible = false; bulb.material.emissiveIntensity = 0; glow.intensity = 0; }, answer: () => ({ r: 3, q: (FN * 1.02 * 0.03 * 0.03) / 8.99e-5 }), focus: V(XJ + 0.2, 0.35, 0) };
}

const MAKERS = { fall, cradle, pendulum, orbit, prism, top, flask, spark };
/** build one puzzle (a fresh target from the seed); see the header for its API */
export function makePuzzle(kind, { seed = 1 } = {}) {
  const P = (MAKERS[kind] || fall)(seed); P.kind = kind;
  const pts = new THREE.Points(new THREE.BufferGeometry(), GHOST); pts.userData.noInk = true; pts.frustumCulled = false; P.group.add(pts);
  P.showGhost = (on = true) => { pts.visible = on; if (on) { pts.geometry.dispose(); pts.geometry = new THREE.BufferGeometry().setFromPoints(P.ghost()); } };
  P.showGhost(true); return P;
}
