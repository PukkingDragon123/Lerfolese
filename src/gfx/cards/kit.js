// Card-art pixel kit. Every illustration is a small palette-indexed sprite built from designed shapes:
// silhouettes are polygons / ellipses placed by hand, light comes from the top-left in hard bands
// (no gradients, no dithering), outlines are darker tints of the local colour, and orphan pixels are
// cleaned before hand-placed details (glints, speckles, grain) go on top.

// ---------- colour helpers ----------
const RAMP_OF = new Map(); // colour -> [ramp, index]
export function ramp(...cols) { cols.forEach((c, i) => { if (!RAMP_OF.has(c)) RAMP_OF.set(c, [cols, i]); }); return cols; }
export const rampOf = (c) => RAMP_OF.get(c);
// one step darker / lighter within the colour's ramp
export function dk(c, n = 1) { const r = RAMP_OF.get(c); if (!r) return c; return r[0][Math.max(0, r[1] - n)]; }
export function lt(c, n = 1) { const r = RAMP_OF.get(c); if (!r) return c; return r[0][Math.min(r[0].length - 1, r[1] + n)]; }

// ---------- shape tests (pixel centres) ----------
export const ell = (cx, cy, rx, ry = rx) => (x, y) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; };
export const box = (x0, y0, w, h) => (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h;
export function poly(pts) {
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5; let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
}
export const and = (...f) => (x, y) => f.every((g) => g(x, y));
export const or = (...f) => (x, y) => f.some((g) => g(x, y));
export const not = (f) => (x, y) => !f(x, y);
export const half = (nx, ny, c) => (x, y) => (x + 0.5) * nx + (y + 0.5) * ny < c; // half-plane
// thick segment
export const seg = (x0, y0, x1, y1, r) => (x, y) => {
  const px = x + 0.5, py = y + 0.5, dx = x1 - x0, dy = y1 - y0; const L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L)); const ex = x0 + dx * t - px, ey = y0 + dy * t - py;
  return ex * ex + ey * ey <= r * r;
};

// ---------- sprite ----------
export class Spr {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return this.ok(x, y) ? this.d[y * this.w + x] : null; }
  px(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c && this.ok(x, y)) this.d[y * this.w + x] = c; return this; }
  del(x, y) { x = Math.floor(x); y = Math.floor(y); if (this.ok(x, y)) this.d[y * this.w + x] = null; return this; }
  // paint every pixel passing test; c = colour or (x, y, old) => colour
  fill(test, c) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x, y)) { const v = typeof c === 'function' ? c(x, y, this.d[y * this.w + x]) : c; if (v) this.d[y * this.w + x] = v; }
    return this;
  }
  // paint only over pixels that are already opaque (clip to the current silhouette)
  over(test, c) { return this.fill((x, y) => this.d[y * this.w + x] && test(x, y), c); }
  // recolour existing pixels of colour `from` (string or array) inside test
  swap(test, map) { for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; if (v && map[v] !== undefined && test(i % this.w, (i / this.w) | 0)) this.d[i] = map[v]; } return this; }
  rect(x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, c); return this; }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.px(x0, y0, typeof c === 'function' ? c(x0, y0) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  // stamp a string grid; pal maps chars to colours (missing / '.' / ' ' = transparent)
  grid(rows, pal, ox = 0, oy = 0, flip = false) {
    const w = Math.max(...rows.map((r) => r.length));
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const c = pal[rows[y][x]]; if (c) this.px(ox + (flip ? w - 1 - x : x), oy + y, c); }
    return this;
  }
  mask() { const m = this.d.map((v) => !!v); const w = this.w, h = this.h; return (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x]; }
  copy() { const s = new Spr(this.w, this.h); s.d = this.d.slice(); return s; }
  // tinted outline: each transparent pixel touching the sprite takes a dark tint of its neighbour.
  // lit sides (top/left) get the softer ramp[1] tint, shadow sides ramp[0]; `col` forces one colour.
  outline({ col = null, soft = true, diag = false, only = null } = {}) {
    const src = this.d.slice(), W = this.w, H = this.h; const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? src[y * W + x] : null);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      const shadowN = at(x, y - 1) || at(x - 1, y), litN = at(x, y + 1) || at(x + 1, y);
      let n = shadowN || litN; const litSide = !shadowN && !!litN;
      if (!n && diag) n = at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1);
      if (!n) continue; if (only && !only(x, y)) continue;
      let c = col; if (!c) { const r = RAMP_OF.get(n); c = r ? r[0][soft && litSide ? 1 : 0] : '#1a0c14'; }
      this.d[y * W + x] = c;
    }
    return this;
  }
  // inner outline: darken the sprite's own edge pixels (used on top of an outer outline for weight)
  innerEdge(test = () => true, steps = 1) {
    const src = this.d.slice(), W = this.w, H = this.h; const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src[y * W + x] && test(x, y) && (!op(x + 1, y) || !op(x, y + 1))) this.d[y * W + x] = dk(src[y * W + x], steps);
    return this;
  }
  // remove orphan pixels: a pixel with no same-coloured 4-neighbour takes its most common neighbour colour
  clean(test = () => true, passes = 1) {
    const W = this.w, H = this.h;
    for (let p = 0; p < passes; p++) {
      const src = this.d.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = src[y * W + x]; if (!c || !test(x, y)) continue;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (x + a >= 0 && y + b >= 0 && x + a < W && y + b < H ? src[(y + b) * W + x + a] : null));
        if (nb.some((v) => v === c)) continue;
        const cnt = {}; let best = null, bn = 0;
        for (const v of nb) if (v) { cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > bn) { bn = cnt[v]; best = v; } }
        if (best && nb.filter(Boolean).length >= 3) this.d[y * W + x] = best;
      }
    }
    return this;
  }
  flipX() { const s = new Spr(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) s.d[y * this.w + x] = this.d[y * this.w + this.w - 1 - x]; return s; }
  // draw into another Spr (or anything with px) at an offset
  draw(dst, ox = 0, oy = 0, map = null) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { let c = this.d[y * this.w + x]; if (c) { if (map) c = map(c, x, y); if (c) dst.px(ox + x, oy + y, c); } } return dst; }
  bounds() { let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; }
}

// ---------- light ----------
const LV = (() => { const v = [-0.62, -0.72, 0.62]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
// tone from a lambert term using thresholds (ascending), returns 0..thr.length
const band = (l, thr) => { let i = 0; while (i < thr.length && l >= thr[i]) i++; return i; };

// shade an ellipsoid-ish volume inside `test` with ramp tones r[lo..hi]; thresholds tuned for crisp crescents.
// rim: reflected light on the shadow-side rim; returns the Spr.
export function orb(s, test, cx, cy, rx, ry, r, { lo = 1, hi = 5, thr = null, rim = true, squash = 1, light = LV } = {}) {
  const n = hi - lo; const T = thr || [[], [0], [-0.05, 0.6], [-0.1, 0.35, 0.75], [-0.2, 0.2, 0.55, 0.82], [-0.3, 0.05, 0.38, 0.66, 0.87]][n] || [-0.2, 0.2, 0.55, 0.82];
  s.fill((x, y) => test(x, y), (x, y) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; const d2 = Math.min(1, dx * dx + dy * dy); const nz = Math.sqrt(1 - d2) * squash;
    const L = Math.hypot(dx, dy, nz) || 1; const l = (dx * light[0] + dy * light[1] + nz * light[2]) / L;
    let t = lo + band(l, T);
    if (rim && d2 > 0.8 && dx * light[0] + dy * light[1] < -0.55 && t <= lo + 1) t = lo + 1;
    return r[Math.min(hi, t)];
  });
  return s;
}

// height-field volume for arbitrary silhouettes: edges round over `round` px, plateau stays flat.
export function vol(s, test, r, { lo = 1, hi = 5, round = 6, thr = null, smooth = 2, rim = true, bias = 0, light = LV } = {}) {
  const W = s.w, H = s.h; const inside = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) inside[y * W + x] = test(x, y) ? 1 : 0;
  const edge = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inside[y * W + x]) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < W && Y < H && inside[Y * W + X]; }); if (nb) edge.push([x + 0.5, y + 0.5]); }
  // also treat the sprite border as outside
  for (let x = -1; x <= W; x++) { edge.push([x + 0.5, -0.5]); edge.push([x + 0.5, H + 0.5]); } for (let y = 0; y < H; y++) { edge.push([-0.5, y + 0.5]); edge.push([W + 0.5, y + 0.5]); }
  let h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside[y * W + x]) {
    let m = 1e9; for (const [ex, ey] of edge) { const d = (ex - x - 0.5) ** 2 + (ey - y - 0.5) ** 2; if (d < m) m = d; }
    const d = Math.sqrt(m); const t = Math.min(1, d / round); h[y * W + x] = round * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  for (let k = 0; k < smooth; k++) { const o = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0, c = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < W && Y < H) { a += h[Y * W + X]; c++; } } o[y * W + x] = inside[y * W + x] ? a / c : 0; } h = o; }
  const n = hi - lo; const T = thr || [[], [0.2], [0.15, 0.75], [0.1, 0.5, 0.85], [-0.05, 0.35, 0.65, 0.9], [-0.2, 0.15, 0.45, 0.72, 0.92]][n];
  const H0 = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? h[y * W + x] : 0);
  s.fill((x, y) => inside[y * W + x], (x, y) => {
    const gx = (H0(x + 1, y) - H0(x - 1, y)) / 2, gy = (H0(x, y + 1) - H0(x, y - 1)) / 2; const nx = -gx, ny = -gy, nz = 1; const L = Math.hypot(nx, ny, nz);
    const l = (nx * light[0] + ny * light[1] + nz * light[2]) / L + bias;
    let t = lo + band(l, T);
    if (rim && (nx * light[0] + ny * light[1]) / L < -0.45 && h[y * W + x] < 1.2 && t <= lo + 1) t = lo + 1;
    return r[Math.min(hi, t)];
  });
  return s;
}

// flat-shaded facet: polygon in a single tone
export const facet = (s, pts, c) => s.fill(poly(pts), c);

// cylinder banding across x (vertical cylinder) or y; table of tone indices from the lit edge to the dark edge
export function cylX(s, test, x0, x1, r, table = [2, 4, 5, 4, 3, 3, 2, 2, 1]) {
  return s.fill(test, (x) => { const u = (x + 0.5 - x0) / Math.max(1, x1 - x0); return r[table[Math.max(0, Math.min(table.length - 1, Math.floor(u * table.length)))]]; });
}
export function cylY(s, test, y0, y1, r, table = [2, 4, 5, 4, 3, 3, 2, 2, 1]) {
  return s.fill(test, (x, y) => { const u = (y + 0.5 - y0) / Math.max(1, y1 - y0); return r[table[Math.max(0, Math.min(table.length - 1, Math.floor(u * table.length)))]]; });
}

// small hand-made glints
export const GLINT = {
  dot: ['w'],
  small: ['.w.', 'www', '.w.'],
  star: ['..w..', '..w..', 'wwWww', '..w..', '..w..'],
  big: ['...w...', '...w...', '..wWw..', 'wwWWWww', '..wWw..', '...w...', '...w...'],
  diag: ['w...w', '.w.w.', '..W..', '.w.w.', 'w...w'],
};
export function glint(s, kind, cx, cy, c1, c2 = c1) { const g = GLINT[kind]; const h = g.length, w = g[0].length; s.grid(g, { w: c1, W: c2 }, Math.round(cx - (w - 1) / 2), Math.round(cy - (h - 1) / 2)); return s; }

// copy a Spr into an RGBA canvas scaled by an integer factor (nearest)
const packCache = new Map();
function pack(c) {
  let v = packCache.get(c); if (v !== undefined) return v;
  let a = 255, h = c; if (c.length === 9) { a = parseInt(c.slice(7, 9), 16); h = c.slice(0, 7); }
  const n = parseInt(h.slice(1), 16); v = ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0; packCache.set(c, v); return v;
}
export function toCanvas(s, scale = 1) {
  const c = document.createElement('canvas'); c.width = s.w * scale; c.height = s.h * scale; const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height); const d = new Uint32Array(img.data.buffer);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.d[y * s.w + x]; if (!v) continue; const p = pack(v); for (let j = 0; j < scale; j++) { const row = (y * scale + j) * c.width + x * scale; for (let i = 0; i < scale; i++) d[row + i] = p; } }
  g.putImageData(img, 0, 0); return c;
}

// deterministic tiny PRNG for placing texture details reproducibly
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// bevelled plate: polygon whose rim (width px) takes a tone by the edge's facing (lit edges light, far edges dark)
export function bevel(s, pts, R, { width = 2, face = 3, litT = 5, darkT = 1, sideT = 4, sideD = 2, light = [-0.62, -0.72] } = {}) {
  const inside = poly(pts); const E = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; const dx = q[0] - p[0], dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1; return { p, q, nx: dy / L, ny: -dx / L }; });
  // orientation: make normals point outward
  let area = 0; for (const e of E) area += e.p[0] * e.q[1] - e.q[0] * e.p[1]; const sg = area > 0 ? -1 : 1;
  const lL = Math.hypot(light[0], light[1]); const lx = light[0] / lL, ly = light[1] / lL;
  return s.fill(inside, (x, y) => {
    const px = x + 0.5, py = y + 0.5; let best = 1e9, be = null;
    for (const e of E) { const dx = e.q[0] - e.p[0], dy = e.q[1] - e.p[1]; const L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - e.p[0]) * dx + (py - e.p[1]) * dy) / L2)); const d = Math.hypot(e.p[0] + dx * t - px, e.p[1] + dy * t - py); if (d < best) { best = d; be = e; } }
    if (best >= width) return R[face];
    const f = (be.nx * sg) * lx + (be.ny * sg) * ly;
    return R[f > 0.5 ? litT : f > 0 ? sideT : f > -0.5 ? sideD : darkT];
  });
}

// a shaded rod (thick segment) banded across its width, lit side toward the light
export function rod(s, x0, y0, x1, y1, r, R, table = [5, 4, 4, 3, 3, 2, 1], light = [-0.62, -0.72]) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L; if (nx * light[0] + ny * light[1] < 0) { nx = -nx; ny = -ny; }
  return s.fill(seg(x0, y0, x1, y1, r), (x, y) => {
    const px = x + 0.5 - x0, py = y + 0.5 - y0; const off = px * nx + py * ny; const u = (r - off) / (2 * r);
    return R[table[Math.max(0, Math.min(table.length - 1, Math.floor(u * table.length)))]];
  });
}

// draw a part on its own layer (outlined separately) and composite it
export function layer(s, draw, outline = {}) { const t = new Spr(s.w, s.h); draw(t); if (outline) t.outline(outline); t.draw(s, 0, 0); return t; }

// 3x5 glyphs for engraved / chalked lettering
export const GLYPH = {
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'], '2': ['XX.', '..X', '.X.', 'X..', 'XXX'], K: ['X.X', 'XX.', 'XX.', 'X.X', 'X.X'], G: ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'], d: ['..X', '..X', '.XX', 'X.X', '.XX'], x: ['...', 'X.X', '.X.', 'X.X', '...'], f: ['.XX', '.X.', 'XXX', '.X.', '.X.'],
  '(': ['.X', 'X.', 'X.', 'X.', '.X'], ')': ['X.', '.X', '.X', '.X', 'X.'], '=': ['...', 'XXX', '...', 'XXX', '...'], m: ['...', 'XX.', 'XXX', 'X.X', 'X.X'], a: ['...', 'XX.', '.XX', 'X.X', 'XXX'], F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
};
// raised (embossed) or flat lettering
export function letters(s, str, x, y, c, { hi = null, lo = null } = {}) {
  let cx = x;
  for (const ch of str) {
    const g = GLYPH[ch]; if (!g) { cx += 2; continue; }
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === 'X') {
      if (lo) { if (g[j + 1]?.[i] !== 'X') s.px(cx + i, y + j + 1, lo); if (g[j][i + 1] !== 'X') s.px(cx + i + 1, y + j, lo); }
    }
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === 'X') s.px(cx + i, y + j, hi && (g[j - 1]?.[i] !== 'X' || g[j][i - 1] !== 'X') ? hi : c);
    cx += g[0].length + 1;
  }
  return cx;
}
