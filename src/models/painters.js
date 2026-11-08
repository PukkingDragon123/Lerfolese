// Realistic procedural surface painters for the HQ characters. Each fills an atlas cell (ctx from hq.Atlas.render) in
// float colour, writing height (normal map relief) and roughness / metalness as it goes: wool, velvet, silk brocade,
// lace, gold embroidery and braid, varnished wood, leather, brass, hair cards, fur, scales and horn.
import { rgb, sat, sstep, lerp, TAU } from './hq.js';

// value noise with a proper integer hash (no lattice aliasing) + fbm
const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function makeNoise(seed) {
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  n.fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += n(x * f + i * 17.3, y * f - i * 9.1) * amp; norm += amp; amp *= 0.5; f *= 2.03; } return s / norm; };
  return n;
}
const NZ = new Map();
export const noise = (seed) => { if (!NZ.has(seed)) NZ.set(seed, makeNoise(seed)); return NZ.get(seed); };
export const fr = (x) => x - Math.floor(x);
export const C = rgb;
// colour helpers on the texel object o
export const put = (o, c, k = 1) => { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; };
export const mix = (o, c, t) => { if (t <= 0) return; t = Math.min(1, t); o.r += (c[0] - o.r) * t; o.g += (c[1] - o.g) * t; o.b += (c[2] - o.b) * t; };
export const mul = (o, k) => { o.r *= k; o.g *= k; o.b *= k; };
// anti-aliased line coverage (signed distance d, half width w, px = texel size in the same units)
export const line = (d, w, px) => sat((w - Math.abs(d)) / px + 0.5);
export const segD = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = sat(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy + 1e-12)); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };

// woven cloth: twill relief, fibre noise, slub and fading, crease darkening from the surface cavity
export function fabric(ctx, base, { seed = 1, twill = 3, rough = 0.86, vary = 0.07, cav = 0.9, sheen = 0, uS = 1, vS = 1, h = 0.35 } = {}) {
  const n = noise(seed), b = C(base);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, tw = ((X + Y) % twill + twill) % twill;
    const fib = n(X * 0.9, Y * 0.35) - 0.5, mot = n.fbm(u * 5 * uS, v * 4 * vS, 3) - 0.5, slub = n(X * 0.08, Y * 1.1) - 0.5;
    let k = 1 + mot * vary * 2 + fib * 0.06 + slub * 0.05 - (tw === 0 ? 0.05 : 0) - sat(o.cav) * cav * 0.6 + sat(-o.cav) * 0.12;
    if (sheen) k += sheen * (n.fbm(u * 3 + 7, v * 3, 2) - 0.45);
    put(o, b, Math.max(0.15, k)); o.h = (tw === 0 ? 0 : 0.6) * h + fib * 0.3 * h; o.ro = rough + fib * 0.05;
  }, { geo: true });
}
// silk brocade: satin ground with a raised damask ornament of lower roughness
export function brocade(ctx, base, motif, { seed = 4, period = [0.16, 0.11] } = {}) {
  const n = noise(seed), b = C(base), m = C(motif);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, row = Math.floor(v / period[1]), cu = fr(u / period[0] + (row % 2) * 0.5) - 0.5, cv = fr(v / period[1]) - 0.5;
    const r = Math.hypot(cu * 1.2, cv), a = Math.atan2(cv, cu);
    const petal = r < 0.22 + 0.12 * Math.cos(a * 5) && r > 0.06, stem = Math.abs(cu) < 0.03 && cv > 0.15, leaf = Math.abs(Math.hypot(cu - 0.18, cv - 0.25) - 0.12) < 0.03;
    const on = petal || stem || leaf, fib = n(X * 1.3, Y * 0.4) - 0.5;
    put(o, on ? m : b, 1 + fib * 0.08 + (n.fbm(u * 4, v * 4, 2) - 0.5) * 0.12 - sat(o.cav) * 0.5 + ((X + Y) % 2 ? 0.02 : -0.02));
    o.h = (on ? 0.7 : 0.2) + fib * 0.15; o.ro = on ? 0.38 : 0.55;
  }, { geo: true });
}
// lace: linen ground with flower holes (alpha), cord rings and a scalloped edge near v=1
export function lace(ctx, { cell = 7, edge = true } = {}) {
  const n = noise(19);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, row = Math.floor(Y / cell), cx = ((X + (row % 2) * cell * 0.5) % cell) - cell / 2 + 0.5, cy = (Y % cell) - cell / 2 + 0.5, d = Math.hypot(cx, cy);
    let a = 1, k = 0.95 + (n(X * 0.7, Y * 0.7) - 0.5) * 0.08; o.h = 0.3;
    if (d < 1.3) a = 0; else if (d < 2.2) { k = 1.02; o.h = 0.8; }
    if (Math.abs(cx) < 0.5 && Math.abs(cy) > 2.6) a = 0.3;
    if (edge && v > 0.82) { const sc = Math.abs(fr(u * 14) - 0.5) * 2; if (v > 0.88 + sc * sc * 0.1) a = 0; else if (v > 0.84 + sc * sc * 0.1) { k = 1.05; o.h = 1; } }
    put(o, [0.93, 0.91, 0.86], k); o.a = a; o.ro = 0.8;
  });
}
// gold / metallic cord band (horizontal v0..v1 or vertical u0..u1)
export function braid(ctx, v0, v1, { col = '#d9a441', u0 = 0, u1 = 1, pitch = 5, vert = false } = {}) {
  const g = C(col);
  ctx.each((u, v, o) => {
    if (v < v0 || v > v1 || u < u0 || u > u1) return false;
    const t = vert ? (u - u0) / (u1 - u0) : (v - v0) / (v1 - v0), k = fr((o.x + o.y) / pitch), edge = t < 0.12 || t > 0.88, s = Math.sin(k * Math.PI);
    put(o, g, edge ? 0.45 : 0.72 + 0.45 * s); o.h = edge ? 0.2 : 0.55 + 0.45 * s; o.ro = 0.3; o.me = 0.9;
  });
}
// embroidered metallic scrollwork inside a (u,v) box
export function scroll(ctx, u0, u1, v0, v1, { col = '#e0b050', density = 1 } = {}) {
  const g = C(col), px = 1 / ctx.w;
  ctx.each((u, v, o) => {
    if (u < u0 || u > u1 || v < v0 || v > v1) return false;
    const s = (u - u0) / (u1 - u0), t = (v - v0) / (v1 - v0), y1 = 0.5 + 0.28 * Math.sin(s * TAU * 2 * density), y2 = 0.5 + 0.18 * Math.sin(s * TAU * 4 * density + 1.3);
    const d = Math.min(Math.abs(t - y1), Math.abs(t - y2) * 1.4, Math.abs(Math.hypot(fr(s * 4 * density) - 0.5, t - 0.5) - 0.18) * 1.6);
    const cov = line(d, 0.07, (px / (u1 - u0)) * 2); if (cov <= 0) return false;
    mix(o, g, cov); o.h = Math.max(o.h, cov * (0.7 + 0.3 * Math.sin((o.x + o.y) * 1.3))); o.ro = lerp(o.ro, 0.3, cov); o.me = lerp(o.me, 0.85, cov);
  });
}
// domed metal button with rim, engraved star and wear (centre u,v; radius in texels)
export function button(ctx, u, v, r, { col = '#c9953e', engrave = true } = {}) {
  const g = C(col), cx = ctx.x + u * ctx.w, cy = ctx.y + v * ctx.h;
  ctx.each((uu, vv, o) => {
    const dx = (o.x + 0.5 - cx) / r, dy = (o.y + 0.5 - cy) / r, d = Math.hypot(dx, dy); if (d > 1.18) return false;
    if (d > 1) { mul(o, 0.55); o.h = 0.05; return; }
    const dome = Math.sqrt(1 - d * d), a = Math.atan2(dy, dx); let k = 0.62 + dome * 0.38 - dy * 0.12;
    if (engrave && d < 0.6 && d > 0.15 && Math.abs(Math.cos(a * 4)) > 0.9) k *= 0.62; if (d > 0.8) k *= 0.85;
    put(o, g, k); o.h = 0.3 + dome * 0.9; o.ro = 0.26; o.me = 1;
  });
}
// varnished carved wood: long fibres along v (or u), warped growth figure, pores, knots, rubbed edges
export function wood(ctx, base, { seed = 3, rings = 9, along = 'v', gloss = 0.38, dark = '#3a1f10', h = 0.5, figure = 1 } = {}) {
  const n = noise(seed), b = C(base), d = C(dark);
  ctx.each((u, v, o) => {
    const a = along === 'v' ? u : v, l = along === 'v' ? v : u;
    const w = n.fbm(a * 3, l * 0.8, 3) * 2.2 * figure, ring = fr(a * rings + w), fib = n(a * 120, l * 6) - 0.5, pore = n(a * 160, l * 40) > 0.82;
    put(o, b); mix(o, d, (ring < 0.1 ? 0.45 : ring < 0.18 ? 0.22 : 0) + fib * 0.25 + (pore ? 0.3 : 0) + sat(o.cav) * 0.8);
    mul(o, 1 + (n.fbm(a * 2 + 5, l * 2, 2) - 0.5) * 0.25 + sat(-o.cav) * 0.25);
    o.h = (ring < 0.12 ? 0.25 : 0.55) * h + fib * 0.2 * h - (pore ? 0.2 * h : 0); o.ro = gloss + (pore ? 0.25 : 0) + sat(o.cav) * 0.2;
  }, { geo: true });
}
// leather: pebble grain, creases, stitching near the cell's top/bottom edges, scuffs
export function leather(ctx, base, { seed = 11, rough = 0.5, stitch = true } = {}) {
  const n = noise(seed), b = C(base);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, peb = n(X * 0.45, Y * 0.45), crease = Math.abs(Math.sin((u * 7 + n(u * 3, v * 3) * 2) * TAU));
    put(o, b, 0.85 + (n.fbm(u * 6, v * 6, 3) - 0.5) * 0.35 + (peb - 0.5) * 0.1 - (crease < 0.05 ? 0.2 : 0) - sat(o.cav) * 0.5 + sat(-o.cav) * 0.25);
    o.h = peb * 0.5 - (crease < 0.05 ? 0.4 : 0); o.ro = rough + (peb - 0.5) * 0.1;
    if (stitch && (Y === 3 || Y === ctx.h - 4) && X % 5 < 3) { put(o, [0.75, 0.68, 0.52]); o.h = 0.8; o.ro = 0.8; }
  }, { geo: true });
}
// cast / polished metal with patina in crevices and fine scratches
export function metal(ctx, base, { seed = 13, rough = 0.3, patina = '#3d5a40', scratch = 1, pat = 1 } = {}) {
  const n = noise(seed), b = C(base), p = C(patina);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, sc = Math.abs(n(X * 0.05 + Y * 0.6, Y * 0.05) - 0.5) < 0.012 * scratch;
    put(o, b, 0.85 + (n.fbm(u * 8, v * 8, 3) - 0.5) * 0.3 + sat(-o.cav) * 0.3 * pat); mix(o, p, sat(o.cav * 1.4) * 0.8 * pat);
    o.ro = rough + (n(X * 0.2, Y * 0.2) - 0.5) * 0.12 + sat(o.cav) * 0.4 * pat - (sc ? 0.1 : 0); o.me = 1 - sat(o.cav * 1.4) * 0.7 * pat; o.h = sc ? 0.2 : 0.5;
  }, { geo: true });
}
// hair card: many fine strands with alpha gaps, darker roots, per-strand tone, tapered staggered tips (u across, v root->tip)
export function hairCard(ctx, root, tip, { seed = 5, strands = 40, rough = 0.42, gap = 0.3 } = {}) {
  const n = noise(seed), a0 = C(root), a1 = C(tip), S = [];
  for (let i = 0; i < strands; i++) S.push({ u: (i + 0.5 + (n(i * 7.1, 3) - 0.5) * 0.9) / strands, len: 0.5 + n(i * 3.3, 9) * 0.5, k: 0.7 + n(i * 1.7, 5) * 0.6, wob: n(i * 2.3, 1) * 6, w: 0.6 + n(i, 4) * 0.8 });
  const px = 1 / ctx.w;
  ctx.each((u, v, o) => {
    let best = 0, kk = 1;
    for (const s of S) { if (v > s.len) continue; const cu = s.u + Math.sin(v * 5 + s.wob) * 0.012, w = (0.5 / strands) * (1 - gap * 0.5) * s.w * (1 - (v / s.len) ** 2); const c = line(u - cu, w, px); if (c > best) { best = c; kk = s.k; } }
    const t = sstep(0, 0.55, v), edge = sstep(0.5, 0.32, Math.abs(u - 0.5));
    o.r = lerp(a0[0], a1[0], t) * kk; o.g = lerp(a0[1], a1[1], t) * kk; o.b = lerp(a0[2], a1[2], t) * kk;
    o.a = Math.max(best, v < 0.1 ? edge * 0.9 : 0) * (0.35 + 0.65 * edge); o.h = 0.3 + best * 0.5; o.ro = rough; o.me = 0;
  });
}
// solid hair clump (lens-section tube; u around with 0.5 = outer face, v root -> tip): fine strands with per-strand
// tone, grooves in the normal map, occluded underside, darker roots, a soft sheen band and lighter tips
export function hairClump(ctx, root, tip, { seed = 6, strands = 46, rough = 0.4, sheen = 0.32 } = {}) {
  const n = noise(seed), a0 = C(root), a1 = C(tip);
  ctx.each((u, v, o) => {
    const su = u * strands + Math.sin(v * 6 + u * 9) * 0.6, id = Math.floor(su), f = su - id, k = 0.78 + n(id * 3.1, 7) * 0.44, out = Math.cos((u - 0.5) * TAU), t = sstep(0, 0.6, v);
    o.r = lerp(a0[0], a1[0], t) * k; o.g = lerp(a0[1], a1[1], t) * k; o.b = lerp(a0[2], a1[2], t) * k;
    mul(o, 0.62 + 0.38 * sstep(-0.7, 0.4, out)); const sh = Math.exp(-((v - sheen - (n(u * 4, 1) - 0.5) * 0.1) ** 2) / 0.006) * sstep(-0.1, 0.6, out); o.r += sh * 0.16; o.g += sh * 0.15; o.b += sh * 0.13;
    o.h = 0.5 + (f < 0.18 ? -0.3 : 0.1) + (k - 1) * 0.3; o.ro = rough - sh * 0.1; o.me = 0;
  });
}
// fur: directional clumped hair (flow along +v), darker undercoat, cavity shading
export function fur(ctx, base, { seed = 7, dark = '#1a0e08', len = 14, rough = 0.85, clump = 1 } = {}) {
  const n = noise(seed), b = C(base), d = C(dark);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, cl = n(X * 0.12 * clump, Y * 0.05), st = n(X * 0.9, Y / len) - 0.5, tipv = fr(Y / len + cl * 3);
    put(o, b, 0.8 + st * 0.5 + (cl - 0.5) * 0.4); mix(o, d, (tipv < 0.2 ? 0.45 : 0) + sat(o.cav) * 0.8 + (st < -0.3 ? 0.3 : 0));
    o.h = 0.5 + st * 0.8 - (tipv < 0.2 ? 0.3 : 0); o.ro = rough;
  }, { geo: true });
}
// reptile scales: overlapping rows of keeled scales, belly scutes where u is within `belly` of the back seam (u=0/1)
export function scales(ctx, base, { seed = 9, sw = 9, sh = 7, belly = 0, bellyCol = '#c9b58a', dark = '#0e1a10', blot = 0.5, rough = 0.45 } = {}) {
  const n = noise(seed), b = C(base), bc = C(bellyCol), dk = C(dark);
  ctx.each((u, v, o) => {
    const X = o.x - ctx.x, Y = o.y - ctx.y, bu = Math.abs(fr(u + 0.5) - 0.5);
    if (belly && bu < belly) { const py = Y % 6; put(o, bc, 0.9 - (py === 0 ? 0.35 : 0) + (n(X * 0.2, Y * 0.5) - 0.5) * 0.1 - sat(o.cav) * 0.5); o.h = py === 0 ? 0 : 0.6 + py * 0.06; o.ro = 0.4; return; }
    const row = Math.floor(Y / sh), off = (row % 2) * sw * 0.5, cx = ((((X + off) % sw) + sw) % sw) / sw - 0.5, cy = (Y % sh) / sh, d = Math.hypot(cx * 1.15, (cy - 0.25) * 0.85);
    const k = 0.95 - d * 0.55 + (n(Math.floor((X + off) / sw) * 1.3, row * 2.1) - 0.5) * 0.25, bl = n.fbm(u * 6, v * 5, 3);
    put(o, b, k); mix(o, dk, (bl > 0.6 ? blot : 0) + (d > 0.48 ? 0.55 : 0) + sat(o.cav) * 0.7);
    o.h = d > 0.48 ? 0 : 1 - d * 1.2 + (Math.abs(cx) < 0.06 ? 0.2 : 0); o.ro = rough + (d > 0.48 ? 0.2 : 0);
  }, { geo: true });
}
// horn / hoof / claw: banded keratin with growth ridges along v, darker tip
export function horn(ctx, base, { seed = 15, tip = '#2a1e14', ridges = 22, rough = 0.42, tipAt = 0.7 } = {}) {
  const n = noise(seed), b = C(base), t = C(tip);
  ctx.each((u, v, o) => {
    const rg = Math.sin(v * ridges * TAU + n(u * 6, v * 3) * 2), st = n(u * 40, v * 4) - 0.5;
    put(o, b, 0.9 + st * 0.25 + rg * 0.05); mix(o, t, sstep(tipAt - 0.25, 1, v) + sat(o.cav) * 0.5); o.h = 0.5 + rg * 0.35 + st * 0.2; o.ro = rough + st * 0.1;
  }, { geo: true });
}
// plain fill (hidden / tiny parts)
export const flat = (hex, ro = 0.8, me = 0) => (ctx) => { const c = C(hex); ctx.each((u, v, o) => { put(o, c); o.ro = ro; o.me = me; o.h = 0; }); };
