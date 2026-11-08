// Battle VFX flipbooks: low-res pixel art with black (very dark) outlines and punchy anime shapes.
// Every effect is a horizontal strip of square frames: an anticipation/impact frame, a smear frame, the big hit,
// then follow-through and dissipation. Shapes are hard polygons in 3-4 flat tones (no gradients, no dithering).
import { PixelCanvas } from '../pixel.js';
import { M, hash2 } from './core.js';
import { ngon, star, blade, bar } from './geo.js';

const INK = '#0b0710';
const PAL = {
  hit: ['#ffffff', '#fff6c8', '#ffd84a', '#ff8a1e'], crit: ['#ffffff', '#fff2a8', '#ff6a3a', '#c41e3a'],
  steel: ['#ffffff', '#d8f4ff', '#7cc8ff', '#2c5aa8'], apple: ['#fff2d8', '#ffb09a', '#e2321e', '#8a0e22'],
  stone: ['#f2ead4', '#c8bca4', '#8c7e86', '#4a3e56'], water: ['#ffffff', '#bff2ff', '#4ab4ec', '#1a5ab0'],
  zap: ['#ffffff', '#fffad0', '#8ee8ff', '#2a5ad0'], fire: ['#ffffff', '#ffe04a', '#ff8a1e', '#d42a18'],
  arcane: ['#ffffff', '#e0d0ff', '#9a74f4', '#4a2aa0'], heal: ['#ffffff', '#e4ffc0', '#7ad84a', '#1e8a3a'],
  smoke: ['#ffffff', '#e2e0e6', '#a8a6b6', '#6a6880'], death: ['#f4eaff', '#b8a8d0', '#6a5a8a', '#2e2448'],
  gold: ['#ffffff', '#fff6b0', '#ffd23a', '#e0861a'],
};
// ---------------------------------------------------------------- primitives (hard fills; the outline is added per frame)
function fill(pc, mask, c) { const b = mask.bb || [0, 0, pc.w, pc.h]; for (let y = Math.max(0, b[1]); y < Math.min(pc.h, b[3]); y++) for (let x = Math.max(0, b[0]); x < Math.min(pc.w, b[2]); x++) if (mask(x + 0.5, y + 0.5)) pc.px(x, y, c); }
const poly = (pc, pts, c) => fill(pc, M.poly(pts), c);
const spikes = (cx, cy, r0, r1, n, rot, jag = 0, seed = 1) => star(cx, cy, r0, r1, n, rot).map(([x, y], i) => { if (i % 2) return [x, y]; const k = 1 + (hash2(i, seed) - 0.5) * jag; return [cx + (x - cx) * k, cy + (y - cy) * k]; });
// thick ring broken into segments (each a quad following the circle)
function ring(pc, cx, cy, r, w, segs, gap, c, rot = 0, sy = 1) { for (let i = 0; i < segs; i++) { const a0 = rot + (i / segs) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / segs) * (1 - gap); const pts = []; for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * (k / 4); pts.push([cx + Math.cos(a) * (r + w / 2), cy + Math.sin(a) * (r + w / 2) * sy]); } for (let k = 4; k >= 0; k--) { const a = a0 + (a1 - a0) * (k / 4); pts.push([cx + Math.cos(a) * (r - w / 2), cy + Math.sin(a) * (r - w / 2) * sy]); } poly(pc, pts, c); } }
// shards radiating from the centre
function shards(pc, cx, cy, r, len, n, w, c, rot = 0, seed = 1) { for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2 + (hash2(i, seed) - 0.5) * 0.5; const rr = r * (0.8 + hash2(seed, i) * 0.4); const x0 = cx + Math.cos(a) * rr, y0 = cy + Math.sin(a) * rr; poly(pc, blade(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, w, 0), c); } }
// crescent smear between two circles, limited to an angular range
function crescent(pc, cx, cy, r, thick, a0, a1, c, ox = 0, oy = 0) { const m = M.fn((x, y) => { const d1 = Math.hypot(x - cx, y - cy), d2 = Math.hypot(x - cx - ox, y - cy - oy); let a = Math.atan2(y - cy, x - cx); if (a < a0 - 0.01) a += Math.PI * 2; if (a < a0 || a > a1) return false; const tt = (a - a0) / (a1 - a0); const th = thick * Math.sin(tt * Math.PI); return d1 <= r && d2 >= r - th; }, cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2); fill(pc, m, c); }
const oct = (pc, cx, cy, r, c, n = 8, rot = Math.PI / 8) => { if (r > 0.4) poly(pc, ngon(cx, cy, r, n, rot), c); };
// faceted puff: dark rim octagon, mid body, lit top-left facet, white glint
function puff(pc, cx, cy, r, P) { if (r < 0.8) return; oct(pc, cx, cy, r, P[3]); oct(pc, cx - r * 0.12, cy - r * 0.12, r * 0.84, P[2]); poly(pc, [[cx - r * 0.75, cy - r * 0.1], [cx - r * 0.3, cy - r * 0.72], [cx + r * 0.25, cy - r * 0.62], [cx - r * 0.1, cy - r * 0.15]], P[1]); if (r > 2.5) pc.px(Math.round(cx - r * 0.4), Math.round(cy - r * 0.45), P[0]); }
function sparkle(pc, x, y, s, P) { x = Math.round(x); y = Math.round(y); for (let i = -s; i <= s; i++) { pc.px(x + i, y, Math.abs(i) <= s / 2 ? P[0] : P[2]); pc.px(x, y + i, Math.abs(i) <= s / 2 ? P[0] : P[2]); } }
function bolt(pc, pts, w, P) { for (let i = 0; i + 1 < pts.length; i++) poly(pc, bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w), P[2]); for (let i = 0; i + 1 < pts.length; i++) poly(pc, bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], Math.max(0.5, w * 0.45)), P[0]); }
const jagged = (x0, y0, x1, y1, n, amp, seed) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1; const o = i === 0 || i === n ? 0 : (hash2(i, seed) - 0.5) * 2 * amp; pts.push([x0 + (x1 - x0) * t + (nx / L) * o, y0 + (y1 - y0) * t + (ny / L) * o]); } return pts; };

// ---------------------------------------------------------------- effects: (pc, f, n, S) paint frame f of n on an S x S (or W x H) canvas
const FX = {
  // impact bursts: anticipation pinpoint -> black impact frame -> white starburst -> breaking ring + shards -> sparks
  hit_light: { size: 32, frames: 6, fps: 22, world: 1.5, paint(pc, f, n, S) { impact(pc, f, S, PAL.hit, 8, 0.8, 1); } },
  hit_heavy: { size: 48, frames: 8, fps: 22, world: 2.4, paint(pc, f, n, S) { impact(pc, f, S, PAL.hit, 10, 1, 2, true); } },
  hit_crit: { size: 64, frames: 10, fps: 20, world: 3.4, paint(pc, f, n, S) { impact(pc, f, S, PAL.crit, 12, 1.2, 3, true, true); } },
  slash: { size: 48, frames: 7, fps: 24, world: 2.6, paint(pc, f, n, S) {
    const c = S / 2; const P = PAL.steel;
    if (f === 0) { poly(pc, blade(8, 10, 40, 38, 1.2, 0), P[0]); return; }
    const k = [0, 0.7, 1, 1, 0.8, 0.5, 0.25][f]; const a0 = -2.4 + (f > 3 ? (f - 3) * 0.35 : 0), a1 = 0.6 - (f < 2 ? 0.6 : 0);
    crescent(pc, c - 2, c + 2, 21, 11 * k, a0, a1, P[3], 4, -4); crescent(pc, c - 2, c + 2, 20, 8 * k, a0 + 0.08, a1 - 0.08, P[1], 4, -4); crescent(pc, c - 2, c + 2, 19, 3.5 * k, a0 + 0.25, a1 - 0.3, P[0], 4, -4);
    if (f >= 2 && f <= 4) for (let i = 0; i < 4; i++) { const y = 10 + i * 8 + f; poly(pc, bar(36 + i * 2, y, 46, y - 3, 0.6), P[1]); }
    if (f >= 4) for (let i = 0; i < 3; i++) sparkle(pc, 12 + i * 10 + f, 34 - i * 9, 1 + (f < 6 ? 1 : 0), P);
  } },
  whoosh: { size: 48, frames: 6, fps: 22, world: 2.4, paint(pc, f, n, S) {
    const P = PAL.smoke; for (let i = 0; i < 3; i++) { const r = 10 + i * 6 + f * 2.2; const th = Math.max(0, 5 - Math.abs(f - 2 - i * 0.5) * 1.6); if (th > 0.6) { crescent(pc, 24, 24 + i * 2, r, th, -2.6 + f * 0.2, -0.4 + f * 0.25, P[2]); crescent(pc, 24, 24 + i * 2, r - 0.5, th * 0.5, -2.4 + f * 0.2, -0.6 + f * 0.25, P[0]); } }
  } },
  apple_splat: { size: 48, frames: 8, fps: 18, world: 2.0, paint(pc, f, n, S) {
    const P = PAL.apple; const c = S / 2;
    if (f === 0) { oct(pc, c, c, 7, P[3]); oct(pc, c - 1, c - 1, 6, P[2]); pc.px(c - 3, c - 3, P[0]); return; }
    if (f === 1) { poly(pc, spikes(c, c, 18, 7, 9, 0.2, 0.5, 3), P[3]); poly(pc, spikes(c, c, 13, 5, 9, 0.2, 0.5, 4), P[2]); oct(pc, c, c, 5, P[1]); return; }
    const t = (f - 2) / 5; const R = 8 + t * 14;
    if (f < 6) { poly(pc, spikes(c, c + t * 4, 15 - t * 6, 8 - t * 3, 7, 0.5, 0.6, 5), P[3]); poly(pc, spikes(c, c + t * 4, 10 - t * 5, 5, 7, 0.5, 0.6, 6), P[2]); oct(pc, c - 1, c + t * 4 - 1, 4 - t * 3, P[1]); }
    for (let i = 0; i < 8; i++) { const a = -Math.PI * 0.95 + i * 0.27 + hash2(i, 9) * 0.2; const d = R * (0.7 + hash2(i, 2) * 0.5); const y = c + Math.sin(a) * d + t * t * 14; const x = c + Math.cos(a) * d; const r = Math.max(0, 2.6 - t * 2) + (i % 3 === 0 ? 0.8 : 0); oct(pc, x, y, r, i % 2 ? P[2] : P[3]); if (i % 3 === 1 && r > 1) pc.px(Math.round(x), Math.round(y), '#2a0a0e'); }
  } },
  stone_puff: { size: 48, frames: 8, fps: 18, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.stone; const c = S / 2; const t = f / 7;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const d = 4 + t * 12; const r = (f < 2 ? 4 + f * 3 : 9 - t * 6) * (0.8 + hash2(i, 1) * 0.4); puff(pc, c + Math.cos(a) * d, c + Math.sin(a) * d * 0.6 - t * 6, r, P); }
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; const d = 6 + t * 20; const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d + t * t * 22; const r = 2.4 - t * 0.8; if (f > 0) poly(pc, ngon(x, y, r, 5, i + f * 0.6), i % 2 ? PAL.stone[2] : PAL.stone[1]); }
  } },
  water_splash: { size: 48, frames: 8, fps: 18, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.water; const c = S / 2, base = 34; const t = f / 7;
    if (f === 0) { oct(pc, c, base - 4, 5, P[2]); oct(pc, c - 1, base - 5, 3, P[0]); return; }
    const h = f < 4 ? 6 + f * 5 : 21 - (f - 3) * 4; const w = 6 + t * 10;
    if (h > 2) { const crown = []; for (let i = 0; i <= 10; i++) { const x = c - w + (i / 10) * w * 2; crown.push([x, base - (i % 2 ? h : h * 0.55) * Math.sin((i / 10) * Math.PI)]); } crown.push([c + w, base], [c - w, base]); poly(pc, crown, P[2]); poly(pc, crown.map(([x, y]) => [c + (x - c) * 0.7, base + (y - base) * 0.75]), P[1]); }
    ring(pc, c, base + 1, w + 3, 2.4, 8, 0.25, P[3], 0.2, 0.3);
    for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.9 + i * 0.3; const d = 6 + t * 16; const x = c + Math.cos(a) * d, y = base - 8 + Math.sin(a) * d * 1.2 + t * t * 26; oct(pc, x, y, Math.max(0.6, 2.2 - t), i % 2 ? P[1] : P[2], 6); }
  } },
  zap: { size: 48, frames: 6, fps: 20, world: 2.6, paint(pc, f, n, S) {
    const P = f === 3 ? ['#8ee8ff', '#3c8ae8', '#2a5ad0', '#1d2c7a'] : PAL.zap; const seed = [1, 2, 2, 2, 3, 3][f];
    if (f === 5) { for (let i = 0; i < 5; i++) sparkle(pc, 8 + i * 8, 14 + ((i * 7) % 20), 1, PAL.zap); return; }
    const main = jagged(4, 6, 44, 42, 7, f === 0 ? 3 : 6, seed); bolt(pc, main, f === 0 ? 1 : f === 4 ? 1.2 : 2.2, P);
    if (f >= 1 && f <= 3) { bolt(pc, jagged(main[3][0], main[3][1], 40, 10, 4, 3, seed + 5), 1.2, P); bolt(pc, jagged(main[5][0], main[5][1], 10, 44, 4, 3, seed + 7), 1.2, P); }
    if (f === 1 || f === 2) { poly(pc, spikes(44, 42, 7, 3, 6, 0, 0.4, 2), P[1]); oct(pc, 44, 42, 2.5, P[0]); }
  } },
  fire_burst: { size: 48, frames: 8, fps: 18, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.fire; const c = S / 2; const t = f / 7;
    if (f === 0) { oct(pc, c, c + 4, 5, P[2]); oct(pc, c, c + 4, 2.6, P[0]); return; }
    const R = f === 1 ? 16 : 18 - t * 8, lift = t * 10;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.42; const len = R * (0.75 + hash2(i, f) * 0.45) * (Math.abs(i - 4) < 2 ? 1.2 : 0.85); const x0 = c, y0 = c + 6 - lift * 0.5; poly(pc, blade(x0 + Math.cos(a) * 2, y0 + Math.sin(a) * 2, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len - lift, 4.2 - t * 1.6, 0, 1), P[3]); }
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; const len = R * 0.62; const x0 = c, y0 = c + 6 - lift * 0.5; poly(pc, blade(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len - lift, 3 - t, 0), P[2]); }
    oct(pc, c, c + 5 - lift * 0.5, Math.max(0, 6 - t * 5), P[1]); oct(pc, c, c + 5 - lift * 0.5, Math.max(0, 3.4 - t * 3), P[0]);
    if (f >= 4) for (let i = 0; i < 4; i++) puff(pc, c - 9 + i * 6, c - 8 - t * 10 + (i % 2) * 3, 2.4 + t * 2, PAL.smoke);
  } },
  arcane: { size: 64, frames: 10, fps: 18, world: 3.0, paint(pc, f, n, S) {
    const P = PAL.arcane; const c = S / 2; const t = f / 9; const grow = Math.min(1, f / 3); const fade = f > 6 ? (9 - f) / 3 : 1; const rot = f * 0.22;
    const R = 24 * grow; if (R > 3) { ring(pc, c, c, R, 3 * fade + 0.6, 12, 0.18, P[2], rot, 0.55); ring(pc, c, c, R - 5, 1.6, 16, 0.4, P[1], -rot * 1.5, 0.55); }
    if (f >= 2 && f <= 8) { for (const s of [0, Math.PI]) { const tri = [0, 1, 2].map((k) => { const a = s + rot * 0.6 + (k / 3) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(a) * (R - 6), c + Math.sin(a) * (R - 6) * 0.55]; }); for (let k = 0; k < 3; k++) poly(pc, bar(...tri[k], ...tri[(k + 1) % 3], 0.7), P[0]); } }
    for (let i = 0; i < 8; i++) { const a = rot * 2 + (i / 8) * Math.PI * 2; const x = c + Math.cos(a) * R, y = c + Math.sin(a) * R * 0.55; if (R > 6 && fade > 0.3) { pc.px(Math.round(x), Math.round(y) - 1, P[0]); pc.px(Math.round(x) + 1, Math.round(y), P[0]); pc.px(Math.round(x) - 1, Math.round(y), P[1]); } }
    if (f === 3 || f === 4) { poly(pc, spikes(c, c, 12, 4, 4, Math.PI / 4), P[1]); poly(pc, spikes(c, c, 7, 2, 4, Math.PI / 4), P[0]); }
    for (let i = 0; i < 6; i++) { const a = i * 1.7 + f * 0.5; const d = 8 + t * 22; sparkle(pc, c + Math.cos(a) * d, c - 4 + Math.sin(a) * d * 0.6 - t * 10, f < 8 ? 2 : 1, P); }
  } },
  block: { size: 48, frames: 6, fps: 20, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.steel; const c = S / 2; const hex = (r) => ngon(c, c, r, 6, Math.PI / 6, 0.85, 1);
    if (f === 0) { ring(pc, c, c, 15, 2, 6, 0.05, P[2], Math.PI / 6, 1); return; }
    if (f <= 2) { poly(pc, hex(18 + f), P[3]); poly(pc, hex(15 + f), f === 1 ? P[0] : P[1]); poly(pc, bar(c, c - 14, c, c + 14, 0.8), P[2]); poly(pc, bar(c - 12, c, c + 12, c, 0.8), P[2]); if (f === 2) { poly(pc, bar(c + 3, c - 10, c - 2, c + 2, 0.6), P[3]); poly(pc, bar(c - 2, c + 2, c + 5, c + 9, 0.6), P[3]); } return; }
    const t = (f - 3) / 2; shards(pc, c, c, 10 + t * 10, 6 - t * 2, 6, 2.6, P[1], Math.PI / 6, 4); for (let i = 0; i < 6; i++) sparkle(pc, c + Math.cos(i) * (14 + t * 8), c + Math.sin(i) * (14 + t * 8), f === 3 ? 2 : 1, P);
  } },
  heal: { size: 48, frames: 8, fps: 14, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.heal; const c = S / 2; const t = f / 7;
    ring(pc, c, 40, 12 + t * 6, Math.max(0.8, 3 - t * 2.4), 10, 0.3, P[2], f * 0.3, 0.3);
    for (let i = 0; i < 5; i++) { const ph = (t + i * 0.2) % 1; const x = c - 12 + i * 6, y = 38 - ph * 32; const s = ph < 0.2 || ph > 0.85 ? 1 : 2; poly(pc, bar(x - s - 1, y, x + s + 1, y, 1), P[2]); poly(pc, bar(x, y - s - 1, x, y + s + 1, 1), P[2]); pc.px(Math.round(x), Math.round(y), P[0]); }
    if (f % 2 === 0) sparkle(pc, c + 8, 14 + f, 2, P);
  } },
  smoke_poof: { size: 48, frames: 8, fps: 16, world: 2.2, paint(pc, f, n, S) {
    const P = PAL.smoke; const c = S / 2; const t = f / 7; const sc = f < 2 ? 0.6 + f * 0.4 : 1.4 - t * 0.9;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const d = 5 + t * 9; puff(pc, c + Math.cos(a) * d, c + Math.sin(a) * d * 0.7 - t * 6, (5 + hash2(i, 3) * 3) * sc, P); }
    if (f < 3) puff(pc, c, c, 7 * sc, P);
  } },
  death_puff: { size: 64, frames: 10, fps: 16, world: 3.2, paint(pc, f, n, S) {
    const P = PAL.death; const c = S / 2; const t = f / 9;
    if (f === 0) { poly(pc, spikes(c, c, 16, 6, 8, 0, 0.3, 1), PAL.hit[0]); return; }
    const sc = f < 3 ? 0.7 + f * 0.25 : 1.3 - t * 0.9;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const d = 7 + t * 14; puff(pc, c + Math.cos(a) * d, c + Math.sin(a) * d * 0.7 - t * 10, (6 + hash2(i, 7) * 4) * sc, P); }
    if (f >= 2 && f <= 7) { const y = c - 6 - t * 14; oct(pc, c, y, 7, P[3]); oct(pc, c, y - 1, 6, P[1]); for (const s of [-1, 1]) oct(pc, c + s * 2.6, y, 1.6, '#140a1e', 6); poly(pc, [[c - 1, y + 2], [c + 1, y + 2], [c, y + 4]], '#140a1e'); }
    for (let i = 0; i < 4; i++) sparkle(pc, c - 18 + i * 12, c - 10 + ((i * 5) % 12) - t * 12, f % 2 ? 2 : 1, PAL.gold);
  } },
  eureka: { size: 64, frames: 10, fps: 16, world: 3.6, paint(pc, f, n, S) {
    const P = PAL.gold; const c = S / 2; const t = f / 9; const grow = f < 3 ? 0.4 + f * 0.3 : 1; const fade = f > 6 ? (9 - f) / 3 : 1;
    for (let i = 0; i < 12; i++) { const a = f * 0.08 + (i / 12) * Math.PI * 2; const r0 = 12 * grow, r1 = (20 + (i % 2) * 8) * grow * (0.6 + 0.4 * fade); poly(pc, blade(c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * r1, c + Math.sin(a) * r1, i % 2 ? 1.2 : 2, 0), i % 2 ? P[2] : P[1]); }
    poly(pc, star(c, c, 15 * grow, 6.5 * grow, 5, -Math.PI / 2 + f * 0.1), P[3]); poly(pc, star(c, c - 1, 11 * grow, 4.8 * grow, 5, -Math.PI / 2 + f * 0.1), P[2]); poly(pc, star(c - 1, c - 2, 6 * grow, 2.6 * grow, 5, -Math.PI / 2 + f * 0.1), P[0]);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + f * 0.3; const d = 16 + t * 12; sparkle(pc, c + Math.cos(a) * d, c + Math.sin(a) * d, (f + i) % 3 ? 1 : 2, PAL.arcane); }
  } },
};
// shared impact recipe (light / heavy / crit)
function impact(pc, f, S, P, n, scale, seed, inkFrame = false, extra = false) {
  const c = S / 2; const R = S * 0.46;
  const seq = inkFrame ? ['pin', 'ink', 'flash', 'burst', 'ring', 'ring2', 'spark', 'spark2', 'spark2', 'fade'] : ['pin', 'flash', 'burst', 'ring', 'spark', 'fade'];
  const k = seq[f] || 'fade';
  if (k === 'pin') { poly(pc, spikes(c, c, R * 0.35, R * 0.1, 4, 0), P[0]); return; }
  if (k === 'ink') { poly(pc, spikes(c, c, R, R * 0.35, n, 0.1, 0.5, seed), INK); poly(pc, spikes(c, c, R * 0.6, R * 0.2, n, 0.1, 0.5, seed + 1), P[0]); return; }
  if (k === 'flash') { poly(pc, spikes(c, c, R, R * 0.42, n, 0.15, 0.45, seed), P[0]); return; }
  if (k === 'burst') { poly(pc, spikes(c, c, R, R * 0.45, n, 0.25, 0.45, seed + 2), P[3]); poly(pc, spikes(c, c, R * 0.72, R * 0.32, n, 0.25, 0.4, seed + 3), P[2]); poly(pc, spikes(c, c, R * 0.42, R * 0.2, n, 0.25, 0.3, seed + 4), P[0]); if (extra) shards(pc, c, c, R * 0.7, R * 0.4, 6, 2, P[1], 0.4, seed); return; }
  if (k === 'ring' || k === 'ring2') { const rr = k === 'ring' ? R * 0.62 : R * 0.8; ring(pc, c, c, rr, k === 'ring' ? 4 * scale : 2.6 * scale, n, 0.35, P[2], 0.2, 1); shards(pc, c, c, rr + 3, R * 0.25, n / 2, 1.4 * scale, P[1], 0.6, seed); oct(pc, c, c, k === 'ring' ? 3 * scale : 0, P[0]); return; }
  if (k === 'spark' || k === 'spark2') { const d = k === 'spark' ? R * 0.7 : R * 0.85; for (let i = 0; i < n / 2; i++) { const a = 0.3 + (i / (n / 2)) * Math.PI * 2; sparkle(pc, c + Math.cos(a) * d, c + Math.sin(a) * d, k === 'spark' ? 2 : 1, P); } return; }
  for (let i = 0; i < 4; i++) { const a = 0.8 + i * 1.57; pc.px(Math.round(c + Math.cos(a) * R * 0.9), Math.round(c + Math.sin(a) * R * 0.9), P[2]); }
}

export const VFX_DEFS = Object.fromEntries(Object.entries(FX).map(([k, v]) => [k, { size: v.size, frames: v.frames, fps: v.fps, world: v.world }]));
const sheets = new Map();
// horizontal strip of frames for one effect, outlined in near-black
export function vfxSheet(name) {
  if (sheets.has(name)) return sheets.get(name);
  const D = FX[name]; const S = D.size; const out = new PixelCanvas(S * D.frames, S);
  for (let f = 0; f < D.frames; f++) { const pc = new PixelCanvas(S, S); D.paint(pc, f, D.frames, S); if (!(name === 'hit_heavy' || name === 'hit_crit') || f !== 1) pc.outline(INK); out.blit(pc, f * S, 0); }
  sheets.set(name, out); return out;
}

// ---------------------------------------------------------------- the 2D pixel sun (80x80), 6 shimmer frames
export function sunSheet() {
  if (sheets.has('sun')) return sheets.get('sun');
  const S = 80, F = 6; const out = new PixelCanvas(S * F, S); const c = S / 2;
  const R = ['#fffbe8', '#fff1a8', '#ffd650', '#ffab2e', '#f2701e', '#c8401c'];
  for (let f = 0; f < F; f++) {
    const pc = new PixelCanvas(S, S); const rot = f * (Math.PI / 48);
    // rays: alternating long/short blades whose lengths breathe frame to frame
    for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * Math.PI * 2; const long = i % 2 === 0; const L = (long ? 36 : 29) + (((i + f) % 3) - 1) * 1.5; const r0 = 21; poly(pc, blade(c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * L, c + Math.sin(a) * L, long ? 3.4 : 2.4, 0), long ? R[3] : R[4]); if (long) poly(pc, blade(c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * (L - 6), c + Math.sin(a) * (L - 6), 1.4, 0), R[2]); }
    // halo dots
    for (let i = 0; i < 24; i++) { const a = -rot * 2 + (i / 24) * Math.PI * 2; if ((i + f) % 4 === 0) continue; pc.px(Math.round(c + Math.cos(a) * 25), Math.round(c + Math.sin(a) * 25), R[1]); }
    // faceted disc: 16-gon in bands, lit toward the upper left
    poly(pc, ngon(c, c, 21, 16, Math.PI / 16), R[5]); poly(pc, ngon(c, c, 19.5, 16, Math.PI / 16), R[3]); poly(pc, ngon(c - 1.5, c - 1.5, 16.5, 16, Math.PI / 16), R[2]); poly(pc, ngon(c - 3, c - 3, 11.5, 12, Math.PI / 12), R[1]); poly(pc, ngon(c - 5, c - 5, 5, 8, Math.PI / 8), R[0]);
    // shimmer: a rotating highlight sliver and two twinkling glints
    const ga = rot * 6 - 2.3; poly(pc, blade(c + Math.cos(ga) * 9, c + Math.sin(ga) * 9, c + Math.cos(ga) * 17, c + Math.sin(ga) * 17, 1.2, 0), R[0]);
    sparkle(pc, c - 22 + (f % 3) * 2, c - 20, f % 2 ? 2 : 1, ['#ffffff', '#fffbe8', '#ffd650']); sparkle(pc, c + 24, c + 18 - (f % 2) * 3, (f + 1) % 2 ? 2 : 1, ['#ffffff', '#fffbe8', '#ffd650']);
    pc.outline('#7a2a14'); out.blit(pc, f * S, 0);
  }
  sheets.set('sun', out); return out;
}
