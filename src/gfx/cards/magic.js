// Arcane force effects for the law/power cards: rune circles, vortices, shock rings, light trails and motes.
// Light is built from stepped bands around designed curves (white core -> cyan -> blue -> violet halo),
// never a smooth gradient; runes and ticks are hand-placed 3x4 glyphs.
import { Spr, ell, ramp, rng } from './kit.js';
import { K } from './pal.js';
import { miniApple } from './subjects.js';

export const ARC = ramp('#100828', '#24145a', '#3e2496', '#4e4ed2', '#3ea6ec', '#8cecff', '#f2ffff');
export const AUR = ramp('#24080e', '#5e1c16', '#a2481a', '#e08a1e', '#ffc232', '#fff07c', '#fffff0');
export const VIO = ramp('#12061e', '#2e0c52', '#56188a', '#8a30be', '#bc5ce6', '#eaa0ff', '#fff2ff');
export const BRIGHT_GOLD = ramp('#5a2a14', '#93561a', '#cc8c1e', '#f2c032', '#ffe878', '#fffde0', '#ffffff');
export const EMB = ramp('#1e0610', '#541024', '#9a1e2a', '#d8402a', '#ff7c3a', '#ffc070', '#fff4d8');

// ---------- glow layer: max-combined stepped tones ----------
export class Glow {
  constructor(w, h) { this.w = w; this.h = h; this.t = new Int8Array(w * h).fill(-1); this.r = new Array(w * h).fill(null); }
  put(x, y, R, t) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (t > this.t[i]) { this.t[i] = t; this.r[i] = R; } }
  // stroke a polyline with stepped bands: widths for tones 6,5,4,3(,2)
  path(pts, R, wd = [0.7, 1.5, 2.3, 3.1], tones = [6, 5, 4, 3, 2]) {
    const W = this.w, H = this.h; const m = wd[wd.length - 1];
    const dist = new Map();
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - m)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + m)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - m)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + m));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); const e = Math.hypot(ax + dx * t - px, ay + dy * t - py);
        if (e < m) { const k = y * W + x; const o = dist.get(k); if (o === undefined || e < o) dist.set(k, e); }
      }
    }
    for (const [k, d] of dist) for (let j = 0; j < wd.length; j++) if (d < wd[j]) { this.put(k % W, Math.floor(k / W), R, tones[j]); break; }
    return this;
  }
  // a filled glowing disc / ellipse
  orb(cx, cy, r, R, bands = [0.45, 0.7, 0.88, 1], tones = [6, 5, 4, 3], ry = r) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / ry); for (let k = 0; k < bands.length; k++) if (d <= bands[k]) { this.put(x, y, R, tones[k]); break; }
    }
    return this;
  }
  px(x, y, R, t) { this.put(x, y, R, t); return this; }
  draw(s, ox = 0, oy = 0) { for (let i = 0; i < this.t.length; i++) if (this.t[i] >= 0) s.px(ox + (i % this.w), oy + Math.floor(i / this.w), this.r[i][this.t[i]]); return s; }
}

// ---------- curve builders ----------
export const arc = (cx, cy, rx, ry, a0, a1, n = 0) => { const N = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) * 1.2)); const out = []; for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
export const spiral = (cx, cy, r0, r1, a0, turns, sq = 1, n = 120) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; const a = a0 + t * turns * Math.PI * 2; const r = r0 + (r1 - r0) * t; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq]); } return out; };

// ---------- runes ----------
const RUNES = [
  ['X.X', 'XXX', '.X.', '.X.'], ['XX.', 'X.X', 'XX.', 'X.X'], ['X..', 'XX.', 'X.X', 'X..'], ['.X.', 'X.X', '.X.', 'X.X'],
  ['XXX', '.X.', '.X.', 'XXX'], ['X.X', '.X.', 'X.X', '.X.'], ['X..', 'X..', 'XXX', '..X'], ['.XX', 'X..', '.X.', '..X'],
];
export function rune(s, i, x, y, c) { const g = RUNES[i % RUNES.length]; for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) if (g[j][k] === 'X') s.px(x + k, y + j, c); }
// thin rune circle (ellipse) with an inner ring, ticks and glyphs between
export function runeCircle(s, cx, cy, rx, ry, R, { glyphs = 8, seed = 1, inner = 0.78, ticks = 24, bright = 5 } = {}) {
  const g = new Glow(s.w, s.h);
  g.path(arc(cx, cy, rx, ry, 0, Math.PI * 2), R, [0.6, 1.3], [bright, bright - 2]);
  g.path(arc(cx, cy, rx * inner, ry * inner, 0, Math.PI * 2), R, [0.55], [bright - 1]);
  g.draw(s);
  for (let i = 0; i < ticks; i++) { const a = (i / ticks) * Math.PI * 2; const x = cx + Math.cos(a) * rx * ((1 + inner) / 2 + 0.06), y = cy + Math.sin(a) * ry * ((1 + inner) / 2 + 0.06); if (i % 3 === 0) s.px(x, y, R[bright]); }
  const r = rng(seed);
  for (let i = 0; i < glyphs; i++) { const a = (i / glyphs) * Math.PI * 2 + 0.3; const x = cx + Math.cos(a) * rx * (1 + inner) / 2, y = cy + Math.sin(a) * ry * (1 + inner) / 2; if (ry / rx > 0.6) rune(s, Math.floor(r() * 8), Math.round(x - 1), Math.round(y - 2), R[bright + 1] || R[6]); }
}
// mote: a tiny 4-point sparkle
export function mote(s, x, y, R, big = false) {
  x = Math.round(x); y = Math.round(y);
  s.px(x, y, R[6]); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.px(x + a, y + b, R[4]);
  if (big) for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) s.px(x + a, y + b, R[3]);
}
const anchor = (s, ax, ay, extra = {}) => Object.assign(s, { ax, ay }, extra);

// ---------- force: a bolt of pure push leaving a rune gate ----------
export function forceBolt({ brute = false } = {}) {
  const W = 84, H = 50; const s = new Spr(W, H); const cy = 24; const C = brute ? AUR : ARC, C2 = brute ? EMB : VIO;
  // rune gate seen edge-on at the origin
  runeCircle(s, 12, cy, 5, 17, C2, { glyphs: 0, ticks: 18 });
  for (const [x, y, i] of [[4, cy - 4, 1], [16, cy - 12, 4], [16, cy + 9, 6]]) rune(s, i, x, y, C2[5]);
  const g = new Glow(W, H);
  // trail: three converging streams into the bolt head
  for (const [dy, len] of brute ? [[-9, 40], [0, 50], [9, 40], [-4, 46], [4, 46]] : [[-6, 38], [0, 48], [6, 38]]) g.path([[14, cy + dy], [14 + len * 0.5, cy + dy * 0.6], [14 + len, cy + dy * 0.1]], C, brute ? [0.6, 1.2, 1.9] : [0.5, 1.1, 1.8], [5, 4, 3]);
  // shock rings around the path, smaller toward the head
  for (const [x, r] of brute ? [[30, 15], [42, 12], [54, 9]] : [[30, 12], [44, 9]]) g.path(arc(x, cy, r * 0.28, r, -Math.PI / 2, Math.PI / 2), C2, [0.6, 1.3], [5, 3]), g.path(arc(x, cy, r * 0.28, r, Math.PI / 2, Math.PI * 1.5), C2, [0.5, 1.1], [3, 2]);
  // the head: a chevron of light
  const hx = brute ? 70 : 66, hh = brute ? 13 : 10;
  g.path([[hx - hh, cy - hh], [hx, cy], [hx - hh, cy + hh]], C, [0.8, 1.6, 2.5, 3.4], [6, 5, 4, 3]);
  g.path([[hx - hh - 6, cy - hh + 3], [hx - 6, cy], [hx - hh - 6, cy + hh - 3]], C, [0.6, 1.3, 2.1], [5, 4, 3]);
  g.orb(hx - 4, cy, 4.5, C);
  g.draw(s);
  if (brute) { // impact burst with flying shards
    const B = new Glow(W, H); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.2; const L = i % 2 ? 7 : 11; B.path([[hx + 2, cy], [hx + 2 + Math.cos(a) * L, cy + Math.sin(a) * L]], AUR, [0.6, 1.2], [6, 4]); }
    B.draw(s);
    for (const [x, y] of [[79, 8], [80, 40], [74, 3], [76, 45]]) s.grid(['.a', 'ab'], { a: EMB[5], b: EMB[3] }, x, y);
  }
  const r = rng(brute ? 5 : 4);
  for (let i = 0; i < 9; i++) mote(s, 20 + r() * 50, 6 + r() * 38, i % 2 ? C2 : C, i < 2);
  return anchor(s, 40, cy + 20, { float: true, sw: 40 });
}

// ---------- rotation: a spiral vortex over a rune circle ----------
export function vortex({ twist = false } = {}) {
  const W = 70, H = 54; const s = new Spr(W, H); const cx = 35, cy = 26;
  runeCircle(s, cx, cy + 16, 30, 8, twist ? AUR : VIO, { glyphs: 0, ticks: 30, seed: 3 });
  const g = new Glow(W, H);
  if (!twist) {
    for (let k = 0; k < 3; k++) g.path(spiral(cx, cy, 3, 24, (k * Math.PI * 2) / 3, 0.8, 0.55), k === 1 ? VIO : ARC, [0.6, 1.3, 2.1, 2.9], [6, 5, 4, 3]);
    for (let k = 0; k < 3; k++) g.path(spiral(cx, cy, 6, 18, (k * Math.PI * 2) / 3 + 1, 0.6, 0.55), ARC, [0.5, 1.1], [4, 3]);
    g.orb(cx, cy, 5, ARC, [0.4, 0.7, 1, 1.3]);
    // arrowheads on the arm tips
    for (let k = 0; k < 3; k++) { const a = (k * Math.PI * 2) / 3 + 0.8 * Math.PI * 2; const x = cx + Math.cos(a) * 24, y = cy + Math.sin(a) * 24 * 0.55; const tx = -Math.sin(a), ty = Math.cos(a) * 0.55; const L = Math.hypot(tx, ty); const ux = tx / L, uy = ty / L; g.path([[x - ux * 4 - uy * 3, y - uy * 4 + ux * 3], [x + ux * 1, y + uy * 1], [x - ux * 4 + uy * 3, y - uy * 4 - ux * 3]], k === 1 ? VIO : ARC, [0.6, 1.3], [6, 4]); }
  } else {
    // torque: two ribbons twisting around a vertical axis, with a wrench-turn arrow ring
    for (const [ph, R] of [[0, AUR], [Math.PI, VIO]]) {
      const back = [], front = [];
      for (let i = 0; i <= 80; i++) { const t = i / 80; const y = cy + 18 - t * 40; const a = ph + t * Math.PI * 3; const x = cx + Math.cos(a) * (12 - t * 4); (Math.sin(a) > 0 ? front : back).push([x, y, i]); }
      const segs = (arr) => { const out = []; let cur = []; for (const p of arr) { if (cur.length && p[2] !== cur[cur.length - 1][2] + 1) { out.push(cur); cur = []; } cur.push(p); } if (cur.length) out.push(cur); return out; };
      for (const sg of segs(back)) if (sg.length > 1) g.path(sg.map(([x, y]) => [x, y]), R, [0.5, 1.1, 1.8], [4, 3, 2]);
      for (const sg of segs(front)) if (sg.length > 1) g.path(sg.map(([x, y]) => [x, y]), R, [0.7, 1.4, 2.2, 3], [6, 5, 4, 3]);
    }
    g.path(arc(cx, cy + 2, 24, 7, 0.4, Math.PI * 1.75), ARC, [0.6, 1.3, 2], [6, 4, 3]);
    const a = Math.PI * 1.75; const x = cx + Math.cos(a) * 24, y = cy + 2 + Math.sin(a) * 7; g.path([[x - 5, y - 2], [x + 1, y], [x - 3, y + 4]], ARC, [0.6, 1.3], [6, 4]);
    g.orb(cx, cy - 22, 3, AUR); g.orb(cx, cy + 18, 3, VIO);
  }
  g.draw(s);
  const r = rng(twist ? 8 : 7);
  for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 12; mote(s, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, i % 3 ? ARC : AUR, i < 2); }
  return anchor(s, cx, cy + 16, { sw: 50 });
}

// ---------- momentum: an energy orb gathering itself as it rolls ----------
export function snowballOrb() {
  const W = 84, H = 50; const s = new Spr(W, H); const cy = 26;
  const g = new Glow(W, H);
  // trail of growing rings: each echo bigger than the last
  const echoes = [[10, 3], [20, 4.5], [32, 6.5], [46, 9]];
  for (const [x, r] of echoes) { g.path(arc(x, cy, r * 0.45, r, 0, Math.PI * 2), VIO, [0.5, 1.1], [5, 3]); g.px(x, cy, ARC, 6); }
  g.path([[4, cy], [62, cy]], ARC, [0.5, 1.2, 2], [5, 4, 3]);
  for (const dy of [-8, 8]) g.path([[22, cy + dy * 0.4], [50, cy + dy]], ARC, [0.5, 1.1], [4, 3]);
  g.orb(64, cy, 13, ARC, [0.4, 0.62, 0.8, 0.93, 1.06], [6, 5, 4, 3, 2]);
  g.draw(s);
  // a rune band wrapping the orb, and motes being swept into it
  for (let a = 0.2; a <= 1.9; a += 0.05) s.px(Math.round(64 + Math.cos(a) * 10.5), Math.round(cy + Math.sin(a) * 10.5), ARC[3]);
  for (const [x, y, k] of [[74, 8, 1], [80, 18, 0], [52, 6, 0], [78, 40, 1], [56, 44, 0], [44, 12, 0]]) { mote(s, x, y, k ? AUR : VIO, !!k); }
  s.grid(['WW.', 'W..'], { W: '#ffffff' }, 58, cy - 8);
  return anchor(s, 50, cy + 20, { float: true, sw: 44 });
}

// ---------- powers ----------
export function firstLaw() {
  const W = 100, H = 58; const s = new Spr(W, H);
  // a straight line of light receding to a vanishing point among the stars, gates along it
  const vx = 92, vy = 8, ox = 4, oy = 52;
  const P = (t) => [ox + (vx - ox) * t, oy + (vy - oy) * t];
  const g = new Glow(W, H);
  g.path([P(0), P(1)], ARC, [0.6, 1.3, 2, 2.8], [5, 4, 3, 2]);
  g.draw(s);
  for (const t of [0.82, 0.62, 0.42]) { const [x, y] = P(t); const k = 1 - t; const gg = new Glow(W, H); gg.path(arc(x, y, 2 + k * 5, 5 + k * 14, 0, Math.PI * 2), VIO, [0.5, 1.1], [5, 3]); gg.draw(s); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s.px(Math.round(x + Math.cos(a) * (2 + k * 5) * 1.35), Math.round(y + Math.sin(a) * (5 + k * 14) * 1.15), VIO[5]); } }
  const g2 = new Glow(W, H);
  const [bx, by] = P(0.2); g2.orb(bx, by, 7, AUR, [0.4, 0.65, 0.85, 1.05], [6, 5, 4, 3]);
  g2.path([[ox, oy - 1], [bx - 5, by - 1]], AUR, [0.6, 1.3, 2], [5, 4, 3]);
  g2.draw(s);
  s.grid(['WW', 'W.'], { W: '#ffffff' }, Math.round(bx) - 3, Math.round(by) - 4);
  // the Roman numeral of the law, written in light at the vanishing point
  s.grid(['XXXXX', '..X..', '..X..', '..X..', 'XXXXX'], { X: AUR[5] }, vx - 2, vy - 6);
  for (const [x, y] of [[30, 12], [64, 46], [50, 6], [80, 30]]) mote(s, x, y, ARC, x > 60);
  return anchor(s, 50, 29, { float: true });
}

export function thirdLaw() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 29;
  runeCircle(s, cx, cy, 26, 26, VIO, { glyphs: 10, seed: 14, inner: 0.82 });
  const g = new Glow(W, H);
  // equal and opposite: two arrows of light meeting head-on, mirrored exactly
  for (const [dir, R] of [[1, ARC], [-1, AUR]]) {
    const x0 = cx - dir * 44, x1 = cx - dir * 5;
    g.path([[x0, cy], [x1, cy]], R, [0.7, 1.5, 2.3, 3.1], [6, 5, 4, 3]);
    g.path([[x1 - dir * 7, cy - 7], [x1, cy], [x1 - dir * 7, cy + 7]], R, [0.7, 1.5, 2.3], [6, 5, 4]);
    for (const dy of [-5, 5]) g.path([[x0 + dir * 4, cy + dy], [x1 - dir * 12, cy + dy]], R, [0.5, 1.1], [4, 3]);
  }
  // the clash: a shock ring and a vertical flare
  g.path(arc(cx, cy, 6, 14, 0, Math.PI * 2), ARC, [0.5, 1.1], [5, 3]);
  g.path([[cx, cy - 22], [cx, cy + 22]], AUR, [0.5, 1.2, 1.9], [6, 4, 3]);
  g.orb(cx, cy, 3.5, AUR);
  g.draw(s);
  for (const [x, y, k] of [[cx - 12, cy - 15, 0], [cx + 12, cy + 15, 1], [cx + 13, cy - 14, 1], [cx - 13, cy + 14, 0]]) mote(s, x, y, k ? AUR : ARC, true);
  return anchor(s, cx, cy, { float: true });
}

export function gravitation() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 33;
  // a well: perspective rings dipping toward the centre
  const g = new Glow(W, H);
  for (const [r, dy, t] of [[44, -2, 3], [34, 0, 4], [24, 2, 4], [15, 4, 5]]) g.path(arc(cx, cy + dy, r, r * 0.3, 0, Math.PI * 2), VIO, [0.5, 1.1], [t, t - 2]);
  // motes spiralling in along gold paths
  for (let k = 0; k < 3; k++) g.path(spiral(cx, cy + 4, 40, 6, (k * Math.PI * 2) / 3, 0.85, 0.3), AUR, [0.5, 1.1, 1.7], [5, 4, 3]);
  g.orb(cx, cy + 4, 7, VIO, [0.35, 0.6, 0.85, 1.1], [6, 5, 4, 3], 4);
  g.draw(s);
  for (let k = 0; k < 3; k++) { const a = (k * Math.PI * 2) / 3; mote(s, cx + Math.cos(a) * 40, cy + 4 + Math.sin(a) * 12, AUR, true); }
  // a golden apple hangs at the heart of the well
  const a = miniApple(BRIGHT_GOLD, K.leaf, K.stem); a.draw(s, cx - 6, cy - 19);
  for (const [x, y] of [[cx - 10, cy - 18], [cx + 9, cy - 14], [cx - 9, cy - 6]]) mote(s, x, y, AUR);
  for (const [x, y] of [[14, 8], [86, 10], [22, 48], [80, 50]]) mote(s, x, y, ARC);
  return anchor(s, cx, 29, { float: true });
}

export function calculus() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 29;
  runeCircle(s, cx, cy, 27, 27, ARC, { glyphs: 8, seed: 21, inner: 0.84, bright: 4 });
  // a curve of light, the area beneath it hatched in light
  const f = (x) => cy + 12 - 16 * Math.exp(-((x - cx - 4) ** 2) / 120);
  const g = new Glow(W, H);
  for (let x = cx - 16; x <= cx + 20; x += 3) g.path([[x, cy + 13], [x, f(x) + 2]], ARC, [0.5], [3]);
  const pts = []; for (let x = cx - 24; x <= cx + 26; x += 1) pts.push([x, f(x)]);
  g.path(pts, ARC, [0.6, 1.3, 2.1], [6, 5, 4]);
  g.path([[cx - 24, cy + 13], [cx + 25, cy + 13]], ARC, [0.5, 1.1], [5, 3]);
  // the integral sign, drawn tall in gold light
  const x0 = cx - 13, y0 = cy - 19;
  g.path([[x0 + 5, y0 + 3], [x0 + 4.5, y0 + 0.5], [x0 + 2.5, y0 - 0.5], [x0 + 0.5, y0 + 1], [x0 - 0.5, y0 + 5], [x0 - 4.5, y0 + 31], [x0 - 5.5, y0 + 34.5], [x0 - 7.5, y0 + 35.5], [x0 - 9.5, y0 + 34.5], [x0 - 10, y0 + 32]], AUR, [0.7, 1.4, 2.2, 3], [6, 5, 4, 3]);
  g.draw(s);
  // dx and f(x) written in light
  const gl = { d: ['..X', '..X', '.XX', 'X.X', '.XX'], x: ['...', 'X.X', '.X.', 'X.X', '...'], f: ['.XX', '.X.', 'XXX', '.X.', '.X.'] };
  let px = cx + 14; for (const ch of 'dx') { s.grid(gl[ch], { X: AUR[6] }, px, cy + 16); px += 4; }
  s.grid(gl.f, { X: ARC[6] }, cx + 18, cy - 14);
  for (const [x, y] of [[cx - 6, cy - 18], [cx + 22, cy - 4], [cx - 2, cy + 20]]) mote(s, x, y, AUR);
  return anchor(s, cx, cy, { float: true });
}

export function thermo() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 29;
  runeCircle(s, cx, cy, 27, 27, VIO, { glyphs: 10, seed: 31, inner: 0.84, bright: 4 });
  // fire and frost chasing each other around a hot core: entropy's wheel
  const g = new Glow(W, H);
  g.path(spiral(cx, cy, 2, 20, 0, 0.9, 1), EMB, [0.8, 1.6, 2.5, 3.3], [6, 5, 4, 3]);
  g.path(spiral(cx, cy, 2, 20, Math.PI, 0.9, 1), ARC, [0.8, 1.6, 2.5, 3.3], [6, 5, 4, 3]);
  g.path(spiral(cx, cy, 5, 14, 0.8, 0.6, 1), EMB, [0.5, 1.1], [4, 3]);
  g.path(spiral(cx, cy, 5, 14, Math.PI + 0.8, 0.6, 1), ARC, [0.5, 1.1], [4, 3]);
  g.orb(cx, cy, 4, AUR);
  g.draw(s);
  // sparks flung off the fire arm, snow motes off the frost arm
  for (const [x, y] of [[cx + 22, cy - 12], [cx + 25, cy - 4], [cx + 18, cy - 20]]) { s.px(x, y, EMB[6]); s.px(x, y + 1, EMB[4]); }
  for (const [x, y] of [[cx - 22, cy + 12], [cx - 25, cy + 4], [cx - 18, cy + 20]]) mote(s, x, y, ARC);
  return anchor(s, cx, cy, { float: true });
}

export function orbitSigil() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 29;
  const g = new Glow(W, H);
  const rings = [[18, 7, -0.25, ARC], [30, 10, 0.18, VIO], [42, 13, -0.08, AUR]];
  const pt = (rx, ry, tilt, a) => { const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]; };
  for (const [rx, ry, tl, R] of rings) { const pts = []; for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.04) pts.push(pt(rx, ry, tl, a)); g.path(pts, R, [0.5, 1.1], [5, 3]); }
  g.orb(cx, cy, 8, AUR, [0.4, 0.62, 0.82, 1, 1.2], [6, 5, 4, 3, 2]);
  g.draw(s);
  // planets riding the rings: little lit spheres with a glow rim
  const planet = (x, y, r, R) => { const t = new Spr(W, H); const G = new Glow(W, H); G.orb(x, y, r + 2, R, [1], [2]); G.draw(t); for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i + 0.5, j + 0.5) / r; if (d <= 1) { const l = -(i + 0.5) * 0.6 - (j + 0.5) * 0.7; t.px(x + i, y + j, R[l > r * 0.55 ? 6 : l > 0 ? 5 : l > -r * 0.5 ? 4 : 3]); } } t.draw(s); };
  const [ax, ay] = pt(18, 7, -0.25, 0.9); planet(Math.round(ax), Math.round(ay), 3, ARC);
  const [bx, by] = pt(30, 10, 0.18, 2.5); planet(Math.round(bx), Math.round(by), 4, VIO);
  const [dx, dy] = pt(42, 13, -0.08, -1.1); planet(Math.round(dx), Math.round(dy), 4, ARC);
  const [ex, ey] = pt(42, 13, -0.08, 1.9); planet(Math.round(ex), Math.round(ey), 3, AUR);
  s.grid(['WW', 'W.'], { W: '#ffffff' }, cx - 4, cy - 5);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; s.px(Math.round(cx + Math.cos(a) * 11), Math.round(cy + Math.sin(a) * 11), AUR[5]); }
  return anchor(s, cx, cy, { float: true });
}

// a black hole: a lightless disc ringed by a photon ring, an accretion disc wrapping over and under it
export function blackHole() {
  const W = 100, H = 58; const s = new Spr(W, H); const cx = 50, cy = 29;
  const g = new Glow(W, H);
  g.path(arc(cx, cy, 40, 9, Math.PI, Math.PI * 2), EMB, [0.7, 1.5, 2.4, 3.3], [5, 4, 3, 2]);
  g.path(arc(cx, cy - 2, 15, 14, Math.PI * 1.05, Math.PI * 1.95), AUR, [0.6, 1.3, 2.1], [6, 5, 3]);
  g.orb(cx, cy, 14, VIO, [1.05, 1.2], [4, 2]);
  g.draw(s);
  s.fill(ell(cx, cy, 12.5, 12.5), K.night[0]);
  const f = new Glow(W, H); f.path(arc(cx, cy, 40, 9, 0, Math.PI), EMB, [0.8, 1.6, 2.5, 3.4], [6, 5, 4, 3]); f.path(arc(cx, cy + 1, 26, 5, 0.15, Math.PI - 0.15), AUR, [0.5, 1.1], [6, 4]); f.draw(s);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s.px(Math.round(cx + Math.cos(a) * 13.5), Math.round(cy + Math.sin(a) * 13.5), AUR[6]); }
  const r = rng(12); for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 20; mote(s, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55, i % 2 ? VIO : AUR, i < 2); }
  return anchor(s, cx, cy, { float: true });
}

// law cards drawn as magic (no hands): force, rotation and their mutants
export const MAGIC = {
  force: () => forceBolt(), brute_force: () => forceBolt({ brute: true }),
  rotation: () => vortex(), torque: () => vortex({ twist: true }),
  momentum: () => snowballOrb(),
};
