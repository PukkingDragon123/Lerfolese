// The map diorama in the low-poly dusk style: a wooden display plinth carrying a faceted, gently terraced landscape
// with a river and marsh pools, worn dirt paths between the nodes, olive groves and cypress stands, Greek ruins,
// a rune ring and arcane glints, under the same stepped dusk sky and amber light as the battles.
// buildMapDiorama() adds everything to the scene / world group and returns the helpers MapScene relies on.
import * as THREE from 'three';
import { mulberry32, clamp } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';
import * as LP from './lowpoly.js';

const { Mesher, PAL, M4 } = LP;
const V3 = THREE.Vector3; const TAU = Math.PI * 2;
const SUN = new V3(-0.62, 0.55, 0.42).normalize();

// reserve: [x, z, r] spots kept clear (default: the satyr party's dance ring)
export function buildMapDiorama({ scene, world, renderer, map, seed = 1, WID = 21, LEN = 36, Z0 = 3, reserve = [[-6.5, -9, 1.1]] }) {
  const rnd = mulberry32((seed % 1000) + 11); const n = makeNoise((seed % 997) + 3); const nodes = Object.values(map.nodes);
  // ------------------------------------------------ sky + light (matches the battle stages)
  const sk = LP.SKIES.meadow; scene.background = null; scene.fog = new THREE.Fog(0x3a2c4a, 75, 160);
  const az = 0.16, el = -0.6; scene.add(LP.skyDome('meadow', new V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)), { lift: 38 }));
  { const sp = []; const r2 = mulberry32(7); for (let i = 0; i < 420; i++) { const v = new V3(r2() * 2 - 1, r2() * 0.9 + 0.1, r2() * 2 - 1).normalize(); if (v.y < 0.25) continue; v.multiplyScalar(150); sp.push(v.x, v.y - 40, v.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf2e2ff, size: 0.5, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.8 }))); }
  const sun = new THREE.DirectionalLight(0xffb070, 2.7); sun.target.position.set(0, 0, Z0 - LEN / 2); sun.position.copy(SUN).multiplyScalar(40).add(sun.target.position); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x8a98d8, 0x4a2c1a, 0.55)); const rim = new THREE.DirectionalLight(0x8fb0ff, 1.2); rim.position.set(9, 7, -45); scene.add(rim); const warm = new THREE.DirectionalLight(0xffa860, 0.7); warm.position.set(16, 6, -30); scene.add(warm);
  const env = LP.gradientEnv(renderer, 'stage:meadow', { top: sk.hi, hor: sk.hor, gnd: sk.gnd, sun: sk.sun, sunDir: SUN }); if (env) { scene.environment = env; scene.environmentIntensity = 0.5; }
  // ------------------------------------------------ height field (gentle terraces, carved river, marsh pools, flattened paths)
  const riverX = (z) => Math.sin(z * 0.18) * 4.5 + 1.5;
  const segs = []; for (const a of nodes) for (const bid of a.next) { const b = map.nodes[bid]; if (b) segs.push([a.x, a.z, b.x - a.x, b.z - a.z]); }
  const pathD = (x, z) => { let d = 1e9; for (const [ax, azz, dx, dz] of segs) { const t = clamp(((x - ax) * dx + (z - azz) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - azz - dz * t)); } return d; };
  const nodeD = (x, z) => { let d = 1e9; for (const a of nodes) d = Math.min(d, Math.hypot(x - a.x, z - a.z)); return d; };
  const marsh = (x, z) => (z < -26.5 ? n(x * 0.35 + 7, z * 0.35) - 0.5 + (-26.5 - z) * 0.03 : -1);
  const raw = (x, z) => {
    const edge = Math.min(WID / 2 - Math.abs(x), Math.abs(z - Z0), Math.abs(z - (Z0 - LEN)));
    let h = n.fbm(x * 0.12 + 5, z * 0.12, 4) * 2.2 - 0.6; h += Math.max(0, n.fbm(x * 0.07 + 30, z * 0.07, 3) - 0.55) * 7;
    const q = Math.round(h / 0.42) * 0.42; h += (q - h) * 0.7;
    const pd = pathD(x, z); h = THREE.MathUtils.lerp(h * 0.22, h, clamp((pd - 0.5) / 2.2, 0, 1));
    const rd = Math.abs(x - riverX(z)); if (z > -26.8 && rd < 1.7) h = Math.min(h, -0.4 + Math.max(0, rd - 0.35) * 0.3);
    if (marsh(x, z) > 0.05 && pd > 0.9) h = Math.min(h, -0.32);
    if (edge < 0.6) h = Math.min(h, edge * 0.5);
    return Math.max(-0.42, h);
  };
  const step = 0.5, gx0 = -WID / 2, gz0 = Z0 - LEN; const nx = Math.round(WID / step), nz = Math.round(LEN / step); const H = new Float32Array((nx + 1) * (nz + 1)); const D = new Uint8Array(nx * nz);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) H[j * (nx + 1) + i] = raw(gx0 + i * step, gz0 + j * step);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) D[j * nx + i] = ((i * 7 + j * 13 + (i * j) % 5) % 3 === 0) ? 1 : 0;
  const hv = (i, j) => H[j * (nx + 1) + i];
  const heightAt = (x, z) => {
    const fx = clamp((x - gx0) / step, 0, nx - 1e-4), fz = clamp((z - gz0) / step, 0, nz - 1e-4); const i = Math.floor(fx), j = Math.floor(fz); const u = fx - i, v = fz - j;
    const a = hv(i, j), b = hv(i + 1, j), c = hv(i, j + 1), d = hv(i + 1, j + 1);
    if (D[j * nx + i]) return u + v < 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
    return u > v ? a + u * (b - a) + v * (d - b) : a + u * (d - c) + v * (c - a);
  };
  // ------------------------------------------------ props (placed before the ground is painted so it can darken under them)
  const M = new Mesher(), G = new Mesher(), Gl = new Mesher(), W = new Mesher(), B = new Mesher(), Fm = new Mesher(); const occ = reserve.map((r) => [...r]); const trees = [];
  const clear = (x, z, r) => { for (const [ox, oz, orr] of occ) if ((x - ox) ** 2 + (z - oz) ** 2 < (r + orr) ** 2) return false; return true; };
  const ok = (x, z, r = 0.3) => Math.abs(x) < WID / 2 - 0.45 - r && z < Z0 - 0.45 - r && z > Z0 - LEN + 0.45 + r && pathD(x, z) > 0.62 + r && Math.abs(x - riverX(z)) > (z > -26.8 ? 1.55 : 0) + r && nodeD(x, z) > 1.05 + r && heightAt(x, z) > -0.12 && clear(x, z, r);
  const at = (x, z, s, ry = rnd() * TAU, dy = -0.02) => M4(x, heightAt(x, z) + dy, z, ry, s);
  const perch = (build, x, z, s) => { const T = new Mesher(); build(T); const o = T.build('lp'); o.position.set(x, heightAt(x, z) - 0.02, z); o.rotation.y = rnd() * TAU; o.scale.setScalar(s); o.userData.perchable = true; world.add(o); trees.push(o); };
  const tree = (x, z) => {
    const h = heightAt(x, z); const r = rnd(); const s = 0.21 + rnd() * 0.07; const sd = Math.round(x * 31 + z * 17) + seed;
    const kind = z < -26 ? (r < 0.6 ? 'dead' : 'cyp') : h > 1.1 ? (r < 0.65 ? 'cyp' : 'olive') : (r < 0.62 ? 'olive' : 'cyp');
    const build = (T, m) => (kind === 'olive' ? LP.oliveTree(T, m, sd, { size: 0.95 + rnd() * 0.2 }) : kind === 'cyp' ? LP.cypress(T, m, sd, { h: 4.4 + rnd() * 2 }) : LP.deadTree(T, m, sd, { size: 0.9, moss: true }));
    if (trees.length < 18 && rnd() < 0.5) perch((T) => build(T, new THREE.Matrix4()), x, z, s); else build(M, at(x, z, s));
    occ.push([x, z, kind === 'olive' ? 0.42 : 0.26]);
  };
  // groves where the forest noise is high, a light scatter elsewhere
  for (let i = 0; i < 1400; i++) { const x = (rnd() - 0.5) * WID, z = Z0 - rnd() * LEN; const f = n.fbm(x * 0.17 + 50, z * 0.17 + 20, 3); const p = f > 0.57 ? 0.9 : f > 0.5 ? 0.25 : 0.04; if (rnd() > p || !ok(x, z, 0.3)) continue; tree(x, z); }
  // ruins: a temple fragment, a broken colonnade, a rune ring, a shrine
  const sites = []; for (let i = 0; i < 400 && sites.length < 4; i++) { const x = (rnd() - 0.5) * (WID - 4), z = Z0 - 2.5 - rnd() * (LEN - 8); if (!ok(x, z, 1.25) || sites.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 7)) continue; sites.push([x, z]); occ.push([x, z, 1.25]); }
  sites.forEach(([x, z], k) => {
    const y = heightAt(x, z) - 0.04; const m = M4(x, y, z, rnd() * TAU, 0.3);
    if (k === 0) { for (let i = 0; i < 4; i++) LP.column(M, m.clone().multiply(M4(-2.4 + i * 1.6, 0, 0)), seed + i, { h: i === 3 ? 1.8 : 3.4, broken: i === 3 }); LP.entablature(M, m.clone().multiply(M4(-0.8, 3.4, 0)), seed, { len: 4.0 }); M.add(LP.block(7.4, 0.3, 1.9, { bevel: 0.05, seed: 2 }), m.clone().multiply(M4(0, -0.05, 0)), LP.painter(PAL.marble, rnd, { base: 1.6 })); LP.fallenDrum(M, m.clone().multiply(M4(1.2, 0, 1.6, 0.4)), seed); }
    else if (k === 1) { for (let i = 0; i < 3; i++) LP.column(M, m.clone().multiply(M4(-1.6 + i * 1.6, 0, (i % 2) * 0.4)), seed + 5 + i, { h: 1.2 + rnd() * 1.6, broken: true }); LP.wallChunk(M, m.clone().multiply(M4(0.4, 0, -1.4)), seed, { len: 3.4, h: 1.3 }); LP.fallenDrum(M, m.clone().multiply(M4(-0.6, 0, 1.2, 1.1)), seed + 2); }
    else if (k === 2) { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; LP.runeStone(M, Gl, m.clone().multiply(M4(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6, -a - Math.PI / 2)), seed + i, { h: 1.6 + (i % 2) * 0.5 }); } LP.crystals(M, Gl, m.clone().multiply(M4(0, 0, 0)), seed, { n: 7, h: 1.6 }); for (let i = 0; i < 4; i++) LP.wisp(Gl, new V3(x + (rnd() - 0.5) * 1.6, y + 0.6 + rnd() * 0.5, z + (rnd() - 0.5) * 1.6), 0.1 + rnd() * 0.9, { r: 0.04 }); }
    else { const top = LP.plinth(M, m, seed, { w: 1.0, h: 1.2 }); LP.amphora(M, m.clone().multiply(M4(0, top, 0)), seed, { s: 0.9 }); LP.brazier(M, B, Fm, Gl, m.clone().multiply(M4(-1.8, 0, 0.6)), seed, { h: 0.9 }); LP.brazier(M, B, Fm, Gl, m.clone().multiply(M4(1.8, 0, 0.6)), seed + 1, { h: 0.9 }); }
  });
  // mini labyrinths beside elite nodes
  for (const nd of nodes) { if (nd.type !== 'elite') continue; const ox = nd.x + (nd.x > 0 ? -1.9 : 1.9), oz = nd.z + 0.4; if (!ok(ox, oz, 0.75)) continue; const m = at(ox, oz, 0.3, 0); for (let k = 0; k < 5; k++) LP.mazeWall(M, m.clone().multiply(M4((k % 3) * 1.7 - 1.7, 0, Math.floor(k / 3) * 1.7 - 0.8, (k % 2) * Math.PI / 2)), seed + k, { len: 2.2 + (k % 2), h: 1.6, crown: k % 2 === 0 }); occ.push([ox, oz, 0.75]); }
  // rocks (more on the hills), bushes, reeds on the banks, marsh dressing, grass and flowers
  for (let i = 0; i < 160; i++) { const x = (rnd() - 0.5) * WID, z = Z0 - rnd() * LEN; const h = heightAt(x, z); if (rnd() > (h > 1 ? 0.8 : 0.25) || !ok(x, z, 0.15)) continue; const s = 0.1 + rnd() * 0.2; LP.rock(M, at(x, z, 1), seed + i * 3, { sx: s * 1.3, sy: s * 0.8, sz: s, moss: rnd() < 0.35 ? PAL.moss : null, detail: rnd() < 0.5 ? 0 : 1, cuts: 5 }); occ.push([x, z, s]); }
  for (let i = 0; i < 90; i++) { const x = (rnd() - 0.5) * WID, z = Z0 - rnd() * LEN; if (!ok(x, z, 0.18)) continue; LP.bush(M, at(x, z, 1), seed + i * 5, { r: 0.16 + rnd() * 0.1, flowers: rnd() < 0.3 ? ['poppy', 'daisy', 'rose'][i % 3] : null, G }); occ.push([x, z, 0.18]); }
  for (let i = 0; i < 420; i++) { const z = Z0 - 0.4 - rnd() * (LEN - 0.8); const side = rnd() < 0.5 ? -1 : 1; const x = riverX(z) + side * (0.95 + rnd() * 0.6); const y = heightAt(x, z); if (z < -26.8 || Math.abs(x) > WID / 2 - 0.4 || pathD(x, z) < 0.5 || y > 0.15) continue; if (rnd() < 0.55) LP.reeds(G, x, Math.max(y, -0.22), z, rnd, { n: 3 + Math.floor(rnd() * 3), h: 0.32, spread: 0.08 }); else LP.rock(M, M4(x, y - 0.02, z, rnd() * TAU), seed + i, { sx: 0.07, sy: 0.04, sz: 0.06, detail: 0, cuts: 3, pal: PAL.gravel }); }
  for (let i = 0; i < 260; i++) { const x = (rnd() - 0.5) * WID, z = Z0 - LEN + 0.5 + rnd() * 8; const mm = marsh(x, z); if (mm < -0.15 || mm > 0.12 || Math.abs(x) > WID / 2 - 0.4 || pathD(x, z) < 0.6 || nodeD(x, z) < 1) continue; LP.reeds(G, x, Math.max(heightAt(x, z), -0.22), z, rnd, { n: 4, h: 0.38, spread: 0.1 }); }
  for (let i = 0; i < 8; i++) { const x = (rnd() - 0.5) * (WID - 2), z = Z0 - LEN + 1 + rnd() * 6; LP.wisp(Gl, new V3(x, 0.4 + rnd() * 0.6, z), 0.05 + rnd() * 0.95, { r: 0.04, col: '#8ff8d0' }); }
  const fl = ['poppy', 'daisy', 'asphodel', 'gold', 'lavender'];
  for (let i = 0; i < 1300; i++) {
    const x = (rnd() - 0.5) * (WID - 0.8), z = Z0 - 0.4 - rnd() * (LEN - 0.8); const y = heightAt(x, z); if (y < -0.1 || pathD(x, z) < 0.5 || nodeD(x, z) < 0.6) continue;
    const dry = n.fbm(x * 0.2 + 3, z * 0.2, 3) > 0.55 || y > 1.3; if (rnd() < 0.12) LP.petals(G, new V3(x, y + 0.04, z), rnd, fl[Math.floor(n(x * 0.4, z * 0.4) * fl.length * 0.999)], 0.045);
    else LP.grassTuft(G, x, y - 0.01, z, rnd, { pal: dry ? PAL.dryGrass : PAL.grass, h: 0.11 + rnd() * 0.07, n: 4, spread: 0.06 });
  }
  // ------------------------------------------------ ground: painted facets + stratified cut sides
  const K = LP.KEY; const GR = new Mesher();
  const tone = (pal, nn, extra = 0, jit = 0.8) => { const t = 2 + (nn.y - 0.9) * 4 + nn.dot(K) * 1.0 + (rnd() - 0.5) * jit + extra; return pal[Math.max(0, Math.min(4, Math.round(t)))].clone().multiplyScalar(0.96 + rnd() * 0.08); };
  const paint = (nn, c) => {
    let ao = 0; for (const [ox, oz, orr] of occ) { const d2 = (c.x - ox) ** 2 + (c.z - oz) ** 2; const rr = orr * 1.5 + 0.12; if (d2 < rr * rr) ao -= (1 - Math.sqrt(d2) / rr) * 1.1; }
    const pd = pathD(c.x, c.z), rd = Math.abs(c.x - riverX(c.z)), w = n(c.x * 1.3, c.z * 1.3);
    if (c.y < -0.17) return tone(PAL.mud, nn, -0.4);
    if (pd < 0.22 + w * 0.1) return tone(PAL.dirt, nn, ao + 0.2, 0.5);
    if (pd < 0.34 + w * 0.1) return tone(PAL.dryGrass, nn, ao - 0.1);
    if (c.z > -26.8 && rd < 1.95 && c.y < 0.2) return tone(PAL.gravel, nn, ao);
    if (nn.y < 0.8) return tone(c.y > 1.2 ? PAL.stone : PAL.dirt, nn, ao - 0.2);
    if (c.z < -26.2) return tone(n(c.x * 0.5, c.z * 0.5) > 0.5 ? PAL.moss : PAL.mud, nn, ao + 0.2);
    if (c.y > 1.9) return tone(PAL.dryGrass, nn, ao + 0.2);
    return tone(n.fbm(c.x * 0.2 + 3, c.z * 0.2, 3) > 0.55 ? PAL.dryGrass : PAL.grass, nn, ao);
  };
  const vtx = (i, j) => new V3(gx0 + i * step, hv(i, j), gz0 + j * step);
  const face = (a, b, c) => { const nn = new V3().subVectors(c, a).cross(new V3().subVectors(b, a)).normalize(); if (nn.y < 0) { nn.negate(); GR.tri(a, b, c, paint(nn, new V3().add(a).add(b).add(c).multiplyScalar(1 / 3))); } else GR.tri(a, c, b, paint(nn, new V3().add(a).add(b).add(c).multiplyScalar(1 / 3))); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i, j + 1), d = vtx(i + 1, j + 1); if (D[j * nx + i]) { face(a, b, c); face(b, d, c); } else { face(a, b, d); face(a, d, c); } }
  const strata = [PAL.dirt[2], PAL.dirt[1], PAL.stone[2], PAL.stone[1]]; const base = -0.32;
  const skirt = (pts, out) => { for (let k = 0; k < pts.length - 1; k++) { const p = pts[k], q = pts[k + 1]; if (Math.max(p.y, q.y) < base + 0.04) continue; const ys = [Math.max(p.y, q.y), (Math.max(p.y, q.y) + base) * 0.5 + 0.02, base]; for (let s = 0; s < 2; s++) { const a = new V3(p.x, s ? ys[1] : p.y, p.z), b = new V3(q.x, s ? ys[1] : q.y, q.z), c2 = new V3(q.x, s ? base : ys[1], q.z), d = new V3(p.x, s ? base : ys[1], p.z); const col = strata[s * 2 + (k % 2)].clone(); const nrm = new V3().subVectors(b, a).cross(new V3().subVectors(d, a)); if (nrm.dot(out) < 0) { GR.tri(a, d, c2, col); GR.tri(a, c2, b, col); } else { GR.tri(a, b, c2, col); GR.tri(a, c2, d, col); } } } };
  skirt([...Array(nx + 1)].map((_, i) => vtx(i, nz)), new V3(0, 0, 1)); skirt([...Array(nx + 1)].map((_, i) => vtx(i, 0)), new V3(0, 0, -1)); skirt([...Array(nz + 1)].map((_, j) => vtx(0, j)), new V3(-1, 0, 0)); skirt([...Array(nz + 1)].map((_, j) => vtx(nx, j)), new V3(1, 0, 0));
  // water wherever the ground dips below the waterline (river + marsh pools)
  LP.waterSheet(W, { x0: -WID / 2 + 0.05, x1: WID / 2 - 0.05, z0: Z0 - LEN + 0.05, z1: Z0 - 0.05, y: -0.2, step: 0.42, seed, sky: sk.sun, mask: (x, z) => heightAt(x, z) < -0.16 });
  // ------------------------------------------------ the display plinth: walnut block, bronze trim
  const P = new Mesher(); const wood = LP.painter(PAL.wood, rnd, { base: 1.8, up: 0.8, sun: 1.1, jit: 0.4 });
  P.add(LP.block(WID + 1.4, 1.8, LEN + 1.4, { bevel: 0.12, seed: 3 }), M4(0, -1.2, Z0 - LEN / 2), wood);
  P.add(LP.block(WID + 2.0, 0.3, LEN + 2.0, { bevel: 0.1, seed: 4 }), M4(0, -2.05, Z0 - LEN / 2), wood);
  B.add(LP.block(WID + 1.7, 0.25, LEN + 1.7, { bevel: 0.06, seed: 5 }), M4(0, -0.35, Z0 - LEN / 2), LP.painter(PAL.bronze, rnd, { base: 2.2, sun: 1.2, jit: 0.3 }));
  const add = (m) => { if (m) world.add(m); return m; };
  add(GR.build('lp', { cast: false })); add(P.build('lp')); add(M.build('lp')); add(B.build('metal')); add(G.build('grass', { cast: false })); add(Gl.build('glow', { cast: false, receive: false })); add(Fm.build('flame', { cast: false, receive: false }));
  const water = add(W.build('water', { cast: false, receive: false }));
  return { heightAt, pathD, riverX, water, trees };
}

// low-poly stepping stone for the dotted routes between nodes
export const pathStoneGeo = () => LP.rockGeo(9, { sx: 0.13, sy: 0.05, sz: 0.1, detail: 0, cuts: 4, sink: 0.4 });
