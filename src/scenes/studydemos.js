// THE BENCH DEMONSTRATIONS of the Experiment Hall (menu agent): one small, fully 3D, interactive experiment per kind of
// study (game/studies.js demoOf), built in sharp low-poly with hand-pixelled textures, sitting on the bench top (y = 0,
// about 1.4 x 0.8 m). Each runs a little real physics and answers the pointer:
//   pendulum  a brass bob on a gallows: drag it aside and let go; it swings (theta'' = -g/L sin theta), damped
//   fall      an apple on a bough over a weighing pan: click and it falls, bounces and rolls, then grows back
//   prism     a white beam from a slit through a glass prism fans into a pixel rainbow on a card: drag to turn it
//   top       a painted top on a plate: drag across it to spin it up; it precesses, wobbles and topples as it slows
//   cradle    Newton's cradle: click to lift the end ball; momentum passes through the row
//   flask     an alembic over a spirit burner: click to stoke it; it boils, steams and the gauge climbs
//   spark     a Leyden jar and two electrodes: click to discharge a crackling spark
//   orbit     a brass orrery: drag to wind it; the inner worlds run faster (Kepler)
//   const D = makeDemo('pendulum', { motes }); bench.add(D.group); D.update(dt, t); D.click(p); D.drag(dx, dy, p); D.release()
import * as THREE from 'three';
import { tex, lathe, tube, cbox, extrude, shape, facet } from '../models/lowprops.js';
import { makeApple } from '../models/orchard.js';
import { audio } from '../core/audio.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const MATS = new Map();
export function smat(kind, { metal = 0, rough = 0.6, color = 0xffffff, emissive = 0, ei = 1 } = {}) {
  const k = [kind, metal, rough, color, emissive, ei].join('|'); let m = MATS.get(k); if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: kind ? tex(kind) : null, color: new THREE.Color(color), metalness: metal, roughness: rough, flatShading: true, emissive: new THREE.Color(emissive), emissiveIntensity: ei }); MATS.set(k, m); return m;
}
export const M = { brass: () => smat('brass', { metal: 0.9, rough: 0.32 }), gold: () => smat('gold', { metal: 0.95, rough: 0.25 }), oak: () => smat('oak', { rough: 0.7 }), walnut: () => smat('walnut', { rough: 0.7 }), iron: () => smat('iron', { metal: 0.8, rough: 0.45 }), marble: () => smat('marble', { rough: 0.4 }), parch: () => smat('parch', { rough: 0.9 }), leather: () => smat('leather', { rough: 0.8 }) };
export const glassM = (tint = 0xdcecff, op = 0.3) => new THREE.MeshStandardMaterial({ color: tint, metalness: 0.1, roughness: 0.04, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, flatShading: true, envMapIntensity: 2.4 });
const glowM = (c, k = 1.6, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
export function put(p, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(geo.index ? facet(geo, 3) : geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; }
const beam = (len, r = 0.006) => { const g = new THREE.BoxGeometry(r, r, len); g.translate(0, 0, len / 2); return g; };
const Z = new THREE.Vector3(0, 0, 1);
function aim(o, from, to) { o.position.copy(from); const d = to.clone().sub(from); const L = d.length(); if (L > 1e-6) o.quaternion.setFromUnitVectors(Z, d.multiplyScalar(1 / L)); o.scale.z = Math.max(0.001, L); } // in the parent's own space

// ---------------------------------------------------------------- pendulum
function pendulum() {
  const g = new THREE.Group(); const L = 0.62;
  put(g, cbox(0.7, 0.05, 0.34, 0.012), M.walnut(), 0, 0.025, 0); for (const x of [-0.3, 0.3]) put(g, cbox(0.04, 0.86, 0.04, 0.008), M.brass(), x, 0.48, 0); put(g, cbox(0.68, 0.045, 0.05, 0.01), M.brass(), 0, 0.91, 0);
  for (const x of [-0.3, 0.3]) put(g, lathe([[0.0005, 0], [0.05, 0], [0.04, 0.03], [0.0005, 0.035]], 8), M.brass(), x, 0.05, 0);
  const piv = new THREE.Group(); piv.position.set(0, 0.885, 0); g.add(piv); put(piv, cbox(0.008, L, 0.008, 0.002), smat(null, { color: 0xe8dcc0, rough: 0.9 }), 0, -L / 2, 0);
  const bob = put(piv, lathe([[0.0005, -0.07], [0.05, -0.055], [0.07, -0.01], [0.06, 0.03], [0.02, 0.06], [0.0005, 0.07]], 8), M.gold(), 0, -L, 0);
  // a scale arc on the base, ticks every 10 degrees
  for (let i = -4; i <= 4; i++) { const a = i * 0.17; put(g, cbox(0.006, 0.012 + (i % 2 ? 0 : 0.01), 0.006, 0.001), M.iron(), Math.sin(a) * (L + 0.02), 0.885 - Math.cos(a) * (L + 0.02), 0.06); }
  let th = 0.55, w = 0, held = false; let lastSign = 1;
  return { group: g, eq: 'T = 2 pi sqrt(L/g)',
    update(dt) { if (!held) { const steps = 4; for (let i = 0; i < steps; i++) { const h = dt / steps; w += (-(9.8 / L) * Math.sin(th) - w * 0.08) * h; th += w * h; } } piv.rotation.z = th; const s = Math.sign(w); if (s !== lastSign && Math.abs(th) > 0.08) { lastSign = s; audio.play('wood_knock', { vol: 0.05, rate: 1.6 }); } },
    drag(dx) { held = true; th = Math.max(-1.1, Math.min(1.1, th + dx * 2.2)); w = 0; }, release() { if (held) { held = false; audio.play('whoosh_soft', { vol: 0.3 }); } }, click() { w += 2.2; audio.play('metal_clang', { vol: 0.2, rate: 1.8 }); }, focus: bob };
}

// ---------------------------------------------------------------- the falling apple
function fall() {
  const g = new THREE.Group();
  put(g, cbox(0.5, 0.05, 0.36, 0.012), M.walnut(), 0, 0.025, 0); put(g, cbox(0.05, 0.8, 0.05, 0.01), M.oak(), -0.2, 0.42, -0.1);
  const bough = put(g, tube([[-0.2, 0.8, -0.1], [-0.05, 0.87, -0.06], [0.12, 0.85, 0.0], [0.24, 0.79, 0.02]], 0.022, { seg: 8, rad: 5, taper: (u) => 1 - u * 0.6 }), M.oak()); void bough;
  const leafM = smat('green', { rough: 0.8, color: 0x7ab048 });
  for (let i = 0; i < 7; i++) { const a = i * 1.7; const l = put(g, extrude(shape([[0, 0], [0.03, 0.02], [0.05, 0.06], [0.03, 0.09], [0, 0.1], [-0.02, 0.06]]), 0.004, 0.001), leafM, -0.1 + (i % 4) * 0.1, 0.83 + Math.sin(a) * 0.04, -0.06 + (i % 3) * 0.04, Math.sin(a) * 0.6, a, Math.cos(a) * 0.9 - 0.5); l.castShadow = false; }
  // a brass weighing pan below
  put(g, lathe([[0.0005, 0], [0.16, 0.0], [0.17, 0.025], [0.15, 0.03], [0.0005, 0.012]], 10), M.brass(), 0.16, 0.05, 0.02);
  const apple = makeApple({ s: 0.085 }); g.add(apple); const home = V(0.16, 0.73, 0.02); apple.position.copy(home);
  const stem = put(g, cbox(0.006, 0.05, 0.006, 0.001), M.oak(), 0.16, 0.79, 0.02);
  let st = 'hang', v = V(), grow = 1, tHang = 0; void stem;
  return { group: g, eq: 'F = G m1 m2 / r^2',
    update(dt, t) { if (st === 'hang') { tHang += dt; apple.rotation.z = Math.sin(t * 1.3) * 0.08; apple.position.copy(home); if (tHang > 5) this.click(); }
      else if (st === 'fall') { v.y -= 9.8 * dt * 0.55; apple.position.addScaledVector(v, dt); apple.rotation.x += v.x * dt * 4; apple.rotation.z -= v.length() * dt * 2; const floor = 0.11; if (apple.position.y < floor) { apple.position.y = floor; if (Math.abs(v.y) > 0.4) audio.play('apple_squish', { vol: Math.min(0.5, Math.abs(v.y) * 0.25) }); v.y = -v.y * 0.42; v.x *= 0.8; if (Math.abs(v.y) < 0.15) { v.y = 0; st = 'rest'; grow = 0; tHang = 0; } } }
      else if (st === 'rest') { tHang += dt; if (tHang > 2.2) { st = 'grow'; grow = 0; apple.position.copy(home); } }
      else if (st === 'grow') { grow = Math.min(1, grow + dt * 0.8); apple.scale.setScalar(0.085 * Math.max(0.01, grow)); if (grow >= 1) { st = 'hang'; tHang = 0; } } },
    click() { if (st !== 'hang') return; st = 'fall'; v.set((Math.random() - 0.5) * 0.15, 0, 0.02); audio.play('whoosh_soft', { vol: 0.3 }); }, drag() {}, release() {}, focus: apple };
}

// ---------------------------------------------------------------- the prism
const SPECTRUM = ['#ff3a3a', '#ff8a2a', '#ffe23a', '#4ad84a', '#3a9aff', '#5a4aff', '#b04aff'];
function prism() {
  const g = new THREE.Group();
  put(g, cbox(1.1, 0.04, 0.4, 0.01), M.walnut(), 0, 0.02, 0);
  // the slit screen (light comes from the window, through a slit)
  put(g, cbox(0.03, 0.34, 0.26, 0.006), M.oak(), -0.5, 0.21, 0); const slit = put(g, cbox(0.035, 0.08, 0.012, 0.002), glowM('#fff6e0', 1.8), -0.5, 0.24, 0); slit.castShadow = false;
  const piv = new THREE.Group(); piv.position.set(-0.08, 0.24, 0); g.add(piv); put(g, lathe([[0.0005, 0], [0.06, 0], [0.04, 0.12], [0.0005, 0.13]], 6), M.brass(), -0.08, 0.04, 0);
  const tri = extrude(shape([[0, 0.1], [-0.087, -0.05], [0.087, -0.05]]), 0.16, 0.006); tri.rotateX(-Math.PI / 2); const pr = put(piv, tri, glassM(0xcfe6ff, 0.3)); pr.material.emissive = new THREE.Color(0x203048); pr.material.emissiveIntensity = 0.6; pr.castShadow = false; pr.renderOrder = 3;
  put(piv, cbox(0.19, 0.008, 0.19, 0.002), M.brass(), 0, -0.058, 0);
  // the card that catches the spectrum: a pixel rainbow drawn as the beams land
  const cardC = document.createElement('canvas'); cardC.width = 32; cardC.height = 48; const cg = cardC.getContext('2d'); const cardT = new THREE.CanvasTexture(cardC); cardT.magFilter = THREE.NearestFilter; cardT.colorSpace = THREE.SRGBColorSpace;
  const card = put(g, new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ map: cardT, roughness: 0.9, emissive: 0xffffff, emissiveMap: cardT, emissiveIntensity: 0.6 }), 0.5, 0.2, 0, 0, -Math.PI / 2); card.castShadow = false; put(g, cbox(0.02, 0.36, 0.24, 0.005), M.oak(), 0.515, 0.2, 0);
  const white = put(g, beam(1, 0.012), glowM('#fff8e8', 2.2, 0.9)); white.castShadow = false; white.userData.noInk = true;
  const rays = SPECTRUM.map((c) => { const r = put(g, beam(1, 0.008), glowM(c, 2.0, 0.85)); r.castShadow = false; r.userData.noInk = true; return r; });
  const inside = SPECTRUM.map((c) => { const r = put(g, beam(1, 0.006), glowM(c, 1.4, 0.5)); r.castShadow = false; r.userData.noInk = true; return r; });
  let ang = 0.25, av = 0; const P0 = V(-0.48, 0.24, 0);
  const draw = (hits) => { cg.fillStyle = '#e8dcc0'; cg.fillRect(0, 0, 32, 48); cg.fillStyle = '#c8b898'; for (let y = 0; y < 48; y += 4) cg.fillRect(0, y, 32, 1); for (const [i, z] of hits) { const y = Math.round(24 - z * 160); if (y < 1 || y > 46) continue; cg.fillStyle = SPECTRUM[i]; cg.fillRect(6, y - 1, 20, 3); } cardT.needsUpdate = true; };
  return { group: g, eq: 'n1 sin a = n2 sin b',
    update(dt, t) { ang += av * dt; av *= Math.exp(-dt * 3); piv.rotation.y = ang + Math.sin(t * 0.3) * 0.03; const entry = V(-0.08 - 0.05, 0.24, 0); aim(white, P0, entry);
      const exit = V(-0.03, 0.24, 0); const hits = []; const spread = 0.05 + Math.min(0.14, Math.abs(Math.sin(ang * 2 + 0.6)) * 0.12);
      SPECTRUM.forEach((c, i) => { const k = (i - 3) / 3; const dir = V(1, 0, -0.18 + k * spread + Math.sin(ang) * 0.25).normalize(); const end = exit.clone().addScaledVector(dir, (0.5 - exit.x) / dir.x); aim(rays[i], exit, end); aim(inside[i], entry, exit.clone().add(V(0, 0, k * 0.01))); hits.push([i, end.z]); rays[i].material.opacity = 0.65 + 0.25 * Math.sin(t * 7 + i); });
      if (!this._f || (this._f++ % 6) === 0) draw(hits); this._f = (this._f || 0) + 1; },
    drag(dx) { av += dx * 30; ang += dx * 2.5; }, release() {}, click() { av += 1.6; audio.play('glass_clink', { vol: 0.35 }); }, focus: pr };
}

// ---------------------------------------------------------------- the spinning top
function top() {
  const g = new THREE.Group(); put(g, lathe([[0.0005, 0], [0.32, 0], [0.34, 0.02], [0.3, 0.035], [0.0005, 0.03]], 12), M.marble(), 0, 0, 0);
  const body = new THREE.Group(); g.add(body); body.position.y = 0.035; const tilt = new THREE.Group(); body.add(tilt); const spinG = new THREE.Group(); tilt.add(spinG);
  const cols = [0xc8443a, 0xf3e6c4, 0x2d6e6a, 0xf2c14e]; const prof = [[0.0005, 0], [0.03, 0.03], [0.09, 0.07], [0.12, 0.1], [0.11, 0.13], [0.06, 0.15], [0.02, 0.17], [0.015, 0.24], [0.0005, 0.25]];
  for (let i = 0; i < 8; i++) put(spinG, lathe(prof, 1, (i / 8) * TAU, TAU / 8), smat('tint', { color: cols[i % 4], rough: 0.45 }), 0, 0, 0);
  put(spinG, new THREE.TorusGeometry(0.115, 0.006, 4, 16), M.gold(), 0, 0.1, 0, Math.PI / 2);
  let w = 0, prec = 0, lean = 0, fallen = 0;
  return { group: g, eq: 'L = I w',
    update(dt, t) { if (w > 0.5) { w *= Math.exp(-dt * 0.12); lean = Math.min(1.1, 0.04 + 2.2 / (w + 1.5)); prec += dt * (1.2 + 9 / (w + 2)); fallen = 0; } else { lean = Math.min(1.25, lean + dt * 1.2); fallen += dt; if (fallen > 2.5 && fallen < 2.6) audio.play('wood_knock', { vol: 0.2 }); if (fallen > 3.5) { w = 26; fallen = 0; audio.play('spin_whoosh', { vol: 0.35 }); } }
      spinG.rotation.y += w * dt; body.rotation.y = prec; tilt.rotation.z = lean * (w > 0.5 ? 0.25 : 1) + Math.sin(t * 13) * 0.01 * (w > 0.5 ? 1 : 0); body.position.x = Math.sin(prec) * 0.05 * (w > 0.5 ? 1 : 0); body.position.z = Math.cos(prec) * 0.05 * (w > 0.5 ? 1 : 0); },
    drag(dx) { w = Math.min(60, w + Math.abs(dx) * 220); }, release() { if (w > 10) audio.play('spin_whoosh', { vol: 0.35 }); }, click() { w = Math.min(60, w + 18); audio.play('spin_whoosh', { vol: 0.3 }); }, focus: spinG };
}

// ---------------------------------------------------------------- Newton's cradle
function cradle() {
  const g = new THREE.Group(); const L = 0.42, R = 0.045, N = 5;
  put(g, cbox(0.7, 0.05, 0.32, 0.012), M.walnut(), 0, 0.025, 0); for (const x of [-0.3, 0.3]) for (const z of [-0.12, 0.12]) put(g, cbox(0.02, 0.62, 0.02, 0.005), M.brass(), x, 0.35, z);
  for (const z of [-0.12, 0.12]) put(g, cbox(0.62, 0.02, 0.02, 0.005), M.brass(), 0, 0.66, z);
  const balls = []; for (let i = 0; i < N; i++) { const x = (i - 2) * R * 2.02; const piv = new THREE.Group(); piv.position.set(x, 0.66, 0); g.add(piv);
    for (const z of [-0.12, 0.12]) { const s = put(piv, beam(1, 0.003), smat(null, { color: 0xe8dcc0, rough: 0.9 })); aim(s, V(0, 0, z), V(0, -L, 0)); s.castShadow = false; }
    put(piv, lathe([[0.0005, -R], [R * 0.7, -R * 0.7], [R, 0], [R * 0.7, R * 0.7], [0.0005, R]], 10), smat('steel', { metal: 0.95, rough: 0.18 }), 0, -L, 0); balls.push({ piv, th: 0, w: 0 }); }
  const step = (dt) => { for (const b of balls) { b.w += -(9.8 / L) * Math.sin(b.th) * dt; b.w *= 1 - dt * 0.06; b.th += b.w * dt; }
    for (let i = 0; i < N - 1; i++) { const a = balls[i], b = balls[i + 1]; const xa = Math.sin(a.th) * L + i * R * 2.02, xb = Math.sin(b.th) * L + (i + 1) * R * 2.02; if (xb - xa < R * 2 && a.w > b.w) { const t = a.w; a.w = b.w * 0.98; b.w = t * 0.98; if (Math.abs(t) > 0.5 && !a.cl) { audio.play('metal_clang', { vol: Math.min(0.25, Math.abs(t) * 0.06), rate: 2.2, minGap: 0 }); } } } };
  balls[0].th = -0.6;
  return { group: g, eq: 'p = m v',
    update(dt) { const n = 8; for (let k = 0; k < n; k++) step(dt / n); for (const b of balls) b.piv.rotation.z = b.th; },
    click() { balls[0].th = -0.7; balls[0].w = 0; audio.play('metal_clang', { vol: 0.12, rate: 2 }); }, drag(dx) { balls[0].th = Math.max(-1, Math.min(0, balls[0].th + dx * 2)); balls[0].w = 0; }, release() {}, focus: balls[2].piv };
}

// ---------------------------------------------------------------- the alembic on its burner
function flask(o = {}) {
  const g = new THREE.Group(); put(g, cbox(0.8, 0.04, 0.36, 0.01), M.walnut(), 0, 0.02, 0);
  put(g, lathe([[0.0005, 0], [0.08, 0], [0.09, 0.04], [0.06, 0.09], [0.025, 0.1], [0.0005, 0.12]], 8), M.brass(), -0.15, 0.04, 0);
  const flame = put(g, lathe([[0.0005, 0], [0.028, 0.025], [0.022, 0.06], [0.0005, 0.12]], 5), glowM('#ffb040', 1.8, 0.9), -0.15, 0.16, 0); flame.castShadow = false; flame.userData.noInk = true;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; put(g, cbox(0.014, 0.3, 0.014, 0.003), M.iron(), -0.15 + Math.cos(a) * 0.12, 0.19, Math.sin(a) * 0.12); } put(g, new THREE.TorusGeometry(0.12, 0.009, 4, 12), M.iron(), -0.15, 0.33, 0, Math.PI / 2);
  const liqM = new THREE.MeshStandardMaterial({ color: 0x1a7a6a, emissive: 0x2ad8b0, emissiveIntensity: 0.8, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.9 });
  const prof = [[0.0005, -0.14], [0.08, -0.13], [0.13, -0.08], [0.145, 0.0], [0.13, 0.07], [0.08, 0.11], [0.04, 0.13], [0.035, 0.3], [0.045, 0.32]];
  const fl = put(g, lathe(prof, 10), glassM(), -0.15, 0.48, 0); fl.castShadow = false; fl.renderOrder = 3; const liq = put(g, lathe([[0.0005, -0.13], [0.075, -0.122], [0.12, -0.08], [0.134, -0.02], [0.13, 0.0], [0.0005, 0.0]], 10), liqM, -0.15, 0.48, 0); liq.castShadow = false;
  const neck = put(g, tube([[-0.15, 0.8, 0], [-0.1, 0.88, 0], [0.08, 0.8, 0], [0.24, 0.5, 0], [0.3, 0.26, 0]], 0.014, { seg: 16, rad: 5 }), glassM(0xe8f4ff, 0.4)); neck.castShadow = false;
  const rec = put(g, lathe([[0.0005, -0.1], [0.06, -0.09], [0.07, -0.03], [0.05, 0.05], [0.02, 0.08], [0.02, 0.1]], 8), glassM(0xf4ecff, 0.3), 0.3, 0.14, 0); rec.castShadow = false;
  const drip = put(g, lathe([[0.0005, -0.09], [0.055, -0.085], [0.064, -0.05], [0.0005, -0.045]], 8), liqM, 0.3, 0.14, 0); drip.castShadow = false;
  // a pressure gauge
  const gc = document.createElement('canvas'); gc.width = gc.height = 24; const gx = gc.getContext('2d'); for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const d = Math.hypot(x - 11.5, y - 11.5); if (d > 11.5) continue; gx.fillStyle = d > 10.5 ? '#4b2a17' : d > 8.5 && (Math.round(Math.atan2(y - 11.5, x - 11.5) * 4) % 2 === 0) ? '#2a1a10' : '#f4ecd6'; gx.fillRect(x, y, 1, 1); }
  const gt = new THREE.CanvasTexture(gc); gt.magFilter = THREE.NearestFilter; gt.colorSpace = THREE.SRGBColorSpace; const gface = put(g, new THREE.CircleGeometry(0.06, 12), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.5 }), 0.05, 0.85, 0.02); gface.castShadow = false;
  put(g, new THREE.TorusGeometry(0.062, 0.008, 4, 12), M.brass(), 0.05, 0.85, 0.02); const ndl = put(g, cbox(0.006, 0.05, 0.004, 0.001), M.iron(), 0.05, 0.85, 0.03); ndl.geometry.translate(0, 0.02, 0);
  const bubM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8fff0, emissiveIntensity: 1.1, transparent: true, opacity: 0.8, flatShading: true, depthWrite: false }); const bubs = [];
  for (let i = 0; i < 12; i++) { const b = put(g, new THREE.OctahedronGeometry(0.01 + (i % 3) * 0.005, 0), bubM, -0.15, 0.4, 0); b.castShadow = false; b.userData.ph = i / 12; bubs.push(b); }
  const lt = new THREE.PointLight(0x5af0d0, 1.2, 2.2, 1.8); lt.position.set(-0.15, 0.5, 0.3); g.add(lt); const flL = new THREE.PointLight(0xffa040, 1.0, 1.6, 1.8); flL.position.set(-0.15, 0.22, 0.2); g.add(flL);
  let heat = 0.35, acc = 0;
  return { group: g, eq: 'P V = n R T',
    update(dt, t) { heat = Math.max(0.3, heat - dt * 0.08); const f = 0.8 + heat + Math.sin(t * 23) * 0.1; flame.scale.set(1, f, 1); flL.intensity = 0.6 + heat * 1.4; liqM.emissiveIntensity = 0.6 + heat * 0.8; lt.intensity = 0.8 + heat * 1.6; ndl.rotation.z = 1.2 - heat * 2.2 + Math.sin(t * 17) * 0.03 * heat;
      for (const b of bubs) { const u = (t * (0.25 + heat * 1.2) + b.userData.ph) % 1; b.position.set(-0.15 + Math.sin(u * 7 + b.userData.ph * 30) * 0.08 * (1 - u), 0.36 + u * 0.12, Math.cos(b.userData.ph * 40) * 0.06 * (1 - u)); b.scale.setScalar(0.3 + u * heat); }
      acc += dt * heat * 6; while (acc > 1 && o.motes) { acc--; const p = g.localToWorld(V(-0.15 + (Math.random() - 0.5) * 0.05, 0.82, 0)); o.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(Math.random() - 0.5) * 0.06, 0.18 + Math.random() * 0.1, 0], wobble: 0.3, drag: 0.6, life: 1.4, sprite: 'dust', color: '#f0f4ff', bright: 0.8, fadeIn: 0.1 }); }
      drip.scale.y = 1 + heat * 0.4; },
    click() { heat = Math.min(1.4, heat + 0.45); audio.play('fire_whoosh', { vol: 0.35 }); audio.play('gurgle', { vol: 0.3, delay: 0.2 }); }, drag(dx) { heat = Math.min(1.4, heat + Math.abs(dx)); }, release() {}, focus: fl };
}

// ---------------------------------------------------------------- the Leyden jar
function spark(o = {}) {
  const g = new THREE.Group(); put(g, cbox(0.8, 0.04, 0.36, 0.01), M.walnut(), 0, 0.02, 0);
  const jar = put(g, lathe([[0.0005, 0], [0.11, 0], [0.12, 0.05], [0.12, 0.3], [0.1, 0.34], [0.0005, 0.34]], 10), glassM(0xd8e8ff, 0.35), -0.18, 0.04, 0); jar.castShadow = false;
  put(g, lathe([[0.0005, 0], [0.124, 0], [0.124, 0.18], [0.0005, 0.18]], 10), smat('lead', { metal: 0.85, rough: 0.35, color: 0xd0d8e4 }), -0.18, 0.045, 0);
  put(g, cbox(0.012, 0.3, 0.012, 0.003), M.brass(), -0.18, 0.5, 0); const k1 = put(g, lathe([[0.0005, -0.04], [0.035, -0.028], [0.04, 0], [0.035, 0.028], [0.0005, 0.04]], 8), M.brass(), -0.18, 0.66, 0);
  put(g, cbox(0.02, 0.5, 0.02, 0.004), M.brass(), 0.22, 0.27, 0); put(g, cbox(0.3, 0.014, 0.014, 0.003), M.brass(), 0.08, 0.52, 0, 0, 0, 0.35); const k2 = put(g, lathe([[0.0005, -0.035], [0.03, -0.024], [0.035, 0], [0.03, 0.024], [0.0005, 0.035]], 8), M.brass(), -0.05, 0.58, 0);
  const zapM = glowM('#c8d8ff', 2.4, 1); const segs = []; for (let i = 0; i < 9; i++) { const s = put(g, beam(1, 0.007), zapM); s.castShadow = false; s.userData.noInk = true; s.visible = false; segs.push(s); }
  const L = new THREE.PointLight(0xa0c0ff, 0, 2.5, 1.6); L.position.set(-0.1, 0.62, 0.2); g.add(L);
  let charge = 0.2, zap = 0;
  const bolt = () => { const a = k1.position.clone().add(V(0.035, 0, 0)), b = k2.position.clone().add(V(-0.03, 0, 0)); let p = a.clone(); for (let i = 0; i < segs.length; i++) { const u = (i + 1) / segs.length; const q = a.clone().lerp(b, u).add(V(0, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05)); if (i === segs.length - 1) q.copy(b); aim(segs[i], p, q); segs[i].visible = true; p = q; } };
  return { group: g, eq: 'F = k q1 q2 / r^2',
    update(dt) { charge = Math.min(1, charge + dt * 0.12); zap = Math.max(0, zap - dt * 2.5); if (zap > 0) { if (Math.random() < 0.6) bolt(); } else for (const s of segs) s.visible = false; L.intensity = zap * 6; zapM.color.setRGB(1.6 + zap, 1.8 + zap, 2.6); if (charge >= 1 && Math.random() < dt * 0.4) this.click(); },
    click() { zap = 0.6 + charge * 0.6; charge = 0; bolt(); audio.play('electric_zap', { vol: 0.45 }); const p = g.localToWorld(V(-0.11, 0.62, 0)); if (o.motes) for (let i = 0; i < 16; i++) o.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.9, (Math.random() - 0.5) * 0.5], drag: 2, grav: 1.2, life: 0.5, seq: 'glint', fps: 10, color: '#d8e4ff', bright: 1.8, fadeIn: 0.01 }); },
    drag() {}, release() {}, focus: k2 };
}

// ---------------------------------------------------------------- the orrery
function orbit() {
  const g = new THREE.Group(); put(g, lathe([[0.0005, 0], [0.26, 0], [0.27, 0.04], [0.2, 0.07], [0.0005, 0.07]], 10), M.walnut(), 0, 0, 0); put(g, cbox(0.03, 0.4, 0.03, 0.006), M.brass(), 0, 0.27, 0);
  const sun = put(g, new THREE.IcosahedronGeometry(0.08, 1), glowM('#ffc860', 1.5), 0, 0.5, 0); sun.castShadow = false; const SL = new THREE.PointLight(0xffc070, 1.6, 2.5, 1.6); SL.position.set(0, 0.5, 0); g.add(SL);
  const worlds = [[0.17, 0.035, 'ruby', 1.0], [0.27, 0.045, 'blue', 0.6], [0.38, 0.05, 'green', 0.38], [0.5, 0.06, 'clay', 0.22]].map(([r, s, k, w], i) => { const arm = new THREE.Group(); arm.position.y = 0.47 - i * 0.012; g.add(arm); put(arm, cbox(r, 0.008, 0.008, 0.002), M.brass(), r / 2, 0, 0);
    put(arm, cbox(0.008, 0.04, 0.008, 0.002), M.brass(), r, 0.02, 0); const p = put(arm, new THREE.IcosahedronGeometry(s, 0), smat(k, { rough: 0.5, metal: 0.2 }), r, 0.05, 0); if (i === 1) { const moon = put(arm, new THREE.OctahedronGeometry(0.014, 0), smat('silver', { metal: 0.6, rough: 0.4 }), r + 0.08, 0.05, 0); moon.userData.moon = true; }
    if (i === 3) put(arm, new THREE.TorusGeometry(s * 1.6, 0.006, 3, 14), M.gold(), r, 0.05, 0, 1.2); arm.rotation.y = i * 1.7; return { arm, w, p }; });
  put(g, new THREE.TorusGeometry(0.5, 0.006, 3, 40), M.brass(), 0, 0.46, 0, Math.PI / 2);
  let speed = 0.5;
  return { group: g, eq: 'T^2 / a^3 = k',
    update(dt) { speed = Math.max(0.35, speed * Math.exp(-dt * 0.5)); for (const W of worlds) { W.arm.rotation.y += W.w * speed * dt * 1.6; W.p.rotation.y += dt * 2; } sun.rotation.y += dt * 0.3; },
    drag(dx) { speed = Math.min(6, speed + Math.abs(dx) * 14); }, release() { audio.play('clockwork', { vol: 0.25 }); }, click() { speed = Math.min(6, speed + 2.5); audio.play('clockwork', { vol: 0.35 }); }, focus: sun };
}

const MAKERS = { pendulum, fall, prism, top, cradle, flask, spark, orbit };
export function makeDemo(kind, o = {}) { const D = (MAKERS[kind] || orbit)(o); D.kind = kind; return D; }
