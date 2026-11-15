// THE TOWN BELOW THE TOWER (the LERFOLESE menu): a hill town round the foot of the spiral observatory at sunset, built
// from the shared village kit and the CC0 library rather than new one-offs:
//   - a fine faceted ground patch on the vista's own height function (meadow, worn earth, cobbled lanes, a market
//     square), so the coarse far land never pokes through the houses; grass is the colour of the ground it grows from
//   - cottages from models/village.js (rubble plinths, barrel-tile roofs, shutters, lamplit windows, chimney smoke)
//     lining a winding high street from the tower gate down to the river, round a square with the village well
//   - a whitewashed windmill on the rise, a tholos (round temple) on the far bank, a hump-backed stone bridge
//   - trees from models/flora.js (cypress, olive, oak, pine: real branch structure with pixel-art leaf-spray cards)
//   - CC0 props swapped to low-poly twins (barrels, crates) and moss rocks / a fort wall from the Poly Haven library
//   - lantern posts along the lanes (warm practicals; only a few real lights), stone field walls
// All placement is deterministic. The vista (models/vista.js) leaves a hole of radius HOLE for this patch.
//   const TW = buildTown({ hAt, gate, exclude }); scene.add(TW.group); TW.update(dt, t)
import * as THREE from 'three';
import { cottage, windmill, well, tholos, stoneBridge, stoneWall, chimneySmoke } from './village.js';
import { Grove } from './flora.js';
import { prop, lowSwap } from './lowprops.js';
import { toonModel } from './realworld.js';
import { grainTex } from './vista.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const TOWN_R = 88, HOLE = 84;

/** distance from p to a polyline */
function segD(x, z, pts) { let best = 1e9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const dx = b.x - a.x, dz = b.z - a.z; const L = dx * dx + dz * dz || 1; let t = ((x - a.x) * dx + (z - a.z) * dz) / L; t = Math.max(0, Math.min(1, t)); const ex = a.x + dx * t - x, ez = a.z + dz * t - z; best = Math.min(best, ex * ex + ez * ez); } return Math.sqrt(best); }
/** a smooth winding lane through control points (Catmull-Rom, sampled) */
const lane = (ctrl, n = 60) => new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V(x, 0, z)), false, 'centripetal').getPoints(n);

export function buildTown({ hAt, gate = V(0, 0, 8), riverX = () => -40, seed = 21, avoid = [] } = {}) {
  const G = new THREE.Group(); G.name = 'town'; const r = mulberry32(seed); const anim = [];
  // ---------------------------------------------------------------- lanes: the high street from the gate down to the bridge, the square, side lanes
  const sq = V(-14, 0, -30); // the market square
  const bz = -46; const bx = riverX(bz); // the bridge over the river
  const high = lane([[gate.x, gate.z], [gate.x - 4, gate.z - 6], [-6, -14], [sq.x + 3, sq.z + 6], [sq.x, sq.z], [sq.x - 6, sq.z - 8], [bx + 9, bz + 1], [bx - 9, bz - 1], [bx - 22, bz - 8], [bx - 40, bz - 30]], 90);
  const side1 = lane([[sq.x, sq.z], [sq.x + 12, sq.z - 6], [10, -46], [24, -60], [34, -78]], 50);
  const side2 = lane([[sq.x - 2, sq.z + 2], [sq.x - 14, sq.z + 9], [-38, -14], [-52, -4]], 40);
  const side3 = lane([[gate.x - 2, gate.z - 4], [14, -6], [26, -16], [40, -22], [62, -30]], 40);
  const lanes = [high, side1, side2, side3]; const laneD = (x, z) => Math.min(...lanes.map((l) => segD(x, z, l)));
  const river = (x, z) => Math.abs(x - riverX(z));
  // ---------------------------------------------------------------- the ground patch (faceted, per-face colour: meadow, worn earth, cobbles, the square)
  { const S = 1.55, N = Math.ceil(TOWN_R / S); const pts = []; const R2 = mulberry32(seed + 1);
    const idx = (i, j) => (j + N) * (2 * N + 1) + (i + N);
    for (let j = -N; j <= N; j++) for (let i = -N; i <= N; i++) { const x = i * S + (Math.abs(i) < N && Math.abs(j) < N ? (R2() - 0.5) * S * 0.5 : 0), z = j * S + (Math.abs(i) < N && Math.abs(j) < N ? (R2() - 0.5) * S * 0.5 : 0); const d = Math.hypot(x, z); pts.push([x, hAt(x, z) - Math.max(0, d - 80) * 0.08, z, d]); }
    const pos = [], col = []; const cc = new THREE.Color();
    const cMeadow = C('#4a6428'), cMeadow2 = C('#5e6e2e'), cDark = C('#34481e'), cEarth = C('#6e5a3a'), cCobble = C('#8a7c68'), cCobble2 = C('#6e6254'), cBank = C('#56502e'), cSquare = C('#a09078');
    const tri = (a, b, c) => { const mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3; if (Math.min(a[3], b[3], c[3]) > TOWN_R) return; const ld = laneD(mx, mz), rv = river(mx, mz), sd = Math.hypot(mx - sq.x, mz - sq.z);
      const h = Math.sin(mx * 12.9898 + mz * 78.233) * 43758.5453; const j = h - Math.floor(h);
      if (sd < 7.5) cc.copy(j < 0.5 ? cSquare : cCobble); else if (ld < 1.5) cc.copy(j < 0.5 ? cCobble : cCobble2); else if (ld < 2.6) cc.copy(cEarth).lerp(cMeadow, (ld - 1.5) / 1.1 * 0.6);
      else if (rv < 9) cc.copy(cBank).lerp(cMeadow, sm(4, 9, rv)); else { cc.copy(cMeadow).lerp(cMeadow2, Math.sin(mx * 0.11) * Math.cos(mz * 0.09) * 0.5 + 0.5); if (j < 0.12) cc.lerp(cDark, 0.5); }
      cc.offsetHSL(0, 0, (j - 0.5) * 0.035); for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); col.push(cc.r, cc.g, cc.b); } };
    for (let j = -N; j < N; j++) for (let i = -N; i < N; i++) { const a = pts[idx(i, j)], b = pts[idx(i + 1, j)], c = pts[idx(i, j + 1)], d = pts[idx(i + 1, j + 1)]; if ((i + j) & 1) { tri(a, c, b); tri(b, c, d); } else { tri(a, c, d); tri(a, d, b); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.5; uv[i * 2 + 1] = p.getZ(i) * 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: 0.95, metalness: 0, flatShading: true })); m.receiveShadow = true; m.name = 'townGround'; m.userData.noInk = true; G.add(m); }
  // ---------------------------------------------------------------- placement bookkeeping
  const taken = [...avoid.map(([x, z, rr]) => [x, z, rr]), [0, 0, 9], [sq.x, sq.z, 7.5]];
  const free = (x, z, rr) => { if (Math.hypot(x, z) > TOWN_R - 6) return false; if (laneD(x, z) < 2.0 + rr * 0.6) return false; if (river(x, z) < 6 + rr) return false; for (const [a, b, q] of taken) if ((x - a) ** 2 + (z - b) ** 2 < (q + rr) ** 2) return false; return true; };
  const grove = new Grove({ shadows: false }); const smoke = [];
  const house = (x, z, ry, o = {}) => { const cs = Math.cos(ry), sn = Math.sin(ry); const hts = [[-2.6, -2.3], [2.6, -2.3], [2.6, 2.5], [-2.6, 2.5], [0, 0]].map(([a, b]) => hAt(x + a * cs + b * sn, z - a * sn + b * cs)); const top = Math.max(...hts), low = Math.min(...hts);
    const c = cottage(Math.floor(r() * 1000), { lit: r() < 0.8, ...o, base: top - low + 0.45 }); c.group.position.set(x, top, z); c.group.rotation.y = ry; G.add(c.group); for (const s of c.smoke) smoke.push(c.group.localToWorld(s.clone())); taken.push([x, z, 3.2]);
    c.group.updateMatrixWorld(true); for (const gr of c.greens) { const p = c.group.localToWorld(V(gr.x, gr.y, gr.z)); grove.add(gr.kind, p.x, gr.y ? p.y : hAt(p.x, p.z), p.z, { s: gr.s, lod: Math.hypot(p.x, p.z) > 45 ? 1 : 0 }); } return c; };
  // houses lining the lanes: step along each lane, offset to either side, facing the lane
  const lineLane = (L, every, side, k0 = 0, k1 = L.length) => { for (let k = k0; k < k1; k += every) { const p = L[k], q = L[Math.min(L.length - 1, k + 1)]; const dx = q.x - p.x, dz = q.z - p.z; const len = Math.hypot(dx, dz) || 1; const nx = -dz / len, nz = dx / len;
      for (const s of side) { const off = 5.2 + r() * 1.4; const x = p.x + nx * off * s, z = p.z + nz * off * s; if (!free(x, z, 2.6)) continue; const ry = Math.atan2(-nx * s, -nz * s); house(x, z, ry + (r() - 0.5) * 0.12); } } };
  lineLane(high, 6, [1, -1], 6, 66); lineLane(side1, 7, [1, -1], 4); lineLane(side2, 7, [1, -1], 4); lineLane(side3, 7, [1, -1], 6);
  // the square: the village well, market barrels and crates, a lamp
  { const w = well(4); w.position.set(sq.x, hAt(sq.x, sq.z), sq.z); w.scale.setScalar(1.1); G.add(w);
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 2.5; const x = sq.x + Math.cos(a) * d, z = sq.z + Math.sin(a) * d; const o = lowSwap(r() < 0.5 ? 'wine_barrel_01#' + i : 'wooden_crate_01#' + i); if (!o) continue; o.position.set(x, hAt(x, z), z); o.rotation.y = r() * 6; o.scale.multiplyScalar(1.3); G.add(o); } }
  // the windmill on the rise to the right, the tholos across the river, the bridge
  { const x = 46, z = -44; const m = windmill(3); m.position.set(x, hAt(x, z) - 0.2, z); m.rotation.y = -0.6; m.scale.setScalar(1.3); G.add(m); taken.push([x, z, 5]); }
  { const x = bx - 30, z = bz - 18; const th = tholos(12, { R: 2.6, n: 10, h: 3.6 }); th.position.set(x, hAt(x, z), z); th.rotation.y = 0.4; G.add(th); taken.push([x, z, 5]); }
  { const y = Math.max(hAt(bx + 7, bz), hAt(bx - 7, bz)); const b = stoneBridge(14, 3.0, 2); b.position.set(bx, y - 0.1, bz); b.rotation.y = Math.atan2(-1, 18) * 0; G.add(b); }
  // lantern posts along the high street (glowing heads; a few real lights)
  { let n = 0; const lights = []; for (let k = 3; k < high.length - 4; k += 7) { const p = high[k], q = high[k + 1]; const dx = q.x - p.x, dz = q.z - p.z; const len = Math.hypot(dx, dz) || 1; const s = k % 2 ? 1 : -1; const x = p.x - dz / len * 2.1 * s, z = p.z + dx / len * 2.1 * s; const y = hAt(x, z);
      const post = prop('post', { h: 2.4, r: 0.08 }); post.position.set(x, y, z); G.add(post); const lan = prop('lantern', { h: 0.42 }); lan.position.set(x, y + 2.42, z); G.add(lan);
      if (n++ % 3 === 0 && lights.length < 3) { const l = new THREE.PointLight(0xffa04a, 6, 14, 1.8); l.position.set(x, y + 2.7, z); G.add(l); lights.push(l); } }
    anim.push((dt, t) => { for (const [i, l] of lights.entries()) l.intensity = 6 * (0.92 + Math.sin(t * 6.1 + i * 1.7) * 0.05 + Math.sin(t * 13.7 + i) * 0.03); }); }
  // field walls on the slopes, and fields beyond
  { const wall = (pts) => { const g = stoneWall(pts.map(([x, z]) => V(x, hAt(x, z), z)), hAt, 9); G.add(g); }; try { wall([[30, -4], [44, -12], [58, -10]]); wall([[-30, -48], [-40, -64], [-36, -80]]); wall([[18, -70], [30, -86]]); } catch (e) { /* */ } }
  // trees: cypresses along the lanes and by the tower, olive and oak groves on the slopes, pines toward the edge
  for (let k = 0; k < 340; k++) { const a = r() * Math.PI * 2, d = 10 + Math.pow(r(), 0.8) * (TOWN_R - 12); const x = Math.cos(a) * d, z = Math.sin(a) * d; const rr = 1.4; if (!free(x, z, rr)) continue;
    const kind = d < 18 ? 'cypress' : laneD(x, z) < 5 ? (r() < 0.7 ? 'cypress' : 'olive') : d > 60 ? (r() < 0.6 ? 'pine' : 'oak') : ['olive', 'oak', 'olive', 'cypress', 'laurel'][Math.floor(r() * 5)];
    grove.add(kind, x, hAt(x, z) - 0.05, z, { s: (kind === 'cypress' ? 1.1 : 1.25) + r() * 0.5, lod: d > 45 ? 1 : 0 }); taken.push([x, z, rr]); }
  G.add(grove.build());
  if (smoke.length) G.add(chimneySmoke(smoke.slice(0, 18), { n: 7, rate: 0.8 }));
  // CC0 library pieces (async): moss rocks on the slopes, a ruined column by the bridge, a stretch of old fort wall
  const jobs = [];
  const lib = (name, x, z, { s = 1, ry = r() * 6.28, y = 0 } = {}) => { jobs.push(toonModel(name, r).then((o) => { o.position.set(x, hAt(x, z) + y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } }); G.add(o); }).catch(() => null)); };
  for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, d = 20 + r() * 60; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (!free(x, z, 1.6)) continue; taken.push([x, z, 1.6]); lib(r() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, { s: 1 + r() * 0.8, y: -0.25 }); }
  lib('greek_column', bx + 9, bz + 6, { s: 0.7, y: -0.1 });
  lib('stone_wall_kit#2', -58, -30, { s: 0.42, ry: 1.1, y: -0.4 });
  return { group: G, ready: Promise.all(jobs), sq, high, update(dt, t) { for (const f of anim) f(dt, t); } };
}
