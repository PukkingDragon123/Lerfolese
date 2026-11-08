// Physical UI toolkit. Every UI element is a crafted object: chamfered slabs of walnut, oak, brass, lacquer,
// parchment, leather and wax, wearing LOW-RES hand-placed pixel surfaces (tone-indexed, hue-shifted ramps,
// hard light/shadow splits, tinted edges) and inscriptions drawn with pixel fonts at native size:
// engraved into brass, carved/burnt into wood, inked on parchment, chalked, stamped or embroidered. Never glowing.
import * as THREE from 'three';
import { GR } from '../gfx/art/ramps.js';
import { hash2, fbm } from '../gfx/art/core.js';
import { Spring } from '../core/tween.js';

export const PX = 16;   // texels per world unit on wood / metal / leather objects
export const PXP = 24;  // texels per world unit on paper (handwriting needs the finer grain)
// the UI rig (ambient + key + rim + env) lifts a front-facing surface ~1.35x: materials take this albedo scale so the
// authored ramps land on screen as painted
export const LK = 0.74;

// ---------------------------------------------------------------- ramps (dark -> light, hue-shifted)
export const RAMP = {
  walnut: GR.walnut, oak: GR.oak, brass: GR.brass, gold: GR.gold, verd: GR.verdigris, iron: GR.iron, leather: GR.leather,
  wicker: GR.wicker, rope: GR.rope, amethyst: GR.purple, lacquer: ['#1a0612', '#4a0c1c', '#7e1424', '#b42a2a', '#de5a3c', '#f89a6a'],
  parch: ['#3a2216', '#6a4428', '#9e6e42', '#c89a64', '#e2c08a', '#f2dcaa', '#fcf0d0'],
  wax: ['#1c040e', '#480a1a', '#821424', '#bc2a2c', '#e25a40', '#fca07a'],
  slate: ['#0c0e14', '#181c26', '#252c3a', '#343e50', '#4a566c'], chalk: ['#7a8090', '#b4bac4', '#e8ecee'],
  cloth: GR.clothRed, teal: GR.clothTeal, violet: GR.clothPurple, night: ['#08060e', '#140e1e', '#221a30', '#342844', '#4a3c5e'],
  char: GR.charred, thread: ['#3a1408', '#7c3a10', '#c47a1c', '#f0b83a', '#ffe48a', '#fff8d0'], ivory: GR.bone, ink: GR.ink,
};
const rampIds = new Map(); const rampList = [];
const RID = (r) => { let i = rampIds.get(r); if (i == null) { i = rampList.length; rampList.push(r); rampIds.set(r, i); } return i; };
const pack = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; };
const packCache = new Map(); const P = (hex) => { let v = packCache.get(hex); if (v == null) { v = pack(hex); packCache.set(hex, v); } return v; };

// ---------------------------------------------------------------- tone-indexed pixel surface
// Each pixel is (ramp, tone) so all detail work (grain, engraving lips, bevels) stays inside hand-picked ramps.
export class Surf {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; const n = this.w * this.h; this.r = new Int16Array(n).fill(-1); this.t = new Int8Array(n); this.fx = new Uint32Array(n); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  has(x, y) { x |= 0; y |= 0; return this.in(x, y) && (this.r[y * this.w + x] >= 0 || this.fx[y * this.w + x] !== 0); }
  set(x, y, ramp, t) { x |= 0; y |= 0; if (!this.in(x, y)) return; const i = y * this.w + x; this.r[i] = RID(ramp); this.t[i] = Math.max(0, Math.min(ramp.length - 1, t | 0)); this.fx[i] = 0; }
  tone(x, y) { x |= 0; y |= 0; return this.in(x, y) && this.r[y * this.w + x] >= 0 ? this.t[y * this.w + x] : -1; }
  ramp(x, y) { x |= 0; y |= 0; const k = this.in(x, y) ? this.r[y * this.w + x] : -1; return k >= 0 ? rampList[k] : null; }
  shift(x, y, d) { x |= 0; y |= 0; if (!this.in(x, y)) return; const i = y * this.w + x; const k = this.r[i]; if (k < 0 || this.fx[i]) return; this.t[i] = Math.max(0, Math.min(rampList[k].length - 1, this.t[i] + d)); }
  setT(x, y, t) { x |= 0; y |= 0; if (!this.in(x, y)) return; const i = y * this.w + x; const k = this.r[i]; if (k < 0) return; this.t[i] = Math.max(0, Math.min(rampList[k].length - 1, t)); this.fx[i] = 0; }
  pix(x, y, hex) { x |= 0; y |= 0; if (!this.in(x, y)) return; if (hex == null) { this.r[y * this.w + x] = -1; this.fx[y * this.w + x] = 0; return; } this.fx[y * this.w + x] = P(hex); }
  erase(x, y) { this.pix(x, y, null); }
  fill(mask, ramp, tone = 3) { const tf = typeof tone === 'function'; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (mask(x, y)) this.set(x, y, ramp, tf ? tone(x, y) : tone); return this; }
  rect(x0, y0, w, h, ramp, tone = 3) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, ramp, typeof tone === 'function' ? tone(x, y) : tone); return this; }
  // inner bevel: lit top/left rim, shaded bottom/right rim (in-ramp shifts), w px wide
  bevel(mask = null, { lit = 1, dark = -1, w = 1, lit2 = 0 } = {}) {
    const inside = mask || ((x, y) => this.has(x, y)); const ops = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!inside(x, y) || !this.has(x, y)) continue;
      for (let k = 1; k <= w; k++) {
        const up = !inside(x, y - k), lf = !inside(x - k, y), dn = !inside(x, y + k), rt = !inside(x + k, y);
        if (up || lf) { ops.push([x, y, k === 1 ? lit : lit2 || Math.max(0, lit - 1)]); break; }
        if (dn || rt) { ops.push([x, y, k === 1 ? dark : Math.min(0, dark + 1)]); break; }
      }
    }
    for (const [x, y, d] of ops) this.shift(x, y, d); return this;
  }
  line(x0, y0, x1, y1, fn) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
  // copy a PixelCanvas (sprite) onto the surface as fixed colours
  blit(pc, ox, oy, { scale = 1 } = {}) { const d = pc.data; for (let y = 0; y < pc.h * scale; y++) for (let x = 0; x < pc.w * scale; x++) { const v = d[((y / scale) | 0) * pc.w + ((x / scale) | 0)]; if ((v >>> 24) > 100) { const X = ox + x, Y = oy + y; if (this.in(X, Y)) this.fx[Y * this.w + X] = (v | 0xff000000) >>> 0; } } }
  // rendered pre-scaled by an integer factor K (nearest), so linear sampling keeps every texel a crisp block even when
  // the object tilts, swings or sits at a non-integer scale (no rotated-nearest jaggies on 1px strokes)
  toCanvas(c, K = Surf.K(this.w, this.h)) {
    c = c || document.createElement('canvas'); const W = this.w * K, H = this.h * K; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext('2d'); const img = g.createImageData(W, H); const D = new Uint32Array(img.data.buffer);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x; let v = this.fx[i]; if (!v) { const k = this.r[i]; if (k < 0) continue; v = P(rampList[k][this.t[i]]); }
      for (let j = 0; j < K; j++) { const row = (y * K + j) * W + x * K; for (let q = 0; q < K; q++) D[row + q] = v; }
    }
    g.putImageData(img, 0, 0); c.userData = { K }; return c;
  }
  static K(w, h) { return Math.max(1, Math.min(4, Math.floor(2048 / Math.max(w, h)))); }
}

// ---------------------------------------------------------------- textures
export function pxTex(canvas, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; const pre = canvas.userData?.K > 1; t.magFilter = pre ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// a surface bound to a texture: redraw(fn) repaints and uploads only when called
export class SurfTex {
  constructor(w, h) { this.w = w; this.h = h; this.canvas = new Surf(w, h).toCanvas(); this.tex = pxTex(this.canvas); }
  paint(fn) { const S = new Surf(this.w, this.h); fn(S); S.toCanvas(this.canvas); this.tex.needsUpdate = true; return S; }
  dispose() { this.tex.dispose(); }
}
const sideCache = new Map();
// small repeating texture for slab edges (end grain / brushed metal / paper edge), in world units via side UVs
export function sideTex(kind) {
  if (sideCache.has(kind)) return sideCache.get(kind);
  const S = new Surf(16, 16); const R = { walnut: RAMP.walnut, oak: RAMP.oak, brass: RAMP.brass, verd: RAMP.brass, lacquer: RAMP.lacquer, parch: RAMP.parch, leather: RAMP.leather, iron: RAMP.iron, amethyst: RAMP.walnut, slate: RAMP.walnut, wax: RAMP.wax, ivory: RAMP.ivory }[kind] || RAMP.walnut;
  const metal = kind === 'brass' || kind === 'verd' || kind === 'iron';
  S.rect(0, 0, 16, 16, R, (x, y) => (metal ? (y % 5 === 0 ? 2 : 3) : kind === 'parch' ? 3 + ((hash2(x, y, 3) > 0.8) | 0) : 2 + (((y + Math.round(Math.sin(x * 0.4) * 1.2)) % 4 === 0) ? -1 : 0) + (hash2(x >> 2, y, 7) > 0.85 ? 1 : 0)));
  const t = pxTex(S.toCanvas(), { repeat: true }); sideCache.set(kind, t); return t;
}

// ---------------------------------------------------------------- materials (lit; palette kept close to authored values)
export function frontMat(map, { metal = 0, rough = 0.78, alphaTest = 0, side = THREE.FrontSide, env = 0.25, k = 1 } = {}) {
  return new THREE.MeshStandardMaterial({ map, metalness: metal, roughness: rough, toneMapped: false, alphaTest, transparent: false, side, envMapIntensity: env, color: new THREE.Color().setScalar(LK * k) });
}
const sideMats = new Map();
export function sideMat(kind) {
  if (sideMats.has(kind)) return sideMats.get(kind);
  const metal = kind === 'brass' || kind === 'iron' ? 0.55 : 0; const m = new THREE.MeshStandardMaterial({ map: sideTex(kind), metalness: metal, roughness: metal ? 0.38 : 0.8, toneMapped: false, envMapIntensity: metal ? 0.9 : 0.3, color: new THREE.Color().setScalar(LK) });
  m.map.repeat.set(PX / 16, PX / 16); sideMats.set(kind, m); return m;
}

// ---------------------------------------------------------------- material painters (all hand-placed, deterministic)
const hsh = (x, y, s) => hash2(x, y, s);
// wood: undulating broken grain streaks, a lit streak riding above some dark ones, occasional knot, plank seams
export function wood(S, x0, y0, w, h, ramp = RAMP.walnut, { seed = 1, base = 3, vertical = false, knots = 1, seams = 0, mask = null, quiet = false } = {}) {
  const inM = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && (!mask || mask(x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inM(x, y)) S.set(x, y, ramp, base + (fbm(x * 0.05, y * 0.22, seed) > 0.62 ? 1 : 0) - (fbm(x * 0.07 + 9, y * 0.3, seed + 4) < 0.3 ? 1 : 0));
  const L = vertical ? h : w, Wd = vertical ? w : h;
  for (let j = 1; j < Wd - 1; j += (quiet ? 3 : 2) + ((hsh(j, seed, 2) * 2) | 0)) {
    let i = (hsh(j, seed, 3) * 6) | 0;
    while (i < L) {
      const len = 4 + ((hsh(i, j, seed) * 12) | 0); const lit = hsh(j, i, seed + 9) > 0.7;
      for (let k = 0; k < len && i + k < L; k++) {
        const u = i + k; const off = Math.round(Math.sin(u * 0.09 + j * 0.7 + seed) * 0.9);
        const x = vertical ? x0 + j + off : x0 + u, y = vertical ? y0 + u : y0 + j + off;
        if (!inM(x, y)) continue; S.shift(x, y, -1);
        if (lit) { const xl = vertical ? x - 1 : x, yl = vertical ? y : y - 1; if (inM(xl, yl) && S.tone(xl, yl) <= base) S.shift(xl, yl, 1); }
      }
      i += len + (quiet ? 6 : 2) + ((hsh(i, seed, 5) * 5) | 0);
    }
  }
  for (let k = 0; k < knots; k++) {
    if (hsh(k, seed, 11) > 0.75) continue;
    const cx = x0 + 4 + ((hsh(k, seed, 12) * (w - 8)) | 0), cy = y0 + 2 + ((hsh(k, seed, 13) * Math.max(1, h - 4)) | 0); const rx = vertical ? 1.6 : 3.2, ry = vertical ? 3.2 : 1.6;
    for (let y = -4; y <= 4; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x / rx, y / ry); const X = cx + x, Y = cy + y; if (!inM(X, Y)) continue; if (d < 0.6) S.setT(X, Y, 0); else if (d < 1.05) S.setT(X, Y, 1); else if (d < 1.5) S.setT(X, Y, base - 1); }
    if (inM(cx - 1, cy - 1)) S.setT(cx - 1, cy - 1, 2);
  }
  for (let s = 1; s <= seams; s++) { const p = Math.round((vertical ? w : h) * s / (seams + 1)); for (let u = 0; u < L; u++) { const x = vertical ? x0 + p : x0 + u, y = vertical ? y0 + u : y0 + p; if (!inM(x, y)) continue; S.setT(x, y, 0); const lx = vertical ? x + 1 : x, ly = vertical ? y : y + 1; if (inM(lx, ly)) S.setT(lx, ly, Math.min(ramp.length - 1, base + 1)); } }
}
// brass: brushed streaks, one hard diagonal sheen plane, verdigris patina in corners and around screws
export function brass(S, x0, y0, w, h, { seed = 1, ramp = RAMP.brass, patina = 0.5, sheen = true, mask = null, base = 3 } = {}) {
  const inM = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && (!mask || mask(x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inM(x, y)) continue; let t = base;
    if (sheen) { const d = (x - x0) * 0.55 + (y - y0) - (w * 0.55 + h) * 0.32; if (d > 0 && d < h * 0.55) t = base + 1; if (d > h * 0.55 && d < h * 0.55 + 2) t = base; if (d < -h * 0.9) t = base - 1 + (hsh(x >> 2, y, seed) > 0.6 ? 1 : 0); }
    S.set(x, y, ramp, t);
  }
  for (let y = y0 + 1; y < y0 + h - 1; y++) { let x = x0 + ((hsh(y, seed, 1) * 6) | 0); while (x < x0 + w) { const len = 2 + ((hsh(x, y, seed) * 7) | 0); if (hsh(y, x, seed + 3) > 0.62) for (let k = 0; k < len; k++) if (inM(x + k, y)) S.shift(x + k, y, hsh(x, y, 9) > 0.5 ? 1 : -1); x += len + 3 + ((hsh(x, seed, y) * 9) | 0); } }
  if (patina > 0) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inM(x, y)) continue; const e = Math.min(x - x0, y - y0, x0 + w - 1 - x, y0 + h - 1 - y); const n = fbm(x * 0.18, y * 0.18, seed + 21);
    if (n + (e < 4 ? 0.22 : 0) - (e > 8 ? 0.15 : 0) > 1.02 - patina * 0.35) S.set(x, y, RAMP.verd, n > 0.78 ? 3 : 2 + (hsh(x, y, seed) > 0.7 ? 1 : 0));
  }
}
export function screw(S, x, y, ramp = RAMP.brass, slot = 0) { // 4x4 slotted screw head
  const pts = [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]]; for (const [a, b] of pts) S.set(x + a, y + b, ramp, 1);
  S.set(x + 1, y + 1, ramp, 5); S.set(x + 2, y + 1, ramp, 4); S.set(x + 1, y + 2, ramp, 3); S.set(x + 2, y + 2, ramp, 2);
  if (slot === 0) { S.set(x + 1, y + 1, ramp, 0); S.set(x + 2, y + 2, ramp, 0); } else { S.set(x + 1, y + 2, ramp, 0); S.set(x + 2, y + 1, ramp, 0); }
  S.set(x + 1, y + 4, ramp, 1); S.set(x + 2, y + 4, ramp, 2);
}
export function rivet(S, x, y, ramp = RAMP.brass) { S.set(x, y, ramp, 5); S.set(x + 1, y, ramp, 3); S.set(x, y + 1, ramp, 3); S.set(x + 1, y + 1, ramp, 1); S.set(x + 1, y + 2, ramp, 0); S.set(x + 2, y + 1, ramp, 1); }
// engraved border groove (dark line + lit lip inside below/right), inset px from the box
export function groove(S, x0, y0, w, h, inset = 2, { cut = 2, deep = 0, lip = 5 } = {}) {
  const X0 = x0 + inset, Y0 = y0 + inset, X1 = x0 + w - 1 - inset, Y1 = y0 + h - 1 - inset;
  const path = [[X0 + cut, Y0], [X1 - cut, Y0], [X1, Y0 + cut], [X1, Y1 - cut], [X1 - cut, Y1], [X0 + cut, Y1], [X0, Y1 - cut], [X0, Y0 + cut], [X0 + cut, Y0]];
  for (let i = 0; i + 1 < path.length; i++) S.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], (x, y) => { S.setT(x, y, deep); });
  for (let i = 0; i + 1 < path.length; i++) S.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], (x, y) => { const lx = x < (X0 + X1) / 2 ? x + 1 : x - 1, ly = y < (Y0 + Y1) / 2 ? y + 1 : y - 1; const top = y === Y0 || x === X0; if (top) { if (S.tone(x, ly) > deep) S.setT(x, ly === y ? y + 1 : ly, lip); } else if (S.tone(lx, y) > deep && S.tone(lx, y) < lip) S.shift(x === X1 ? x + 1 : x, y === Y1 ? y + 1 : y, 1); });
}
// aged parchment: warm blotches, toned and darkened edges, fibres, foxing, optional torn alpha edge
export function parchment(S, x0, y0, w, h, { seed = 1, torn = 2, tone = 4, age = 1, mask = null, crease = false } = {}) {
  const R = RAMP.parch; const tear = (u, s) => (torn ? Math.floor(fbm(u * 0.35, s, seed) * torn * 2.2 + (hsh(u, s, seed) > 0.93 ? 1 : 0)) : 0);
  const inM = (x, y) => { if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h || (mask && !mask(x, y))) return false; return x - x0 >= tear(y, 1) && x0 + w - 1 - x >= tear(y, 2) && y - y0 >= tear(x, 3) && y0 + h - 1 - y >= tear(x, 4); };
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inM(x, y)) continue; const n = fbm(x * 0.06, y * 0.06, seed); let t = tone + (n > 0.64 ? 1 : 0) - (n < 0.3 ? 1 : 0);
    let e = 99; for (let k = 1; k <= 4; k++) if (!inM(x - k, y) || !inM(x + k, y) || !inM(x, y - k) || !inM(x, y + k)) { e = k; break; }
    if (e === 1) t = tone - 2 - (age > 1 ? 1 : 0); else if (e === 2) t = Math.min(t, tone - 1); else if (e <= 4 && fbm(x * 0.2, y * 0.2, seed + 3) < 0.45) t = Math.min(t, tone - 1);
    S.set(x, y, R, t);
  }
  for (let i = 0; i < (w * h) / 26; i++) { const x = x0 + ((hsh(i, 1, seed) * w) | 0), y = y0 + ((hsh(i, 2, seed) * h) | 0); const len = 2 + ((hsh(i, 3, seed) * 3) | 0); const d = hsh(i, 4, seed) > 0.45 ? -1 : 1; const dy = hsh(i, 5, seed) > 0.75 ? 1 : 0; for (let k = 0; k < len; k++) if (inM(x + k, y + (k > 1 ? dy : 0)) && S.tone(x + k, y + (k > 1 ? dy : 0)) >= tone - 1) S.shift(x + k, y + (k > 1 ? dy : 0), d); }
  for (let i = 0; i < Math.max(1, (w * h) / 900) * age; i++) { const cx = x0 + 3 + hsh(i, 7, seed) * (w - 6), cy = y0 + 3 + hsh(i, 8, seed) * (h - 6); const r = 0.8 + hsh(i, 9, seed) * 1.6; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y * 1.2); if (d <= r && inM(cx + x, cy + y)) S.setT(cx + x, cy + y, d < r * 0.5 ? tone - 2 : tone - 1); } }
  if (crease) { const cx = x0 + Math.round(w * (0.3 + hsh(1, 1, seed) * 0.4)); for (let y = y0; y < y0 + h; y++) { const x = cx + Math.round((y - y0) * 0.08); if (inM(x, y)) S.shift(x, y, -1); if (inM(x + 1, y)) S.shift(x + 1, y, 1); } }
  return inM;
}
// stitched leather: pebbled grain, darker edge, cream stitches with dark holes inset px from the edge
export function leather(S, x0, y0, w, h, { seed = 1, ramp = RAMP.leather, base = 2, stitch = 2, mask = null } = {}) {
  const inM = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && (!mask || mask(x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inM(x, y)) { const n = fbm(x * 0.12, y * 0.12, seed); S.set(x, y, ramp, base + (n > 0.62 ? 1 : 0) - (n < 0.32 ? 1 : 0) + ((hsh(x, y, seed) > 0.9 && (x + y) % 2) ? 1 : 0)); }
  S.bevel(inM, { lit: 1, dark: -1 });
  if (stitch) { let k = 0; const X0 = x0 + stitch, Y0 = y0 + stitch, X1 = x0 + w - 1 - stitch, Y1 = y0 + h - 1 - stitch; const run = (x, y) => { if (!inM(x, y)) return; const m = k++ % 4; if (m < 2) { S.set(x, y, RAMP.rope, m ? 4 : 5); } else if (m === 2) S.setT(x, y, 0); }; S.line(X0, Y0, X1, Y0, run); S.line(X1, Y0, X1, Y1, run); S.line(X1, Y1, X0, Y1, run); S.line(X0, Y1, X0, Y0, run); }
  return inM;
}
// red sealing wax blob with drips, pressed ring and a raised apple monogram
export function waxSeal(S, cx, cy, r = 6, { seed = 1, ramp = RAMP.wax } = {}) {
  const R2 = (a) => r + (fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5, seed) - 0.5) * 3.2;
  for (let y = -r - 3; y <= r + 5; y++) for (let x = -r - 3; x <= r + 3; x++) {
    const a = Math.atan2(y, x), d = Math.hypot(x, y); const drip = (Math.abs(x + 2) < 1.5 && y > 0 && y < r + 4 - (hsh(seed, 1, 1) * 2 | 0)) || (Math.abs(x - 3) < 1 && y > 0 && y < r + 2);
    if (d <= R2(a) || drip) { const lit = (-x - y) / (r * 1.4); let t = 3 + (lit > 0.35 ? 1 : 0) - (lit < -0.45 ? 1 : 0); if (d > R2(a) - 1.2 && !drip) t = lit > 0 ? 3 : 1; S.set(cx + x, cy + y, ramp, t); }
  }
  const ri = r * 0.62; for (let a = 0; a < Math.PI * 2; a += 0.08) { const x = Math.round(cx + Math.cos(a) * ri), y = Math.round(cy + Math.sin(a) * ri); S.set(x, y, ramp, 1); const lx = Math.round(cx + Math.cos(a) * (ri + 1)), ly = Math.round(cy + Math.sin(a) * (ri + 1)); if (Math.sin(a) > 0.2 || Math.cos(a) > 0.5) S.set(lx, ly, ramp, 4); }
  const ap = ['.##.', '####', '####', '.##.']; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (ap[j][i] === '#') S.set(cx - 2 + i, cy - 1 + j, ramp, i + j < 3 ? 5 : i + j > 4 ? 2 : 4);
  S.set(cx, cy - 2, ramp, 1); S.set(cx + 1, cy - 3, ramp, 4); S.set(cx - 2 + Math.round(r * -0.4), cy - Math.round(r * 0.6), ramp, 5);
}
// woven cloth with a stitched gold border
export function cloth(S, x0, y0, w, h, { ramp = RAMP.cloth, base = 3, border = 3, seed = 1, mask = null } = {}) {
  const inM = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && (!mask || mask(x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inM(x, y)) S.set(x, y, ramp, base + (((x >> 1) + (y >> 1)) % 2 && hsh(x, y, seed) > 0.55 ? -1 : 0) + (fbm(x * 0.04, y * 0.1, seed) > 0.66 ? 1 : 0));
  if (border) { let k = 0; const run = (x, y) => { if (!inM(x, y)) return; S.set(x, y, RAMP.thread, k++ % 3 === 2 ? 2 : 4); }; const X0 = x0 + border, Y0 = y0 + border, X1 = x0 + w - 1 - border; S.line(X0, Y0, X1, Y0, run); S.line(X0, Y0, X0, y0 + h - 1, run); S.line(X1, Y0, X1, y0 + h - 1, run); }
  return inM;
}
// woven wicker band pattern
export function wicker(S, x0, y0, w, h, { ramp = RAMP.wicker } = {}) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / 3), col = Math.floor((x - x0 + (row % 2) * 3) / 6); const over = (row + col) % 2 === 0; const ry = (y - y0) % 3, cx = (x - x0 + (row % 2) * 3) % 6;
    let t = over ? (ry === 0 ? 4 : ry === 1 ? 3 : 2) : (cx === 0 || cx === 5 ? 1 : 2); if (over && (cx === 0)) t = 2; if (!over && ry === 2) t = 1; if (hash2(x, y, 4) > 0.94) t = Math.max(0, t - 1);
    S.set(x, y, ramp, t);
  }
}

// ---------------------------------------------------------------- pixel fonts at native size
// hand-placed chunky numerals (2px strokes) for counters, HP and damage chips: always crisp, never binarised
const NUMG = {
  0: ['.####.', '##..##', '##..##', '##.###', '###.##', '##..##', '##..##', '##..##', '.####.'], 1: ['..##', '.###', '####', '..##', '..##', '..##', '..##', '..##', '..##'],
  2: ['.####.', '##..##', '....##', '....##', '...##.', '..##..', '.##...', '##....', '######'], 3: ['.####.', '##..##', '....##', '..###.', '....##', '....##', '....##', '##..##', '.####.'],
  4: ['...##.', '..###.', '.####.', '##.##.', '##.##.', '######', '...##.', '...##.', '...##.'], 5: ['######', '##....', '##....', '#####.', '....##', '....##', '....##', '##..##', '.####.'],
  6: ['..###.', '.##...', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '.####.'], 7: ['######', '....##', '....##', '...##.', '...##.', '..##..', '..##..', '..##..', '..##..'],
  8: ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'], 9: ['.####.', '##..##', '##..##', '##..##', '.#####', '....##', '....##', '...##.', '.###..'],
  '/': ['....##', '....##', '...##.', '...##.', '..##..', '.##...', '.##...', '##....', '##....'], '×': ['.....', '.....', '##.##', '.###.', '..#..', '.###.', '##.##', '.....', '.....'], 'x': ['.....', '.....', '##.##', '.###.', '..#..', '.###.', '##.##', '.....', '.....'],
  '+': ['......', '..##..', '..##..', '######', '######', '..##..', '..##..', '......', '......'], '-': ['.....', '.....', '.....', '#####', '#####', '.....', '.....', '.....', '.....'], ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
  '!': ['##', '##', '##', '##', '##', '##', '..', '##', '##'],
};
export const FONT = {
  title: { font: 'Jacquard', size: 24, weight: 400, lineH: 26, base: 19 }, head: { font: 'Jacquard', size: 16, weight: 400, lineH: 17, base: 12 },
  hand: { font: 'Caveat', size: 18, weight: 700, lineH: 18, base: 13 }, handS: { font: 'Caveat', size: 16, weight: 700, lineH: 16, base: 12 },
  print: { font: 'VT323', size: 16, weight: 400, lineH: 14, base: 11 }, caps: { font: 'Silkscreen', size: 8, weight: 400, lineH: 9, base: 7 }, capsB: { font: 'Silkscreen', size: 8, weight: 700, lineH: 9, base: 7 },
  tiny: { font: 'Tiny5', size: 8, weight: 400, lineH: 8, base: 6 }, num: { bitmap: NUMG, scale: 1, lineH: 11, base: 9 }, num2: { bitmap: NUMG, scale: 2, lineH: 20, base: 18 }, bold: { font: 'Pixelify', size: 13, weight: 700, lineH: 13, base: 10 }, big: { font: 'Pixelify', size: 26, weight: 700, lineH: 24, base: 19 },
};
const gCanvas = document.createElement('canvas'); const gCtx = gCanvas.getContext('2d', { willReadFrequently: true });
const glyphCache = new Map();
function fontOf(f) { return typeof f === 'string' ? FONT[f] : f; }
export function measure(str, f) { f = fontOf(f); if (f.bitmap) { let w = 0; for (const ch of String(str)) w += ((f.bitmap[ch] || f.bitmap[' '])[0].length + 1) * f.scale; return Math.max(0, w - f.scale); } gCtx.font = `${f.weight} ${f.size}px "${f.font}"`; return Math.ceil(gCtx.measureText(str).width); }
// binarised glyph run: { w, h, base, on(x,y) } with the baseline at row `base`
export function runMask(str, f) {
  f = fontOf(f); const key = f.bitmap ? `#bm${f.scale}|${str}` : `${f.font}|${f.size}|${f.weight}|${str}`; let m = glyphCache.get(key); if (m) return m;
  if (f.bitmap) { const sc = f.scale; const cols = []; for (const ch of String(str)) { const g = f.bitmap[ch] || f.bitmap[' ']; for (let i = 0; i < g[0].length; i++) cols.push(g.map((r) => r[i] === '#')); cols.push(null); }
    const gh = 9 * sc; m = { w: Math.max(0, cols.length - 1) * sc, h: gh, by: gh, top: -gh, bot: 0, on: (x, y) => { const c = cols[Math.floor(x / sc)]; const r = Math.floor((y + gh) / sc); return x >= 0 && y < 0 && y >= -gh && !!c && !!c[r]; } }; glyphCache.set(key, m); return m; }
  const w = Math.max(1, measure(str, f) + 4), h = Math.ceil(f.size * 1.6) + 4; gCanvas.width = w; gCanvas.height = h;
  gCtx.font = `${f.weight} ${f.size}px "${f.font}"`; gCtx.textBaseline = 'alphabetic'; gCtx.fillStyle = '#fff'; gCtx.clearRect(0, 0, w, h); const by = Math.ceil(f.size * 1.15); gCtx.fillText(str, 2, by);
  const id = gCtx.getImageData(0, 0, w, h).data; const bits = new Uint8Array(w * h); let x1 = 0;
  for (let i = 0; i < w * h; i++) if (id[i * 4 + 3] >= 120) { bits[i] = 1; x1 = Math.max(x1, i % w); }
  m = { w: Math.max(0, x1 - 1), h, by, on: (x, y) => { x += 2; y += by; return x >= 0 && y >= 0 && x < w && y < h && bits[y * w + x] === 1; }, top: -by, bot: h - by };
  if (glyphCache.size > 600) glyphCache.clear(); glyphCache.set(key, m); return m;
}
export function wrapText(str, f, maxW) { const words = String(str).split(' '); const out = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (measure(t, f) > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }

// draw one run of text with a style; (x, baseline). Returns width.
// styles: ink | engrave | carve | gild | burn | chalk | stamp | emb | enamel
export function inscribe(S, str, x, baseY, f, style = 'ink', { color = '#2a160c', ramp = null, seed = 1, fill = null } = {}) {
  if (!str) return 0; f = fontOf(f); const m = runMask(str, f); const on = (X, Y) => m.on(X - x, Y - baseY);
  const X0 = x - 2, X1 = x + m.w + 3, Y0 = baseY + m.top - 1, Y1 = baseY + m.bot + 1; const pts = [];
  for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) if (on(X, Y)) pts.push([X, Y]);
  const rampAt = (X, Y) => ramp || S.ramp(X, Y);
  switch (style) {
    case 'ink': case 'stamp': {
      const small = f.bitmap || f.lineH <= 11; const drop = small ? 0 : style === 'stamp' ? 0.16 : 0.03; const c2 = color; let i = 0;
      for (const [X, Y] of pts) { i++; if (hsh(X, Y, seed) < drop) { S.shift(X, Y, -1); continue; } S.pix(X, Y, c2); }
      if (style === 'ink' && !small) for (const [X, Y] of pts) if (hsh(X, Y, seed + 7) > 0.985 && !on(X + 1, Y + 1)) S.shift(X + 1, Y + 1, -1);
      break;
    }
    case 'engrave': case 'enamel': { // cut into metal: dark groove (or enamel fill), shadowed upper rim, bright lower lip
      for (const [X, Y] of pts) { if (!on(X, Y - 1) && S.has(X, Y - 1)) S.shift(X, Y - 1, -1); }
      for (const [X, Y] of pts) { if (!on(X + 1, Y + 1) && S.has(X + 1, Y + 1) && !on(X + 1, Y + 1)) { const r = rampAt(X + 1, Y + 1); if (r) S.setT(X + 1, Y + 1, r.length - 1); } }
      for (const [X, Y] of pts) { if (fill) S.set(X, Y, fill, on(X, Y - 1) ? 2 : 1); else S.setT(X, Y, on(X, Y - 1) ? 1 : 0); }
      break;
    }
    case 'carve': { // V-cut into wood: deep shadow on upper wall, lit lower wall, crisp lit lip below
      for (const [X, Y] of pts) { if (!on(X + 1, Y + 1) && S.has(X + 1, Y + 1)) { const r = rampAt(X + 1, Y + 1); if (r) S.setT(X + 1, Y + 1, r.length - 2); } }
      for (const [X, Y] of pts) if (!on(X, Y - 1) && S.has(X, Y - 1)) S.shift(X, Y - 1, -1);
      for (const [X, Y] of pts) S.setT(X, Y, !on(X, Y + 1) && on(X, Y - 1) ? 1 : 0);
      break;
    }
    case 'gild': { // raised gold-leaf letters on the surface with a cast shadow
      const G = ramp || RAMP.gold;
      for (const [X, Y] of pts) { for (const [dx, dy] of [[1, 1], [2, 2]]) if (!on(X + dx, Y + dy) && S.has(X + dx, Y + dy)) S.shift(X + dx, Y + dy, dx === 1 ? -2 : -1); }
      for (const [X, Y] of pts) { const tl = !on(X - 1, Y) || !on(X, Y - 1), br = !on(X + 1, Y) || !on(X, Y + 1); S.set(X, Y, G, tl && !br ? 5 : br && !tl ? 2 : tl && br ? 3 : 4); }
      break;
    }
    case 'burn': { // pyrography: charred strokes with a scorched halo
      for (const [X, Y] of pts) if (!on(X + 1, Y + 1) && S.has(X + 1, Y + 1) && hsh(X, Y, seed + 2) > 0.35) S.shift(X + 1, Y + 1, -1);
      for (const [X, Y] of pts) S.set(X, Y, RAMP.char, hsh(X, Y, seed) > 0.86 ? 2 : on(X, Y - 1) ? 0 : 1);
      break;
    }
    case 'paint': { // lead paint / bone inlay: solid, crisp, with a 1px cast shadow
      for (const [X, Y] of pts) if (!on(X + 1, Y + 1) && S.has(X + 1, Y + 1)) S.shift(X + 1, Y + 1, -2);
      for (const [X, Y] of pts) { if (ramp) S.set(X, Y, ramp, !on(X, Y - 1) ? ramp.length - 1 : ramp.length - 2); else S.pix(X, Y, color); }
      break;
    }
    case 'chalk': { for (const [X, Y] of pts) { const h = hsh(X, Y, seed); if (h < 0.18) continue; S.set(X, Y, RAMP.chalk, h > 0.75 ? 2 : 1); } break; }
    case 'emb': { // embroidered thread: satin stitch tones, shadow under
      const T = ramp || RAMP.thread;
      for (const [X, Y] of pts) if (!on(X + 1, Y + 1) && S.has(X + 1, Y + 1)) S.shift(X + 1, Y + 1, -2);
      for (const [X, Y] of pts) S.set(X, Y, T, (X + Y) % 3 === 0 ? 3 : !on(X, Y - 1) ? 5 : 4);
      break;
    }
  }
  return m.w;
}
// lay out lines (strings or [[text, color], ...] segments) in a box; returns used height
export function inscribeLines(S, lines, box, f, style = 'ink', { align = 'center', valign = 'middle', lineH = null, color = '#2a160c', seed = 1, ramp = null, fill = null, fonts = null } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines]; const fl = (i) => fontOf((fonts && fonts[i]) || f);
  const LH = (i) => lineH || fl(i).lineH; let total = 0; for (let i = 0; i < arr.length; i++) total += LH(i);
  let y = valign === 'top' ? box.y : valign === 'bottom' ? box.y + box.h - total : Math.round(box.y + (box.h - total) / 2);
  for (let i = 0; i < arr.length; i++) {
    const F = fl(i); const segs = typeof arr[i] === 'string' ? [[arr[i], color]] : arr[i]; const wsum = segs.reduce((s, [t]) => s + measure(t, F), 0);
    let x = align === 'left' ? box.x : align === 'right' ? box.x + box.w - wsum : Math.round(box.x + (box.w - wsum) / 2);
    const base = y + F.base + Math.round((LH(i) - F.lineH) / 2);
    for (const [t, c] of segs) { inscribe(S, t, x, base, F, style, { color: c || color, seed: seed + i, ramp, fill }); x += measure(t, F); }
    y += LH(i);
  }
  return total;
}

// ---------------------------------------------------------------- geometry: chamfered slabs with front-projected UVs
const geoCache = new Map();
export function outline(shape, w, h, c) {
  const W = w / 2, H = h / 2; c = Math.min(c, W * 0.9, H * 0.9);
  switch (shape) {
    case 'notch': { const n = Math.min(h * 0.32, 0.5); return [[-W + n, -H], [W - n, -H], [W, -H + n * 0.9], [W - n * 0.75, 0], [W, H - n * 0.9], [W - n, H], [-W + n, H], [-W, H - n * 0.9], [-W + n * 0.75, 0], [-W, -H + n * 0.9]]; }
    case 'tag': { const n = Math.min(w * 0.3, h * 0.3); return [[-W, -H + c], [-W + c, -H], [W - c, -H], [W, -H + c], [W, H - n], [W - n, H], [-W + n, H], [-W, H - n]]; }
    case 'arch': { const pts = [[-W, -H + c], [-W + c, -H], [W - c, -H], [W, -H + c], [W, H - h * 0.22]]; const ar = h * 0.22; for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; pts.push([Math.cos(a) * W, H - ar + Math.sin(a) * ar]); } pts.push([-W, H - ar]); return pts; }
    case 'shield': return [[0, -H], [W * 0.62, -H * 0.62], [W * 0.92, -H * 0.05], [W, H * 0.62], [W * 0.94, H], [-W * 0.94, H], [-W, H * 0.62], [-W * 0.92, -H * 0.05], [-W * 0.62, -H * 0.62]];
    case 'oct': { const k = Math.min(W, H) * 0.42; return [[-W + k, -H], [W - k, -H], [W, -H + k], [W, H - k], [W - k, H], [-W + k, H], [-W, H - k], [-W, -H + k]]; }
    case 'flag': { const n = w * 0.16; return [[-W, -H], [W, -H], [W - n, 0], [W, H], [-W, H]]; }
    case 'swallow': { const n = h * 0.22; return [[-W, -H], [0, -H + n], [W, -H], [W, H], [-W, H]]; }
    default: return [[-W + c, -H], [W - c, -H], [W, -H + c], [W, H - c], [W - c, H], [-W + c, H], [-W, H - c], [-W, -H + c]];
  }
}
export function slab(w, h, d, { shape = 'rect', cut = 0.12, bevel = 0.05 } = {}) {
  const key = `${shape}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${cut}|${bevel}`; let g = geoCache.get(key); if (g) return g;
  const pts = outline(shape, w, h, cut); const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const b = Math.min(bevel, d * 0.45);
  const ex = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 4, steps: 1 });
  ex.translate(0, 0, -d / 2 + b);
  g = splitFront(ex, w, h); geoCache.set(key, g); return g;
}
// regroup a non-indexed geometry: group 0 = faces looking forward (planar XY UV over w x h), group 1 = sides (world-unit UV)
export function splitFront(geo, w, h) {
  geo = geo.index ? geo.toNonIndexed() : geo; geo.computeVertexNormals();
  const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv; const n = pos.count / 3; const front = [], side = [];
  const fn = new THREE.Vector3(), a = new THREE.Vector3(), b2 = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < n; i++) { a.fromBufferAttribute(pos, i * 3); b2.fromBufferAttribute(pos, i * 3 + 1); c.fromBufferAttribute(pos, i * 3 + 2); fn.subVectors(c, b2).cross(a.clone().sub(b2)).normalize(); (fn.z > 0.25 ? front : side).push(i); }
  const P2 = new Float32Array(pos.count * 3), N2 = new Float32Array(pos.count * 3), U2 = new Float32Array(pos.count * 2); let k = 0;
  const put = (tri, planar) => { for (let j = 0; j < 3; j++) { const s = tri * 3 + j; const x = pos.getX(s), y = pos.getY(s), z = pos.getZ(s); P2.set([x, y, z], k * 3); N2.set([nrm.getX(s), nrm.getY(s), nrm.getZ(s)], k * 3); if (planar) U2.set([x / w + 0.5, y / h + 0.5], k * 2); else { const nx = Math.abs(nrm.getX(s)); U2.set([nx > 0.7 ? y : x, z], k * 2); } k++; } };
  front.forEach((t) => put(t, true)); side.forEach((t) => put(t, false));
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P2, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U2, 2));
  out.addGroup(0, front.length * 3, 0); out.addGroup(front.length * 3, side.length * 3, 1); out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
// paper: a thin sheet with gentle curl (bends in z along x and y), double sided
const sheetCache = new Map();
export function sheet(w, h, { curl = 0.12, sag = 0.05, segX = 8, segY = 6 } = {}) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${curl}|${sag}|${segX}|${segY}`; let g = sheetCache.get(key); if (g) return g;
  g = new THREE.PlaneGeometry(w, h, segX, segY); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w * 2, v = p.getY(i) / h * 2; p.setZ(i, curl * (u * u) * 0.5 + sag * (v * v) * 0.5 - curl * 0.25 + Math.sin(u * 3.1 + v * 2.3) * 0.012); }
  g.computeVertexNormals(); sheetCache.set(key, g); return g;
}
export function mesh(geo, mats, parent, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mats); m.castShadow = cast; m.receiveShadow = recv; if (parent) parent.add(m); return m; }

// turned wood / brass parts (rollers, finials, knobs): lathe from a profile of [r, y] pairs, faceted on purpose
const latheCache = new Map();
export function turned(profile, sides = 8) { const key = JSON.stringify(profile) + sides; let g = latheCache.get(key); if (g) return g; g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), sides); g.computeVertexNormals(); latheCache.set(key, g); return g; }
const flatMats = new Map();
export function plainMat(kind) { // ramp-coloured lit material for turned parts (wood or metal), with a tiny banded texture
  if (flatMats.has(kind)) return flatMats.get(kind);
  const S = new Surf(8, 16); const R = { walnut: RAMP.walnut, oak: RAMP.oak, brass: RAMP.brass, iron: RAMP.iron, gold: RAMP.gold, rope: RAMP.rope, wax: RAMP.wax, leather: RAMP.leather, ivory: RAMP.ivory, glass: RAMP.verd }[kind] || RAMP.walnut;
  const metal = ['brass', 'iron', 'gold'].includes(kind);
  S.rect(0, 0, 8, 16, R, (x, y) => (metal ? 3 + (y % 6 === 0 ? 1 : 0) - (y % 6 === 3 ? 1 : 0) : kind === 'rope' ? 3 + (((x + y) % 4 < 2) ? 1 : -1) : 2 + (((y + x * 3) % 5 === 0) ? 1 : 0) - (hash2(x, y, 3) > 0.8 ? 1 : 0)));
  const m = new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas(), { repeat: true }), metalness: metal ? 0.55 : 0, roughness: metal ? 0.35 : 0.75, toneMapped: false, envMapIntensity: metal ? 1 : 0.3, flatShading: true, color: new THREE.Color().setScalar(LK) });
  flatMats.set(kind, m); return m;
}
export const ROLLER = (L, r = 0.14) => turned([[0, -L / 2 - 0.22], [r * 0.9, -L / 2 - 0.2], [r * 1.25, -L / 2 - 0.12], [r * 0.7, -L / 2 - 0.04], [r, -L / 2], [r, L / 2], [r * 0.7, L / 2 + 0.04], [r * 1.25, L / 2 + 0.12], [r * 0.9, L / 2 + 0.2], [0, L / 2 + 0.22]], 8);
export const TACK = () => turned([[0, 0.09], [0.1, 0.075], [0.13, 0.03], [0.12, 0], [0.02, 0], [0.02, -0.12], [0, -0.13]], 7);

// ---------------------------------------------------------------- springy bodies
// group (placed by the owner) > pivot (tilts toward the pointer, squashes when pressed, wobbles when kicked)
const _w = new THREE.Vector3();
export class Body {
  constructor() {
    this.group = new THREE.Group(); this.pivot = new THREE.Group(); this.group.add(this.pivot);
    this.tx = new Spring(0, 14, 0.42); this.ty = new Spring(0, 14, 0.42); this.rz = new Spring(0, 11, 0.22); this.lift = new Spring(0, 16, 0.5); this.sq = new Spring(0, 26, 0.32); this.pop = new Spring(1, 15, 0.42);
    this.hover = false; this.tiltK = 0.07; this.hoverLift = 0.35; this.restRz = 0;
  }
  kick(k = 1) { this.rz.kick(k * 2.2 * (Math.random() < 0.5 ? -1 : 1)); this.pop.kick(k * 1.4); }
  squash(k = 1) { this.sq.kick(-k * 9); this.rz.kick((Math.random() - 0.5) * 3 * k); }
  updateBody(dt, ptr) {
    if (this.hover && ptr) { this.group.getWorldPosition(_w); this.tx.target = Math.max(-0.35, Math.min(0.35, -(ptr.y - _w.y) * this.tiltK)); this.ty.target = Math.max(-0.45, Math.min(0.45, (ptr.x - _w.x) * this.tiltK)); }
    else { this.tx.target = 0; this.ty.target = 0; }
    this.lift.target = this.hover ? this.hoverLift : 0; this.rz.target = this.restRz;
    for (const s of [this.tx, this.ty, this.rz, this.lift, this.sq, this.pop]) s.update(dt);
    const sq = this.sq.value * 0.04; const p = Math.max(0.001, this.pop.value);
    this.pivot.rotation.set(this.tx.value, this.ty.value, this.rz.value * 0.05); this.pivot.position.z = this.lift.value;
    this.pivot.scale.set(p * (1 - sq * 0.5), p * (1 - sq * 0.5), p * (1 + sq * 2.2));
  }
}

// ---------------------------------------------------------------- the UI scene's light rig (shared by every screen)
export function uiRig(engine) {
  const sc = engine.ui.scene; if (sc.userData.rig) return sc.userData.rig;
  const g = new THREE.Group(); g.name = 'ui-rig';
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-8, 12, 30); key.castShadow = true; key.shadow.mapSize.set(2048, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -34, right: 34, top: 20, bottom: -20, near: 1, far: 80 }); key.target.position.set(0, 0, 0); g.add(key, key.target);
  const amb = new THREE.AmbientLight(0xfff6ea, 1.35); g.add(amb);
  const rim = new THREE.DirectionalLight(0xffc68a, 0.6); rim.position.set(14, 8, 6); g.add(rim);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(160, 100), new THREE.ShadowMaterial({ opacity: 0.32 })); catcher.position.z = -2; catcher.receiveShadow = true; g.add(catcher);
  sc.add(g); sc.userData.rig = { group: g, key, amb, rim, catcher }; return sc.userData.rig;
}

export function paperMat() { return new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, toneMapped: false, envMapIntensity: 0.15, color: new THREE.Color().setScalar(LK * 0.97) }); }

// place an object at depth z so it projects where (x, y) would on the z=0 UI plane (UI camera at z=40)
export function uiPos(o, x, y, z = 1) { const k = (40 - z) / 40; o.position.set(x * k, y * k, z); return o; }
