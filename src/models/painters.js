// Pixel-art surface painters for the HQ characters. Each painter fills an atlas cell (ctx from hq.Atlas.render) using
// (u, v) texel coordinates and, where needed, the rest-pose 3D point of the texel. Hard-edged anime cel shapes,
// palette ramps with Bayer dithering, seams, stitches, trims, embroidery and the anime face (eyes / brows / mouth).
import { bayer, makeNoise } from '../gfx/pixel.js';
import { sat, sstep, TAU } from './hq.js';

const NZ = new Map();
export const noise = (seed) => { if (!NZ.has(seed)) NZ.set(seed, makeNoise(seed)); return NZ.get(seed); };
// ramp lookup with ordered dithering (d = dither amount in ramp steps)
// flat bands with ordered dithering only across the transition between two ramp steps (d = width of the dithered zone)
export const pick = (r, t, x, y, d = 0.9) => { const f = Math.max(0, Math.min(r.length - 1, t * (r.length - 1))), i = Math.floor(f), k = f - i, h = d * 0.5, a = 0.5 - h * 0.5; return r[Math.min(r.length - 1, k < a ? i : k > 1 - a ? i + 1 : (k - a) / (1 - 2 * a) > bayer(x, y) ? i + 1 : i)]; };
export const ramp = (r, i) => r[Math.max(0, Math.min(r.length - 1, i))];
const fr = (x) => x - Math.floor(x);

// ---------------------------------------------------------------- palettes (hue-shifted: cool shadows, warm lights)
export const PAL = {
  plum: ['#170c22', '#24133a', '#35204f', '#4a2c69', '#5f3a83', '#7a50a0', '#9a70bd'],
  mustard: ['#4a260c', '#7a4412', '#a8661a', '#cf8e26', '#ecb53e', '#f8d56e', '#fff0b0'],
  gold: ['#3a1f08', '#6e3e10', '#a8691e', '#d6982e', '#f2c452', '#ffe48e', '#fff8d8'],
  brass: ['#2a1608', '#5a3410', '#8e5a1c', '#c08a32', '#e2b558', '#f6dc92', '#fffbe0'],
  bronze: ['#1e0f06', '#46240c', '#74401a', '#a2622a', '#c98a46', '#e6b274', '#fbe0b0'],
  lace: ['#8e8296', '#b4aabb', '#d6cfd8', '#ece7ea', '#fbf8f4', '#ffffff'],
  cream: ['#8a7458', '#b39c7c', '#d4c09e', '#e9dcc0', '#f6eedc', '#fffaf0'],
  black: ['#07060c', '#100e18', '#1c1828', '#2a2438', '#3c344e', '#585070'],
  wood: ['#3a1e0e', '#5c3216', '#7e4a22', '#a0662e', '#bd8240', '#d6a25a', '#ecc488'],
  woodL: ['#7a4a26', '#9c6434', '#ba8046', '#d29c5e', '#e4b87a', '#f2d29c', '#fbe8c4'],
  white: ['#5a5a78', '#7e7e9c', '#a6a6c0', '#c8c8dc', '#e2e2ee', '#f4f4fa', '#ffffff'],
  hairW: ['#545a86', '#7078a6', '#959cc4', '#b8bedc', '#d6daee', '#eceef8', '#ffffff'],
  skin: ['#6a3226', '#9a4e3a', '#c47458', '#e09a7a', '#f2bc9a', '#fbd8bc', '#fff0e2'],
  tan: ['#4a2216', '#743a24', '#a05a38', '#c47c50', '#de9e6c', '#f0c090', '#fbe0bc'],
  leather: ['#1e0e08', '#3a1e10', '#5a3018', '#7a4624', '#9a6034', '#ba7e4a', '#d8a06a'],
  red: ['#2a0610', '#4e0e1a', '#7a1a26', '#a82a32', '#d04640', '#ec7462', '#ffae96'],
  green: ['#0c1e12', '#16321c', '#24502a', '#3a723a', '#5a964a', '#86ba62', '#bede8a'],
};

// ---------------------------------------------------------------- base materials
// woven cloth: twill weave, cel-shaded drape folds (stronger toward the hem), AO at the ends
export function cloth(ctx, r, { seed = 1, folds = 7, fold = 0.3, hemFold = 1, base = 0.55, weave = 0.06, ao0 = 0.15, ao1 = 0.1, twill = true, uS = 1 } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    const f = Math.sin((u * uS * folds + n(u * 6 * uS, v * 2.5) * 1.1) * TAU) * (0.45 + 0.55 * v * hemFold);
    let t = base + (f > 0.5 ? 0.12 : f < -0.45 ? -fold : f * 0.12) + (n.fbm(u * 18, v * 9, 2) - 0.5) * 0.12;
    if (twill) t += ((x + y) % 4 === 0 ? -weave : (x + y) % 4 === 2 ? weave * 0.5 : 0);
    t -= sstep(ao0, 0, v) * 0.22 + sstep(1 - ao1, 1, v) * 0.18;
    return pick(r, t, x, y);
  });
}
// varnished carved wood, grain running along v
export function wood(ctx, r, { seed = 3, base = 0.55, grain = 1, rings = 14, knots = 2, gloss = true } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    const w = n.fbm(u * 4, v * 1.2, 3) * 3 + Math.sin(v * 9 + u * 3) * 0.3;
    const g = fr(u * rings + w); let t = base + (g < 0.12 ? -0.28 : g < 0.2 ? -0.12 : g > 0.85 ? 0.08 : 0) * grain + (n(u * 40, v * 6) - 0.5) * 0.16;
    for (let k = 0; k < knots; k++) { const ku = fr(0.27 + k * 0.41 + seed * 0.13), kv = fr(0.33 + k * 0.37 + seed * 0.21), d = Math.hypot((u - ku) * 3, (v - kv) * 1.4); if (d < 0.05) t -= 0.35 - d * 4; }
    if (gloss && fr(u * 2 + 0.2) < 0.06) t += 0.18;
    return pick(r, t, x, y);
  });
}
// anime hair lock: dark root, strand lines along v, jagged shine band, light tips
export function hair(ctx, r, { seed = 5, shine = 0.32, root = 0.18, strands = 9, base = 0.56 } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    const s = Math.sin((u * strands + n(u * 5, v * 3) * 0.6) * TAU); let t = base + (s > 0.6 ? 0.12 : s < -0.55 ? -0.18 : 0) - sstep(root, 0, v) * 0.38 + sstep(0.75, 1, v) * 0.12;
    const zig = Math.abs(fr(u * 14) - 0.5) * 0.08; if (Math.abs(v - shine + zig) < 0.035) t = 0.92; else if (Math.abs(v - shine + zig) < 0.06) t += 0.14;
    t -= Math.abs(Math.cos(u * TAU)) * 0.08;
    return pick(r, t, x, y, 0.6);
  });
}
// shaggy fur: chevron clumps pointing toward +v
export function fur(ctx, r, { seed = 7, cw = 9, ch = 14, base = 0.5, uS = 1 } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    const X = x - ctx.x, Y = y - ctx.y, row = Math.floor(Y / ch), off = (row % 2) * cw * 0.5, cx = ((X + off) % cw) / cw, cy = (Y % ch) / ch;
    const tip = Math.abs(cx - 0.5) * 2; let t = base + (cy > 1 - tip * 0.6 ? -0.25 : 0) + (cy < 0.2 ? 0.12 : 0) + (n(row * 3.1, Math.floor((X + off) / cw) * 1.7) - 0.5) * 0.3;
    if ((X + Math.floor(cy * 4)) % 3 === 0) t -= 0.08;
    return pick(r, t + (n.fbm(u * 8 * uS, v * 4, 2) - 0.5) * 0.2, x, y);
  });
}
// reptile scales: offset rows of rounded scales; belly band (u within belly of 0.5±bw) gets wide plates
export function scales(ctx, r, { seed = 9, sw = 7, sh = 6, belly = null, bw = 0.12, base = 0.55, pattern = 0 } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    const X = x - ctx.x, Y = y - ctx.y;
    if (belly && Math.abs(((u - 0.5 + 1.5) % 1) - 0.5) < bw) { const py = Y % 5; let t = 0.62 - (py === 0 ? 0.35 : py === 1 ? -0.12 : 0) + (n(u * 10, v * 30) - 0.5) * 0.1; return pick(belly, t, x, y); }
    const row = Math.floor(Y / sh), off = (row % 2) * sw * 0.5, cx = ((X + off) % sw) / sw - 0.5, cy = (Y % sh) / sh;
    const d = Math.hypot(cx * 1.15, (cy - 0.15) * 0.9);
    let t = base + 0.25 - d * 0.6 + (n(Math.floor((X + off) / sw) * 1.3, row * 2.1) - 0.5) * 0.2;
    if (d > 0.5) t = 0.12; else if (cy < 0.2 && Math.abs(cx) < 0.25) t += 0.18;
    if (pattern) t += Math.sin(u * TAU * 3 + v * pattern) > 0.6 ? -0.2 : 0;
    return pick(r, t, x, y, 0.5);
  });
}
// leather: mottled, creased, with stitched edges near v=0/1
export function leather(ctx, r, { seed = 11, base = 0.5, stitch = true } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    let t = base + (n.fbm(u * 10, v * 10, 3) - 0.5) * 0.4; const c = Math.abs(Math.sin((u * 6 + n(u * 4, v * 4) * 2) * TAU)); if (c < 0.06) t -= 0.25;
    const Y = y - ctx.y; if (stitch && (Y === 2 || Y === ctx.h - 3) && (x % 4) < 2) t = 0.95; if (Y < 1 || Y > ctx.h - 2) t -= 0.3;
    return pick(r, t, x, y);
  });
}
// polished metal: banded highlights, engraved line, rivets optional
export function metal(ctx, r, { seed = 13, base = 0.55, bands = 3, engrave = true } = {}) {
  const n = noise(seed);
  ctx.each((u, v, x, y) => {
    let t = base + Math.sin(v * TAU * bands * 0.5 + u * 2) * 0.18 + (n(u * 30, v * 3) - 0.5) * 0.15; const Y = y - ctx.y;
    if (Y < 1) t = 0.95; else if (Y > ctx.h - 2) t = 0.15; if (engrave && Math.abs(v - 0.5) < 0.04 && (x % 6) < 4) t -= 0.3;
    if (fr(u * 3) < 0.04) t += 0.3;
    return pick(r, t, x, y, 0.6);
  });
}
// lace: cream ground, flower holes on a lattice, scalloped edge toward v=1
export function lace(ctx, r = PAL.lace, { cell = 6, base = 0.78 } = {}) {
  ctx.each((u, v, x, y) => {
    const X = x - ctx.x, Y = y - ctx.y, cx = X % cell, cy = Y % cell, rowOff = Math.floor(Y / cell) % 2 ? cell / 2 : 0, cxx = (X + rowOff) % cell;
    let t = base; const d = Math.hypot(cxx - cell / 2 + 0.5, cy - cell / 2 + 0.5); if (d < 1.2) t = 0.25; else if (d < 2.1) t = 0.98; if (cx === 0 && cy === 0) t = 0.5;
    if (v > 0.86) { const sc = Math.abs(fr(u * 18) - 0.5) * 2; if (v > 0.9 + sc * 0.06) t = 0.3; }
    return pick(r, t, x, y, 0.4);
  });
}

// ---------------------------------------------------------------- detail strokes (u,v space)
export function hband(ctx, v0, v1, fn) { const y0 = Math.floor(ctx.Y(v0)), y1 = Math.ceil(ctx.Y(v1)); for (let y = Math.max(ctx.y, y0); y < Math.min(ctx.y + ctx.h, y1); y++) for (let x = ctx.x; x < ctx.x + ctx.w; x++) { const c = fn(ctx.U(x), (y - y0) / Math.max(1, y1 - y0), x, y); if (c) ctx.pc.px(x, y, c); } }
export function vband(ctx, u0, u1, fn) { const x0 = Math.floor(ctx.X(u0)), x1 = Math.ceil(ctx.X(u1)); for (let x = x0; x < x1; x++) for (let y = ctx.y; y < ctx.y + ctx.h; y++) { const xx = ((x - ctx.x) % ctx.w + ctx.w) % ctx.w + ctx.x; const c = fn((x - x0) / Math.max(1, x1 - x0), ctx.Vv(y), xx, y); if (c) ctx.pc.px(xx, y, c); } }
// gold braid trim: twisted cord pattern with dark edges
export const braid = (r = PAL.gold) => (s, t, x, y) => { if (t < 0.12 || t > 0.88) return r[1]; const k = fr((x + y * 0.9) / 4); return pick(r, 0.45 + (k < 0.5 ? 0.35 : -0.05) - Math.abs(t - 0.5) * 0.5, x, y, 0.4); };
// greek key / meander band
export const meander = (r = PAL.gold, bg = null) => (s, t, x, y) => { if (t < 0.1 || t > 0.9) return r[1]; const X = x % 8, Y = Math.floor(t * 8); const on = Y === 1 || (X === 1 && Y > 1 && Y < 7) || (Y === 6 && X > 0 && X < 6) || (X === 5 && Y > 2 && Y < 6) || (Y === 3 && X > 2 && X < 6); return on ? r[5] : bg ? bg : r[2]; };
export function seam(ctx, u0, v0, u1, v1, dark, light) { const n = Math.ceil(Math.hypot((u1 - u0) * ctx.w, (v1 - v0) * ctx.h)); for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(ctx.X(u0 + (u1 - u0) * t)), y = Math.round(ctx.Y(v0 + (v1 - v0) * t)); ctx.pc.px(x, y, dark); if (light && i % 3 === 0) ctx.pc.px(x + 1, y, light); } }
// painted shank button / gem: shaded disc with rim, cross-slot and specular pixel
export function stud(ctx, u, v, rad, r, { slot = false } = {}) {
  const cx = ctx.X(u), cy = ctx.Y(v);
  for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
    const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / rad, d = dx * dx + dy * dy; if (d > 1.25) continue;
    let t = d > 0.85 ? 0.08 : 0.55 - dx * 0.25 - dy * 0.35 + (1 - d) * 0.2; if (slot && Math.abs(dx + dy) < 0.18 && d < 0.5) t = 0.2; if (dx < -0.2 && dy < -0.2 && d < 0.35 && d > 0.12) t = 1;
    ctx.pc.px(x, y, pick(r, t, x, y, 0.3));
  }
}

// ---------------------------------------------------------------- anime face
// Feature geometry is evaluated per texel from the rest-pose surface point (front projection), so drawn lines stay crisp
// in the texture's own pixel grid. F: face spec (head-space units), E: expression state.
export const EXPR = {
  smug: { lid: [0.36, 0.3], tilt: [0.05, 0], brow: [0.05, 0.3], browA: [-0.05, 0.25], mouth: 'smirk', look: [0.15, 0] },
  delight: { eye: 'happy', brow: [0.35, 0.35], browA: [0.1, 0.1], mouth: 'open', blush: 1 },
  annoyed: { lid: [0.42, 0.42], tilt: [0.35, 0.35], brow: [-0.25, -0.25], browA: [-0.55, -0.55], mouth: 'frown', vein: 1, look: [0.25, -0.05] },
  hurt: { eye: ['squeeze', 'open'], lid: [0, 0.2], brow: [0.25, 0.35], browA: [0.55, 0.45], mouth: 'wavy', sweat: 1, pupil: 0.8 },
  shock: { lid: [0, 0], brow: [0.6, 0.6], browA: [0.25, 0.25], mouth: 'o', pupil: 0.45, iris: 0.72, sweat: 1 },
  think: { lid: [0.18, 0.12], brow: [0.0, 0.45], browA: [-0.15, 0.35], mouth: 'side', look: [0.45, 0.45] },
  idle: { lid: [0.08, 0.08], brow: [0.05, 0.05], browA: [0, 0], mouth: 'line' },
  blink: { eye: 'blink', brow: [0, 0], browA: [0, 0], mouth: 'line' },
  talk: { lid: [0.08, 0.08], brow: [0.1, 0.1], browA: [0, 0], mouth: 'open' },
  angry: { lid: [0.25, 0.25], tilt: [0.45, 0.45], brow: [-0.3, -0.3], browA: [-0.6, -0.6], mouth: 'grit', look: [0, -0.1] },
  pain: { eye: 'squeeze', brow: [0.3, 0.3], browA: [0.6, 0.6], mouth: 'grit', sweat: 1 },
  drunk: { lid: [0.5, 0.42], tilt: [-0.1, -0.1], brow: [0.25, 0.2], browA: [0.2, 0.15], mouth: 'smile', blush: 1, look: [0.1, -0.15] },
  dead: { eye: 'x', brow: [0.2, 0.2], browA: [0.4, 0.4], mouth: 'o' },
};
const at2 = (a, i) => (Array.isArray(a) ? a[i] : a);
// eye-local coordinates: x toward temple (-1 inner corner .. 1 outer), y up (-1..1)
function eyeCol(x, y, F, E, side, px, py) {
  const shape = at2(E.eye || 'open', side), C = F.eyeC;
  const tilt = F.eyeTilt || 0; y -= x * tilt;
  if (shape === 'blink' || shape === 'happy') {
    const arc = shape === 'happy' ? 0.15 + 0.42 * (1 - x * x) - 0.35 : -0.12 - 0.22 * (1 - x * x);
    if (Math.abs(x) < 1.05 && Math.abs(y - arc) < 0.12 + (x > 0.5 ? 0.05 : 0)) return C.lash;
    if (shape === 'blink' && x > 0.75 && x < 1.25 && Math.abs(y - (arc - (x - 0.75) * 0.5)) < 0.08) return C.lash;
    return null;
  }
  if (shape === 'squeeze') { const yy = Math.abs(y + 0.05), lx = 1 - (x + 1) / 2.1; if (x > -1 && x < 1.05 && Math.abs(yy - lx * 0.5) < 0.12) return C.lash; return null; }
  if (shape === 'x') { if (Math.abs(x) < 0.8 && Math.abs(y) < 0.8 && (Math.abs(x - y) < 0.16 || Math.abs(x + y) < 0.16)) return C.lash; return null; }
  const lid = at2(E.lid ?? 0.08, side), lt = at2(E.tilt ?? 0, side);
  const top0 = 0.98 - 0.72 * (x - 0.12) * (x - 0.12), bot = -0.82 + 0.58 * (x + 0.05) * (x + 0.05);
  const lidY = 1 - lid * 2.0 + (x + 1) * lt * 0.5 - (x < 0 ? 0 : 0);
  const top = Math.min(top0, lidY + 0.15 * (1 - x * x) * (lid > 0.05 ? 1 : 0));
  const thick = 0.15 + 0.12 * sat(x) + (F.lashBoost || 0);
  if (x > -1.02 && x < 1.06 && y >= top - 0.02 && y < top + thick && top > bot) return C.lash;
  if (x >= 0.82 && x < 1.32 && Math.abs(y - (top0 + 0.02 - (x - 0.82) * (F.wing ?? 0.7))) < 0.075 + (1.32 - x) * 0.12 && lid < 0.45) return C.lash;
  if (F.crease !== false && x > -0.45 && x < 0.95 && Math.abs(y - (top0 + 0.34 - lid * 0.5)) < 0.055) return C.crease;
  if (y < top && y > bot && Math.abs(x) <= 1) {
    if (x > 0.15 && x < 0.95 && y < bot + 0.08) return C.lashLo;
    const lk = E.look || [0, 0], is = (E.iris || 1) * (F.iris || 1), ix = lk[0] * 0.28 * (side ? 1 : -1) - 0.03, iy = -0.08 + lk[1] * 0.22;
    const rx = 0.5 * is, ry = 0.76 * is, dx = (x - ix) / rx, dy = (y - iy) / ry, d = dx * dx + dy * dy;
    if (d < 1) {
      const pr = (E.pupil || 1) * (F.pupil || 1), pdx = dx / (F.slit ? 0.2 * pr : 0.42 * pr), pdy = (dy - 0.08) / (0.56 * pr);
      if ((dx + 0.38) ** 2 / 0.09 + (dy - 0.42) ** 2 / 0.11 < 1) return C.hi;
      if ((dx - 0.4) ** 2 + (dy + 0.48) ** 2 < 0.025) return C.hi;
      if (pdx * pdx + pdy * pdy < 1) return C.iris[0];
      if (d > 0.8) return C.iris[1];
      if (dy > 0.45 || y > top - 0.22) return C.iris[1];
      const t = 0.35 + (-dy) * 0.32 + (Math.abs(Math.atan2(dy, dx) * 5 % 1) < 0.15 && d > 0.3 ? -0.15 : 0);
      return pick(C.iris, t + (dy < -0.5 ? 0.25 : 0), px, py, 0.5);
    }
    if (y > top - 0.2) return C.white[0];
    return C.white[1];
  }
  return null;
}
// mouth-local: x -1..1 across, y in mouth-height units
function mouthCol(x, y, F, E, px, py) {
  const m = E.mouth || 'line', C = F.mouthC, w = F.mouthLine || 0.2;
  if (m === 'line' || m === 'smile' || m === 'frown') { const c = m === 'smile' ? 0.45 : m === 'frown' ? -0.35 : 0.08; const yy = c * (x * x - 0.4); if (Math.abs(x) < 1 && Math.abs(y - yy) < w) return C.line; if (m === 'smile' && Math.abs(x) > 0.85 && Math.abs(x) < 1.12 && Math.abs(y - c * 0.75) < w) return C.line; return null; }
  if (m === 'smirk') { const yy = x > 0 ? 0.55 * x * x - 0.05 : -0.05 + 0.08 * x * x; if (x > -0.85 && x < 1.05 && Math.abs(y - yy) < w) return C.line; if (x > 0.9 && x < 1.15 && Math.abs(y - 0.6) < w * 1.2) return C.line; return null; }
  if (m === 'side') { if (x > -0.2 && x < 0.95 && Math.abs(y - (0.05 - (x - 0.4) * 0.12)) < w) return C.line; return null; }
  if (m === 'wavy') { const yy = Math.sin(x * 7) * 0.18; if (Math.abs(x) < 1 && Math.abs(y - yy) < w * 0.9) return C.line; return null; }
  if (m === 'o') { const d = (x / 0.42) ** 2 + ((y + 0.35) / 0.62) ** 2; if (d < 0.55) return C.in; if (d < 1) return C.line; return null; }
  if (m === 'grit') { if (Math.abs(x) < 0.95 && y < 0.25 && y > -0.55) { if (y > 0.13 || y < -0.43 || Math.abs(x) > 0.85) return C.line; return (Math.round((x + 1) * 5) % 2 === 0 && Math.abs(y + 0.15) < 0.05) ? C.line : C.teeth; } return null; }
  // open: D shape with tongue
  const top = 0.18 - 0.1 * x * x, bot = -0.95 + 0.75 * x * x;
  if (Math.abs(x) < 1 && y < top && y > bot) { if (y > top - w) return C.line; if (y < bot + w * 0.9 || Math.abs(x) > 0.92) return C.line; if (F.teeth && y > top - 0.28) return C.teeth; if ((x / 0.62) ** 2 + ((y - bot - 0.15) / 0.35) ** 2 < 1) return C.tongue; return C.in; }
  return null;
}
// paints face features over whatever is already in the texel (call per texel with the head-space point p)
export function faceCol(p, F, E, px, py) {
  if (p.z < F.zMin) return null;
  const s = p.x >= 0 ? 1 : 0, ax = Math.abs(p.x);
  // eyes
  const ex = (ax - F.eye[0]) / F.eye[2], ey = (p.y - F.eye[1]) / F.eye[3];
  if (ex > -1.4 && ex < 1.5 && ey > -1.3 && ey < 1.4) { const c = eyeCol(ex, ey, F, E, s, px, py); if (c) return c; }
  // brows
  if (F.brow) {
    const bx = (ax - F.brow[0]) / F.brow[2], ang = at2(E.browA || 0, s), lift = at2(E.brow || 0, s);
    const by = (p.y - F.brow[1] - lift * F.brow[3] * 1.4) / F.brow[3] - bx * ang * 0.9 + 0.25 * bx * bx - 0.1;
    const th = F.browTh * (1.15 - 0.35 * (bx + 1) / 2);
    if (bx > -1 && bx < 1.05 && Math.abs(by) < th) return Math.abs(by) < th * 0.45 && bx < 0.6 ? F.browC[1] : F.browC[0];
  }
  // mouth
  const mx = p.x / F.mouth[2], my = (p.y - F.mouth[1]) / F.mouth[3];
  if (Math.abs(mx) < 1.3 && my > -1.2 && my < 1) { const c = mouthCol(mx, my, F, E, px, py); if (c) return c; }
  // nose: shade stroke on the shadow side + tip highlight
  if (F.nose) { const nx = (p.x - F.nose[0]) / F.nose[2], ny = (p.y - F.nose[1]) / F.nose[3]; if (nx > 0.2 && nx < 1.1 && Math.abs(ny + nx * 0.35) < 0.22) return F.noseC[0]; if (nx > -0.4 && nx < 0.2 && Math.abs(ny - 0.25) < 0.18) return F.noseC[1]; }
  // blush hatching, sweat drop, anger vein
  if (E.blush || F.blush) { const bx = (ax - F.cheek[0]) / F.cheek[2], by = (p.y - F.cheek[1]) / F.cheek[3]; if (bx * bx + by * by < 1 && ((px + py) % 4 === 0 || ((px + py) % 4 === 1 && bx * bx + by * by < 0.5))) return F.blushC; }
  const browY = F.brow ? F.brow[1] : F.eye[1] + F.eye[3] * 1.45;
  if (E.sweat && p.x < 0) { const sx = (p.x + F.eye[0] * 1.75) / (F.eye[2] * 0.35), sy = (p.y - browY - F.eye[3] * 0.2) / (F.eye[3] * 0.6); const d = sx * sx + (sy < 0 ? sy * sy : sy * sy * 3.5); if (d < 1 && sy > -1) return d > 0.6 ? '#3a6ab0' : sx < -0.1 && sy < 0.1 && sy > -0.6 ? '#ffffff' : '#9ad0f4'; }
  if (E.vein && p.x > 0) { const vx = (p.x - F.eye[0] * 1.3) / (F.eye[2] * 0.5), vy = (p.y - browY - F.eye[3] * 1.3) / (F.eye[2] * 0.5); const a = Math.abs(vx), b = Math.abs(vy); if (a < 1 && b < 1 && ((Math.abs(a - 0.55) < 0.17 && b > 0.2) || (Math.abs(b - 0.55) < 0.17 && a > 0.2))) return '#d02838'; }
  return null;
}
// default face color sets
export function faceColors({ iris = ['#141024', '#2a2a5a', '#3a4c8e', '#4f78b8', '#78aee0', '#b8e2ff'], lash = '#1a0f16', crease = '#9a5a48', mouth = '#6a2a2a', blush = '#f07a86' } = {}) {
  return { eyeC: { lash, lashLo: '#5a2e2e', crease, iris, hi: '#ffffff', white: ['#c8c4dc', '#fbf8f6'] }, mouthC: { line: mouth, in: '#4a1018', tongue: '#e0606a', teeth: '#fbf8f4' }, blushC: blush, noseC: ['#c47a64', '#fff2e6'], browC: ['#2a1810', '#4a2e20'] };
}
