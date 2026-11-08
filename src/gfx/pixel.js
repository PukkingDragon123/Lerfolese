// PixelCanvas: a tiny pixel-art painter (palette ramps, Bayer dithering, shaded primitives, outlines, crisp text).
// Everything visual in the game (cards, textures, icons, particles) is painted with this at low resolution
// and scaled up with nearest-neighbour filtering.
import { hexToRgb, mulberry32 } from '../core/util.js';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

const colCache = new Map();
export function packColor(c) {
  if (typeof c === 'number') return c;
  if (c == null || c === 'transparent') return 0;
  let v = colCache.get(c);
  if (v === undefined) {
    let a = 255; let hex = c;
    if (c.length === 9) { a = parseInt(c.slice(7, 9), 16); hex = c.slice(0, 7); }
    const [r, g, b] = hexToRgb(hex);
    v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; // little-endian RGBA in Uint32
    colCache.set(c, v);
  }
  return v;
}

// value noise for textures
export function makeNoise(seed = 1) {
  const rnd = mulberry32(seed); const P = new Float32Array(512);
  for (let i = 0; i < 512; i++) P[i] = rnd();
  const h = (x, y) => P[((x & 255) + ((y & 255) * 57)) & 511];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  n.fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; } return s / norm; };
  return n;
}

export class PixelCanvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.img = this.ctx.createImageData(w, h);
    this.data = new Uint32Array(this.img.data.buffer);
    this.dirty = false;
  }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.inb(x, y) ? this.data[y * this.w + x] : 0; }
  alpha(x, y) { return this.get(x, y) >>> 24; }
  px(x, y, c) { x |= 0; y |= 0; if (!this.inb(x, y)) return; const v = packColor(c); if ((v >>> 24) === 0) return; this.data[y * this.w + x] = v; }
  erase(x, y) { if (this.inb(x | 0, y | 0)) this.data[(y | 0) * this.w + (x | 0)] = 0; }
  clear(c = 0) { this.data.fill(packColor(c)); return this; }
  fillRect(x, y, w, h, c) { const v = packColor(c); for (let j = Math.max(0, y | 0); j < Math.min(this.h, (y + h) | 0); j++) for (let i = Math.max(0, x | 0); i < Math.min(this.w, (x + w) | 0); i++) this.data[j * this.w + i] = v; return this; }
  rect(x, y, w, h, c) { this.line(x, y, x + w - 1, y, c); this.line(x, y + h - 1, x + w - 1, y + h - 1, c); this.line(x, y, x, y + h - 1, c); this.line(x + w - 1, y, x + w - 1, y + h - 1, c); return this; }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  thickLine(x0, y0, x1, y1, t, c) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; this.disc(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, t / 2, c); } return this; }
  disc(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.px(x, y, c);
    }
    return this;
  }
  // shaded ellipsoid: ramp dark->light, light direction (lx,ly), dithered between bands
  ball(cx, cy, rx, ry, ramp, { lx = -0.55, ly = -0.65, rim = true, spec = true, ditherAmt = 1 } = {}) {
    const n = ramp.length; const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; const d2 = dx * dx + dy * dy; if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      let l = dx * lx + dy * ly + nz * lz; l = l * 0.5 + 0.5;
      if (rim && d2 > 0.72 && dx * lx + dy * ly < -0.2) l += 0.12; // bounce light
      let f = l * (n - 1) + (bayer(x, y) - 0.5) * ditherAmt;
      let i = Math.max(0, Math.min(n - 1, Math.round(f)));
      if (spec && l > 0.97) i = n - 1;
      this.px(x, y, ramp[i]);
    }
    return this;
  }
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity; for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = []; const yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
    return this;
  }
  // vertical (dir='v') or horizontal dithered gradient across a ramp
  gradient(x, y, w, h, ramp, dir = 'v', ditherAmt = 1) {
    const n = ramp.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = dir === 'v' ? j / Math.max(1, h - 1) : i / Math.max(1, w - 1);
      const f = t * (n - 1) + (bayer(x + i, y + j) - 0.5) * ditherAmt;
      this.px(x + i, y + j, ramp[Math.max(0, Math.min(n - 1, Math.round(f)))]);
    }
    return this;
  }
  // map a scalar field (0..1) onto a ramp with dithering
  field(x, y, w, h, fn, ramp, ditherAmt = 1, mask) {
    const n = ramp.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (mask && !mask(x + i, y + j)) continue;
      const v = fn(i, j); if (v == null) continue;
      const f = v * (n - 1) + (bayer(x + i, y + j) - 0.5) * ditherAmt;
      this.px(x + i, y + j, ramp[Math.max(0, Math.min(n - 1, Math.round(f)))]);
    }
    return this;
  }
  // outer 1px outline around opaque pixels (optionally only below/right for a drop-line look)
  outline(c, { diagonal = false, inside = false } = {}) {
    const v = packColor(c); const src = this.data.slice(); const W = this.w, H = this.h;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (src[y * W + x] >>> 24) > 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (inside) {
        if (op(x, y) && (!op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1))) this.data[y * W + x] = v;
      } else if (!op(x, y)) {
        let edge = op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1);
        if (!edge && diagonal) edge = op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1);
        if (edge) this.data[y * W + x] = v;
      }
    }
    return this;
  }
  // darken edge pixels on the shadow side to add volume ("selective outline")
  shadeEdges(darkMap, lx = -1, ly = -1) {
    const src = this.data.slice(); const W = this.w, H = this.h;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (src[y * W + x] >>> 24) > 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      if (!op(x - lx, y) || !op(x, y - ly)) { const d = darkMap(src[y * W + x]); if (d != null) this.data[y * W + x] = packColor(d); }
    }
    return this;
  }
  blit(pc, x, y, { flipX = false, alphaMin = 1 } = {}) {
    for (let j = 0; j < pc.h; j++) for (let i = 0; i < pc.w; i++) {
      const v = pc.data[j * pc.w + (flipX ? pc.w - 1 - i : i)]; if ((v >>> 24) < alphaMin) continue;
      const X = x + i, Y = y + j; if (this.inb(X, Y)) this.data[Y * this.w + X] = v;
    }
    return this;
  }
  // replace colors via map {fromHex: toHex}
  recolor(map) { const m = new Map(); for (const k in map) m.set(packColor(k), packColor(map[k])); for (let i = 0; i < this.data.length; i++) { const r = m.get(this.data[i]); if (r !== undefined) this.data[i] = r; } return this; }
  // crisp text: renders with the browser at native size, thresholds alpha, paints in color
  text(str, x, y, { font = 'Silkscreen', size = 8, color = '#1a1220', align = 'left', weight = 400, thresh = 110, shadow, outline, maxW } = {}) {
    const tmp = PixelCanvas._tmp || (PixelCanvas._tmp = document.createElement('canvas'));
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.font = `${weight} ${size}px "${font}"`;
    let w = Math.ceil(tctx.measureText(str).width) + 2; const h = Math.ceil(size * 1.5) + 2;
    tmp.width = Math.max(1, w); tmp.height = h;
    tctx.font = `${weight} ${size}px "${font}"`; tctx.textBaseline = 'top'; tctx.fillStyle = '#fff'; tctx.fillText(str, 1, 1);
    const id = tctx.getImageData(0, 0, tmp.width, h).data;
    let ox = x; if (align === 'center') ox = Math.round(x - (w - 2) / 2); else if (align === 'right') ox = Math.round(x - (w - 2));
    const pts = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < tmp.width; i++) if (id[(j * tmp.width + i) * 4 + 3] >= thresh) pts.push([ox + i - 1, y + j - 1]);
    if (shadow) for (const [a, b] of pts) this.px(a + 1, b + 1, shadow);
    if (outline) for (const [a, b] of pts) { this.px(a - 1, b, outline); this.px(a + 1, b, outline); this.px(a, b - 1, outline); this.px(a, b + 1, outline); }
    for (const [a, b] of pts) this.px(a, b, color);
    return w - 2;
  }
  static measure(str, font = 'Silkscreen', size = 8, weight = 400) {
    const tmp = PixelCanvas._tmp || (PixelCanvas._tmp = document.createElement('canvas'));
    const c = tmp.getContext('2d'); c.font = `${weight} ${size}px "${font}"`; return Math.ceil(c.measureText(str).width);
  }
  commit() { this.ctx.putImageData(this.img, 0, 0); return this.canvas; }
  // upscale (nearest) into a new canvas
  scaled(s) {
    this.commit(); const c = document.createElement('canvas'); c.width = this.w * s; c.height = this.h * s;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(this.canvas, 0, 0, c.width, c.height); return c;
  }
}

// wrap text into lines that fit maxW pixels
export function wrapText(str, maxW, font = 'Silkscreen', size = 8, weight = 400) {
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    if (w === '\n') { lines.push(cur); cur = ''; continue; }
    const t = cur ? cur + ' ' + w : w;
    if (PixelCanvas.measure(t, font, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// string-grid sprites: rows of chars mapped through a palette object
export function gridSprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const ch = rows[y][x]; if (pal[ch]) pc.px(x, y, pal[ch]); }
  return pc;
}
