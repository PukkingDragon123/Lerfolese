// Art core: a tiny deferred pixel painter used by every hand-built sprite.
// Shapes are rasterised as "parts" carrying a material (hue-shifted ramp), a surface normal and a texture offset.
// render() lights everything from ONE key light (top-left, slightly in front), posterises into clean bands,
// adds cast/contact shadows and internal contour lines where a front part overlaps a back part,
// removes orphan pixels, and finishes with a selective (sel-out) outline. Details are then painted by hand.
import { PixelCanvas, packColor, bayer } from '../pixel.js';

// ------------------------------------------------------------------ math / colour
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function norm3(x, y, z) { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
export const LIGHT = norm3(-0.6, -0.72, 0.42); // key light: top-left, in front (screen y points down)
const BOUNCE = norm3(0.45, 0.85, 0.15); // warm reflected light from the ground (lower right)

export function hexRgb(h) { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgbHex(r, g, b) { const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
export function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
export function rgbHsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
export function hsvHex(h, s, v) { h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); v = clamp(v, 0, 1); const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255); }
// rotate hue toward a target by up to `deg`
function hueToward(h, target, deg) { let d = ((target - h + 540) % 360) - 180; if (Math.abs(d) < deg) return target; return h + Math.sign(d) * deg; }
// Hue-shifted ramp around a mid colour (Slynyrd): lights rotate toward yellow, shadows toward blue-violet,
// saturation peaks mid-ramp, value rises with shrinking steps toward the top.
export function ramp(mid, n = 6, { hue = 14, lo = 0.16, hi = 0.97, satLo = 0.88, satHi = 0.55, warm = 58, cool = 255 } = {}) {
  const [h0, s0, v0] = rgbHsv(...hexRgb(mid)); const m = Math.round((n - 1) * 0.55); const out = [];
  for (let i = 0; i < n; i++) {
    const k = i - m;
    const h = k > 0 ? hueToward(h0, warm, hue * k) : hueToward(h0, cool, hue * -k);
    const t = k > 0 ? k / (n - 1 - m) : m ? k / m : 0; // -1..1
    const v = t > 0 ? lerp(v0, hi, 1 - Math.pow(1 - t, 1.6)) : lerp(v0, lo, -t);
    const s = t > 0 ? s0 * lerp(1, satHi, t) : s0 * lerp(1, satLo, -t) + (t < 0 ? 0.06 * -t : 0);
    out.push(hsvHex(h, s, v));
  }
  return out;
}
export const darken = (hex, k = 0.25) => mix(hex, '#120a18', k);
export const lighten = (hex, k = 0.25) => mix(hex, '#fffbe8', k);

// deterministic hash noise
export function hash2(x, y, s = 0) { let h = (x | 0) * 374761393 + (y | 0) * 668265263 + s * 2147483647; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967296; }
export function vnoise(x, y, s = 0) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function fbm(x, y, s = 0, oct = 3) { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2; } return t / n; }

// ------------------------------------------------------------------ masks (functions of pixel-centre coords with a bounding box)
const bb = (f, x0, y0, x1, y1) => { f.bb = [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1]; return f; };
export const M = {
  ellipse(cx, cy, rx, ry, rot = 0) { const c = Math.cos(rot), s = Math.sin(rot); const r = Math.max(rx, ry); return bb((x, y) => { const dx = x - cx, dy = y - cy; const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return u * u + v * v <= 1; }, cx - r, cy - r, cx + r, cy + r); },
  // superellipse: p=2 ellipse, p>2 squarer (rounded rectangle-ish)
  superellipse(cx, cy, rx, ry, p = 4) { return bb((x, y) => Math.pow(Math.abs((x - cx) / rx), p) + Math.pow(Math.abs((y - cy) / ry), p) <= 1, cx - rx, cy - ry, cx + rx, cy + ry); },
  rect(x0, y0, w, h) { return bb((x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h, x0, y0, x0 + w, y0 + h); },
  poly(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return bb((x, y) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }, x0, y0, x1, y1);
  },
  // tapered capsule from (x0,y0,r0) to (x1,y1,r1)
  capsule(x0, y0, x1, y1, r0, r1 = r0) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6; const R = Math.max(r0, r1);
    return bb((x, y) => { const t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1); const px = x0 + dx * t, py = y0 + dy * t; const r = lerp(r0, r1, t); return (x - px) ** 2 + (y - py) ** 2 <= r * r; }, Math.min(x0, x1) - R, Math.min(y0, y1) - R, Math.max(x0, x1) + R, Math.max(y0, y1) + R);
  },
  // thick polyline / curve through points with per-point radius [[x,y,r],...]
  stroke(pts) {
    const segs = []; for (let i = 0; i + 1 < pts.length; i++) segs.push(M.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2]));
    return M.union(...segs);
  },
  // cubic bezier sampled into a stroke
  bezier(p0, p1, p2, p3, r0, r1, n = 16) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]; const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]; pts.push([x, y, lerp(r0, r1, t)]); } return M.stroke(pts); },
  ring(cx, cy, r0, r1) { return bb((x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; }, cx - r1, cy - r1, cx + r1, cy + r1); },
  union(...ms) { const f = (x, y) => ms.some((m) => m(x, y)); let a = [Infinity, Infinity, -Infinity, -Infinity]; for (const m of ms) { const b = m.bb || [-1e4, -1e4, 1e4, 1e4]; a = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; } f.bb = a; return f; },
  sub(a, ...bs) { const f = (x, y) => a(x, y) && !bs.some((b) => b(x, y)); f.bb = a.bb; return f; },
  and(a, b) { const f = (x, y) => a(x, y) && b(x, y); f.bb = a.bb; return f; },
  fn(f, x0, y0, x1, y1) { return bb(f, x0, y0, x1, y1); },
  // half-plane helpers for cutting shapes
  above(y0) { return (x, y) => y < y0; }, below(y0) { return (x, y) => y >= y0; },
};

// ------------------------------------------------------------------ normals (screen space: +x right, +y down, +z toward viewer)
export const N = {
  flat(nx = 0, ny = 0, nz = 1) { const v = norm3(nx, ny, nz); return () => v; },
  sphere(cx, cy, rx, ry, k = 1) { return (x, y) => { let dx = (x - cx) / rx, dy = (y - cy) / ry; let d = dx * dx + dy * dy; if (d > 0.999) { const s = 0.9995 / Math.sqrt(d); dx *= s; dy *= s; d = 0.999; } return norm3(dx, dy, Math.sqrt(1 - d) * k); }; },
  cylV(cx, rx, tilt = 0) { return (x) => { const dx = clamp((x - cx) / rx, -0.999, 0.999); return norm3(dx, tilt, Math.sqrt(1 - dx * dx)); }; },
  cylH(cy, ry, tilt = 0) { return (x, y) => { const dy = clamp((y - cy) / ry, -0.999, 0.999); return norm3(tilt, dy, Math.sqrt(1 - dy * dy)); }; },
  // cylinder along an arbitrary axis (a->b), radius r
  cyl(ax, ay, bx, by, r) { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1; const px = -dy / L, py = dx / L; return (x, y) => { const s = clamp(((x - ax) * px + (y - ay) * py) / r, -0.999, 0.999); return norm3(px * s, py * s, Math.sqrt(1 - s * s)); }; },
  // torus ring around (cx,cy) with tube centred at radius rc and half-width hw
  torus(cx, cy, rc, hw, k = 1) { return (x, y) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; const t = clamp((d - rc) / hw, -0.999, 0.999); return norm3((dx / d) * t, (dy / d) * t, Math.sqrt(1 - t * t) * k); }; },
  cone(cx, top, bottom, rTop, rBot) { return (x, y) => { const t = clamp((y - top) / (bottom - top), 0, 1); const r = lerp(rTop, rBot, t) || 1; const dx = clamp((x - cx) / r, -0.999, 0.999); return norm3(dx, -(rBot - rTop) / (bottom - top) * 0.6, Math.sqrt(1 - dx * dx)); }; },
  tilt(nf, tx, ty) { return (x, y) => { const n = nf(x, y); return norm3(n[0] + tx, n[1] + ty, n[2]); }; },
  blend(a, b, t) { return (x, y) => { const p = a(x, y), q = b(x, y); return norm3(lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)); }; },
  bump(nf, hf, k = 1) { return (x, y) => { const n = nf(x, y); const gx = (hf(x + 0.5, y) - hf(x - 0.5, y)) * k, gy = (hf(x, y + 0.5) - hf(x, y - 0.5)) * k; return norm3(n[0] - gx, n[1] - gy, n[2]); }; },
};

// ------------------------------------------------------------------ materials
// m = { ramp:[dark..light], amb, dif, wrap, spec, pow, metal, bounce, ol (outline), olLit, dither }
export function mat(rampArr, o = {}) {
  return { ramp: rampArr, amb: 0.2, dif: 0.85, wrap: 0, spec: 0, pow: 18, metal: 0, bounce: 0.12, dither: 0, bias: 0, ol: o.ol || darken(rampArr[0], 0.35), olLit: o.olLit || rampArr[Math.min(1, rampArr.length - 1)], ...o };
}
function envLight(rx, ryUp, rz) { // studio environment for metals: bright sky/window upper-left, dark horizon band, warm floor
  const sky = smooth(-0.02, 0.55, ryUp), ground = smooth(0.0, -0.55, ryUp), hor = 1 - smooth(0.0, 0.3, Math.abs(ryUp));
  let v = 0.2 + sky * (0.5 - rx * 0.22) + ground * 0.26 - hor * 0.14 - rx * 0.12 * (1 - sky);
  const k = Math.max(0, rx * LIGHT[0] - ryUp * LIGHT[1] + rz * LIGHT[2]); v += Math.pow(k, 6) * 0.5; return v;
}

// ------------------------------------------------------------------ painter
export class Painter {
  constructor(w, h) {
    this.w = w; this.h = h; const n = w * h;
    this.pid = new Int16Array(n).fill(-1); this.mid = new Int16Array(n).fill(-1);
    this.nrm = new Float32Array(n * 3); this.tex = new Float32Array(n); this.fix = new Uint32Array(n);
    this.parts = []; this.mats = []; this.pc = new PixelCanvas(w, h);
  }
  _mat(m) { let i = this.mats.indexOf(m); if (i < 0) { i = this.mats.length; this.mats.push(m); } return i; }
  // add a part. mask(x,y) at pixel centres. o: { m: material | (x,y)=>material, n: normalFn | number (inflate radius),
  //   tex: (x,y)=>light offset, cast: shadow length px, contour: steps darker drawn on parts behind, shade: band offset,
  //   outline: bool, clip: only over existing pixels, under: only into empty pixels, fixed: (x,y)=>hex (unlit colour) }
  add(mask, o = {}) {
    const W = this.w, H = this.h; const id = this.parts.length;
    const part = { id, name: o.id || '', cast: o.cast ?? 0, contour: o.contour ?? 1, outline: o.outline !== false, shade: o.shade || 0, olw: o.olw ?? 1, noClean: !!o.noClean, clip: o.clip };
    this.parts.push(part);
    const b = mask.bb || [0, 0, W, H]; const x0 = Math.max(0, b[0]), y0 = Math.max(0, b[1]), x1 = Math.min(W, b[2]), y1 = Math.min(H, b[3]);
    const pix = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * W + x; if (o.clip && this.pid[i] < 0) continue; if (o.under && this.pid[i] >= 0) continue;
      if (o.clipTo && !o.clipTo.includes(this.parts[this.pid[i]]?.name)) continue;
      if (mask(x + 0.5, y + 0.5)) pix.push(i);
    }
    let nf = o.n;
    let inflate = null;
    if (nf == null || typeof nf === 'number') inflate = this._inflate(pix, x0, y0, x1, y1, nf == null ? 4 : nf);
    for (const i of pix) {
      const x = i % W, y = (i / W) | 0; const m = typeof o.m === 'function' ? o.m(x + 0.5, y + 0.5) : o.m;
      this.pid[i] = id; this.mid[i] = m ? this._mat(m) : -1; this.fix[i] = 0;
      if (o.fixed) { const c = o.fixed(x + 0.5, y + 0.5); this.fix[i] = c ? packColor(c) : 0; }
      const n = inflate ? inflate.get(i) : nf(x + 0.5, y + 0.5);
      this.nrm[i * 3] = n[0]; this.nrm[i * 3 + 1] = n[1]; this.nrm[i * 3 + 2] = n[2];
      this.tex[i] = o.tex ? o.tex(x + 0.5, y + 0.5) || 0 : 0;
    }
    part.count = pix.length; return part;
  }
  // rounded-edge normals for any silhouette: quarter-circle height profile of radius R from the edge
  _inflate(pix, x0, y0, x1, y1, R) {
    const W = this.w; const set = new Set(pix); const ins = (x, y) => set.has(y * W + x); const map = new Map();
    const Rc = Math.ceil(R) + 1; const hgt = new Map();
    const height = (x, y) => {
      const k = y * W + x; if (!ins(x, y)) return 0; let hv = hgt.get(k); if (hv !== undefined) return hv;
      let d = Rc + 1;
      for (let j = -Rc; j <= Rc; j++) for (let i = -Rc; i <= Rc; i++) { if (!ins(x + i, y + j)) { const dd = Math.hypot(i, j) - 0.5; if (dd < d) d = dd; } }
      const e = clamp(d / R, 0, 1); hv = R * Math.sqrt(Math.max(0, 1 - (1 - e) * (1 - e))); hgt.set(k, hv); return hv;
    };
    for (const i of pix) { const x = i % W, y = (i / W) | 0; const gx = (height(x + 1, y) - height(x - 1, y)) / 2, gy = (height(x, y + 1) - height(x, y - 1)) / 2; map.set(i, norm3(-gx, -gy, 1.1)); }
    return map;
  }
  partAt(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const p = this.pid[y * this.w + x]; return p >= 0 ? this.parts[p] : null; }
  // light, posterise, shadows, contours, clean-up, outline -> PixelCanvas
  render({ outline = true, clean = true, shadowSteps = 1 } = {}) {
    const W = this.w, H = this.h, n = W * H; const idx = new Int16Array(n).fill(-1); const L = LIGHT;
    for (let i = 0; i < n; i++) {
      const p = this.pid[i]; if (p < 0 || this.mid[i] < 0) continue; const m = this.mats[this.mid[i]]; const R = m.ramp.length;
      const nx = this.nrm[i * 3], ny = this.nrm[i * 3 + 1], nz = this.nrm[i * 3 + 2]; const ndl = nx * L[0] + ny * L[1] + nz * L[2];
      let f = m.wrap ? clamp((ndl + m.wrap) / (1 + m.wrap), 0, 1) : Math.max(0, ndl); let v = m.amb + m.dif * f;
      if (m.bounce && ndl < 0.3) v += m.bounce * Math.max(0, nx * BOUNCE[0] + ny * BOUNCE[1] + nz * BOUNCE[2]);
      if (m.metal) { const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1; v = lerp(v, envLight(rx, -ry, rz), m.metal); }
      v += this.tex[i];
      const x = i % W, y = (i / W) | 0;
      let k = v * (R - 1) + this.parts[p].shade + m.bias; if (m.dither) k += (bayer(x, y) - 0.5) * m.dither;
      let r = Math.round(k);
      if (m.spec) { const rz = 2 * ndl * nz - L[2]; const s = Math.pow(Math.max(0, rz), m.pow) * m.spec; if (s > 0.5) r = R - 1; else if (s > 0.25) r = Math.max(r, R - 2); }
      idx[i] = clamp(r, 0, R - 1);
    }
    // cast shadows: a pixel is shadowed when stepping toward the light hits a part in front of it that casts
    const steps = [[-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -3], [-3, -4], [-4, -5], [-5, -6]];
    const sh = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const p = this.pid[i]; if (p < 0) continue; const x = i % W, y = (i / W) | 0;
      for (let t = 0; t < steps.length; t++) { const X = x + steps[t][0], Y = y + steps[t][1]; if (X < 0 || Y < 0) break; const q = this.pid[Y * W + X]; if (q > p && this.parts[q].cast > t) { sh[i] = 1; break; } }
    }
    // contours: dark line on a back part along the edge of a part in front of it
    const ct = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const p = this.pid[i]; if (p < 0) continue; const x = i % W, y = (i / W) | 0; let c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = this.pid[Y * W + X]; if (q > p) c = Math.max(c, this.parts[q].contour); }
      ct[i] = c;
    }
    for (let i = 0; i < n; i++) if (idx[i] >= 0) idx[i] = Math.max(0, idx[i] - sh[i] * shadowSteps - ct[i]);
    // orphan clean-up (within a part): a pixel with no 8-neighbour of its own band joins the majority around it
    if (clean) for (let pass = 0; pass < 2; pass++) {
      const src = idx.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, p = this.pid[i]; if (p < 0 || src[i] < 0 || this.parts[p].noClean || ct[i] || this.fix[i]) continue; let same = 0, tot = 0; const cnt = {};
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { if (!j && !k) continue; const X = x + k, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (this.pid[q] !== p || this.mid[q] !== this.mid[i]) continue; tot++; if (src[q] === src[i]) same++; cnt[src[q]] = (cnt[src[q]] || 0) + 1; }
        if (same === 0 && tot >= 4) { let best = src[i], bc = 0; for (const v in cnt) if (cnt[v] > bc) { bc = cnt[v]; best = +v; } idx[i] = best; }
      }
    }
    const pc = this.pc; const D = pc.data;
    for (let i = 0; i < n; i++) { if (this.pid[i] < 0) continue; if (this.fix[i]) { D[i] = this.fix[i]; continue; } if (idx[i] < 0) continue; const m = this.mats[this.mid[i]]; D[i] = packColor(m.ramp[idx[i]]); }
    this.idx = idx;
    if (outline) this.outline();
    return pc;
  }
  // selective outline: darkest shade of the touching material; lighter on lit (top/left) edges
  outline() {
    const W = this.w, H = this.h, D = this.pc.data; const src = D.slice(); const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (src[i] >>> 24) continue; let col = null, lit = false, best = -1;
      for (const [dx, dy, l] of [[0, 1, 1], [1, 0, 1], [0, -1, 0], [-1, 0, 0]]) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; const p = this.pid[q]; if (p < 0 || !this.parts[p].outline || !(src[q] >>> 24)) continue;
        const m = this.mats[this.mid[q]]; if (!m) continue; const pr = l ? 1 : 2; if (pr > best) { best = pr; col = l ? m.olLit : m.ol; lit = !!l; }
      }
      if (col) add.push([i, col]);
    }
    for (const [i, c] of add) D[i] = packColor(c);
    return this;
  }
  // direct painting helpers (after render)
  px(x, y, c) { this.pc.px(x, y, c); }
}

// ------------------------------------------------------------------ hand-painting helpers
// stamp a palette-indexed string grid ('.' or ' ' = skip)
export function stamp(pc, x0, y0, rows, pal, { flipX = false } = {}) {
  for (let y = 0; y < rows.length; y++) { const r = rows[y]; for (let x = 0; x < r.length; x++) { const ch = r[flipX ? r.length - 1 - x : x]; const c = pal[ch]; if (c) pc.px(x0 + x, y0 + y, c); } }
}
// 4-point star glint
export function glint(pc, x, y, s = 1, core = '#ffffff', arm = '#fff6d8') { pc.px(x, y, core); for (let i = 1; i <= s; i++) { pc.px(x - i, y, arm); pc.px(x + i, y, arm); pc.px(x, y - i, arm); pc.px(x, y + i, arm); } }
// recolour existing opaque pixels in a mask by a function of their colour
export function tint(pc, mask, fn) { const b = mask.bb || [0, 0, pc.w, pc.h]; for (let y = Math.max(0, b[1]); y < Math.min(pc.h, b[3]); y++) for (let x = Math.max(0, b[0]); x < Math.min(pc.w, b[2]); x++) { if (!mask(x + 0.5, y + 0.5)) continue; const v = pc.data[y * pc.w + x]; if (!(v >>> 24)) continue; const hex = rgbHex(v & 255, (v >>> 8) & 255, (v >>> 16) & 255); const r = fn(hex, x, y); if (r) pc.px(x, y, r); } }
export function getHex(pc, x, y) { const v = pc.get(x, y); if (!(v >>> 24)) return null; return rgbHex(v & 255, (v >>> 8) & 255, (v >>> 16) & 255); }
// pixel-perfect line without doubles (Bresenham)
export function line(pc, x0, y0, x1, y1, c) { pc.line(x0, y0, x1, y1, c); }
// clean 1px arc
export function arc(pc, cx, cy, r, a0, a1, c, ry = r) { const n = Math.ceil(Math.abs(a1 - a0) * Math.max(r, ry) * 1.5) + 2; let lx = null, ly = null; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const x = Math.round(cx + Math.cos(a) * r - 0.5), y = Math.round(cy + Math.sin(a) * ry - 0.5); if (x === lx && y === ly) continue; pc.px(x, y, c); lx = x; ly = y; } }
// remove a pixel's alpha (cut)
export function cut(pc, mask) { const b = mask.bb || [0, 0, pc.w, pc.h]; for (let y = Math.max(0, b[1]); y < Math.min(pc.h, b[3]); y++) for (let x = Math.max(0, b[0]); x < Math.min(pc.w, b[2]); x++) if (mask(x + 0.5, y + 0.5)) pc.erase(x, y); }

// ------------------------------------------------------------------ 3x5 / 4x5 bitmap font (hand-drawn glyphs; no font loading)
const G = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '.##'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#', '##', '.#', '.#', '.#'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
  '&': ['.#..', '#.#.', '.#..', '#.##', '.##.'], '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'], '=': ['...', '###', '...', '###', '...'], '?': ['##.', '..#', '.#.', '...', '.#.'], '!': ['#', '#', '#', '.', '#'],
  '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'], ' ': ['..', '..', '..', '..', '..'], "'": ['#', '#', '.', '.', '.'],
  'Δ': ['.#.', '.#.', '#.#', '#.#', '###'], 'Γ': ['###', '#..', '#..', '#..', '#..'], 'Σ': ['###', '#..', '.#.', '#..', '###'], 'Π': ['###', '#.#', '#.#', '#.#', '#.#'], 'Λ': ['.#.', '.#.', '#.#', '#.#', '#.#'],
  'Φ': ['.#.', '###', '#.#', '###', '.#.'], 'Θ': ['.#.', '#.#', '###', '#.#', '.#.'], 'Ω': ['.#.', '#.#', '#.#', '.#.', '#.#'], 'Η': ['#.#', '#.#', '###', '#.#', '#.#'], 'Ι': ['###', '.#.', '.#.', '.#.', '###'],
  'Ο': ['.#.', '#.#', '#.#', '#.#', '.#.'], 'Ε': ['###', '#..', '##.', '#..', '###'], 'Ν': ['#..#', '##.#', '#.##', '#..#', '#..#'], 'Α': ['.#.', '#.#', '###', '#.#', '#.#'], 'Ρ': ['##.', '#.#', '##.', '#..', '#..'],
  '²': ['##', '.#', '#.', '##', '..'],
};
export function textW(str) { let w = 0; for (const ch of str) { const g = G[ch] || G[' ']; w += g[0].length + 1; } return Math.max(0, w - 1); }
export function text(pc, str, x, y, c, { shadow, align = 'left' } = {}) {
  let ox = align === 'center' ? Math.round(x - textW(str) / 2) : align === 'right' ? x - textW(str) : x;
  for (const ch of str) { const g = G[ch] || G[' ']; for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === '#') { if (shadow) pc.px(ox + i + 1, y + j + 1, shadow); } for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === '#') pc.px(ox + i, y + j, c); ox += g[0].length + 1; }
  return ox;
}
