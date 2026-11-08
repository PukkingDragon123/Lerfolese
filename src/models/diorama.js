// The run map as a big hand-built MINIATURE DIORAMA (tabletop wargame / model-railway board), cel-shaded with ink
// outlines: a sculpted heightfield (rolling hills, stepped rocky terraces, a high plateau with a waterfall, mountains
// behind the guardian's mesa), a winding resin river crossing the valley under little bridges, a lake, worn dirt
// paths between the node clearings, flock-textured grass with pixel-art tufts and flowers, detailed toon trees in
// clumps, rocks, a ruined tholos, a tiny village with a windmill and fields, chests, all sitting on a walnut plinth
// whose cut edges show the soil strata. Pure scenery + geometry queries; node figurines live in minis.js.
import * as THREE from 'three';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32, clamp } from '../core/util.js';
import * as T from './toon.js';
import { toonModel, firePit } from './realworld.js';
import { loadModel, loadPBR } from '../gfx/assets.js';
import { plantField } from '../gfx/plants.js';
import { miniTree } from './minitrees.js';

const V3 = THREE.Vector3; const TAU = Math.PI * 2;
export const DIO = { X0: -20, X1: 20, ZN: 9, ZF: -72, ST: 0.15, CS: 4.0, RS: 4.4, GAP: 2.0, J: 1.2, BASE: -0.75, PPU: 16 };
/** z of a (fractional) map row: rows past the river crossing sit a little further back to make room for it */
export const rowZ = (r) => -r * DIO.RS - DIO.GAP * clamp(r - 5, 0, 1);
export const START = [0, 4.8];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const strHash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003; return h; };
const col = (h) => new THREE.Color(h);
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** world position of a map node on the diorama (bigger spacing than the rules' layout; keeps its jitter) */
export function nodeXZ(nd) {
  if (nd.id === 'guardian') return [0, rowZ(nd.row) - 3.4];
  const jx = nd.x - (nd.col - 3) * 2.3, jz = nd.z + nd.row * 2.25;
  return [(nd.col - 3) * DIO.CS + jx * DIO.J, rowZ(nd.row) + jz * DIO.J];
}

// ---------------------------------------------------------------- small pixel-art textures (cel ramps, nearest filter)
export function pixTex(w, h, fn, { repeat = [1, 1], srgb = true, mip = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fn(x, y); const k = (y * w + x) * 4; id.data[k] = v[0]; id.data[k + 1] = v[1]; id.data[k + 2] = v[2]; id.data[k + 3] = v[3] ?? 255; }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.magFilter = THREE.NearestFilter; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter; t.anisotropy = 4; return t;
}
const ramp = (hexes) => hexes.map(rgb);
const pick = (R, v) => R[clamp(Math.floor(v * R.length), 0, R.length - 1)];
const TEXC = new Map(); const once = (k, f) => (TEXC.has(k) ? TEXC.get(k) : (TEXC.set(k, f()), TEXC.get(k)));
export const TX = {
  wood: () => once('wood', () => { const n = makeNoise(31); const R = ramp(['#4a2c1a', '#6a4026', '#8a5a34', '#a8743f', '#c79256']); return pixTex(32, 32, (x, y) => { const plank = Math.floor(y / 8); const g = n(x * 0.12 + plank * 9, y * 0.9) * 0.7 + n(x * 0.5, y * 0.2 + plank) * 0.3; const seam = y % 8 === 0 ? -0.35 : y % 8 === 1 ? 0.12 : 0; const knot = Math.hypot(((x + plank * 11) % 32) - 18, (y % 8) - 4) < 1.6 ? -0.3 : 0; return pick(R, 0.25 + g * 0.55 + seam + knot); }); }),
  stone: () => once('stone', () => { const n = makeNoise(17); const R = ramp(['#4e4a52', '#6c6670', '#8a8488', '#aaa29e', '#c8beb2']); return pixTex(32, 32, (x, y) => { const row = Math.floor(y / 6); const off = row % 2 ? 5 : 0; const bx = (x + off) % 10; const mortar = y % 6 === 5 || bx === 9; const hl = y % 6 === 0 || bx === 0; const v = n(x * 0.4 + row * 3, y * 0.4) * 0.35 + 0.42; return pick(R, mortar ? 0.05 : hl ? v + 0.25 : v); }); }),
  plaster: () => once('plaster', () => { const n = makeNoise(5); const R = ramp(['#b8a48a', '#d8c8aa', '#ece0c6', '#f8f0dc']); const B = ramp(['#3a2216', '#5a3420', '#7a4a2a']); return pixTex(32, 32, (x, y) => { const beam = x < 2 || x > 29 || y > 29 || (y < 2) || Math.abs(x - y) < 1.5 && y > 16 || Math.abs(31 - x - y) < 1.5 && y > 16; if (beam) return pick(B, 0.4 + n(x * 0.8, y * 0.1) * 0.6); return pick(R, 0.45 + n(x * 0.3, y * 0.3) * 0.5); }); }),
  thatch: () => once('thatch', () => { const n = makeNoise(9); const R = ramp(['#6a4a22', '#8e6a32', '#b48c44', '#d4ae5c', '#ead07a']); return pixTex(32, 32, (x, y) => { const row = y % 8; const s = n(x * 1.3, Math.floor(y / 8) * 5.1); return pick(R, 0.2 + s * 0.6 + (row < 2 ? 0.2 : row > 6 ? -0.25 : 0) + ((x * 7 + y * 3) % 5 === 0 ? 0.12 : 0)); }); }),
  tiles: () => once('tiles', () => { const R = ramp(['#5a1e18', '#8a3022', '#b44a2e', '#d4704a']); return pixTex(32, 32, (x, y) => { const row = Math.floor(y / 5); const bx = (x + (row % 2) * 4) % 8; return pick(R, y % 5 === 4 ? 0.0 : bx === 0 ? 0.25 : y % 5 === 0 ? 0.95 : 0.55 + (bx > 5 ? -0.2 : 0)); }); }),
  cloth: (a = '#b0283a', b = '#f2e2c0') => once('cloth' + a + b, () => { const A = rgb(a), B = rgb(b); return pixTex(32, 32, (x, y) => { const s = Math.floor(x / 8) % 2 ? A : B; const w = (x + y) % 4 === 0 ? 0.92 : 1; return [s[0] * w, s[1] * w, s[2] * w]; }); }),
  iron: () => once('iron', () => { const n = makeNoise(3); const R = ramp(['#1c1a20', '#2c2a32', '#3e3c46', '#5a5862']); return pixTex(16, 16, (x, y) => pick(R, 0.3 + n(x * 0.5, y * 0.5) * 0.5)); }),
};
export const toonM = (o = {}, sat = 1.15) => T.toon({ roughness: 0.8, ...o }, { sat });

// ---------------------------------------------------------------- the diorama
export class Diorama {
  constructor({ map, seed = 1 }) {
    this.map = map; this.seed = seed; const rnd = (this.rnd = mulberry32((seed % 100000) + 71)); const n = (this.n = makeNoise((seed % 997) + 13));
    const D = DIO; this.NX = Math.round((D.X1 - D.X0) / D.ST) + 1; this.NZ = Math.round((D.ZN - D.ZF) / D.ST) + 1;
    this.group = new THREE.Group(); this.group.name = 'diorama'; this.updaters = [];
    // node layout
    this.pos = new Map(); for (const nd of Object.values(map.nodes)) this.pos.set(nd.id, nodeXZ(nd)); this.pos.set('start', START);
    this.G = this.pos.get('guardian') || [0, -56];
    this.buildRiver(); this.buildRoutes(); this.buildHeights(); this.buildBridges();
    this.buildTerrainMesh(); this.buildWater(); this.buildBase();
    this.buildVillage(); this.buildCamp(); this.buildPlants(); this.makePlantMesh();
  }

  // ------------------------------------------------ natural relief
  hNat(x, z) {
    const n = this.n; const G = this.G;
    let h = 1.0 + (n.fbm(x * 0.055 + 3.1, z * 0.055 + 7.3, 4) - 0.5) * 2.0 + (n(x * 0.25 + 9, z * 0.25) - 0.5) * 0.18;
    const ax = Math.abs(x); const vill = x < 0 && z > -22 && z < 7 ? 0.25 : 1;
    h += sstep(13.4, 18.6, ax) * (0.5 + n.fbm(x * 0.11 + 11, z * 0.11 + 2, 3) * 2.4) * vill; // rocky terraced margins
    const back = sstep(-60.5, -67, z); h += back * (2.4 + n.fbm(x * 0.09 + 5, z * 0.09 + 1, 4) * 9.5 * (0.65 + 0.35 * Math.abs(Math.sin(x * 0.17 + 1)))); // mountains
    const pl = sstep(-52.3, -53.3, z) * sstep(-14.2, -15.3, x); h = lerp(h, Math.max(h, 4.05 + (n(x * 0.3, z * 0.3) - 0.5) * 0.25), pl); // high plateau
    const dg = Math.hypot(x - G[0], (z - G[1]) * 0.85); h += (1 - sstep(2.6, 4.6, dg)) * 1.25; // guardian's mesa
    h = Math.max(h, 0.85);
    if (h > 1.55) { const q = 0.6, f = h / q, fl = Math.floor(f); const tt = q * (fl + sstep(0.7, 1.0, f - fl)); h = lerp(h, tt, sstep(1.55, 2.1, h)); } // stepped terraces
    return h;
  }

  // ------------------------------------------------ river course (adapts to the rows it crosses), lake
  buildRiver() {
    const nodes = Object.values(this.map.nodes); const D = DIO;
    const rz = (r, x) => { let s = 0, w = 0; for (const nd of nodes) if (nd.row === r) { const [nx, nz] = this.pos.get(nd.id); const k = Math.exp(-(((x - nx) / 2.6) ** 2)) + 1e-4; s += nz * k; w += k; } return w > 0.01 ? s / w : rowZ(r); };
    const ph = (this.seed % 17) * 0.37; const cross = []; for (let x = -12; x <= 12.01; x += 2) { const a = rz(5, x), b = rz(6, x); cross.push([x, (a + b) / 2 + Math.sin(x * 0.5 + ph) * Math.max(0, (a - b) / 2 - 1.75)]); }
    const main = [[-16.6, -51.3], [-16.2, -47.5], [-16.9, -42], [-16.1, -36], [-15.3, -31.5], [-13.9, -28.2], ...cross, [14.0, cross[cross.length - 1][1] + 0.6], [15.9, -21.6], [16.5, -16.5], [16.0, -11], [16.6, -6.4], [16.8, -3.6]];
    const curve = new THREE.CatmullRomCurve3(main.map(([x, z]) => new V3(x, 0, z)), false, 'centripetal'); const len = curve.getLength();
    const pts = curve.getSpacedPoints(Math.ceil(len / 0.2)); let s = 0, sc = null; const R = [];
    for (let i = 0; i < pts.length; i++) { if (i) s += pts[i].distanceTo(pts[i - 1]); if (sc == null && pts[i].z > -30 && pts[i].x > 1.6) sc = s; R.push({ x: pts[i].x, z: pts[i].z, s }); }
    sc ??= s * 0.5; this.cascade = sc;
    for (const p of R) { p.L = p.s < sc ? lerp(0.8, 0.64, p.s / sc) : lerp(0.44, 0.36, (p.s - sc) / (s - sc)); p.w = 0.6 + Math.sin(p.s * 0.37) * 0.08 + Math.sin(p.s * 0.13 + 1) * 0.06 + (p.x > 14 && p.z > -7 ? 0.15 : 0); }
    const up = new THREE.CatmullRomCurve3([[-16.0, -72.5], [-17.1, -66], [-16.3, -59.5], [-16.7, -54.6], [-16.6, -52.35]].map(([x, z]) => new V3(x, 0, z)), false, 'centripetal');
    const upP = up.getSpacedPoints(Math.ceil(up.getLength() / 0.2)); let su = 0; const U = upP.map((p, i) => { if (i) su += p.distanceTo(upP[i - 1]); return { x: p.x, z: p.z, s: su, L: lerp(3.66, 3.58, su / 20), w: 0.5 + Math.sin(su * 0.5) * 0.05 }; });
    this.river = R; this.upper = U; this.lake = { x: 16.8, z: -2.5, L: 0.36 };
    this.lakeR = (a) => 2.25 + Math.sin(a * 3 + 1) * 0.32 + Math.sin(a * 5 + 2) * 0.16;
    this.fall = { top: U[U.length - 1], foot: R[0] };
  }
  lakeD(x, z) { const dx = x - this.lake.x, dz = z - this.lake.z; return Math.hypot(dx, dz) - this.lakeR(Math.atan2(dz, dx)); }

  // ------------------------------------------------ dirt routes between node clearings
  buildRoutes() {
    this.routes = new Map(); const add = (a, b) => {
      const A = this.pos.get(a), B = this.pos.get(b); if (!A || !B) return; const dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz); const px = -dz / len, pz = dx / len; const k = strHash(a + b);
      const w1 = (hash(k, 1) - 0.5) * 1.0, w2 = (hash(k, 2) - 0.5) * 1.0;
      const c = new THREE.CatmullRomCurve3([new V3(A[0], 0, A[1]), new V3(A[0] + dx * 0.33 + px * w1, 0, A[1] + dz * 0.33 + pz * w1), new V3(A[0] + dx * 0.67 + px * w2, 0, A[1] + dz * 0.67 + pz * w2), new V3(B[0], 0, B[1])], false, 'centripetal');
      const P = c.getSpacedPoints(Math.max(8, Math.ceil(len / 0.22))); this.routes.set(a + '>' + b, { a, b, pts: P, y: new Float32Array(P.length), len: c.getLength() });
    };
    for (const nd of Object.values(this.map.nodes)) for (const id of nd.next) add(nd.id, id);
    for (const id of this.map.starts) add('start', id);
  }
  route(a, b) { return this.routes.get(a + '>' + b) || null; }

  // ------------------------------------------------ heightfield (fields stamped by segments, then combined)
  idx(x, z) { const D = DIO; const ix = clamp(Math.round((x - D.X0) / D.ST), 0, this.NX - 1), iz = clamp(Math.round((D.ZN - z) / D.ST), 0, this.NZ - 1); return iz * this.NX + ix; }
  stamp(ax, az, bx, bz, R, cb) {
    const D = DIO, NX = this.NX, NZ = this.NZ; const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - R - D.X0) / D.ST)), x1 = Math.min(NX - 1, Math.ceil((Math.max(ax, bx) + R - D.X0) / D.ST));
    const z0 = Math.max(0, Math.floor((D.ZN - Math.max(az, bz) - R) / D.ST)), z1 = Math.min(NZ - 1, Math.ceil((D.ZN - Math.min(az, bz) + R) / D.ST)); const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    for (let iz = z0; iz <= z1; iz++) { const z = D.ZN - iz * D.ST; for (let ix = x0; ix <= x1; ix++) { const x = D.X0 + ix * D.ST; let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < R) cb(iz * NX + ix, d, t); } }
  }
  buildHeights() {
    const D = DIO, NX = this.NX, NZ = this.NZ, N = NX * NZ; const F = () => new Float32Array(N).fill(1e3);
    const H = (this.H = new Float32Array(N)); const dP = (this.dP = F()), pH = new Float32Array(N), dN = (this.dN = F()), nH = new Float32Array(N), dR = (this.dR = F()), rL = (this.rL = new Float32Array(N)), rW = (this.rW = new Float32Array(N).fill(0.6));
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) H[iz * NX + ix] = this.hNat(D.X0 + ix * D.ST, D.ZN - iz * D.ST);
    // node clearings (flat pads)
    this.pad = new Map(); for (const [id, [x, z]] of this.pos) { const h = id === 'guardian' ? this.hNat(x, z) : clamp(this.hNat(x, z), 0.95, 1.55); this.pad.set(id, h); this.stamp(x, z, x, z, 2.6, (i, d) => { if (d < dN[i]) { dN[i] = d; nH[i] = h; } }); }
    // routes: a smooth ramp between the pads, partly following the land
    for (const r of this.routes.values()) {
      const ha = this.pad.get(r.a), hb = this.pad.get(r.b), P = r.pts, m = P.length - 1; const ph = P.map((p, i) => lerp(lerp(ha, hb, i / m), this.hNat(p.x, p.z), 0.35 * Math.sin((i / m) * Math.PI)));
      for (let i = 0; i < m; i++) this.stamp(P[i].x, P[i].z, P[i + 1].x, P[i + 1].z, 1.3, (k, d, t) => { if (d < dP[k]) { dP[k] = d; pH[k] = lerp(ph[i], ph[i + 1], t); } });
    }
    // rivers
    for (const R of [this.river, this.upper]) for (let i = 0; i < R.length - 1; i++) { const a = R[i], b = R[i + 1]; this.stamp(a.x, a.z, b.x, b.z, 5, (k, d, t) => { if (d < dR[k]) { dR[k] = d; rL[k] = lerp(a.L, b.L, t); rW[k] = lerp(a.w, b.w, t); } }); }
    // combine
    this.dL = new Float32Array(N);
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix, x = D.X0 + ix * D.ST, z = D.ZN - iz * D.ST; let h = H[i];
      const mp = 1 - sstep(0.45, 1.25, dP[i]); if (mp > 0) h = lerp(h, pH[i], mp);
      const mn = 1 - sstep(1.45, 2.5, dN[i]); if (mn > 0) h = lerp(h, nH[i], mn);
      h -= 0.035 * (1 - sstep(0.2, 0.4, dP[i])) * sstep(0.9, 1.3, dN[i]); // the worn path groove
      const d = dR[i], L = rL[i], w = rW[i];
      if (d < w + 5) { const lev = Math.max(h, L + 0.14 - Math.max(0, d - w - 1.0) * 0.3); h = d < w ? Math.min(lev, L - 0.03 - 0.3 * (1 - (d / w) ** 2)) : Math.min(lev, L + 0.05 + (d - w) * 1.05 + (d - w) ** 2 * 0.2); }
      const dl = this.lakeD(x, z); this.dL[i] = dl; const lk = this.lake.L; if (dl < 4) h = dl < 0 ? Math.min(h, lk - 0.04 - 0.38 * sstep(0, -1.4, dl)) : Math.min(Math.max(h, lk + 0.12), lk + 0.05 + dl * 0.9);
      H[i] = h;
    }
  }
  heightAt(x, z) {
    const D = DIO; const fx = clamp((x - D.X0) / D.ST, 0, this.NX - 1.001), fz = clamp((D.ZN - z) / D.ST, 0, this.NZ - 1.001); const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz; const H = this.H, NX = this.NX, i = iz * NX + ix;
    return lerp(lerp(H[i], H[i + 1], u), lerp(H[i + NX], H[i + NX + 1], u), v);
  }
  /** true where scenery may stand: off paths, clearings, water and steep ground */
  free(x, z, r = 0.5) {
    const D = DIO; if (x < D.X0 + 0.4 + r || x > D.X1 - 0.4 - r || z > D.ZN - 0.4 - r || z < D.ZF + 0.4 + r) return false;
    const i = this.idx(x, z); if (this.dP[i] < r + 0.45 || this.dN[i] < r + 1.7 || this.dR[i] < this.rW[i] + r + 0.35 || this.dL[i] < r + 0.35) return false;
    for (const b of this.reserved || []) if (Math.hypot(x - b[0], z - b[1]) < b[2] + r) return false;
    const e = 0.3; const s = Math.abs(this.heightAt(x + e, z) - this.heightAt(x - e, z)) + Math.abs(this.heightAt(x, z + e) - this.heightAt(x, z - e)); return s < 0.5;
  }

  // ------------------------------------------------ bridges where routes cross the river (routes ride the decks)
  buildBridges() {
    this.bridges = [];
    for (const r of this.routes.values()) {
      const P = r.pts; let run = null; const wet = P.map((p) => { const i = this.idx(p.x, p.z); return this.dR[i] < this.rW[i] + 0.3; });
      for (let i = 0; i <= P.length; i++) { if (i < P.length && wet[i]) { run ??= i; continue; } if (run != null) { const a = Math.max(0, run - 1), b = Math.min(P.length - 1, i); this.bridges.push({ r, a, b }); run = null; } }
    }
    for (const r of this.routes.values()) for (let i = 0; i < r.pts.length; i++) r.y[i] = this.heightAt(r.pts[i].x, r.pts[i].z);
    this.bridges.forEach((B, k) => { const P = B.r.pts; const A = P[B.a], Bp = P[B.b]; B.k = k; B.arch = hash(k + this.seed % 97, 4) < 0.45; B.deck = Math.max(this.heightAt(A.x, A.z), this.heightAt(Bp.x, Bp.z)) + 0.1; for (let i = B.a; i <= B.b; i++) { const t = (i - B.a) / Math.max(1, B.b - B.a); B.r.y[i] = B.deck + (B.arch ? Math.sin(t * Math.PI) * 0.16 : 0) + 0.03; } });
  }

  // ------------------------------------------------ terrain mesh + painted flock colour map
  buildTerrainMesh() {
    const D = DIO, NX = this.NX, NZ = this.NZ, H = this.H, n = this.n; const W = D.X1 - D.X0, L = D.ZN - D.ZF;
    const pos = new Float32Array(NX * NZ * 3), uv = new Float32Array(NX * NZ * 2); const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const i = iz * NX + ix, x = D.X0 + ix * D.ST, z = D.ZN - iz * D.ST; pos.set([x, H[i], z], i * 3); uv.set([(x - D.X0) / W, (z - D.ZF) / L], i * 2); }
    let k = 0; for (let iz = 0; iz < NZ - 1; iz++) for (let ix = 0; ix < NX - 1; ix++) { const a = iz * NX + ix, b = a + 1, c = a + NX, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    // the ground as crisp pixel art: hue-shifted ramps chosen per texel from the fields, Bayer-dithered zone edges,
    // pixel dirt paths with ruts and pebbles, sandy banks, trampled clearings, wildflower speckles, crop furrows
    const P = D.PPU, CW = W * P, CH = L * P; const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const g = cv.getContext('2d'); const img = g.createImageData(CW, CH);
    const mk = document.createElement('canvas'); mk.width = CW; mk.height = CH; const mg = mk.getContext('2d'); const mimg = mg.createImageData(CW, CH);
    const R = (a) => a.map(rgb); const GR = R(['#2c5a36', '#3b7438', '#52903c', '#6eaa44', '#97c452', '#c4dc6c']), DRY = R(['#5e7a34', '#7e9440', '#a0aa4c', '#c0c062']), DIRT = R(['#4e3626', '#6c4c32', '#8c6840', '#a8834e', '#c09c62', '#d6b67a']);
    const SAND = R(['#a08a5a', '#c2a872', '#dcc48c', '#ecdaa6']), MUD = R(['#3c4a3a', '#4e5c42']), HIGH = R(['#6a7a46', '#86924e', '#a2a85a']), ROCK = R(['#6e6458', '#8a7e6e', '#a89a86']), SNOW = R(['#c8cce8', '#e8ecfa', '#ffffff']);
    const FLOW = R(['#fff6e0', '#ffd84a', '#ff7a8a', '#b48aff', '#7ab8ff']); const COBBLE = R(['#6e6458', '#9a8e7c', '#bcae96', '#d8ccb2']);
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    // low-frequency noise fields on the vertex grid (sampled bilinearly per texel, much cheaper than per-texel fbm)
    const PAT = new Float32Array(NX * NZ), DRYF = new Float32Array(NX * NZ), FLF = new Float32Array(NX * NZ), FLC = new Float32Array(NX * NZ);
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const i = iz * NX + ix, x = D.X0 + ix * D.ST, z = D.ZN - iz * D.ST; PAT[i] = n.fbm(x * 0.07 + 40, z * 0.07, 3); DRYF[i] = n.fbm(x * 0.05 + 90, z * 0.05 + 3, 3); FLF[i] = n.fbm(x * 0.11 + 7, z * 0.11 + 1, 2); FLC[i] = n(x * 0.04, z * 0.04); }
    let su = 0, sv = 0, si = 0; const at = (x, z) => { const fx = clamp((x - D.X0) / D.ST, 0, NX - 1.001), fz = clamp((D.ZN - z) / D.ST, 0, NZ - 1.001); const ix = fx | 0, iz = fz | 0; su = fx - ix; sv = fz - iz; si = iz * NX + ix; };
    const samp = (A) => (A[si] * (1 - su) + A[si + 1] * su) * (1 - sv) + (A[si + NX] * (1 - su) + A[si + NX + 1] * su) * sv;
    const tone = (ramp, v, b) => ramp[clamp(Math.floor(v * ramp.length + (b - 0.5) * 0.3), 0, ramp.length - 1)];
    const plan = this.villagePlan();
    for (let py = 0; py < CH; py++) for (let px = 0; px < CW; px++) {
      const x = D.X0 + (px + 0.5) / P, z = D.ZN - (py + 0.5) / P, b = BAY[(py & 3) * 4 + (px & 3)]; const hsh = hash(px * 0.37, py * 0.71);
      at(x, z); const h = samp(H), dp = samp(this.dP), dn = samp(this.dN), dr = samp(this.dR) - samp(this.rW), dl = samp(this.dL); const wet = Math.min(dr, dl);
      let c, grass = 1;
      // meadow: big painted patches, lighter on rises, lush by the water
      const pat = samp(PAT), fine = n(x * 0.6 + 5, z * 0.6); const v = 0.32 + (pat - 0.45) * 1.1 + (fine - 0.5) * 0.18 + (h - 1.0) * 0.12 - (1 - sstep(0.3, 2.4, wet)) * 0.18;
      c = tone(GR, clamp(v, 0, 0.99), b);
      const dry = samp(DRYF); if (dry > 0.67 && wet > 1.5) c = tone(DRY, clamp((dry - 0.67) * 5 + fine * 0.3, 0, 0.99), b);
      if (h > 2.5) c = tone(HIGH, clamp((h - 2.5) * 0.4 + fine * 0.3, 0, 0.99), b); if (h > 4.9) c = tone(ROCK, clamp(fine + (h - 5) * 0.1, 0, 0.99), b); if (h + (fine - 0.5) * 0.8 > 7.2) c = tone(SNOW, fine, b);
      // wildflowers: single-pixel blooms in meadow patches
      const fl = samp(FLF); if (fl > 0.64 && hsh > 0.955 && h < 2.6 && wet > 0.8) c = FLOW[Math.floor(samp(FLC) * 5 + hsh * 2) % 5];
      // trampled clearings round the nodes
      if (dn < 1.25) { const k = (1.25 - dn) / 0.45 + (b - 0.5) * 0.8; if (k > 0.5) { c = tone(DIRT, clamp(0.55 + (fine - 0.5) * 0.5 - (dn > 1.0 ? 0.2 : 0), 0, 0.99), b); grass = 0; } }
      // paths: dark worn verge, packed earth, pale ruts, pebbles
      if (dp < 0.36) { const e = dp + (b - 0.5) * 0.06; if (e < 0.3) { grass = 0; const rut = Math.abs(dp - 0.1) < 0.025; c = e > 0.24 ? DIRT[1] : rut ? DIRT[2] : tone(DIRT, clamp(0.5 + (fine - 0.5) * 0.6 + (dp < 0.06 ? 0.15 : 0), 0, 0.99), b); if (hsh > 0.975) c = DIRT[5]; else if (hsh < 0.02) c = DIRT[0]; } else c = tone(GR, clamp(v - 0.15, 0, 0.99), b); }
      // village plaza cobbles, crop furrows
      const pz0 = plan.plaza; const pe = ((x - pz0[0]) / pz0[2]) ** 2 + ((z - pz0[1]) / pz0[3]) ** 2; if (pe < 1 + (b - 0.5) * 0.15) { const cz = Math.floor(z * 6), cx = Math.floor(x * 5 + (cz % 2) * 0.5); const edge = (((x * 5 + (cz % 2) * 0.5) % 1) + 1) % 1 < 0.18 || (((z * 6) % 1) + 1) % 1 < 0.2; c = edge ? COBBLE[0] : COBBLE[1 + ((hash(cx, cz) * 3) | 0)]; grass = 0; }
      for (const f of plan.plots) { const dx = x - f.x, dz = z - f.z, lx = dx * Math.cos(f.r) - dz * Math.sin(f.r), lz = dx * Math.sin(f.r) + dz * Math.cos(f.r); if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) { const row = ((lz + 10) / 0.24) % 1; c = row < 0.45 ? f.c1 : row < 0.6 ? DIRT[1] : f.c2; grass = 0; } }
      // sandy banks and mud
      if (wet < 0.34 + (b - 0.5) * 0.1) { c = tone(SAND, clamp(0.6 - (0.34 - wet) * 1.2 + (fine - 0.5) * 0.4, 0, 0.99), b); grass = 0; } if (wet < -0.2) c = MUD[hsh > 0.5 ? 1 : 0];
      const o = (py * CW + px) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; mimg.data[o] = mimg.data[o + 1] = mimg.data[o + 2] = grass * 255; mimg.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); mg.putImageData(mimg, 0, 0); this.paint = { g, m: mg, px: (x) => (x - D.X0) * P, pz: (z) => (D.ZN - z) * P }; const mk2 = mk;
    this.colorCanvas = cv;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.magFilter = THREE.NearestFilter; this.colorTex = tex; const mtex = new THREE.CanvasTexture(mk2); mtex.anisotropy = 4; mtex.magFilter = THREE.NearestFilter; this.maskTex = mtex;
    const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: T.gradientMap([0.5, 0.76, 1.0]) }); mat.userData.toon = true; const detail = flockDetail();
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDetail = { value: detail }; sh.uniforms.uMask = { value: mtex };
      sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = 'uniform sampler2D uDetail; uniform sampler2D uMask; varying vec3 vWP; varying vec3 vWN;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { float gm = texture2D(uMask, vMapUv).r; vec4 dt = texture2D(uDetail, vWP.xz * 0.375); vec4 dt2 = texture2D(uDetail, vWP.xz * 0.09 + 0.37);
          diffuseColor.rgb *= mix(0.8 + dt.g * 0.4, 0.78 + dt.r * 0.44, gm);
          float sl = 1.0 - clamp(vWN.y, 0.0, 1.0); float rk = smoothstep(0.36, 0.48, sl + (dt2.b - 0.5) * 0.08);
          float st = fract(vWP.y * 2.4 + dt2.b * 0.5 + dt.b * 0.15);
          vec3 rock = mix(vec3(0.3, 0.28, 0.36), vec3(0.46, 0.43, 0.5), step(0.36, st)); rock = mix(rock, vec3(0.6, 0.57, 0.62), step(0.8, st)); rock = mix(rock, vec3(0.2, 0.19, 0.26), step(0.95, st)); rock *= 0.86 + dt.b * 0.28;
          diffuseColor.rgb = mix(diffuseColor.rgb, rock, rk); }`);
    };
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = true; mesh.name = 'terrain'; this.terrain = mesh; this.group.add(mesh);
  }
  /** call after scenery painted extra marks (fields, plaza) */
  refreshPaint() { this.colorTex.needsUpdate = true; this.maskTex.needsUpdate = true; }

  // ------------------------------------------------ resin water: river ribbons, lake, waterfall, cascade foam
  buildWater() {
    const mat = waterMaterial(); this.waterMat = mat; this.updaters.push((dt, t) => { mat.uniforms.uTime.value = t; });
    const ribbon = (R, extra = 0.14) => {
      const across = 6, pos = [], ed = [], fl = [], fall = [], idx = [];
      for (let i = 0; i < R.length; i++) {
        const p = R[i], q = R[Math.min(R.length - 1, i + 1)], o = R[Math.max(0, i - 1)]; let dx = q.x - o.x, dz = q.z - o.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const w = p.w + extra;
        const slope = Math.abs(q.L - o.L) / Math.max(0.05, q.s - o.s);
        for (let j = 0; j <= across; j++) { const u = j / across, off = (u - 0.5) * 2 * w; pos.push(p.x - dz * off, p.L, p.z + dx * off); ed.push(Math.min(u, 1 - u) * 2); fl.push(u * 2.2, p.s * 0.55); fall.push(clamp(slope * 2.2, 0, 1)); }
        if (i < R.length - 1) for (let j = 0; j < across; j++) { const a = i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(ed, 1)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 2)); g.setAttribute('aFall', new THREE.Float32BufferAttribute(fall, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.receiveShadow = false; m.frustumCulled = false; m.renderOrder = 1; this.group.add(m); return m;
    };
    ribbon(this.river); ribbon(this.upper, 0.12);
    // the lake: rings from the reedy shore to the deep middle
    { const rings = 7, segs = 72, pos = [], ed = [], fl = [], fall = [], idx = []; const Lk = this.lake;
      for (let r = 0; r <= rings; r++) for (let s = 0; s <= segs; s++) { const a = (s / segs) * TAU, k = 1 - r / rings; const rr = (this.lakeR(a) + 0.16) * k; const x = Lk.x + Math.cos(a) * rr, z = Lk.z + Math.sin(a) * rr; pos.push(x, Lk.L, z); ed.push(Math.min(1, (1 - k) * 3.2)); fl.push(x * 0.5, z * 0.5); fall.push(0); }
      for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) { const a = r * (segs + 1) + s, b = a + 1, c = a + segs + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(ed, 1)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 2)); g.setAttribute('aFall', new THREE.Float32BufferAttribute(fall, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 1; this.group.add(m); }
    // the waterfall off the plateau lip: a bulging sheet of streaming water, foam at the lip and the plunge pool
    { const top = this.fall.top, foot = this.fall.foot; const fm = fallMaterial(); this.updaters.push((dt, t) => { fm.uniforms.uTime.value = t; });
      const cols = 10, rows = 22, pos = [], uvs = [], idx = []; const w = 0.62;
      for (let r = 0; r <= rows; r++) { const v = r / rows; const y = lerp(top.L + 0.02, foot.L - 0.02, v * v * 0.6 + v * 0.4); const zz = top.z + 0.35 + Math.sin(v * Math.PI * 0.5) * 0.95 + v * 0.25;
        for (let c = 0; c <= cols; c++) { const u = c / cols; const x = top.x + (u - 0.5) * 2 * (w + v * 0.25); pos.push(x, y, zz + Math.sin(u * Math.PI) * 0.12 * (1 - v)); uvs.push(u, v); } }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + 1, cc = a + cols + 1, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, fm); m.frustumCulled = false; m.renderOrder = 2; this.group.add(m); this.fallFoot = new V3(foot.x, foot.L + 0.05, foot.z); this.fallTop = new V3(top.x, top.L, top.z + 0.35); }
    // foam rings: plunge pool + cascade
    const cR = this.river.find((p) => p.s >= this.cascade) || this.river[0]; this.cascadeAt = new V3(cR.x, cR.L, cR.z);
    for (const [p, r] of [[this.fallFoot, 1.05], [new V3(cR.x, (cR.L + 0.64) / 2 + 0.02, cR.z), 0.8]]) { const f = new THREE.Mesh(new THREE.RingGeometry(r * 0.15, r, 48, 3).rotateX(-Math.PI / 2), foamMaterial()); f.position.copy(p); f.position.y += 0.012; f.renderOrder = 2; f.userData.noInk = true; this.group.add(f); this.updaters.push((dt, t) => { f.material.uniforms.uTime.value = t; }); }
  }

  // ------------------------------------------------ plinth: soil strata on the cut edges, bevelled walnut frame, brass plaque
  buildBase() {
    const D = DIO, NX = this.NX, NZ = this.NZ, H = this.H; const pos = [], top = [], idx = []; let v = 0;
    const side = (pts) => { for (let i = 0; i < pts.length; i++) { const [x, z, h] = pts[i]; pos.push(x, h, z, x, D.BASE, z); top.push(h, h); if (i) { const a = v - 2, b = v - 1, c = v, d = v + 1; idx.push(a, b, c, b, d, c); } v += 2; } };
    const row = (iz, rev) => { const a = []; for (let ix = 0; ix < NX; ix++) a.push([D.X0 + ix * D.ST, D.ZN - iz * D.ST, H[iz * NX + ix]]); return rev ? a.reverse() : a; };
    const colm = (ix, rev) => { const a = []; for (let iz = 0; iz < NZ; iz++) a.push([D.X0 + ix * D.ST, D.ZN - iz * D.ST, H[iz * NX + ix]]); return rev ? a.reverse() : a; };
    side(row(0, false)); v = pos.length / 3; side(colm(NX - 1, false)); v = pos.length / 3; side(row(NZ - 1, true)); v = pos.length / 3; side(colm(0, true));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1)); g.setIndex(idx); g.computeVertexNormals();
    // normals face outward: the winding above is consistent with an outward view on each side; flip if needed
    const nrm = g.attributes.normal; for (let i = 0; i < nrm.count; i++) { const x = pos[i * 3], z = pos[i * 3 + 2]; const ox = Math.abs(x - D.X0) < 0.01 ? -1 : Math.abs(x - D.X1) < 0.01 ? 1 : 0, oz = Math.abs(z - D.ZN) < 0.01 ? 1 : Math.abs(z - D.ZF) < 0.01 ? -1 : 0; nrm.setXYZ(i, ox, 0, oz); }
    const sm = new THREE.MeshToonMaterial({ gradientMap: T.gradientMap([0.55, 0.8, 1.0]), side: THREE.DoubleSide }); const det = flockDetail(); const n = this.n;
    sm.onBeforeCompile = (sh) => {
      sh.uniforms.uDetail = { value: det };
      sh.vertexShader = 'attribute float aTop; varying float vTop; varying vec3 vWP2;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vTop = aTop; vWP2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform sampler2D uDetail; varying float vTop; varying vec3 vWP2;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 q = vec2(vWP2.x + vWP2.z, vWP2.y) * 1.6; vec4 dt = texture2D(uDetail, q); float wob = (texture2D(uDetail, q * 0.2).b - 0.5) * 0.12; float dep = vTop - vWP2.y;
          vec3 c; if (dep < 0.07 + wob * 0.4) c = vec3(0.22, 0.42, 0.16) * (0.85 + dt.r * 0.35);
          else if (dep < 0.45 + wob) { c = vec3(0.2, 0.12, 0.07) * (0.85 + dt.g * 0.35); if (dt.b > 0.88) c = vec3(0.45, 0.36, 0.28); if (dt.r > 0.9) c = vec3(0.32, 0.2, 0.12); }
          else { float y = vWP2.y + wob * 1.5; float b = fract(y * 1.2); c = b < 0.38 ? vec3(0.36, 0.2, 0.11) : b < 0.66 ? vec3(0.5, 0.32, 0.18) : b < 0.8 ? vec3(0.3, 0.27, 0.26) : vec3(0.42, 0.38, 0.35); c *= 0.84 + dt.b * 0.3; if (dt.g > 0.9) c = vec3(0.62, 0.56, 0.5); if (dt.g < 0.12) c *= 0.6; }
          diffuseColor.rgb = c; }`);
    };
    const skirt = new THREE.Mesh(g, sm); skirt.receiveShadow = true; skirt.name = 'cutEdge'; this.group.add(skirt);
    // walnut frame: a mitred moulding swept round the board
    const prof = [[-0.03, 0.04], [0.0, 0.0], [0.16, 0.0], [0.2, -0.02, 1], [0.22, -0.06, 1], [0.22, -0.1], [0.3, -0.13], [0.36, -0.2, 1], [0.38, -0.28, 1], [0.38, -0.86], [0.42, -0.9], [0.46, -0.96, 1], [0.47, -1.04, 1], [0.47, -1.18], [0.0, -1.18]];
    const frame = sweepRect(D.X0, D.X1, D.ZF, D.ZN, D.BASE, prof); const wt = TX.wood().clone(); wt.needsUpdate = true; wt.repeat.set(0.4, 2.2); const wood = toonM({ color: '#d8a878', map: wt }, 1.05);
    const fm = new THREE.Mesh(frame, wood); fm.castShadow = true; fm.receiveShadow = true; fm.name = 'plinth'; this.group.add(fm);
    loadPBR('wood_dark', { repeat: [4, 4] }).then((m) => { const w2 = T.toonMaterial(m, { sat: 1.0, paint: '#8a5230', paintK: 0.6, bands: [0.5, 0.78, 1.0] }); fm.material = w2; }).catch(() => {});
    // brass plaque on the front
    const plq = brassPlaque('The Mythical Wilderness', 7.2, 0.62); plq.position.set(0, D.BASE - 0.56, D.ZN + 0.41); this.group.add(plq);
    // the study table under the diorama
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(140, 180).rotateX(-Math.PI / 2), toonM({ color: '#6a4028' }, 1)); desk.position.set(0, D.BASE - 1.18, -25); desk.receiveShadow = true; desk.userData.noInk = true; this.group.add(desk);
    loadPBR('wood_dark', { repeat: [14, 18] }).then((m) => { desk.material = T.toonMaterial(m, { sat: 0.95, paint: '#5a3420', paintK: 0.7, bands: [0.45, 0.72, 1.0] }); }).catch(() => {});
  }

  // ------------------------------------------------ pixel-art grass tufts, wildflowers, reeds (one instanced field)
  buildPlants() {
    const items = []; const rnd = mulberry32((this.seed % 1000) + 5); const n = this.n; const D = DIO;
    const ok = (x, z) => { const i = this.idx(x, z); if (this.H[i] > 5.2 || this.dP[i] < 0.34 || this.dN[i] < 1.1) return null; const wet = Math.min(this.dR[i] - this.rW[i], this.dL[i]); if (wet < 0.08) return null; const e = 0.2; if (Math.abs(this.heightAt(x + e, z) - this.heightAt(x - e, z)) + Math.abs(this.heightAt(x, z + e) - this.heightAt(x, z - e)) > 0.32) return null; return { i, wet }; };
    const FLOW = ['poppy', 'chamomile', 'cornflower', 'lavender'];
    for (let p = 0; p < 560; p++) {
      const cx = D.X0 + 0.5 + rnd() * (D.X1 - D.X0 - 1), cz = D.ZF + 0.5 + rnd() * (D.ZN - D.ZF - 1); const c = ok(cx, cz); if (!c) continue;
      const f = n.fbm(cx * 0.13 + 7, cz * 0.13 + 1, 2); const wet = c.wet < 0.9; const edge = this.dP[c.i] < 0.9;
      const kinds = wet ? ['reeds', 'reeds', 'cattail', 'tall'] : f > 0.6 ? [FLOW[Math.floor(n(cx * 0.05, cz * 0.05) * 4) % 4], FLOW[Math.floor(n(cx * 0.05, cz * 0.05) * 4) % 4], 'short', 'clover'] : edge ? ['dry', 'short', 'wispy', 'seed'] : rnd() < 0.15 ? ['fern', 'fern', 'tall'] : rnd() < 0.12 ? ['berry', 'broom', 'rosemary'] : ['tall', 'short', 'wispy', 'clover', 'tall'];
      const cnt = 4 + Math.floor(rnd() * 9), rad = 0.25 + rnd() * 0.45;
      for (let k = 0; k < cnt; k++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * rad; const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!ok(x, z)) continue; const kind = kinds[Math.floor(rnd() * kinds.length)]; items.push({ kind, x, y: this.heightAt(x, z) - 0.01, z, s: (/berry|broom|rosemary/.test(kind) ? 1.1 : 0.8) + rnd() * 0.35 }); }
    }
    for (const f of this.fields || []) for (const it of f) items.push(it);
    this.plantItems = items;
  }
  makePlantMesh() { const pm = plantField(this.plantItems, { wind: T.WIND, tick: T.tickWind, texel: 0.016, cam: new V3(0, 0, 1e5), far: 1e9 }); pm.renderOrder = 0; this.group.add(pm); this.plants = pm; return pm; }

  // ------------------------------------------------ the village (front-left): cottages, windmill, well, fields, fences
  villagePlan() {
    if (this._plan) return this._plan; const crops = [['seed', '#d8c060', '#b89a40'], ['dry', '#c8b45a', '#9c8a3c'], ['lavender', '#9a8ac8', '#6e5ea4'], ['tall', '#7aa048', '#567a34']];
    const plots = [[-17.2, -15.2, 2.4, 2.2, 0.15], [-14.9, -15.8, 1.8, 2.0, -0.1], [-17.6, -18.6, 2.6, 2.0, 0.05], [-17.4, 6.6, 2.2, 1.6, 0.0]].map(([x, z, w, d, r], k) => ({ x, z, w, d, r, kind: crops[k % 4][0], c1: rgb(crops[k % 4][1]), c2: rgb(crops[k % 4][2]) }));
    return (this._plan = { plaza: [-16.6, -2.8, 1.9, 1.4], plots, spots: [[-17.6, -1.5, 0.4], [-16.0, 1.8, -0.3], [-18.2, 3.6, 0.2], [-15.6, -4.8, 0.9], [-18.0, -7.6, -0.2]] });
  }
  buildVillage() {
    const g = new THREE.Group(); g.name = 'village'; this.group.add(g); const rnd = mulberry32((this.seed % 1000) + 9); this.reserved = []; const plan = this.villagePlan(); const spots = plan.spots;
    this.smokes = []; for (const [x, z, ry] of spots) { const c = cottage(rnd, ry); const y = this.heightAt(x, z); c.position.set(x, y - 0.02, z); g.add(c); this.reserved.push([x, z, 1.3]); c.updateMatrixWorld(true); this.smokes.push(c.localToWorld(c.userData.smoke.clone())); }
    { const wm = windmill(); const x = -17.4, z = -11.2; wm.position.set(x, this.heightAt(x, z) - 0.02, z); wm.rotation.y = 0.5; wm.scale.setScalar(1.25); g.add(wm); this.reserved.push([x, z, 1.4]); const sails = wm.userData.sails; this.updaters.push((dt) => { sails.rotation.z -= dt * 0.9; }); }
    { const w = well(); const x = -16.4, z = -2.9; w.position.set(x, this.heightAt(x, z), z); g.add(w); this.reserved.push([x, z, 0.6]); }
    // patchwork fields: crop sprites in rows inside little fences (the furrows are painted into the ground)
    const fields = (this.fields = []);
    for (const f of plan.plots) {
      const items = []; const { x: cx, z: cz, w, d, r: rot, kind } = f;
      for (let r = -d / 2 + 0.16; r < d / 2; r += 0.24) for (let s2 = -w / 2 + 0.1; s2 < w / 2; s2 += 0.15) { const lx = s2 * Math.cos(rot) + r * Math.sin(rot), lz = -s2 * Math.sin(rot) + r * Math.cos(rot); const x = cx + lx, z = cz + lz; items.push({ kind, x, y: this.heightAt(x, z) - 0.01, z, s: 0.75 + rnd() * 0.3 }); }
      fields.push(items); this.reserved.push([cx, cz, Math.max(w, d) * 0.62]);
      const fence = fenceRect(w + 0.2, d + 0.2, (x, z) => this.heightAt(cx + x * Math.cos(rot) + z * Math.sin(rot), cz - x * Math.sin(rot) + z * Math.cos(rot)), rnd); fence.position.set(cx, 0, cz); fence.rotation.y = rot; g.add(fence);
    }
    this.refreshPaint();
  }
  // the starting camp at the near edge: Sir Isaac's tent, a campfire and a carved signpost
  buildCamp() {
    const [x, z] = START; const y = this.heightAt(x, z); const g = new THREE.Group(); g.position.set(x, y, z); g.name = 'camp'; this.group.add(g);
    const f = firePit({ seed: 2 }); f.scale.setScalar(0.32); f.position.set(-1.0, 0, 0.5); g.add(f);
    const sign = signpost(['THE WILDS', 'DELPHI'], this.rnd); sign.position.set(1.15, 0, 0.35); sign.rotation.y = -0.35; g.add(sign);
    const tent = pupTent(); tent.position.set(-1.9, 0, -0.4); tent.rotation.y = 0.5; g.add(tent);
    this.reserved.push([x, z, 2.4]);
  }

  // ------------------------------------------------ scenery models (async): tree clumps, rocks, cliffs, ruins, chests
  async dress() {
    const rnd = mulberry32((this.seed % 1000) + 23); const jobs = []; const D = DIO; this.trees = []; this.chests = [];
    const TREE_LOOK = { sat: 1.55, tint: '#fff0e0', leafTint: '#e4ffa0', wind: 1, windH: 0.18 };
    const put = (name, x, z, s, { ry = rnd() * TAU, sink = 0.03, tree = false, look = tree ? TREE_LOOK : null } = {}) => jobs.push(toonModel(name, rnd, look).then((o) => { o.position.set(x, this.heightAt(x, z) - sink, z); o.rotation.y = ry; o.scale.multiplyScalar(s); this.group.add(o); if (tree) this.trees.push(o); return o; }).catch(() => null));
    const spot = (r, tries = 40, f = () => [D.X0 + rnd() * (D.X1 - D.X0), D.ZF + 6 + rnd() * (D.ZN - D.ZF - 8)]) => { for (let i = 0; i < tries; i++) { const p = f(); if (this.free(p[0], p[1], r)) return p; } return null; };
    // miniature trees: olives on the low meadows, oaks by the water, umbrella pines on the high ground, cypresses by ruins and hamlet
    const species = (x, z) => { const i = this.idx(x, z), h = this.H[i]; const wet = Math.min(this.dR[i] - this.rW[i], this.dL[i]); if (h > 2.3) return rnd() < 0.7 ? 'pine' : 'cypress'; if (wet < 2.5) return rnd() < 0.7 ? 'oak' : 'olive'; if (x < -13 && z > -22) return rnd() < 0.5 ? 'cypress' : 'oak'; const r = rnd(); return r < 0.5 ? 'olive' : r < 0.75 ? 'oak' : r < 0.9 ? 'cypress' : 'pine'; };
    // the environment's cel flora (models/flora.js, instanced groves) when present; otherwise our own miniature trees
    let F = null; try { F = await import('./flora.js'); if (!F.Grove || !F.TREE_KINDS) F = null; } catch (e) { F = null; } const grove = F ? new F.Grove({ shadows: true }) : null;
    const FH = { olive: 0.39, oak: 0.36, pine: 0.33, cypress: 0.36, apple: 0.4, laurel: 0.36, golden: 0.5 };
    const plant = (x, z, s = 1.5, kind = species(x, z)) => { const y = this.heightAt(x, z) - 0.02; if (grove && F.TREE_KINDS.includes(kind)) grove.add(kind, x, y, z, { s: FH[kind] * (s / 1.5) * (0.88 + rnd() * 0.24), ry: rnd() * TAU }); else { const t = miniTree(kind in FH && !['apple', 'laurel', 'golden'].includes(kind) ? kind : 'oak', rnd, s); t.position.set(x, y, z); this.group.add(t); } this.trees.push([x, z]); this.reserved.push([x, z, 0.6]); };
    // an apple orchard by the hamlet, and one golden apple tree before the guardian's mesa
    for (let k = 0; k < 9; k++) { const x = -18.6 + (k % 3) * 1.3 + (rnd() - 0.5) * 0.3, z = -22.6 - Math.floor(k / 3) * 1.3 + (rnd() - 0.5) * 0.3; if (this.free(x, z, 0.4)) plant(x, z, 1.25, 'apple'); }
    { const p = spot(0.6, 60, () => [this.G[0] + (rnd() - 0.5) * 9, this.G[1] + 4 + rnd() * 3]); if (p) plant(p[0], p[1], 1.6, 'golden'); }
    let placed = 0; for (let c = 0; c < 34 && placed < 70; c++) {
      const ctr = spot(1.0, 60); if (!ctr) continue; const nT = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < nT; k++) { const a = rnd() * TAU, r = k ? 0.75 + rnd() * 0.7 : 0; const x = ctr[0] + Math.cos(a) * r, z = ctr[1] + Math.sin(a) * r; if (!this.free(x, z, 0.45)) continue; plant(x, z, 1.35 + rnd() * 0.35); placed++; }
      for (let k = 0; k < 2; k++) { const a = rnd() * TAU, r = 0.8 + rnd() * 1.0; const x = ctr[0] + Math.cos(a) * r, z = ctr[1] + Math.sin(a) * r; if (this.free(x, z, 0.3)) put(rnd() < 0.5 ? 'searsia_lucida' : 'shrub_01', x, z, rnd() < 0.5 ? 0.4 : 0.85); }
    }
    // margin woods (denser, along the board edges)
    for (let k = 0; k < 46; k++) { const side = rnd() < 0.5 ? -1 : 1; const p = spot(0.45, 20, () => [side * (14.2 + rnd() * 5.4), D.ZF + 8 + rnd() * (D.ZN - D.ZF - 10)]); if (p) plant(p[0], p[1], 1.3 + rnd() * 0.45); }
    if (grove && grove.list.length) { const gg = grove.build(); this.group.add(gg); }
    // rocks and boulders
    for (let k = 0; k < 34; k++) { const p = spot(0.35, 25); if (!p) continue; const r = rnd(); put(r < 0.4 ? 'rock_moss_set_02' : r < 0.7 ? 'rock_moss_set_01' : r < 0.85 ? 'namaqualand_boulder_02' : 'boulder_01', p[0], p[1], r < 0.7 ? 0.16 + rnd() * 0.14 : 0.22 + rnd() * 0.12, { sink: 0.06 }); this.reserved.push([p[0], p[1], 0.5]); }
    // cliffs: the plateau face either side of the waterfall, the mountain foot
    for (let x = -19.7; x < -14.4; x += 1.25) if (Math.abs(x - this.fall.top.x) > 0.95) put('rock_face_02', x, -51.9, 0.75 + rnd() * 0.25, { ry: (rnd() - 0.5) * 0.5, sink: 0.2 });
    for (let z = -54; z > -60; z -= 1.6) put('rock_face_02', -14.4, z, 0.6 + rnd() * 0.2, { ry: -Math.PI / 2 + (rnd() - 0.5) * 0.4, sink: 0.3 });
    for (let x = -12; x < 19; x += 3.1 + rnd() * 1.5) if (Math.abs(x - this.G[0]) > 3.5) put(rnd() < 0.5 ? 'cliff_mountainside' : 'rock_face_02', x, -63.6 - rnd() * 1.5, rnd() < 0.5 ? 0.32 : 0.8, { ry: Math.PI + (rnd() - 0.5) * 0.6, sink: 0.4 });
    // rocks at the cascade and the plunge pool
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; put('rock_moss_set_02', this.fallFoot.x + Math.cos(a) * 1.25, this.fallFoot.z + Math.sin(a) * 1.0, 0.13, { sink: 0.1 }); }
    for (const s of [-1, 1]) put('rock_moss_set_02', this.cascadeAt.x, this.cascadeAt.z + s * 0.95, 0.12, { sink: 0.08 });
    // the ruined tholos on the back-right terraces
    { const cx = 16.6, cz = -39.5; this.reserved.push([cx, cz, 2.2]); const y0 = this.heightAt(cx, cz);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; const x = cx + Math.cos(a) * 1.25, z = cz + Math.sin(a) * 1.25; const which = [0, 1, 0, 1, 2, 0, 1, 1][k]; jobs.push(loadModel('greek_column#' + which).then((o) => { T.toonify(o, { sat: 1.1, tint: '#fff4ea', wind: 0 }); o.scale.setScalar(0.2); o.position.set(x, Math.min(y0, this.heightAt(x, z)) - 0.03, z); o.rotation.y = rnd() * TAU; if (which === 2) { o.rotation.z = Math.PI / 2; o.position.y += 0.1; } this.group.add(o); }).catch(() => {})); }
      put('marble_bust_01', cx, cz, 0.13, { ry: Math.PI * 0.2 }); }
    // chests hidden round the board (decorative: click to pop them open)
    const chestSpots = [[this.fallFoot.x + 1.6, this.fallFoot.z + 0.6], [16.0, -37.6], [-15.4, 6.2], [9.0, -62.0], [18.4, -29.5], [-18.6, -32.5]];
    for (const [x0, z0] of chestSpots) { let p = [x0, z0]; if (!this.free(x0, z0, 0.3)) p = spot(0.3, 30, () => [x0 + (rnd() - 0.5) * 3, z0 + (rnd() - 0.5) * 3]); if (!p) continue; jobs.push(loadModel('treasure_chest').then((o) => { T.toonify(o, { sat: 1.3, wind: 0 }); o.scale.setScalar(0.62); o.position.set(p[0], this.heightAt(p[0], p[1]) - 0.02, p[1]); o.rotation.y = rnd() * TAU; this.group.add(o); this.chests.push({ obj: o, lid: o.getObjectByName('treasure_chest_lid'), open: 0, target: 0 }); }).catch(() => {})); }
    // bridges (procedural)
    for (const B of this.bridges) this.group.add(bridge(B, this));
    await Promise.all(jobs);
    return this;
  }
  update(dt, t) { for (const u of this.updaters) u(dt, t); for (const c of this.chests || []) { c.open += (c.target - c.open) * Math.min(1, dt * 7); if (c.lid) c.lid.rotation.x = -c.open * 1.6; } }
}

// ---------------------------------------------------------------- shared detail texture (pixel flock / pebbles / rock grain)
let DETAIL = null;
function flockDetail() {
  if (DETAIL) return DETAIL; const S = 64; const rnd = mulberry32(77); const n = makeNoise(41); const R = new Float32Array(S * S).fill(0.5), G = new Float32Array(S * S).fill(0.5), B = new Float32Array(S * S);
  const at = (x, y) => (((y % S) + S) % S) * S + (((x % S) + S) % S);
  for (let k = 0; k < 520; k++) { const x = Math.floor(rnd() * S), y = Math.floor(rnd() * S); const v = rnd() < 0.55 ? 0.78 : 0.18; const len = 1 + Math.floor(rnd() * 3); for (let j = 0; j < len; j++) { R[at(x, y - j)] = v; if (v > 0.5 && j === len - 1) R[at(x, y - j - 1)] = 0.95; } }
  for (let k = 0; k < 160; k++) { const x = Math.floor(rnd() * S), y = Math.floor(rnd() * S); const v = rnd() < 0.5 ? 0.85 : 0.2; G[at(x, y)] = v; G[at(x + 1, y)] = v; if (v > 0.5) { G[at(x, y + 1)] = 0.3; G[at(x + 1, y + 1)] = 0.3; } }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) B[at(x, y)] = 0.38 + rnd() * 0.24; void n;
  for (let k = 0; k < 90; k++) { const x = Math.floor(rnd() * S), y = Math.floor(rnd() * S), v = rnd() < 0.5 ? 0.92 : 0.1; B[at(x, y)] = v; B[at(x + 1, y)] = v; B[at(x, y + 1)] = v * 0.9; }
  DETAIL = pixTex(S, S, (x, y) => [R[at(x, y)] * 255, G[at(x, y)] * 255, B[at(x, y)] * 255], { srgb: false }); return DETAIL;
}

// ---------------------------------------------------------------- water shaders (stylised resin: cel bands, flow streaks, foam lines)
const GLSL_NOISE = `float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm2(vec2 p){ return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.3 + vn(p * 4.3 + 1.3) * 0.15; }`;
function waterMaterial() {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uDeep: { value: col('#1d5f8e') }, uMid: { value: col('#2f8fb0') }, uShal: { value: col('#64c8c8') }, uFoam: { value: col('#f2fbff') } },
    vertexShader: `attribute float aEdge; attribute vec2 aFlow; attribute float aFall; varying float vEdge; varying vec2 vFlow; varying float vFall; varying vec3 vWP;
      void main(){ vEdge = aEdge; vFlow = aFlow; vFall = aFall; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uDeep, uMid, uShal, uFoam; varying float vEdge; varying vec2 vFlow; varying float vFall; varying vec3 vWP; ${GLSL_NOISE}
      void main(){
        vec2 f = vFlow; float t = uTime;
        float wob = (vn(vWP.xz * 3.0 + t * 0.4) - 0.5) * 0.18;
        float e = vEdge + wob;
        vec3 c = e < 0.3 ? uShal : e < 0.62 ? uMid : uDeep;
        float st = fbm2(vec2(f.x * 2.2, f.y * 1.4 - t * 0.9)); float st2 = fbm2(vec2(f.x * 4.0 + 7.0, f.y * 3.0 - t * 1.6));
        if (st > 0.66) c = mix(c, uShal, 0.55); if (st2 > 0.74) c = mix(c, uFoam, 0.75);
        float foam = step(e, 0.12 + sin(f.y * 9.0 - t * 2.5) * 0.03) + step(0.5, vFall) * step(0.45, st2);
        float glint = step(0.985, vn(vWP.xz * 9.0 + vec2(t * 0.7, -t * 0.5)));
        c = mix(c, uFoam, clamp(foam + glint, 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
function fallMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: col('#4aa8c8') }, uB: { value: col('#a8e8f0') }, uFoam: { value: col('#f6fdff') } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uA, uB, uFoam; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ float s = fbm2(vec2(vUv.x * 7.0, vUv.y * 2.2 - uTime * 2.4)); float s2 = vn(vec2(vUv.x * 14.0, vUv.y * 5.0 - uTime * 3.6));
        vec3 c = s > 0.55 ? uB : uA; if (s2 > 0.7) c = uFoam; if (vUv.y < 0.08 || vUv.y > 0.86 + s * 0.08) c = uFoam;
        float edge = min(vUv.x, 1.0 - vUv.x); float a = smoothstep(0.0, 0.08, edge + (s - 0.5) * 0.1);
        gl_FragColor = vec4(c, a * 0.95); }`,
  });
  return m;
}
function foamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vP; ${GLSL_NOISE}
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float ring = fract(r * 2.4 - uTime * 0.8); float n = vn(vec2(a * 3.0, r * 4.0 - uTime * 1.2));
        float m = step(0.55, n) * step(ring, 0.55) * (1.0 - smoothstep(0.5, 1.0, r)); if (m < 0.5) discard; gl_FragColor = vec4(0.95, 0.99, 1.0, 0.9); }`,
  });
}

// ---------------------------------------------------------------- swept moulding round a rectangle (mitred corners, smooth groups)
function sweepRect(x0, x1, z0, z1, y0, prof) {
  const corners = [[x0, z1, -1, 1], [x1, z1, 1, 1], [x1, z0, 1, -1], [x0, z0, -1, -1]]; const pos = [], nrm = [], uv = [], idx = []; let v = 0;
  // profile normals (in the o/y plane), split at sharp points (flag 1 = smooth vertex)
  const pn = prof.map((p, i) => { const a = prof[Math.max(0, i - 1)], b = prof[Math.min(prof.length - 1, i + 1)]; const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...d) || 1; return [-d[1] / l, d[0] / l]; });
  for (let s = 0; s < 4; s++) {
    const A = corners[s], B = corners[(s + 1) % 4]; const ex = B[0] - A[0], ez = B[1] - A[1], el = Math.hypot(ex, ez); const ox = -ez / el, oz = ex / el; // outward normal of this side
    let along = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const p = prof[i], q = prof[i + 1]; const smooth = (k) => prof[k][2] === 1; const segN = (() => { const d = [q[0] - p[0], q[1] - p[1]]; const l = Math.hypot(...d) || 1; return [-d[1] / l, d[0] / l]; })();
      const nA = smooth(i) ? pn[i] : segN, nB = smooth(i + 1) ? pn[i + 1] : segN;
      for (const [pp, nn, vv] of [[p, nA, along], [q, nB, along + Math.hypot(q[0] - p[0], q[1] - p[1])]]) for (const C of [A, B]) {
        pos.push(C[0] + C[2] * pp[0], y0 + pp[1], C[1] + C[3] * pp[0]); nrm.push(ox * nn[0], nn[1], oz * nn[0]); uv.push((C === A ? 0 : el) * 0.25, vv * 2);
      }
      along += Math.hypot(q[0] - p[0], q[1] - p[1]); idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); v += 4;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}

// ---------------------------------------------------------------- props
const bevelBox = (w, h, d, b = 0.02) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + b, -h / 2); s.lineTo(w / 2 - b, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + b); s.lineTo(w / 2, h / 2 - b); s.quadraticCurveTo(w / 2, h / 2, w / 2 - b, h / 2); s.lineTo(-w / 2 + b, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - b); s.lineTo(-w / 2, -h / 2 + b); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + b, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - b * 2), bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.6, bevelSegments: 3, curveSegments: 4 }); g.translate(0, 0, -(d - b * 2) / 2); g.computeVertexNormals(); return g; };
export { bevelBox };
const M = (geo, mat, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
let MATS = null; const mats = () => { if (!MATS) { MATS = mkMats(); MATS.plaster.map.repeat.set(2.4, 2.4); MATS.thatch.map.repeat.set(3, 3); MATS.tiles.map.repeat.set(3, 3); MATS.stone.map.repeat.set(2.5, 2.5); MATS.wood.map.repeat.set(2, 2); } return MATS; };
const mkMats = () => ({
  wood: toonM({ color: '#e0b080', map: TX.wood() }), darkWood: toonM({ color: '#9a6a48', map: TX.wood() }), plaster: toonM({ map: TX.plaster() }), thatch: toonM({ map: TX.thatch() }), tiles: toonM({ map: TX.tiles() }), stone: toonM({ map: TX.stone() }),
  window: new THREE.MeshToonMaterial({ color: '#ffd890', emissive: '#ffb050', emissiveIntensity: 0.9, gradientMap: T.gradientMap([1, 1]) }), canvas: toonM({ color: '#efe2c4' }), bridgeStone: toonM({ color: '#f4e8d4', map: TX.stone() }), plank: toonM({ color: '#c8a888', map: TX.wood() }), rope: toonM({ color: '#a88a5a' }), iron: toonM({ map: TX.iron() }),
});
function cottage(rnd, ry) {
  const g = new THREE.Group(); const Mt = mats(); const w = 0.85 + rnd() * 0.3, d = 0.7 + rnd() * 0.2, h = 0.55 + rnd() * 0.12, rh = 0.42 + rnd() * 0.1; const thatch = rnd() < 0.5;
  // walls with gables: a pentagon prism (front elevation) with soft bevels
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(0, h + rh); s.lineTo(-w / 2, h); s.closePath();
  const wg = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 }); wg.translate(0, 0, -d / 2); wg.computeVertexNormals();
  M(wg, Mt.plaster, g);
  // roof: two thick bevelled slabs overhanging the gables
  const pitch = Math.atan2(rh, w / 2), sl = Math.hypot(w / 2, rh) + 0.12; const roofM = thatch ? Mt.thatch : Mt.tiles;
  for (const sx of [-1, 1]) { const r = M(bevelBox(sl, thatch ? 0.1 : 0.06, d + 0.22, thatch ? 0.04 : 0.018), roofM, g); r.position.set(sx * (w / 4 + 0.02), h + rh / 2 + 0.06, 0); r.rotation.z = -sx * pitch; }
  M(bevelBox(0.08, 0.08, d + 0.26, 0.025), thatch ? Mt.thatch : Mt.darkWood, g, 0, h + rh + 0.06, 0).rotation.z = Math.PI / 4;
  // chimney with a little smoke anchor
  M(bevelBox(0.13, 0.36, 0.13, 0.02), Mt.stone, g, w * 0.22, h + rh * 0.75, -d * 0.18); g.userData.smoke = new V3(w * 0.22, h + rh * 0.75 + 0.22, -d * 0.18);
  // door + glowing windows (pixel decals with frames)
  M(bevelBox(0.17, 0.3, 0.03, 0.01), Mt.darkWood, g, -w * 0.18, 0.15, d / 2 + 0.01);
  for (const [x, y, z, ry2] of [[w * 0.2, h * 0.58, d / 2 + 0.01, 0], [w / 2 + 0.01, h * 0.58, 0, Math.PI / 2], [-w / 2 - 0.01, h * 0.58, 0.05, -Math.PI / 2]]) { const fr = M(bevelBox(0.17, 0.15, 0.025, 0.008), Mt.darkWood, g, x, y, z); fr.rotation.y = ry2; const gl = M(new THREE.PlaneGeometry(0.11, 0.09), Mt.window, fr, 0, 0, 0.014); gl.castShadow = false; }
  g.rotation.y = ry; g.scale.setScalar(1.3); return g;
}
function windmill() {
  const g = new THREE.Group(); const Mt = mats();
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(0.48 - t * 0.16, t * 1.5)); } prof.unshift(new THREE.Vector2(0.001, 0)); prof.push(new THREE.Vector2(0.001, 1.5));
  M(new THREE.LatheGeometry(prof, 32), Mt.stone, g);
  const cap = []; for (let i = 0; i <= 10; i++) { const t = i / 10; cap.push(new THREE.Vector2(Math.max(0.001, 0.4 * Math.cos(t * Math.PI * 0.5) * (1 + (1 - t) * 0.12)), 1.48 + Math.sin(t * Math.PI * 0.5) * 0.55)); }
  M(new THREE.LatheGeometry(cap, 24), Mt.thatch, g);
  M(bevelBox(0.22, 0.34, 0.04, 0.012), Mt.darkWood, g, 0, 0.17, 0.44);
  const hub = new THREE.Group(); hub.position.set(0, 1.62, 0.42); g.add(hub); g.userData.sails = hub; M(bevelBox(0.12, 0.12, 0.14, 0.03), Mt.darkWood, hub);
  for (let k = 0; k < 4; k++) { const arm = new THREE.Group(); arm.rotation.z = (k / 4) * TAU; hub.add(arm); M(bevelBox(0.05, 1.05, 0.04, 0.012), Mt.darkWood, arm, 0, 0.55, 0.05);
    for (let j = 0; j < 5; j++) M(bevelBox(0.26, 0.02, 0.02, 0.006), Mt.wood, arm, 0.1, 0.25 + j * 0.18, 0.06);
    const sail = M(new THREE.PlaneGeometry(0.22, 0.85), toonM({ color: '#f2e8d0', side: THREE.DoubleSide }), arm, 0.12, 0.6, 0.07); sail.castShadow = true; }
  return g;
}
function well() {
  const g = new THREE.Group(); const Mt = mats(); const ring = []; for (let i = 0; i <= 8; i++) { const t = i / 8; ring.push(new THREE.Vector2(0.24 + Math.sin(t * Math.PI) * 0.025, t * 0.22)); } ring.push(new THREE.Vector2(0.18, 0.22), new THREE.Vector2(0.18, 0.05));
  M(new THREE.LatheGeometry(ring, 28), Mt.stone, g); const water = M(new THREE.CircleGeometry(0.18, 24).rotateX(-Math.PI / 2), toonM({ color: '#2a6a8a' }), g, 0, 0.12, 0); water.castShadow = false;
  for (const s of [-1, 1]) M(bevelBox(0.04, 0.5, 0.04, 0.01), Mt.darkWood, g, s * 0.22, 0.42, 0);
  M(bevelBox(0.5, 0.03, 0.03, 0.01), Mt.darkWood, g, 0, 0.6, 0); for (const s of [-1, 1]) { const r = M(bevelBox(0.34, 0.03, 0.5, 0.012), Mt.thatch, g, s * 0.13, 0.72, 0); r.rotation.z = -s * 0.75; }
  return g;
}
function fenceRect(w, d, hAt, rnd) {
  const g = new THREE.Group(); const Mt = mats(); const post = bevelBox(0.035, 0.18, 0.035, 0.008);
  const edges = [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]];
  for (const [ax, az, bx, bz] of edges) { const len = Math.hypot(bx - ax, bz - az); const n = Math.max(2, Math.round(len / 0.32)); const ry = Math.atan2(-(bz - az), bx - ax);
    for (let i = 0; i < n; i++) { const t = i / n, t2 = (i + 1) / n; const x = lerp(ax, bx, t), z = lerp(az, bz, t); const p = M(post, Mt.darkWood, g, x, hAt(x, z) + 0.07, z); p.rotation.z = (rnd() - 0.5) * 0.12;
      if (rnd() < 0.92) for (const yy of [0.05, 0.11]) { const x2 = lerp(ax, bx, (t + t2) / 2), z2 = lerp(az, bz, (t + t2) / 2); const r = M(bevelBox(len / n + 0.02, 0.022, 0.018, 0.006), Mt.wood, g, x2, hAt(x2, z2) + yy, z2); r.rotation.y = ry; } } }
  return g;
}
function signpost(words, rnd) {
  const g = new THREE.Group(); const Mt = mats(); M(bevelBox(0.06, 0.9, 0.06, 0.015), Mt.darkWood, g, 0, 0.45, 0);
  words.forEach((wd, i) => { const b = new THREE.Group(); b.position.set(0, 0.72 - i * 0.2, 0.04); b.rotation.y = (i ? -1 : 1) * 0.3 + (rnd() - 0.5) * 0.2; g.add(b);
    const sh = new THREE.Shape(); sh.moveTo(-0.3, -0.07); sh.lineTo(0.26, -0.07); sh.lineTo(0.34, 0); sh.lineTo(0.26, 0.07); sh.lineTo(-0.3, 0.07); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }); geo.computeVertexNormals();
    M(geo, Mt.wood, b, 0.15, 0, 0); const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.font = '16px "Alagard"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#2a1408'; x.fillText(wd, 60, 17); x.fillStyle = 'rgba(40,16,4,0.35)'; x.fillText(wd, 61, 18);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshToonMaterial({ map: t, transparent: true, gradientMap: T.gradientMap([0.6, 1]) })); p.position.set(0.15, 0, 0.042); p.userData.noInk = true; b.add(p); });
  return g;
}
function pupTent() {
  const g = new THREE.Group(); const Mt = mats(); const L = 1.0, W = 0.46, Hh = 0.58;
  const canvas = toonM({ map: pixTex(16, 16, (x, y) => { const seam = x % 8 === 0; const patch = x > 9 && x < 14 && y > 3 && y < 8; const v = 0.85 + hash(x, y) * 0.1; const c = patch ? [168, 120, 80] : seam ? [190, 170, 130] : [226, 210, 172]; return [c[0] * v, c[1] * v, c[2] * v]; }), side: THREE.DoubleSide });
  const side = (s) => clothSheetT(10, 6, (u, v, p) => { const sag = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.04; p.set((u - 0.5) * L, Hh * (1 - v) - sag, s * (W * v + sag * 0.4)); });
  M(side(1), canvas, g); M(side(-1), canvas, g);
  // back panel closed, front flaps tied open
  const tri = (z, open) => { const s = new THREE.Shape(); if (open) { s.moveTo(0, Hh); s.lineTo(-W, 0); s.lineTo(-W * 0.55, 0); s.lineTo(-0.04, Hh * 0.7); s.closePath(); } else { s.moveTo(-W, 0); s.lineTo(W, 0); s.lineTo(0, Hh); s.closePath(); } const gg = new THREE.ShapeGeometry(s); gg.rotateY(Math.PI / 2); gg.translate(z, 0, 0); return gg; };
  M(tri(-L / 2, false), canvas, g); const f1 = M(tri(L / 2, true), canvas, g); const f2 = M(tri(L / 2, true), canvas, g); f2.scale.z = -1; void f1;
  M(bevelBox(L + 0.12, 0.025, 0.025, 0.008), Mt.darkWood, g, 0, Hh + 0.01, 0);
  for (const s of [-1, 1]) { M(bevelBox(0.03, Hh + 0.1, 0.03, 0.008), Mt.darkWood, g, s * (L / 2 + 0.02), (Hh + 0.1) / 2, 0); const rope = new THREE.CatmullRomCurve3([new V3(s * (L / 2 + 0.02), Hh + 0.05, 0), new V3(s * (L / 2 + 0.3), Hh * 0.45, 0), new V3(s * (L / 2 + 0.5), 0.0, 0)]); M(new THREE.TubeGeometry(rope, 10, 0.006, 5), Mt.rope, g); }
  const bed = M(bevelBox(0.5, 0.05, 0.26, 0.02), toonM({ color: '#8a3a2a' }), g, -0.05, 0.03, 0.02); bed.castShadow = false;
  return g;
}
function clothSheetT(cols, rows, fn) { const pos = [], uv = [], idx = []; const p = new V3(); for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows; fn(u, v, p); pos.push(p.x, p.y, p.z); uv.push(u * 2, v); } for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
function bridge(B, dio) {
  const g = new THREE.Group(); const Mt = mats(); const P = B.r.pts; const A = P[B.a], Bp = P[B.b]; const dx = Bp.x - A.x, dz = Bp.z - A.z; const len = Math.hypot(dx, dz) + 0.5; const ry = Math.atan2(dx, dz);
  g.position.set((A.x + Bp.x) / 2, B.deck, (A.z + Bp.z) / 2); g.rotation.y = ry; const W = 0.62;
  if (B.arch) { // stone arch with parapets
    const s = new THREE.Shape(); const hl = len / 2, ar = Math.min(hl * 0.66, 0.72); s.moveTo(-hl, 0.08); s.lineTo(hl, 0.08); s.lineTo(hl, -0.78); s.lineTo(ar, -0.78); s.absarc(0, -0.78, ar, 0, Math.PI, false); s.lineTo(-hl, -0.78); s.closePath();
    // deck follows a gentle hump
    const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2, curveSegments: 18 }); geo.translate(0, 0, -W / 2); geo.rotateY(Math.PI / 2); geo.computeVertexNormals();
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (p.getY(i) > 0.0) p.setY(i, p.getY(i) + Math.cos((z / (len / 2)) * Math.PI / 2) * 0.16); } geo.computeVertexNormals();
    const st = Mt.bridgeStone; M(geo, st, g);
    for (const s2 of [-1, 1]) for (let k = 0; k < 5; k++) { const z = (k / 4 - 0.5) * (len - 0.3); const c = M(bevelBox(0.08, 0.14, len / 5 - 0.02, 0.018), st, g, s2 * (W / 2 - 0.02), 0.16 + Math.cos((z / (len / 2)) * Math.PI / 2) * 0.16, z); c.rotation.x = Math.sin((z / (len / 2)) * Math.PI / 2) * 0.28; }
  } else { // plank bridge on posts with rope rails
    for (let z = -len / 2 + 0.06; z < len / 2; z += 0.105) { const pl = M(bevelBox(W, 0.035, 0.09, 0.01), Mt.plank, g, (hash(z, 3) - 0.5) * 0.04, 0.02 + (hash(z, 5) - 0.5) * 0.01, z); pl.rotation.y = (hash(z, 7) - 0.5) * 0.08; }
    for (const s2 of [-1, 1]) { M(bevelBox(0.05, 0.05, len, 0.012), Mt.darkWood, g, s2 * (W / 2 - 0.04), -0.03, 0); for (let k = 0; k < 4; k++) { const z = (k / 3 - 0.5) * (len - 0.15); M(bevelBox(0.045, 0.62, 0.045, 0.01), Mt.darkWood, g, s2 * (W / 2 + 0.02), -0.06, z); }
      const rope = new THREE.CatmullRomCurve3([new V3(s2 * (W / 2 + 0.02), 0.24, -len / 2 + 0.07), new V3(s2 * (W / 2 + 0.02), 0.19, -len / 6), new V3(s2 * (W / 2 + 0.02), 0.19, len / 6), new V3(s2 * (W / 2 + 0.02), 0.24, len / 2 - 0.07)]); M(new THREE.TubeGeometry(rope, 24, 0.012, 6), Mt.rope, g); }
  }
  void dio; return g;
}
function brassPlaque(text, w, h) {
  const g = new THREE.Group(); const brass = new THREE.MeshToonMaterial({ color: '#d8a848', gradientMap: T.gradientMap([0.45, 0.75, 1.0]) });
  const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#d6a44a'; x.fillRect(0, 0, 1024, 96); x.strokeStyle = '#7a5418'; x.lineWidth = 4; x.strokeRect(10, 10, 1004, 76); x.lineWidth = 2; x.strokeRect(18, 18, 988, 60);
  x.font = '48px "Alagard"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff0b8'; x.fillText(text.toUpperCase(), 513, 52); x.fillStyle = '#4a2c0c'; x.fillText(text.toUpperCase(), 512, 50);
  for (const sx of [40, 984]) { x.fillStyle = '#6a4610'; x.beginPath(); x.arc(sx, 48, 9, 0, TAU); x.fill(); x.fillStyle = '#f6d880'; x.beginPath(); x.arc(sx - 2, 46, 4, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const plate = M(bevelBox(w, h, 0.06, 0.025), brass, g); const face = M(new THREE.PlaneGeometry(w - 0.04, h - 0.04), new THREE.MeshToonMaterial({ map: t, gradientMap: T.gradientMap([0.55, 0.8, 1.0]) }), g, 0, 0, 0.032); face.castShadow = false; face.userData.noInk = true; void plate;
  return g;
}
export { M as addMesh, mats as propMats };
