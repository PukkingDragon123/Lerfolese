// Plants as detailed, low-res geometric pixel art: grass tufts, wildflowers, ferns, clover, marsh reeds and bushes.
// Every sprite is drawn in 5 wind frames (stems bent -1, -0.5, 0, 0.5, 1) so billboards can sway in gusts.
// Light comes from the top-left: blades split into lit and shade halves, back layers sit a tone darker, front parts
// cast a 1px shadow on whatever they overlap, and outlines are tinted dark and drawn on the shadow side only.
// Flower heads are hand-placed pixel stamps.
import { PixelCanvas } from '../pixel.js';
import { M, LIGHT, clamp, lerp } from './core.js';
import { roof, blade as bladePts, ngon } from './geo.js';
import { GR } from './ramps.js';
import { mulberry32 } from '../../core/util.js';

// ---------------------------------------------------------------- 6-tone hue-shifted ramps (dark, cool -> light, warm)
export const PR = {
  grass: ['#0b1a1a', '#143822', '#225e2a', '#3a882c', '#6cb236', '#bfe05e'],
  meadow: ['#0e1c16', '#1c4020', '#326a24', '#56962a', '#8cc23a', '#d6ea6c'],
  dry: ['#2a1418', '#5a3020', '#8e5c28', '#c28e34', '#e8c058', '#fff0a8'],
  straw: ['#34201e', '#6a462a', '#a0763e', '#cea65a', '#eed086', '#fff6cc'],
  sage: ['#121c24', '#26383a', '#43604e', '#6a8a64', '#9eb486', '#d8e4b8'],
  rosemary: ['#0e1c24', '#16382e', '#22583a', '#367a48', '#5ea25a', '#a8d07e'],
  fern: GR.leaf, leaf: ['#08161a', '#12321e', '#1e5426', '#327a2c', '#5aa634', '#a4d856'],
  reed: ['#121a12', '#2a381c', '#4a5e26', '#728832', '#a6b446', '#dcde88'],
  cattail: ['#1a0a0e', '#3e1a16', '#68301e', '#92502a', '#be783e', '#e6ac6a'],
  plume: ['#24141c', '#4a2a30', '#76504a', '#a27c66', '#cca88a', '#f0dcc0'],
  bark: ['#140c14', '#2c1a1c', '#4c3026', '#724a34', '#9c6c48', '#c6986a'],
  poppy: GR.red, white: ['#3c3852', '#78768e', '#b2b0be', '#dcdade', '#f6f4ec', '#ffffff'], amber: GR.amber,
  blue: ['#0c0c34', '#1a2470', '#2a44b4', '#3e72e4', '#76a8fa', '#c4e0ff'],
  lavender: ['#1a0e30', '#36205e', '#5a3a94', '#8462c4', '#b294e8', '#e2d0ff'],
  thistle: ['#200a26', '#4c1450', '#80267c', '#b44aa8', '#e07cd0', '#ffc2f0'],
  gold: GR.gold, berry: GR.ruby, pink: ['#3e1430', '#7a2e52', '#b45a7c', '#e090aa', '#f8c4d2', '#fff4f4'],
  ink: ['#08040a', '#1a0a16', '#2e1424', '#46223a', '#6a3a54', '#9a6070'],
  sky: ['#1c2048', '#34407a', '#5a6cb0', '#8aa0d8', '#bcd0f4', '#eef6ff'],
};
export const BENDS = [-1, -0.5, 0, 0.5, 1];

const qb = (p0, p1, p2, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return o; };
// drop the inner pixel of every L-shaped corner so 1px lines stay clean
const clean = (p) => { if (p.length < 3) return p; const o = [p[0]]; for (let i = 1; i < p.length - 1; i++) { const a = o[o.length - 1], c = p[i + 1]; if (Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1) continue; o.push(p[i]); } o.push(p[p.length - 1]); return o; };

// ---------------------------------------------------------------- a tone buffer: ramp id + tone per pixel, element ids for shadows
class Buf {
  constructor(w, h, amp) {
    Object.assign(this, { w, h, amp, bend: 0, base: h - 1, H: h }); const n = w * h;
    this.r = new Int16Array(n).fill(-1); this.t = new Int8Array(n); this.e = new Int32Array(n).fill(-1); this.sh = new Uint8Array(n);
    this.ramps = []; this.eid = -1; this.flags = []; this.cur = null;
  }
  rid(R) { let i = this.ramps.indexOf(R); if (i < 0) { i = this.ramps.length; this.ramps.push(R); } return i; }
  // the wind: x shifts with the square of the height above the ground row
  B(x, y) { const k = clamp((this.base - y) / this.H, 0, 1.2); return x + this.bend * this.amp * k * k; }
  px(x, y, R, t) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.r[i] = this.rid(R); this.t[i] = clamp(Math.round(t), 0, R.length - 1); this.e[i] = this.eid; this.sh[i] = 0; if (this.cur) this.cur.add(i); }
  at(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1; const i = y * this.w + x; return this.r[i] < 0 ? -1 : this.t[i]; }
  shift(x, y, d) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (this.r[i] >= 0) this.t[i] = clamp(this.t[i] + d, 0, this.ramps[this.r[i]].length - 1); }
  // one element (blade, leaf, head...): afterwards it casts a 1px shadow down-right onto earlier elements
  el(fn, { shadow = 1, ol = true } = {}) {
    this.eid++; this.flags[this.eid] = ol; this.cur = new Set(); fn(); const cur = this.cur; this.cur = null; if (!shadow) return;
    for (const i of cur) { const x = i % this.w, y = (i / this.w) | 0; for (const [dx, dy] of [[1, 0], [1, 1], [0, 1]]) { const X = x + dx, Y = y + dy; if (X >= this.w || Y >= this.h) continue; const j = Y * this.w + X; if (this.r[j] < 0 || this.e[j] === this.eid || this.sh[j]) continue; this.sh[j] = 1; this.t[j] = Math.max(Math.min(this.t[j], 1), this.t[j] - shadow); } }
  }
  curve(p0, p1, p2) { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); return qb(p0, p1, p2, Math.max(2, Math.ceil(L * 3))).map(([x, y]) => [this.B(x, y), y]); }
  polyline(pts) { const o = []; for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]]; const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3)); for (let k = i ? 1 : 0; k <= n; k++) { const x = lerp(a[0], b[0], k / n), y = lerp(a[1], b[1], k / n); o.push([this.B(x, y), y]); } } return o; }
  // tapered stroke along samples: spans where wide (left px lit, right px shaded), a clean 1px path where thin
  stroke(pts, R, w0, w1, tone, tp = 1) {
    const n = pts.length - 1; const path = [];
    for (let k = 0; k <= n; k++) {
      const u = n ? k / n : 1; const w = lerp(w0, w1, Math.min(1, u / tp)); const [x, y] = pts[k];
      if (w < 1.5) { const X = Math.floor(x), Y = Math.floor(y); const l = path[path.length - 1]; if (!l || l[0] !== X || l[1] !== Y) path.push([X, Y, u]); continue; }
      const x0 = Math.round(x - w / 2), x1 = Math.round(x + w / 2) - 1, Y = Math.floor(y); for (let X = x0; X <= x1; X++) this.px(X, Y, R, tone(u, X === x0 ? -1 : X === x1 ? 1 : 0));
    }
    for (const [X, Y, u] of clean(path)) this.px(X, Y, R, tone(u, 0));
  }
  // a grass-like blade from the ground row; returns the (bent) tip
  blade(bx, by, h, lean, R, { w = 2, sh = 0, curl = 0.14, droop = 0, tip = true, tp = 0.5 } = {}) {
    const tx = clamp(bx + lean, this.amp + 1, this.w - this.amp - 2); lean = tx - bx;
    const pts = this.curve([bx + 0.5, by + 0.9], [bx + 0.5 + lean * curl, by - h * (0.55 + droop * 0.5)], [tx + 0.5, by - h * (1 - droop * 0.3) + 0.5]);
    this.stroke(pts, R, w, 1, (u, side) => { let t = u < 0.16 ? 1 : u < 0.42 ? 2 : u < 0.72 ? 3 : 4; if (tip && u > 0.9 && sh >= 0) t = 5; if (side > 0) t--; return t + sh; }, tp);
    return pts;
  }
  // a thin stem (1px, a few lighter hairs); returns its samples, the last one is the tip
  stem(bx, by, h, lean, R, { droop = 0, hairs = null, t0 = 2, t1 = 3, w = 1 } = {}) {
    const tx = clamp(bx + lean, this.amp + 2, this.w - this.amp - 3);
    const pts = this.curve([bx + 0.5, by + 0.9], [bx + 0.5 + (tx - bx) * (0.3 + droop * 0.3), by - h * (0.55 + droop * 0.5)], [tx + 0.5, by - h * (1 - droop * 0.12) + 0.5]);
    this.stroke(pts, R, w, 1, (u) => (u < 0.3 ? t0 : t1));
    if (hairs) for (let k = 4; k < pts.length - 3; k += 5) if (hairs() < 0.3) this.px(pts[k][0] - 1, pts[k][1], R, t1 + 1);
    return pts;
  }
  // a faceted leaf: lit half / shaded half split along the midrib, a bright tip
  leaf(ax, ay, bx, by, wd, R, sh = 0) {
    ax = this.B(ax, ay); bx = this.B(bx, by);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; const lit = nx * LIGHT[0] + ny * LIGHT[1] > 0 ? 1 : -1;
    const n = Math.ceil(L * 3); for (let k = 0; k <= n; k++) { const u = k / n; this.px(ax + dx * u, ay + dy * u, R, (u > 0.8 ? 4 : 3) + sh); }
    const m = M.poly(bladePts(ax, ay, bx, by, 0.35, 0, wd)); const [x0, y0, x1, y1] = m.bb;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!m(x + 0.5, y + 0.5)) continue; const s = ((x + 0.5 - ax) * nx + (y + 0.5 - ay) * ny) * lit; const a = ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / (L * L);
      let t = s > 0.6 ? 4 : s < -0.4 ? 2 : 3; if (a > 0.82 && s > -0.2) t = 5; if (L > 5 && Math.abs(s) < 0.45 && a > 0.1 && a < 0.72) t = 2; this.px(x, y, R, t + sh);
    }
  }
  // a cut-gem foliage mass: one plane per polygon edge, shaded by the key light, flat table on top
  facet(pts, R, { k = 1.3, table = 2, sh = 0 } = {}) {
    const bp = pts.map(([x, y]) => [this.B(x, y), y]); const nf = roof(bp, { k, table }); const m = M.poly(bp); const [x0, y0, x1, y1] = m.bb;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { if (!m(x + 0.5, y + 0.5)) continue; const nv = nf(x + 0.5, y + 0.5); const d = nv[0] * LIGHT[0] + nv[1] * LIGHT[1] + nv[2] * LIGHT[2]; this.px(x, y, R, (d > 0.72 ? 4 : d > 0.38 ? 3 : d > 0.02 ? 2 : 1) + sh); }
    return bp;
  }
  stamp(st, x, y, R, map = {}) { // hand-placed pixels: digits are tones of R, letters map to [ramp, tone]; anchor (ax, ay)
    const x0 = Math.round(x) - st.ax, y0 = Math.round(y) - st.ay;
    st.rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; if (ch >= '0' && ch <= '5') this.px(x0 + i, y0 + j, R, +ch); else if (map[ch]) this.px(x0 + i, y0 + j, map[ch][0], map[ch][1]); } });
  }
  outline() { // tinted dark outline on the shadow side (right / below the shape) only
    const { w, h } = this; const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (this.r[i] >= 0) continue; const L = x > 0 ? i - 1 : -1, U = y > 0 ? i - w : -1;
      const src = L >= 0 && this.r[L] >= 0 && this.flags[this.e[L]] ? L : U >= 0 && this.r[U] >= 0 && this.flags[this.e[U]] ? U : -1; if (src >= 0) add.push(i, this.r[src]);
    }
    for (let k = 0; k < add.length; k += 2) { this.r[add[k]] = add[k + 1]; this.t[add[k]] = 0; this.e[add[k]] = -1; }
  }
  canvas() { const pc = new PixelCanvas(this.w, this.h); for (let i = 0; i < this.r.length; i++) if (this.r[i] >= 0) pc.px(i % this.w, (i / this.w) | 0, this.ramps[this.r[i]][this.t[i]]); return pc; }
}

// ---------------------------------------------------------------- flower heads (hand-placed stamps)
const S_ = (rows, ax, ay) => ({ rows, ax, ay });
const POPPY = { open: S_(['..2332..', '.234332.', '23kgGk21', '35544331', '.344332.', '..2321..'], 4, 5), side: S_(['.233..', '23443.', '354432', '.4432.', '..32..'], 3, 4), bud: S_(['.g.', 'gGg', 'g3g', '.g.'], 1, 0) };
const POPPY_MAP = { k: [PR.ink, 1], g: [PR.sage, 2], G: [PR.sage, 4] };
const DAISY = { big: S_(['.4554.', '45Yy43', '.3443.'], 3, 2), small: S_(['.54.', '4Yy3'], 2, 1), bud: S_(['Y', 'g'], 0, 1) };
const DAISY_MAP = { Y: [PR.amber, 5], y: [PR.amber, 3], g: [PR.grass, 3] };
const CORN = { big: S_(['3.4.3', '.454.', '34k42', '.232.'], 2, 3), small: S_(['.4.', '4k3', '.2.'], 1, 2), bud: S_(['3', 'g'], 0, 1) };
const CORN_MAP = { k: [PR.lavender, 1], g: [PR.sage, 3] };
const THISTLE = { big: S_(['.4543.', '454332', '.3432.', 'sGGggs', '.Gggf.', '..gf..'], 3, 5), bud: S_(['.43.', 'sGgs', '.gf.'], 2, 2) };
const THISTLE_MAP = { s: [PR.sage, 5], G: [PR.sage, 4], g: [PR.sage, 2], f: [PR.sage, 1] };
const CLOVER = { leaf: S_(['.44.33.', '4543432', '.34532.', '..332..'], 3, 3), small: S_(['45.43', '34532', '.232.'], 2, 2), flower: S_(['.54.', '5443', '4432', '.32.'], 1, 3) };
const CATTAIL = S_(['.4.', '542', '431', '431', '431', '421', '320', '.2.'], 1, 0);

// ---------------------------------------------------------------- grass tufts
const fan = (r, n, cx, hs, wd, sh, w = () => 2, spread = 1.9) => Array.from({ length: n }, () => { const bx = cx + (r() - 0.5) * wd; return { bx, h: hs[0] + r() * (hs[1] - hs[0]), lean: (bx - cx) * spread + (r() - 0.5) * 8, w: w(), sh }; }).sort((a, b) => b.h - a.h);
function tufts(S, R, list, o = {}) { for (const b of list) S.el(() => S.blade(b.bx, S.base, b.h, b.lean, R, { w: b.w, sh: b.sh, ...o, ...(b.o || {}) }), { ol: false }); }
function grassTall(S, r, R = PR.grass) { const cx = S.w / 2; tufts(S, R, fan(r, 6, cx, [16, 30], 6, -1, () => 1.6)); tufts(S, R, fan(r, 7, cx, [8, 25], 7, 0, () => (r() < 0.35 ? 3 : 2))); }
function grassShort(S, r, R = PR.meadow) { const cx = S.w / 2; tufts(S, R, fan(r, 7, cx, [6, 12], 10, -1, () => 1.6, 1.3)); tufts(S, R, fan(r, 9, cx, [4, 10], 12, 0, () => 2, 1.3)); }
function grassWispy(S, r, R = PR.grass) {
  const cx = S.w / 2; tufts(S, R, fan(r, 4, cx, [11, 17], 6, -1));
  const arch = Array.from({ length: 7 }, (_, i) => { const sd = i % 2 ? 1 : -1; const bx = cx + (r() - 0.5) * 5; return { bx, h: 15 + r() * 11, lean: sd * (5 + r() * 6), w: 1.4, sh: 0, o: { curl: 0.35, droop: 0.65 } }; }).sort((a, b) => b.h - a.h);
  tufts(S, R, arch); tufts(S, R, fan(r, 4, cx, [5, 9], 8, 0));
}
function seedHead(S, pts, kind, r) {
  const n = pts.length; const top = pts.slice(Math.floor(n * 0.68)); const R = PR.straw;
  if (kind === 'fox') { let ly = 1e9, k = 0; for (const [x, y] of top) { const Y = Math.floor(y); if (Y === ly) continue; ly = Y; S.px(x, y, R, k < 2 ? 5 : 4); if (k % 2 === 0) S.px(x + 1, y, R, 2); if (r() < 0.3) S.px(x - 1, y + 1, R, 5); k++; } const t = top[top.length - 1]; S.px(t[0], t[1] - 1, R, 4); return; }
  for (let i = 0, sd = -1; i < 4; i++, sd = -sd) { const p = pts[Math.min(n - 1, Math.floor(n * (0.7 + i * 0.085)))]; S.px(p[0] + sd, p[1] + 1, R, 4); S.px(p[0] + 2 * sd, p[1] + 2, R, sd < 0 ? 5 : 3); S.px(p[0] + 2 * sd, p[1] + 3, R, 2); }
}
function grassSeed(S, r, kind = 'fox') {
  const cx = S.w / 2; tufts(S, PR.grass, fan(r, 4, cx, [9, 17], 9, -1));
  for (let i = 0; i < 3; i++) { const bx = cx + (i - 1) * 3 + (r() - 0.5) * 2; let pts; S.el(() => { pts = S.stem(bx, S.base, 22 + r() * 9, (i - 1) * 3 + (r() - 0.5) * 3, PR.reed, { t0: 2, t1: 3 }); }, { shadow: 0 }); S.el(() => seedHead(S, pts, kind, r)); }
  tufts(S, PR.grass, fan(r, 5, cx, [5, 12], 11, 0));
}
function grassDry(S, r) {
  const cx = S.w / 2; const R = PR.dry; tufts(S, R, fan(r, 5, cx, [12, 22], 6, -1, () => 1.6));
  for (let i = 0; i < 2; i++) { let pts; S.el(() => { pts = S.stem(cx + (i ? 3 : -2), S.base, 19 + r() * 5, i ? 4 : -3, PR.straw, { t0: 2, t1: 3 }); }, { shadow: 0 }); S.el(() => seedHead(S, pts, 'oat', r)); }
  for (const b of fan(r, 6, cx, [7, 18], 8, 0, () => 2, 1.5)) S.el(() => {
    if (r() < 0.35) { const kx = b.bx + b.lean * 0.5, ky = S.base - b.h * 0.6, sd = Math.sign(b.lean || 1); const pts = S.polyline([[b.bx + 0.5, S.base + 0.9], [kx, ky], [kx + sd * 4, ky + 2]]); S.stroke(pts, R, 2, 1, (u, s) => (u < 0.2 ? 1 : u < 0.5 ? 2 : u < 0.8 ? 3 : 4) - (s > 0 ? 1 : 0), 0.3); }
    else S.blade(b.bx, S.base, b.h, b.lean, R, { w: b.w });
  }, { ol: false });
}

// ---------------------------------------------------------------- wildflowers
function poppy(S, r) {
  const cx = S.w / 2, by = S.base;
  for (const [a, L, sh] of [[-1.3, 7, -1], [1.25, 7, -1], [-0.55, 6, 0], [0.6, 6, 0]]) S.el(() => { const tx = cx + Math.sin(a) * L, ty = by - Math.cos(a) * L * 0.7; S.leaf(cx + a, by, tx, ty, 1.6, PR.sage, sh); S.leaf(lerp(cx, tx, 0.5), lerp(by, ty, 0.5), lerp(cx, tx, 0.5) + Math.sign(a) * 2, lerp(by, ty, 0.5) - 3, 0.9, PR.sage, sh); });
  const stems = [{ dx: -3, h: 16 + r() * 4, lean: -3, head: 'side' }, { dx: 1, h: 21 + r() * 4, lean: 1, head: 'open' }, { dx: 3, h: 12 + r() * 3, lean: 4, head: 'bud', droop: 1 }];
  for (const s of stems) { let pts; S.el(() => { pts = S.stem(cx + s.dx, by, s.h, s.lean, PR.grass, { hairs: r, droop: s.droop || 0 }); }, { shadow: 0 }); const t = pts[pts.length - 1]; S.el(() => S.stamp(POPPY[s.head], t[0], t[1], PR.poppy, POPPY_MAP)); }
}
function sprig(S, bx, h, lean, R, sh) { const pts = S.stem(bx, S.base, h, lean, R, { t0: 2 + sh, t1: 3 + sh }); for (let k = 3, sd = -1; k < pts.length; k += 4, sd = -sd) S.px(pts[k][0] + sd, pts[k][1] - 1, R, (sd < 0 ? 4 : 2) + sh); }
function chamomile(S, r) {
  const cx = S.w / 2; for (let i = 0; i < 9; i++) S.el(() => sprig(S, cx + (r() - 0.5) * 14, 4 + r() * 5, (r() - 0.5) * 6, PR.meadow, i < 4 ? -1 : 0));
  const heads = []; for (let i = 0; i < 6; i++) { const bx = cx + (r() - 0.5) * 8, h = 9 + r() * 10; let pts; S.el(() => { pts = S.stem(bx, S.base, h, (bx - cx) * 0.8 + (r() - 0.5) * 5, PR.meadow); }, { shadow: 0 }); heads.push([pts[pts.length - 1], r() < 0.6 ? 'big' : r() < 0.6 ? 'small' : 'bud']); }
  heads.sort((a, b) => a[0][1] - b[0][1]); for (const [t, k] of heads) S.el(() => S.stamp(DAISY[k], t[0], t[1], PR.white, DAISY_MAP));
}
function cornflower(S, r) {
  const cx = S.w / 2; for (let i = 0; i < 7; i++) { const bx = cx + (r() - 0.5) * 10; S.el(() => S.blade(bx, S.base, 5 + r() * 7, (bx - cx) * 1.1, PR.sage, { w: 1.6, sh: i < 3 ? -1 : 0 })); }
  const heads = []; for (let i = 0; i < 4; i++) { const bx = cx + (i - 1.5) * 2.5, h = 13 + r() * 10; let pts; S.el(() => { pts = S.stem(bx, S.base, h, (i - 1.5) * 2.4 + (r() - 0.5) * 3, PR.sage); if (r() < 0.6) S.leaf(pts[Math.floor(pts.length * 0.45)][0], pts[Math.floor(pts.length * 0.45)][1], pts[Math.floor(pts.length * 0.45)][0] + (i < 2 ? -3 : 3), pts[Math.floor(pts.length * 0.45)][1] - 3, 0.8, PR.sage); }, { shadow: 0 }); heads.push([pts[pts.length - 1], i === 1 ? 'big' : i === 2 ? (r() < 0.5 ? 'big' : 'small') : r() < 0.5 ? 'small' : 'bud']); }
  for (const [t, k] of heads) S.el(() => S.stamp(CORN[k], t[0], t[1], PR.blue, CORN_MAP));
}
function lavender(S, r) {
  const cx = S.w / 2; tufts(S, PR.sage, fan(r, 6, cx, [4, 8], 12, -1));
  const st = Array.from({ length: 8 }, () => { const bx = cx + (r() - 0.5) * 6; return { bx, h: 15 + r() * 10, lean: (bx - cx) * 1.4 + (r() - 0.5) * 6 }; }).sort((a, b) => b.h - a.h);
  for (const s of st) {
    let pts; S.el(() => { pts = S.stem(s.bx, S.base, s.h, s.lean, PR.sage, { t0: 2, t1: 3 }); }, { shadow: 0 });
    S.el(() => { let ly = 1e9, k = 0; for (let i = pts.length - 1; i >= 0 && k < 9; i--) { const [x, y] = pts[i]; const Y = Math.floor(y); if (Y === ly) continue; ly = Y; const m = k % 3; if (m !== 2) { S.px(x, y, PR.lavender, k === 0 ? 4 : m === 0 ? 4 : 3); S.px(x + 1, y, PR.lavender, m === 0 ? 2 : 1); if (m === 0 && k) S.px(x - 1, y, PR.lavender, 5); } k++; } });
  }
  tufts(S, PR.sage, fan(r, 5, cx, [3, 6], 12, 0));
}
function thistle(S, r) {
  const cx = S.w / 2, by = S.base;
  for (const [a, L, sh] of [[-1.25, 9, -1], [1.2, 9, -1], [-0.6, 8, 0], [0.7, 7, 0]]) S.el(() => { const tx = cx + Math.sin(a) * L, ty = by - Math.cos(a) * L * 0.75; S.leaf(cx, by, tx, ty, 2.2, PR.sage, sh); for (const u of [0.35, 0.6, 0.85]) { const x = lerp(cx, tx, u), y = lerp(by, ty, u); S.px(x + Math.cos(a) * 2.5, y - 2, PR.sage, 5); S.px(x - Math.cos(a) * 2, y + 1.5, PR.sage, 4); } });
  let p1, p2; S.el(() => { p1 = S.stem(cx, by, 22 + r() * 4, 1, PR.sage, { w: 2, t0: 2, t1: 3 }); p2 = S.stem(cx - 1, by, 14 + r() * 3, -5, PR.sage, { t0: 2, t1: 3 }); S.leaf(p1[Math.floor(p1.length * 0.5)][0], p1[Math.floor(p1.length * 0.5)][1], p1[Math.floor(p1.length * 0.5)][0] + 4, p1[Math.floor(p1.length * 0.5)][1] - 2, 1.2, PR.sage); }, { shadow: 0 });
  S.el(() => S.stamp(THISTLE.bud, p2[p2.length - 1][0], p2[p2.length - 1][1], PR.thistle, THISTLE_MAP)); S.el(() => S.stamp(THISTLE.big, p1[p1.length - 1][0], p1[p1.length - 1][1], PR.thistle, THISTLE_MAP));
}

// ---------------------------------------------------------------- fern, clover, reeds, cattails
function fern(S, r) {
  const cx = S.w / 2, by = S.base; const R = PR.fern;
  const fr = [-1.3, 1.25, -0.68, 0.72, 0.04].map((a) => ({ a: a + (r() - 0.5) * 0.14, L: 17 + Math.abs(a) * 4 + r() * 3 })).sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
  fr.forEach((f, i) => { f.sh = i === 1 || i === 2 ? -1 : 0; });
  for (const f of fr) S.el(() => {
    const sa = Math.sin(f.a); const pts = S.curve([cx + 0.5, by + 0.5], [cx + sa * f.L * 0.45, by - f.L * 0.95], [clamp(cx + sa * f.L * 1.05, S.amp + 1, S.w - S.amp - 2), by - f.L * (0.78 - 0.38 * Math.abs(sa))]);
    const n = pts.length - 1; S.stroke(pts, R, 1, 1, (u) => (u > 0.9 ? 4 : 2) + f.sh);
    for (let k = Math.floor(n * 0.16), sd = 1; k < n - 1; k += 7, sd = -sd) {
      const u = k / n, [x, y] = pts[k], [x2, y2] = pts[Math.min(n, k + 3)]; const tl = Math.hypot(x2 - x, y2 - y) || 1, dx = (x2 - x) / tl, dy = (y2 - y) / tl; const len = 1 + 3.2 * Math.pow(1 - u, 0.8);
      for (const s2 of [sd, -sd]) { const nx = -dy * s2, ny = dx * s2; const ex = x + (nx * 0.78 + dx * 0.62) * len, ey = y + (ny * 0.78 + dy * 0.62) * len; const up = ny < 0.1; const m = Math.max(1, Math.round(len)); for (let q = 1; q <= m; q++) S.px(lerp(x, ex, q / m), lerp(y, ey, q / m), R, (up ? (q === m ? 5 : 4) : q === m ? 3 : 2) + f.sh); }
    }
  });
}
function clover(S, r) {
  const spots = Array.from({ length: 9 }, () => [2 + r() * (S.w - 6), 4 + r() * 6]).sort((a, b) => a[1] - b[1]);
  spots.forEach(([x, y], i) => { S.el(() => { for (let yy = Math.ceil(y); yy <= S.base; yy++) S.px(S.B(x, yy), yy, PR.meadow, 2); }, { shadow: 0, ol: false }); S.el(() => S.stamp(i % 3 === 1 ? CLOVER.small : CLOVER.leaf, S.B(x, y), y, PR.meadow)); });
  for (const fx of [S.w * 0.3 + r() * 3, S.w * 0.68 + r() * 3]) { let pts; S.el(() => { pts = S.stem(fx, S.base, 7 + r() * 3, (r() - 0.5) * 2, PR.meadow); }, { shadow: 0 }); const t = pts[pts.length - 1]; S.el(() => S.stamp(CLOVER.flower, t[0], t[1], PR.pink)); }
}
function reeds(S, r, plumes = true) {
  const cx = S.w / 2; const R = PR.reed; tufts(S, R, fan(r, 6, cx, [20, 34], 8, -1, () => 1.6, 0.8));
  const front = fan(r, 7, cx, [16, 40], 8, 0, () => (r() < 0.4 ? 2.6 : 2), 0.75);
  front.forEach((b, i) => { let pts; S.el(() => { pts = S.blade(b.bx, S.base, b.h, b.lean, R, { w: b.w, tp: 0.35 }); }, { ol: false }); if (plumes && i < 2) S.el(() => { const [x, y] = pts[pts.length - 1]; for (let s = 0; s < 3; s++) for (let q = 0; q < 5; q++) S.px(x + (s - 1) * 0.7 + q * 0.45, y + q + s * 0.4, PR.plume, q < 1 ? 5 : s === 0 ? 4 : s < 2 ? 3 : 2); }); });
}
function cattails(S, r) {
  const cx = S.w / 2; reeds(S, r, false);
  for (let i = 0; i < 3; i++) { const bx = cx + (i - 1) * 3 + (r() - 0.5) * 2; let pts; S.el(() => { pts = S.stem(bx, S.base, 28 + r() * 11, (i - 1) * 2.5, PR.reed, { t0: 2, t1: 3 }); }, { shadow: 0 }); const k = pts[Math.floor(pts.length * 0.8)]; S.el(() => S.stamp(CATTAIL, k[0], k[1] - 5, PR.cattail, {})); }
  for (const sd of [-1, 1]) S.el(() => S.blade(cx + sd, S.base, 22 + r() * 6, sd * 7, PR.reed, { w: 2, curl: 0.4, droop: 0.6 }));
}

// ---------------------------------------------------------------- bushes: faceted foliage masses + protruding leaves
function canopy(S, r, R, clumps, { leafLen = 3, leafW = 0, leaves = 7, tex = 1 } = {}) {
  const out = [];
  for (const c of clumps) {
    S.el(() => {
      const pts = ngon(c.x, c.y, c.r, 7, r() * 6, 1, 0.82).map(([x, y]) => [x + (r() - 0.5) * 1.6, y + (r() - 0.5) * 1.2]); const bp = S.facet(pts, R, { k: 1.35, table: c.r * 0.4, sh: c.sh });
      const bx = S.B(c.x, c.y);
      if (tex) for (let i = 0; i < c.r * 2.2; i++) { const a = r() * 6.28, d = r() * c.r * 0.8; const x = bx + Math.cos(a) * d, y = c.y + Math.sin(a) * d * 0.8; const lit = Math.cos(a) + Math.sin(a) < 0; S.shift(x, y, lit ? 1 : -1); S.shift(x + 1, y - 1, lit ? 1 : -1); }
      for (let i = 0; i < leaves; i++) { const a = -Math.PI * (0.05 + 0.9 * r()) + (r() < 0.25 ? Math.PI : 0); const x0 = c.x + Math.cos(a) * c.r * 0.55, y0 = c.y + Math.sin(a) * c.r * 0.5, x1 = c.x + Math.cos(a) * (c.r + leafLen), y1 = c.y + Math.sin(a) * (c.r * 0.82 + leafLen * 0.8); const lit = Math.cos(a) * 0.6 + Math.sin(a) * 0.8 < -0.15;
        if (leafW) S.leaf(x0, y0, x1, y1, leafW, R, c.sh + (lit ? 0 : -1)); else { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let q = 0; q <= n; q++) { const u = q / n; S.px(S.B(lerp(x0, x1, u), lerp(y0, y1, u)), lerp(y0, y1, u), R, (lit ? (u > 0.7 ? 5 : 4) : u > 0.7 ? 3 : 2) + c.sh); } } }
      out.push({ ...c, bx, bp });
    });
  }
  return out;
}
function twigs(S, r, cx, n, h, spread) { for (let i = 0; i < n; i++) S.el(() => { const a = (i / (n - 1) - 0.5) * spread; S.stroke(S.curve([cx + a * 2 + 0.5, S.base + 0.9], [cx + a * 5, S.base - h * 0.5], [cx + a * 9, S.base - h]), PR.bark, 2, 1, (u, s) => (u > 0.7 ? 3 : 2) - (s > 0 ? 1 : 0)); }); }
const dome = (r, cx, by, rx, ry, n, rad) => Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.06 + 0.88 * ((i + r() * 0.6) / n)); return { x: cx - Math.cos(a) * rx * (0.55 + r() * 0.45), y: by - Math.sin(a) * ry * (0.55 + r() * 0.45) - 2, r: rad[0] + r() * (rad[1] - rad[0]) }; });
function olive(S, r) {
  const cx = S.w / 2, by = S.base; twigs(S, r, cx, 4, 18, 1.4);
  const back = dome(r, cx, by - 8, 15, 20, 6, [6, 8]).map((c) => ({ ...c, sh: -1 })); const front = dome(r, cx, by - 4, 17, 13, 6, [6, 8]).map((c) => ({ ...c, sh: 0 }));
  const cl = canopy(S, r, PR.sage, [...back, ...front.sort((a, b) => a.y - b.y)], { leafLen: 3.5, leaves: 9 });
  for (const c of cl.slice(-4)) if (r() < 0.8) S.el(() => { const x = c.bx + (r() - 0.3) * c.r, y = c.y + r() * c.r * 0.5; S.px(x, y, PR.ink, 2); S.px(x + 1, y, PR.ink, 1); S.px(x, y - 1, PR.ink, 4); }, { shadow: 0 });
  for (const c of cl) if (c.sh === 0 && r() < 0.7) S.px(c.bx - c.r * 0.4, c.y - c.r * 0.45, PR.sage, 5);
}
function berry(S, r) {
  const cx = S.w / 2, by = S.base; twigs(S, r, cx, 3, 14, 1.2);
  const back = dome(r, cx, by - 7, 14, 18, 6, [6, 8]).map((c) => ({ ...c, sh: -1 })); const front = dome(r, cx, by - 3, 16, 12, 5, [6, 8]).map((c) => ({ ...c, sh: 0 }));
  const cl = canopy(S, r, PR.leaf, [...back, ...front.sort((a, b) => a.y - b.y)], { leafLen: 3, leafW: 1.1, leaves: 7 });
  for (const c of cl.filter((q) => q.sh === 0 || r() < 0.4)) S.el(() => { const ox = c.bx + (r() - 0.5) * c.r, oy = c.y + (r() - 0.2) * c.r * 0.6; const ripe = r() < 0.7 ? PR.berry : PR.amber; for (const [dx, dy] of [[0, 0], [2, 1], [-1, 2], [1, 3]].slice(0, 2 + Math.floor(r() * 3))) { S.px(ox + dx, oy + dy, ripe, 5); S.px(ox + dx + 1, oy + dy, ripe, 3); S.px(ox + dx, oy + dy + 1, ripe, 3); S.px(ox + dx + 1, oy + dy + 1, ripe, 1); } });
}
function rosemary(S, r) {
  const cx = S.w / 2, by = S.base; twigs(S, r, cx, 3, 8, 1);
  const sp = Array.from({ length: 18 }, (_, i) => { const a = (i / 17 - 0.5) * 1.7 + (r() - 0.5) * 0.2; return { a, L: (14 + r() * 13) * (1 - Math.abs(a) * 0.28), z: r() }; }).sort((p, q) => p.z - q.z);
  for (const s of sp) S.el(() => {
    const sh = s.z < 0.45 ? -1 : 0; const bx = cx + s.a * 4; const tx = clamp(bx + Math.sin(s.a) * s.L, S.amp + 1, S.w - S.amp - 2), ty = by - Math.cos(s.a) * s.L;
    const pts = S.curve([bx + 0.5, by + 0.9], [lerp(bx, tx, 0.35), lerp(by, ty, 0.6)], [tx + 0.5, ty]); const n = pts.length - 1;
    S.stroke(pts, PR.rosemary, 1, 1, () => 1 + sh);
    for (let k = Math.floor(n * 0.18); k < n; k += 3) { const [x, y] = pts[k]; const u = k / n; S.px(x - 1, y - 1, PR.rosemary, 3 + sh + (u > 0.8 ? 1 : 0)); S.px(x + 1, y - 1, PR.rosemary, 2 + sh); if (u > 0.4 && u < 0.9 && k % 2) { S.px(x - 2, y - 2, PR.rosemary, 4 + sh); } }
    const t = pts[n]; S.px(t[0], t[1], PR.rosemary, 5 + sh); S.px(t[0], t[1] + 1, PR.rosemary, 4 + sh);
    if (r() < 0.55) { const k = pts[Math.floor(n * (0.55 + r() * 0.3))]; S.px(k[0] - 1, k[1], PR.sky, 5); S.px(k[0] - 1, k[1] + 1, PR.sky, 3); }
  });
}
function broom(S, r) {
  const cx = S.w / 2, by = S.base;
  const wh = Array.from({ length: 18 }, () => { const a = (r() - 0.5) * 2.3; return { a, L: 18 + r() * 19 * (1 - Math.abs(a) * 0.2), z: r(), x0: cx + (r() - 0.5) * 9 + Math.sin(a) * 3 }; }).sort((p, q) => p.z - q.z);
  for (const w of wh) {
    const sh = w.z < 0.4 ? -1 : 0; const sa = Math.sin(w.a); let pts;
    S.el(() => { pts = S.curve([w.x0 + 0.5, by + 0.9], [w.x0 + sa * w.L * 0.3, by - w.L * 0.9], [clamp(w.x0 + sa * w.L * 0.95, S.amp + 1, S.w - S.amp - 2), by - w.L * (0.95 - Math.abs(sa) * 0.35)]); S.stroke(pts, PR.leaf, 1, 1, (u) => (u < 0.25 ? 2 : u > 0.6 ? 4 : 3) + sh); }, { shadow: 0 });
    S.el(() => { const n = pts.length - 1; for (let u = 0.4 + r() * 0.1, sd = 1; u < 1; u += 0.1 + r() * 0.06, sd = -sd) { const [x, y] = pts[Math.floor(u * n)]; const X = x + (sd > 0 ? 0.5 : -1.5); S.px(X, y - 1, PR.gold, 5 + sh); S.px(X + 1, y - 1, PR.gold, 4 + sh); S.px(X, y, PR.gold, 4 + sh); S.px(X + 1, y, PR.gold, 2 + sh); } });
  }
  tufts(S, PR.grass, fan(r, 6, cx, [5, 11], 16, 0, () => 2, 1.2));
}

// ---------------------------------------------------------------- registry: [width, height, wind amplitude px, draw]
export const PLANT_DEFS = {
  grass_tall_a: [30, 32, 5, (S, r) => grassTall(S, r)], grass_tall_b: [30, 32, 5, (S, r) => grassTall(S, r, PR.meadow)], grass_tall_c: [30, 32, 5, (S, r) => grassTall(S, r)],
  grass_short_a: [22, 14, 2, (S, r) => grassShort(S, r)], grass_short_b: [22, 14, 2, (S, r) => grassShort(S, r, PR.grass)],
  grass_wispy_a: [30, 28, 6, grassWispy], grass_wispy_b: [30, 28, 6, (S, r) => grassWispy(S, r, PR.meadow)],
  grass_seed_a: [26, 34, 5, (S, r) => grassSeed(S, r, 'fox')], grass_seed_b: [26, 34, 5, (S, r) => grassSeed(S, r, 'oat')],
  grass_dry_a: [26, 26, 4, grassDry], grass_dry_b: [26, 26, 4, grassDry],
  poppy_a: [24, 28, 4, poppy], poppy_b: [24, 28, 4, poppy], chamomile_a: [24, 22, 3, chamomile], chamomile_b: [24, 22, 3, chamomile],
  cornflower_a: [22, 26, 4, cornflower], lavender_a: [24, 28, 3, lavender], lavender_b: [24, 28, 3, lavender], thistle_a: [24, 30, 2, thistle],
  fern_a: [40, 28, 3, fern], fern_b: [40, 28, 3, fern], clover_a: [26, 12, 1, clover], clover_b: [26, 12, 1, clover],
  reeds_a: [22, 42, 6, reeds], reeds_b: [22, 42, 6, reeds], cattail_a: [24, 44, 5, cattails],
  bush_olive: [50, 38, 2, olive], bush_rosemary: [42, 32, 2, rosemary], bush_broom: [48, 40, 3, broom], bush_berry: [46, 36, 2, berry],
};
// families used by the stage builder
export const PLANT_KINDS = {
  tall: ['grass_tall_a', 'grass_tall_b', 'grass_tall_c'], short: ['grass_short_a', 'grass_short_b'], wispy: ['grass_wispy_a', 'grass_wispy_b'], seed: ['grass_seed_a', 'grass_seed_b'], dry: ['grass_dry_a', 'grass_dry_b'],
  poppy: ['poppy_a', 'poppy_b'], chamomile: ['chamomile_a', 'chamomile_b'], cornflower: ['cornflower_a'], lavender: ['lavender_a', 'lavender_b'], thistle: ['thistle_a'],
  fern: ['fern_a', 'fern_b'], clover: ['clover_a', 'clover_b'], reeds: ['reeds_a', 'reeds_b'], cattail: ['cattail_a'],
  olive: ['bush_olive'], rosemary: ['bush_rosemary'], broom: ['bush_broom'], berry: ['bush_berry'],
};

/** the 5 wind frames of one plant (PixelCanvas each) */
export function plantFrames(name) {
  const [w, h, amp, fn] = PLANT_DEFS[name]; let seed = 0; for (const c of name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  return BENDS.map((b) => { const S = new Buf(w, h, amp); S.bend = b; fn(S, mulberry32(seed)); S.outline(); return S.canvas(); });
}

let ATLAS = null;
/** every plant's frames packed in one canvas: { canvas, W, H, map: { name: { x, y, w, h, step } } } (frames side by side) */
export function plantAtlas() {
  if (ATLAS) return ATLAS; const W = 1024, PAD = 2; const map = {}; let x = PAD, y = PAD, row = 0; const items = [];
  for (const name of Object.keys(PLANT_DEFS)) { const fr = plantFrames(name); const w = fr[0].w, h = fr[0].h, step = w + PAD; const sw = step * fr.length; if (x + sw > W) { x = PAD; y += row + PAD; row = 0; } map[name] = { x, y, w, h, step }; items.push([fr, x, y, step]); x += sw; row = Math.max(row, h); }
  const H = 1 << Math.ceil(Math.log2(y + row + PAD)); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  for (const [fr, x0, y0, step] of items) fr.forEach((pc, i) => g.drawImage(pc.commit(), x0 + i * step, y0));
  return (ATLAS = { canvas: c, W, H, map });
}
