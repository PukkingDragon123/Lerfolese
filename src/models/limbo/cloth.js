// CLOTH for every Limbo human (Newton, kid Isaac, the old teacher, event NPCs, humanoid monsters):
//  1. PIXEL CLOTH on the painted page: while the body is painted, a recorder notes which texels are cloth and their surface
//     coordinates; after the page is cleaned, a pass weaves real fabric into them: linen plain weave, wool twill wales,
//     slubs, side / inside / shoulder / back seams with a stitch row either side, turned hems at every garment edge (a
//     shadowed fold, a stitch row, frayed fibres), and wear (shiny elbows, scuffed knees, a sat-in seat).
//  2. CLOTH PHYSICS, stable and cheap (a few hundred verlet nodes per character, two constraint passes):
//     - SkinnedCloth: the skinned coat tails / skirts on the Limbo 'coat' bone are driven by a verlet grid round the hips
//       (gravity, inertia from the body's own motion, a breath of wind, leg capsules, shape memory stiff at the waist and
//       free at the hem); each frame the grid's lag is added to those vertices in bind space. Automatic on LimboBody.
//     - ClothPanel: a free hanging verlet sheet / tube (robes, bell sleeves, stoles, scarves, shirt tails, capes) pinned to
//       bones through a rest(i, j) function, drawn with a hand-pixelled cloth texture (clothTex).
// Everything is a function of bind-pose points, so it stays put on the body; no shader tricks.
import * as THREE from 'three';
import { BONES } from './humanModel.js';
import { SEC_BONES } from './gg/types.js';

const hexc = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const h2 = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ================================================================== 1. pixel cloth on the page
/** S = page size; app = Limbo appearance (its skin colour tells skin from cloth). hook(inner) wraps a character's paint hook. */
export function clothRecorder(S, app) {
  const info = new Uint8Array(S * S), cls = new Uint8Array(S * S); const sk = hexc(app.skin ?? 0xe8b98f); let P = null;
  const isSkin = (o) => Math.abs(o[0] / (sk[0] + 1) - o[1] / (sk[1] + 1)) + Math.abs(o[1] / (sk[1] + 1) - o[2] / (sk[2] + 1)) < 0.075 && o[0] >= o[2];
  const note = (c, o) => {
    const p = c.j * S + c.i; if (p < 0 || p >= S * S || !P) return;
    if ((c.mat === 'hand' && c.part !== 'cuff') || isSkin(o) || c.kind !== 'side') { info[p] = 1; return; }
    const f = c.f; const dens = f.dens || 1 / c.px; const s = f.s0 + (c.e + 1) * 0.5 * (f.s1 - f.s0); const r = f.r1 - c.rt;
    const si = Math.floor(s * dens + 4000.5) & 3, rj = Math.floor(r * dens + 4000.5) & 3; const H = P.H || 1.8;
    const arm = c.part === 'uarm' || c.part === 'farm' || c.part === 'cuff', leg = c.part === 'thigh' || c.part === 'calf' || c.part === 'shin';
    const sd = Math.sign(c.x) || 1; const hw = (f.s1 - f.s0) * dens * 0.5; const mid = Math.abs(c.e) * hw < 0.75;
    let seam = false;
    if (mid) {
      if (!arm && !leg && Math.abs(c.nx) > 0.85) seam = true; // side seams
      else if ((arm || leg) && c.nx * sd < -0.78) seam = true; // inseams
      else if (leg && c.nx * sd > 0.85) seam = true; // outseams of breeches
      else if (!arm && !leg && c.nz < -0.85 && c.y < P.waistY) seam = true; // centre back
    }
    if (c.part === 'uarm' && Math.abs(c.y - (P.shoulderY - 0.03 * H)) < c.px * 0.6) seam = true; // set-in sleeve
    let wear = 0;
    if (arm && Math.abs(c.y - P.elbowY) < 0.035 * H && c.nz < 0.1) wear = 2;
    if (leg && Math.abs(c.y - P.kneeY) < 0.04 * H && c.nz > 0.2) wear = 3;
    if (!arm && !leg && c.y < P.crotchY + 0.05 * H && c.nz < -0.4) wear = 1;
    info[p] = 16 | si | (rj << 2) | (seam ? 32 : 0) | (wear << 6);
    cls[p] = leg ? 2 : o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11 > 150 ? 1 : 2; // pale = linen plain weave, else wool twill
  };
  return {
    info, cls,
    hook(inner) { return (paint, P0, spec) => { P = P0; const p = (inner && inner(paint, P0, spec)) || paint; const w = (fn) => fn && ((c, o) => { fn(c, o); note(c, o); }); return { ...p, body: w(p.body), skin: w(p.skin), hand: w(p.hand) }; }; },
    /** weave the fabric into the (cleaned) page data */
    apply(d) {
      const src = d.slice(); const diff = (p, q) => Math.abs(src[p * 4] - src[q * 4]) + Math.abs(src[p * 4 + 1] - src[q * 4 + 1]) + Math.abs(src[p * 4 + 2] - src[q * 4 + 2]);
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const p = j * S + i; const f = info[p]; if (!(f & 16)) continue; const q = p * 4;
        const si = f & 3, rj = (f >> 2) & 3, seam = f & 32, wear = f >> 6;
        let m = cls[p] === 1 ? (((si + rj) & 1) ? 1.045 : 0.955) : (((si + rj) & 3) < 2 ? 1.065 : 0.925); // weave / twill wale
        m *= 0.97 + h2(i, j) * 0.06; if (h2(i >> 2, j, 9) > 0.93) m *= 1.06; // slubs: thicker yarn runs
        // a garment edge 1-3 texels above / below on this face: a turned hem
        let e = 0;
        for (let k = 1; k <= 3 && !e; k++) for (const dj of [-k, k]) { const jj = j + dj; if (jj < 0 || jj >= S) continue; const pp = jj * S + i; const fi = info[pp]; if (!fi) continue; if (!(fi & 16) || diff(p, pp) > 95) { e = k; break; } }
        let thread = false;
        if (e === 1) { m *= 0.8; if (h2(i, j, 3) < 0.16) m *= 0.84; } else if (e === 2) { thread = (si & 3) !== 3; } else if (e === 3) m *= 1.05;
        if (seam) m *= 0.74; else if ((i > 0 && (info[p - 1] & 32)) || (i < S - 1 && (info[p + 1] & 32))) thread = thread || (rj & 3) !== 3;
        let r = src[q] * m, g = src[q + 1] * m, b = src[q + 2] * m; const l = (r + g + b) / 3;
        if (thread) { const t = l > 150 ? -46 : 52; r = r * 0.4 + (l + t) * 0.6; g = g * 0.4 + (l + t) * 0.6; b = b * 0.4 + (l + t - 4) * 0.6; }
        if (wear) { const w = wear * 0.06 * (0.6 + h2(i >> 1, j >> 1, 7) * 0.8); r += (l * 1.22 - r) * w; g += (l * 1.2 - g) * w; b += (l * 1.16 - b) * w; }
        d[q] = r < 0 ? 0 : r > 255 ? 255 : r; d[q + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[q + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
    },
  };
}

// ================================================================== hand-pixelled cloth textures for the panels
/** a canvas texture of real cloth: weave, slubs, a gathered top, side seams with stitching, a turned hem with stitch row,
 *  an optional embroidered band (greek key / running vine / runes), fraying (alpha), darned patches, wear and dust */
export function clothTex({ w = 64, h = 128, base = [90, 70, 50], weave = 'twill', seams = [], hem = 6, band = null, bandH = 7, fray = 1, patches = 0, wear = 0.4, dust = 0.35, seed = 1, top = true, stripe = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); const D = id.data;
  const set = (x, y, col, a = 255) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const q = (y * w + x) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = a; };
  const mul = (col, k) => [col[0] * k, col[1] * k, col[2] * k];
  const lift = (col, t) => { const l = (col[0] + col[1] + col[2]) / 3; return [col[0] * 0.4 + (l + t) * 0.6, col[1] * 0.4 + (l + t) * 0.6, col[2] * 0.4 + (l + t - 4) * 0.6]; };
  const pt = [];
  for (let k = 0; k < patches; k++) pt.push({ x: Math.floor(h2(k, seed, 1) * (w - 14)) + 2, y: Math.floor(h2(k, seed, 2) * (h * 0.6)) + Math.floor(h * 0.2), w: 6 + Math.floor(h2(k, seed, 3) * 6), h: 7 + Math.floor(h2(k, seed, 4) * 6), k: 0.82 + h2(k, seed, 5) * 0.12 });
  const bandY0 = h - hem - bandH - 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let k = weave === 'plain' ? (((x + y) & 1) ? 1.05 : 0.95) : weave === 'knit' ? ((x & 1) ? 1.07 : 0.9) * (((y + (x >> 1)) & 1) ? 1.02 : 0.97) : weave === 'velvet' ? 0.97 + h2(x, y >> 1, seed) * 0.08 : (((x + y) & 3) < 2 ? 1.07 : 0.92);
    k *= 0.96 + h2(x, y, seed) * 0.08; if (h2(x >> 3, y, seed + 9) > 0.94) k *= 1.07; if (h2(x, y >> 3, seed + 4) > 0.95) k *= 0.93; // slubs
    let col = base; if (stripe && Math.floor(x / stripe.w) % 2) col = stripe.c;
    // wear: rubbed patches go lighter and greyer, dust gathers toward the hem
    const wv = wear * Math.max(0, Math.sin(x * 0.21 + seed) * Math.cos(y * 0.13 - seed) - 0.55) * 1.6; if (wv > 0) { const l = (col[0] + col[1] + col[2]) / 3; col = [col[0] + (l * 1.2 - col[0]) * wv, col[1] + (l * 1.18 - col[1]) * wv, col[2] + (l * 1.14 - col[2]) * wv]; }
    const dy = y / h; if (dust > 0 && dy > 0.7) { const dd = (dy - 0.7) / 0.3 * dust * (0.7 + h2(x >> 1, y >> 1, seed + 2) * 0.6); col = [col[0] * (1 - dd * 0.35) + 92 * dd * 0.35, col[1] * (1 - dd * 0.35) + 76 * dd * 0.35, col[2] * (1 - dd * 0.35) + 58 * dd * 0.35]; }
    let out = mul(col, k);
    for (const P of pt) if (x >= P.x && x < P.x + P.w && y >= P.y && y < P.y + P.h) { const edge = x === P.x || y === P.y || x === P.x + P.w - 1 || y === P.y + P.h - 1; out = edge ? (((x + y) & 1) ? lift(mul(col, P.k), 40) : mul(col, P.k * 0.7)) : mul(col, P.k * (((x + y) & 3) < 2 ? 1.04 : 0.95)); }
    if (top && y < 3) { out = mul(out, y === 2 ? 0.72 : ((x & 1) ? 1.0 : 0.82)); if (y === 1 && x % 3 !== 2) out = lift(out, 46); } // gathered, stitched top
    for (const sx of seams) { if (x === sx) out = mul(out, 0.7); else if ((x === sx - 1 || x === sx + 1) && y % 3 !== 2) out = lift(out, 44); }
    if (band && y >= bandY0 && y < bandY0 + bandH) { const by = y - bandY0; const bc = band.c || [200, 160, 70]; if (by === 0 || by === bandH - 1) out = mul(bc, 0.8); else { const on = band.kind === 'key' ? greekKey(x, by - 1) : band.kind === 'vine' ? vine(x, by - 1) : rune(x, by - 1, seed); out = on ? mul(bc, ((x + by) & 1) ? 1.05 : 0.92) : mul(band.bg || mul(base, 0.6), k); } }
    const hy = h - 1 - y; // turned hem: shadowed fold, a stitch row, a pale fold edge at the bottom
    if (hy < hem) { out = mul(out, hy === hem - 1 ? 0.7 : hy === 0 ? 1.08 : 0.96); if (hy === hem - 3 && x % 3 !== 2) out = lift(out, 48); }
    let a = 255; if (fray && hy < 2 && h2(x, y, seed + 7) < (hy === 0 ? 0.45 : 0.12) * fray) a = 0; // frayed fibres
    set(x, y, out, a);
  }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = THREE.RepeatWrapping; return t;
}
function greekKey(x, y) { const u = x % 8, v = y; if (v < 0 || v > 4) return false; return v === 0 && u < 6 || v === 4 && (u > 1 || u === 0) || u === 0 && v > 0 || u === 5 && v < 3 || v === 2 && u > 1 && u < 6 || u === 2 && v > 1 && v < 4; }
function vine(x, y) { const c = Math.round(2 + Math.sin(x * 0.5) * 1.6); return y === c || (x % 6 === 0 && Math.abs(y - c + 1) < 1.5) || (x % 6 === 3 && Math.abs(y - c - 1) < 1.2); }
function rune(x, y, s) { const cx = Math.floor(x / 5), u = x % 5; if (u === 4) return false; const r = h2(cx, s, 11); return u === 1 ? y >= 0 && y < 5 : (r > 0.5 ? (u + y) % 4 === 0 : y === (r > 0.25 ? 0 : 4) || (u === 3 && y === 2)); }

// ================================================================== 2a. skinned coat tails / skirts (the Limbo 'coat' bone)
const _m = new THREE.Matrix4(), _v = V(), _a = V(), _b = V(), _c = V();
/** push p out of a capsule (a, b, radius r) */
function capsule(p, a, b, r) {
  _c.subVectors(b, a); const L2 = _c.lengthSq(); let t = L2 > 1e-8 ? _v.subVectors(p, a).dot(_c) / L2 : 0; t = Math.max(0, Math.min(1, t));
  const cx = a.x + _c.x * t, cy = a.y + _c.y * t, cz = a.z + _c.z * t; const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz; const d = Math.hypot(dx, dy, dz);
  if (d < r && d > 1e-6) { const k = r / d; p.x = cx + dx * k; p.y = cy + dy * k; p.z = cz + dz * k; }
}
/** the leg capsules of a Limbo body in world space (radius scaled by the body's world scale) */
export function legCapsules(L, out = []) {
  const B = L.bones; const s = L.root.getWorldScale(_a).x; let i = 0;
  const seg = (A, Bn, r) => { const c = out[i] || (out[i] = { a: V(), b: V(), r: 0 }); B[A].getWorldPosition(c.a); B[Bn].getWorldPosition(c.b); c.r = r * s; i++; };
  if (B.thighL && B.shinL && B.footL) { seg('thighL', 'shinL', 0.085); seg('shinL', 'footL', 0.062); seg('thighR', 'shinR', 0.085); seg('shinR', 'footR', 0.062); }
  out.length = i; return out;
}
let windT = 0; const WIND = V();
/** a shared breath of wind (world m/s^2), advanced once per frame by whichever cloth steps first */
export function wind(dt) { windT += dt * 0.5; WIND.set(0.55 + Math.sin(windT * 1.3) * 0.35 + Math.sin(windT * 3.7) * 0.15, 0, 0.25 + Math.cos(windT * 0.9) * 0.3); return WIND; }

export class SkinnedCloth {
  constructor(L, { cols = 16, rows = 6 } = {}) {
    this.L = L; const g = L.mesh.geometry; const pos = g.attributes.position, si = g.attributes.skinIndex?.array, sw = g.attributes.skinWeight?.array; const ci = BONES.length + SEC_BONES.indexOf('coat');
    this.off = true; if (!si || !L.bones.coat || ci < BONES.length) return;
    const vs = []; for (let i = 0; i < pos.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si[i * 4 + k] === ci) w += sw[i * 4 + k]; if (w > 0.5) vs.push(i); }
    if (vs.length < 16) return;
    const pv = L.restOf('coat'); const NC = cols, NR = rows; const TAU = Math.PI * 2;
    const rel = vs.map((i) => { const x = pos.getX(i) - pv.x, y = pos.getY(i) - pv.y, z = pos.getZ(i) - pv.z; return { i, x, y, z, th: Math.atan2(x, z), d: -y, rad: Math.hypot(x, z) }; });
    let d0 = Infinity, d1 = -Infinity; for (const r of rel) { d0 = Math.min(d0, r.d); d1 = Math.max(d1, r.d); }
    if (d1 - d0 < 0.06) return;
    const sum = new Float32Array(NC * NR), cnt = new Float32Array(NC * NR), mx = new Float32Array(NC);
    for (const r of rel) { const c = Math.round(((r.th + Math.PI) / TAU) * NC) % NC, k = Math.round(((r.d - d0) / (d1 - d0)) * (NR - 1)); sum[k * NC + c] += r.rad; cnt[k * NC + c]++; mx[c] = Math.max(mx[c], r.rad); }
    const has = new Uint8Array(NC); for (let c = 0; c < NC; c++) for (let k = 0; k < NR; k++) if (cnt[k * NC + c]) has[c] = 1;
    const N = NC * NR; this.rest = new Float32Array(N * 3); this.NC = NC; this.NR = NR; this.has = has;
    for (let c = 0; c < NC; c++) { const th = (c / NC) * TAU - Math.PI; let last = mx[c] || 0.1; for (let k = 0; k < NR; k++) { const n = k * NC + c; const R = cnt[n] ? sum[n] / cnt[n] : last; last = R; this.rest[n * 3] = Math.sin(th) * R; this.rest[n * 3 + 1] = -(d0 + ((d1 - d0) * k) / (NR - 1)); this.rest[n * 3 + 2] = Math.cos(th) * R; } }
    // per vertex: 4 grid nodes and weights (bilinear in angle and depth; a missing column hands its weight to its neighbour)
    this.vi = new Uint32Array(rel.length); this.vn = new Uint16Array(rel.length * 4); this.vw = new Float32Array(rel.length * 4);
    rel.forEach((r, j) => {
      const fc = ((r.th + Math.PI) / TAU) * NC, c0 = ((Math.floor(fc) % NC) + NC) % NC, c1 = (c0 + 1) % NC, tc = fc - Math.floor(fc);
      const fr = Math.max(0, Math.min(NR - 1, ((r.d - d0) / (d1 - d0)) * (NR - 1))), r0 = Math.floor(fr), r1 = Math.min(NR - 1, r0 + 1), tr = fr - r0;
      let wc0 = has[c0] ? 1 - tc : 0, wc1 = has[c1] ? tc : 0; const sc = wc0 + wc1 || 1; wc0 /= sc; wc1 /= sc; if (!has[c0] && !has[c1]) wc0 = 1;
      const ns = [r0 * NC + c0, r0 * NC + c1, r1 * NC + c0, r1 * NC + c1], ws = [wc0 * (1 - tr), wc1 * (1 - tr), wc0 * tr, wc1 * tr];
      this.vi[j] = r.i; for (let k = 0; k < 4; k++) { this.vn[j * 4 + k] = ns[k]; this.vw[j * 4 + k] = ws[k]; }
    });
    this.base = new Float32Array(rel.length * 3); rel.forEach((r, j) => { this.base[j * 3] = pos.getX(r.i); this.base[j * 3 + 1] = pos.getY(r.i); this.base[j * 3 + 2] = pos.getZ(r.i); });
    this.p = new Float32Array(N * 3); this.q = new Float32Array(N * 3); this.rw = new Float32Array(N * 3); this.dl = new Float32Array(N * 3); this.init = false; this.caps = []; this.off = false; this.depth = d1 - d0;
    pos.setUsage?.(THREE.DynamicDrawUsage);
  }
  step(dt) {
    if (this.off || dt <= 0) return; dt = Math.min(dt, 1 / 30); const L = this.L, NC = this.NC, NR = this.NR, N = NC * NR; const M = L.bones.coat.matrixWorld.elements; const s = Math.hypot(M[0], M[1], M[2]) || 1;
    const R = this.rest, rw = this.rw, p = this.p, q = this.q;
    for (let n = 0; n < N; n++) { const x = R[n * 3], y = R[n * 3 + 1], z = R[n * 3 + 2]; rw[n * 3] = M[0] * x + M[4] * y + M[8] * z + M[12]; rw[n * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; rw[n * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14]; }
    let far = !this.init; if (!far) for (let n = 0; n < N; n += 7) if (Math.hypot(p[n * 3] - rw[n * 3], p[n * 3 + 1] - rw[n * 3 + 1], p[n * 3 + 2] - rw[n * 3 + 2]) > 0.7 * s) { far = true; break; } // teleported: settle at rest
    if (far) { p.set(rw); q.set(rw); this.init = true; }
    const W = wind(dt * 0.25), g = -9.8 * dt * dt, k60 = dt * 60;
    for (let k = 1; k < NR; k++) {
      const u = k / (NR - 1); const shape = 1 - Math.pow(1 - (0.2 * Math.pow(1 - u, 1.6) + 0.03), k60); const wk = dt * dt * (0.4 + u);
      for (let c = 0; c < NC; c++) { const n = (k * NC + c) * 3; for (let a = 0; a < 3; a++) { const v = (p[n + a] - q[n + a]) * 0.955; q[n + a] = p[n + a]; p[n + a] += v + (a === 1 ? g : a === 0 ? W.x * wk : W.z * wk); p[n + a] += (rw[n + a] - p[n + a]) * shape; } }
    }
    for (let c = 0; c < NC; c++) { const n = c * 3; p[n] = q[n] = rw[n]; p[n + 1] = q[n + 1] = rw[n + 1]; p[n + 2] = q[n + 2] = rw[n + 2]; }
    const caps = legCapsules(L, this.caps); const has = this.has;
    for (let it = 0; it < 2; it++) {
      for (let k = 0; k < NR - 1; k++) for (let c = 0; c < NC; c++) { if (!has[c]) continue; this.link(k * NC + c, (k + 1) * NC + c, k === 0 ? 1 : 0.5, s); }
      for (let k = 1; k < NR; k++) for (let c = 0; c < NC; c++) { const c1 = (c + 1) % NC; if (has[c] && has[c1]) this.link(k * NC + c, k * NC + c1, 0.5, s); }
      for (let n = NC; n < N; n++) { _a.set(p[n * 3], p[n * 3 + 1], p[n * 3 + 2]); for (const cp of caps) capsule(_a, cp.a, cp.b, cp.r); p[n * 3] = _a.x; p[n * 3 + 1] = _a.y; p[n * 3 + 2] = _a.z; }
    }
    // the lag of each node, back into bind space (the bone frame is rotation x uniform scale: inverse = transpose / s^2)
    const dl = this.dl, i2 = 1 / (s * s); const lim = this.depth * 0.6;
    for (let n = 0; n < N; n++) { const dx = p[n * 3] - rw[n * 3], dy = p[n * 3 + 1] - rw[n * 3 + 1], dz = p[n * 3 + 2] - rw[n * 3 + 2]; let x = (M[0] * dx + M[1] * dy + M[2] * dz) * i2, y = (M[4] * dx + M[5] * dy + M[6] * dz) * i2, z = (M[8] * dx + M[9] * dy + M[10] * dz) * i2; const l = Math.hypot(x, y, z); if (l > lim) { const k = lim / l; x *= k; y *= k; z *= k; } dl[n * 3] = x; dl[n * 3 + 1] = y; dl[n * 3 + 2] = z; }
    const pa = L.mesh.geometry.attributes.position, A = pa.array, vi = this.vi, vn = this.vn, vw = this.vw, B0 = this.base;
    for (let j = 0; j < vi.length; j++) { let x = B0[j * 3], y = B0[j * 3 + 1], z = B0[j * 3 + 2]; for (let k = 0; k < 4; k++) { const w = vw[j * 4 + k]; if (!w) continue; const n = vn[j * 4 + k] * 3; x += dl[n] * w; y += dl[n + 1] * w; z += dl[n + 2] * w; } const o = vi[j] * 3; A[o] = x; A[o + 1] = y; A[o + 2] = z; }
    pa.needsUpdate = true;
  }
  link(a, b, wa, s) { const p = this.p, R = this.rest; const L0 = Math.hypot(R[a * 3] - R[b * 3], R[a * 3 + 1] - R[b * 3 + 1], R[a * 3 + 2] - R[b * 3 + 2]) * s; const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2]; const d = Math.hypot(dx, dy, dz) || 1e-6; const e = (d - L0) / d; const ka = a < this.NC ? 0 : wa, kb = 1 - ka; p[a * 3] += dx * e * ka; p[a * 3 + 1] += dy * e * ka; p[a * 3 + 2] += dz * e * ka; p[b * 3] -= dx * e * kb; p[b * 3 + 1] -= dy * e * kb; p[b * 3 + 2] -= dz * e * kb; }
}

// ================================================================== 2b. free hanging cloth panels (robes, sleeves, stoles, scarves)
/**
 * new ClothPanel({ cols, rows, rest(i, j, out) -> world rest position (row 0 is pinned), parent (drawn in its space), map,
 *   closed (a tube: columns wrap), colliders() -> [{a, b, r}] capsules, ground() -> y, shape: [stiff at the pin, stiff at the hem],
 *   damp, gravity, windK, color }); panel.step(dt); panel.mesh
 */
export class ClothPanel {
  constructor({ cols = 8, rows = 6, rest, parent, map = null, closed = false, colliders = null, ground = null, shape = [0.22, 0.02], damp = 0.96, gravity = 1, windK = 1, color = 0xffffff, roughness = 0.92, uvX = 1 } = {}) {
    Object.assign(this, { cols, rows, restFn: rest, parent, closed, colliders, ground, shape, damp, gravity, windK });
    const C = cols + (closed ? 1 : 0); const nv = C * rows; const geo = new THREE.BufferGeometry(); const P = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), I = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < C; i++) { const v = j * C + i; UV[v * 2] = (i / (C - 1)) * uvX; UV[v * 2 + 1] = 1 - j / (rows - 1); }
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < C - 1; i++) { const a = j * C + i, b = a + 1, c = a + C, d = c + 1; I.push(a, c, b, b, c, d); }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setIndex(I);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, color, side: THREE.DoubleSide, flatShading: true, roughness, metalness: 0, alphaTest: 0.5, envMapIntensity: 0.3 }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    const N = cols * rows; this.p = new Float32Array(N * 3); this.q = new Float32Array(N * 3); this.rw = new Float32Array(N * 3); this.lv = null; this.lh = null; this.init = false; this.C = C;
    parent?.add(this.mesh);
  }
  restAll() { const o = V(); for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) { this.restFn(i, j, o); const n = (j * this.cols + i) * 3; this.rw[n] = o.x; this.rw[n + 1] = o.y; this.rw[n + 2] = o.z; } }
  step(dt) {
    if (dt <= 0) return; dt = Math.min(dt, 1 / 30); const { cols, rows } = this; const N = cols * rows; const p = this.p, q = this.q, rw = this.rw;
    this.restAll();
    let far = !this.init; if (!far) for (let n = 0; n < N; n += 5) if (Math.hypot(p[n * 3] - rw[n * 3], p[n * 3 + 1] - rw[n * 3 + 1], p[n * 3 + 2] - rw[n * 3 + 2]) > 1.2) { far = true; break; }
    if (far) { p.set(rw); q.set(rw); this.init = true; this.lv = new Float32Array(N); this.lh = new Float32Array(N); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const n = j * cols + i; if (j < rows - 1) this.lv[n] = this.dist(rw, n, n + cols); const i1 = i + 1 < cols ? i + 1 : this.closed ? 0 : -1; if (i1 >= 0) this.lh[n] = this.dist(rw, n, j * cols + i1); } }
    const W = wind(dt * 0.25), g = -9.8 * this.gravity * dt * dt, k60 = dt * 60; const [s0, s1] = this.shape;
    for (let j = 1; j < rows; j++) { const u = j / (rows - 1); const sh = 1 - Math.pow(1 - (s0 + (s1 - s0) * Math.pow(u, 0.7)), k60); const wk = dt * dt * (0.5 + u) * this.windK;
      for (let i = 0; i < cols; i++) { const n = (j * cols + i) * 3; for (let a = 0; a < 3; a++) { const v = (p[n + a] - q[n + a]) * this.damp; q[n + a] = p[n + a]; p[n + a] += v + (a === 1 ? g : a === 0 ? W.x * wk : W.z * wk); p[n + a] += (rw[n + a] - p[n + a]) * sh; } } }
    for (let i = 0; i < cols; i++) { const n = i * 3; p[n] = q[n] = rw[n]; p[n + 1] = q[n + 1] = rw[n + 1]; p[n + 2] = q[n + 2] = rw[n + 2]; }
    const caps = this.colliders?.() || []; const gy = this.ground?.();
    for (let it = 0; it < 2; it++) {
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) { const n = j * cols + i; this.link(n, n + cols, this.lv[n], j === 0); }
      for (let j = 1; j < rows; j++) for (let i = 0; i < cols; i++) { const i1 = i + 1 < cols ? i + 1 : this.closed ? 0 : -1; if (i1 < 0) continue; const n = j * cols + i; this.link(n, j * cols + i1, this.lh[n], false); }
      for (let n = cols; n < N; n++) { _a.set(p[n * 3], p[n * 3 + 1], p[n * 3 + 2]); for (const cp of caps) capsule(_a, cp.a, cp.b, cp.r); if (gy != null && _a.y < gy + 0.012) _a.y = gy + 0.012; p[n * 3] = _a.x; p[n * 3 + 1] = _a.y; p[n * 3 + 2] = _a.z; }
    }
    // draw in the parent's space
    const par = this.parent; par.updateWorldMatrix(true, false); _m.copy(par.matrixWorld).invert(); const e = _m.elements; const A = this.mesh.geometry.attributes.position.array; const C = this.C;
    for (let j = 0; j < rows; j++) for (let i = 0; i < C; i++) { const n = (j * cols + (i % cols)) * 3, o = (j * C + i) * 3; const x = p[n], y = p[n + 1], z = p[n + 2]; A[o] = e[0] * x + e[4] * y + e[8] * z + e[12]; A[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; A[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  dist(a, n, m) { return Math.hypot(a[n * 3] - a[m * 3], a[n * 3 + 1] - a[m * 3 + 1], a[n * 3 + 2] - a[m * 3 + 2]); }
  link(a, b, L0, pinA) { const p = this.p; const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2]; const d = Math.hypot(dx, dy, dz) || 1e-6; const e = (d - L0) / d; const ka = pinA ? 0 : 0.5, kb = 1 - ka; p[a * 3] += dx * e * ka; p[a * 3 + 1] += dy * e * ka; p[a * 3 + 2] += dz * e * ka; p[b * 3] -= dx * e * kb; p[b * 3 + 1] -= dy * e * kb; p[b * 3 + 2] -= dz * e * kb; }
  reset() { this.init = false; }
  dispose() { this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

/** a bone-frame rest helper: world position of a local point (bone space, metres before the body scale) */
export function boneRest(bone, x, y, z, out) { return out.set(x, y, z).applyMatrix4(bone.matrixWorld); }
