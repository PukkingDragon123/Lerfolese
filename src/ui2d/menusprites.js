// THE FOUR MENU ICONS as HAND-PIXELLED, SHADED PIXEL ART (menu agent): Studies (a brass-and-glass alembic over a
// spirit burner), Stars (a lapis constellation crystal in a turning brass gimbal), Journal (a stitched leather book
// with brass corners and a gilt apple) and Settings (a train of brass and iron gears round an engraved dial).
// Every sprite is painted pixel by pixel each animation step (12 steps a second, so motion is stepped like real pixel
// animation) with proper light and shadow ramps (light from the upper left), facet and bevel highlights, specular
// glints, texture (wood grain, leather pebbling, hammered brass), and a crisp dark outline; it is shown at a whole
// number of screen pixels per art pixel (nearest filtering), so it is always crisp and never blurred.
//   alive: hover lifts it a step, a pixel halo of light rims its outline, sparkles drift off; the alembic boils and
//   steams, the crystal's stars ignite and its gimbal spins, the book opens and riffles its pages, the gears spin up;
//   press squashes it (a nearest-neighbour squash, still crisp); a ready study / waiting achievement makes it glow gold.
//   const M = new MenuSprites(UI, [{ key, label, onClick, onHover }]); M.update(dt, t, { ready, fresh, open }); M.show(on)
import { audio } from '../core/audio.js';

const N = 56, PAD = 3, CW = N + PAD * 2;
const RAMP = {
  wood: ['#1e0e06', '#3a1e0e', '#5a3016', '#7e4620', '#a2602e', '#c88246', '#e8aa6a'],
  brass: ['#24130f', '#4b2a17', '#7b4a1d', '#ad7826', '#d8a63a', '#f2d36c', '#fff4c4'],
  iron: ['#0e0e14', '#22242e', '#3a3e4c', '#585e70', '#7c8496', '#a8b0c0', '#e0e6f0'],
  teal: ['#06221e', '#0c4a40', '#14705e', '#22a084', '#4ccaa8', '#9af0d4', '#e8fff6'],
  gold: ['#2a1004', '#6a3608', '#a8640e', '#dc9a1c', '#f8c840', '#ffe890', '#fffbe0'],
  lapis: ['#0a0620', '#1a1048', '#2e1e7a', '#4a34aa', '#7058d4', '#a690f4', '#e2d8ff'],
  leather: ['#1a0806', '#3e1410', '#64201a', '#8a3424', '#ac4c30', '#cc6c40', '#e8946a'],
  page: ['#5a3e22', '#8a6a42', '#b8986a', '#d8c094', '#ecdcb4', '#f8eed4', '#fffaf0'],
  glass: ['#123040', '#1e4a5e', '#3a7a90', '#6ab0c4', '#a8dcea', '#dcf6fc', '#ffffff'],
  flame: ['#5a1004', '#b02a08', '#e8600e', '#ffa020', '#ffd860', '#fff4b8', '#ffffff'],
};
const INK = [18, 10, 8];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RGB = {}; for (const [k, r] of Object.entries(RAMP)) RGB[k] = r.map(hex);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h2 = (x, y, s = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

/** a tiny RGBA pixel buffer with the tools the sprites need */
export class Px {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  clear() { this.d.fill(0); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c, a = 255) { x |= 0; y |= 0; if (!this.in(x, y)) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a; }
  r(ramp, t, x, y, a = 255) { const R = RGB[ramp]; this.set(x, y, R[clamp(Math.round(t), 0, R.length - 1)], a); }
  a(x, y) { return this.in(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0; }
  /** the crisp dark outline round every opaque shape (4-neighbour), and an optional pixel halo of light outside it */
  outline(halo = null, haloA = 0) {
    const o = [], g = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (this.a(x, y) > 40) continue; const n = (this.a(x - 1, y) > 40) + (this.a(x + 1, y) > 40) + (this.a(x, y - 1) > 40) + (this.a(x, y + 1) > 40); if (n) o.push([x, y]); }
    for (const [x, y] of o) this.set(x, y, INK);
    if (halo && haloA > 0) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (this.a(x, y)) continue; if (this.a(x - 1, y) || this.a(x + 1, y) || this.a(x, y - 1) || this.a(x, y + 1)) g.push([x, y]); } for (const [x, y] of g) this.set(x, y, halo, haloA); }
  }
  line(x0, y0, x1, y1, fn) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (let k = 0; k < 400; k++) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
}
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
/** sphere-ish light from the upper left for a pixel inside a disc (nx, ny in -1..1): 0..1 */
const sphereL = (nx, ny) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return clamp(0.25 + (-nx * 0.55 - ny * 0.6 + nz * 0.6) * 0.62, 0, 1); };

// ---------------------------------------------------------------- STUDIES: the alembic
function alembic(P, t, o) {
  const liq = o.ready ? 'gold' : 'teal'; const heat = 0.35 + o.hov * 0.65;
  // the walnut board
  for (let y = 47; y <= 52; y++) for (let x = 5; x <= 51; x++) { let tn = y === 47 ? 5 : y === 48 ? 4 : y < 51 ? 3 : 2; if (x === 5 || x === 51) tn -= 1; if (y > 47 && h2(x >> 2, y, 3) > 0.78) tn -= 1; if (y === 49 && (x % 9) === 3) tn = 2; P.r('wood', tn, x, y); }
  // the spirit burner (a brass dome) and its flame
  for (let y = 40; y <= 46; y++) for (let x = 15; x <= 29; x++) { const nx = (x - 22) / 7.5, ny = (y - 46) / 6.5; if (nx * nx + ny * ny > 1) continue; let l = sphereL(nx, ny); if (y === 46) l *= 0.7; P.r('brass', 1 + l * 5, x, y); }
  P.r('brass', 1, 22, 39); P.r('brass', 2, 22, 38);
  const fl = Math.floor(t * 12) % 3; const fh = Math.round(4 + heat * 4 + (fl === 1 ? 1 : 0));
  for (let k = 0; k < fh; k++) { const y = 37 - k; const w = k < 1 ? 1 : k < fh - 2 ? 2 : 1; const sway = fl === 2 && k > fh / 2 ? 1 : 0; for (let dx = -w; dx <= w; dx++) { const core = Math.abs(dx) < w || w === 1; P.r('flame', core ? (k < fh * 0.5 ? 5 : 4) : 2 + (k < 2 ? 1 : 0), 22 + dx + sway, y); } }
  // the tripod and its ring
  P.line(13, 46, 16, 33, (x, y) => P.r('brass', 4, x, y)); P.line(31, 46, 28, 33, (x, y) => P.r('brass', 2, x, y));
  for (let x = 12; x <= 32; x++) { P.r('brass', x < 18 ? 5 : x > 27 ? 2 : 4, x, 33); P.r('brass', x < 18 ? 3 : 1, x, 34); }
  // the swan neck (glass) to the receiver
  const tube = [[24, 5], [30, 4], [36, 6], [41, 11], [44, 18], [45, 27]]; for (let i = 0; i < tube.length - 1; i++) P.line(tube[i][0], tube[i][1], tube[i + 1][0], tube[i + 1][1], (x, y) => { P.r('glass', 5, x, y, 235); P.r('glass', 3, x + 1, y + 1, 220); });
  // the receiving vial with its slow drip
  for (let y = 30; y <= 46; y++) for (let x = 38; x <= 50; x++) { const nx = (x - 44) / 6.2, ny = (y - 40) / 6.5; const neck = y < 35 && Math.abs(x - 44) <= 1; if (!(neck || nx * nx + ny * ny <= 1)) continue; const rim = !neck && nx * nx + ny * ny > 0.62; const lvl = y > 41; if (lvl && !neck) P.r(liq, 1 + sphereL(nx, ny) * 4, x, y); else P.r('glass', rim ? (nx < 0 ? 5 : 2) : neck ? (x < 44 ? 5 : 3) : 1, x, y, rim || neck ? 240 : 120); }
  P.set(41, 37, [255, 255, 255]); P.set(40, 39, RGB.glass[5]);
  { const ph = (t * 0.7) % 1; if (ph < 0.7) { const y = 29 + Math.floor(ph * 16); if (y < 41) P.r(liq, 5, 45, y); } }
  // the flask: a round glass bulb with the liquor in it, a long neck, a lip
  const cx = 22, cy = 22, R = 9.6; const ripple = Math.floor(t * 12) % 4; const level = cy - 1 + (o.hov > 0.5 && ripple % 2 ? -1 : 0);
  for (let y = 3; y <= 33; y++) for (let x = 10; x <= 34; x++) {
    const nx = (x - cx) / R, ny = (y - cy) / R; const d = nx * nx + ny * ny; const neck = y >= 4 && y <= 14 && x >= 19 && x <= 25; const lip = y >= 3 && y <= 4 && x >= 18 && x <= 26; if (!(d <= 1 || neck || lip)) continue;
    if (lip) { P.r('glass', y === 3 ? 6 : 4, x, y); continue; }
    if (neck && d > 1) { const edge = x === 19 || x === 25; P.r('glass', edge ? (x === 19 ? 5 : 2) : x === 20 ? 6 : 1, x, y, edge || x === 20 ? 245 : 110); continue; }
    const rim = d > 0.78; if (y > level && !rim) { let l = sphereL(nx, ny); if (y === level + 1) l = 1; P.r(liq, 1 + l * 5, x, y); continue; }
    if (rim) P.r('glass', nx + ny < -0.3 ? 5 : nx + ny > 0.5 ? 2 : 3, x, y, 245); else P.r('glass', 1, x, y, 105); }
  for (const [x, y] of [[16, 16], [15, 18], [17, 15], [15, 19]]) P.set(x, y, [255, 255, 255]); P.set(28, 28, RGB.glass[5]); P.set(21, 8, [255, 255, 255]); P.set(21, 9, RGB.glass[5]);
  for (let x = 18; x <= 26; x++) { P.r('brass', x < 21 ? 5 : x > 24 ? 2 : 4, x, 12); P.r('brass', x < 21 ? 3 : 1, x, 13); } // a brass clamp round the neck
  // bubbles rising through the liquor (more as it boils), steam from the lip
  const nb = 2 + Math.round(heat * 4); for (let i = 0; i < nb; i++) { const ph = ((t * (0.6 + heat * 1.2)) + i / nb) % 1; const bx = cx - 5 + ((i * 7) % 11) + (Math.floor(ph * 6) % 2); const by = Math.round(31 - ph * (31 - level - 2)); if (by > level + 1) { P.r(liq, 6, bx, by); if (i % 2) P.r(liq, 5, bx + 1, by); } }
  if (o.hov > 0.2 || o.ready) for (let i = 0; i < 4; i++) { const ph = ((t * 0.8) + i / 4) % 1; const sx = 22 + Math.round(Math.sin(ph * 6 + i) * 2), sy = Math.round(2 - ph * 6); if (sy >= 0) P.set(sx, sy, [236, 240, 244], Math.round(200 * (1 - ph))); }
}

// ---------------------------------------------------------------- STARS: the constellation crystal
const CRY_STARS = [[27, 14], [31, 19], [26, 24], [30, 30], [27, 36]];
function crystal(P, t, o) {
  const ramp = o.ready ? 'gold' : 'lapis'; const spin = t * (0.6 + o.hov * 2.4);
  // the walnut base and brass stem
  for (let y = 46; y <= 52; y++) for (let x = 14; x <= 42; x++) { const nx = (x - 28) / 14, ny = (y - 49) / 3.6; if (nx * nx + ny * ny > 1) continue; P.r('wood', y < 48 ? 5 - (nx > 0.4 ? 1 : 0) : y < 50 ? 3 : 2, x, y); }
  for (let y = 40; y <= 46; y++) for (let x = 26; x <= 30; x++) P.r('brass', x === 26 ? 5 : x === 30 ? 1 : 3 + (y === 41 ? 1 : 0), x, y);
  // the gimbal ring: its back half behind the crystal
  const ry = Math.max(1, Math.round(Math.abs(Math.cos(spin)) * 7)); const ring = (front) => { for (let a = 0; a < 200; a++) { const th = (a / 200) * Math.PI * 2; const fz = Math.sin(th); if ((fz > 0) !== front) continue; const x = Math.round(28 + Math.cos(th) * 19), y = Math.round(25 + Math.sin(th) * ry * (Math.cos(spin) > 0 ? 1 : -1)); P.r('brass', front ? (Math.cos(th) < -0.3 ? 6 : Math.cos(th) > 0.5 ? 3 : 5) : 2, x, y); if (front) P.r('brass', 2, x, y + 1); } };
  ring(false); for (const s of [-1, 1]) { P.r('brass', 4, 28 + s * 19, 25); P.r('brass', 2, 28 + s * 19, 26); }
  // the crystal: a hexagonal bipyramid, faceted (left face lit, middle mid, right dark), light inside
  const top = 6, sh = 14, bt = 34, bot = 42; const half = (y) => (y < sh ? ((y - top) / (sh - top)) * 8 : y > bt ? ((bot - y) / (bot - bt)) * 8 : 8);
  for (let y = top; y <= bot; y++) { const hw = half(y); for (let x = Math.round(28 - hw); x <= Math.round(28 + hw); x++) { const u = (x - 28) / Math.max(1, hw); let tn = u < -0.45 ? 5 : u < 0.2 ? 3.6 : 2.2; if (y < sh) tn += 0.8; if (y > bt) tn -= 0.9; if (Math.abs(u + 0.45) < 0.12 || Math.abs(u - 0.2) < 0.1) tn += 0.8; const core = Math.abs(u) < 0.3 && y > 10 && y < 38; if (core) tn += 0.4 + 0.4 * Math.sin(t * 3); if (y === sh || y === bt) tn += 0.6; P.r(ramp, tn, x, y); } }
  // its sealed little constellation: stars twinkle in steps; on hover they ignite and their lines draw in
  const step = Math.floor(t * 8); if (o.hov > 0.3) for (let i = 0; i < CRY_STARS.length - 1; i++) { if (i > o.hov * 5) break; P.line(...CRY_STARS[i], ...CRY_STARS[i + 1], (x, y) => P.set(x, y, [200, 210, 255], 200)); }
  CRY_STARS.forEach(([x, y], i) => { const on = (step + i * 3) % 7 < 4 || o.hov > 0.3; P.set(x, y, on ? [255, 255, 255] : [190, 190, 240]); if (on && ((step + i) % 3 === 0 || o.hov > 0.5)) { P.set(x - 1, y, [170, 180, 255], 220); P.set(x + 1, y, [170, 180, 255], 220); P.set(x, y - 1, [170, 180, 255], 220); P.set(x, y + 1, [170, 180, 255], 220); } });
  for (const [x, y] of [[23, 12], [22, 15], [22, 16]]) P.set(x, y, [255, 255, 255]); // a glint on the lit facet
  ring(true);
  // the gold star finial
  for (const [dx, dy, tn] of [[0, -3, 6], [0, -2, 5], [0, -1, 5], [0, 0, 6], [0, 1, 4], [-1, 0, 5], [-2, 0, 4], [1, 0, 3], [2, 0, 3], [-1, -1, 5], [1, 1, 2]]) P.r('gold', tn, 28 + dx, 3 + dy);
}

// ---------------------------------------------------------------- JOURNAL: the leather book (opens on hover)
const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
function book(P, t, o) {
  const s0 = [8, 26], s1 = [20, 40], f0 = [38, 14], f1 = [50, 28]; // spine edge (near-left), far edge
  const open = clamp(o.open ? 1 : o.hov * 0.45, 0, 1); const ang = open * 2.2; // the cover's angle about the spine
  const TH = 6; const down = (p, k = TH) => [p[0], p[1] + k];
  // the back board and page block
  const block = [s0, f0, f1, s1]; const side = [s1, f1, down(f1), down(s1)]; const spine = [s0, s1, down(s1), down(s0)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (inPoly(x + 0.5, y + 0.5, side)) { const yy = y - (s1[1] + (f1[1] - s1[1]) * ((x - s1[0]) / (f1[0] - s1[0]))); const bottom = yy > TH - 1.5; P.r(bottom ? 'leather' : 'page', bottom ? 2 : (Math.round(yy) % 2 ? 3 : 4) + (x % 7 === 0 ? -1 : 0), x, y); }
    else if (inPoly(x + 0.5, y + 0.5, spine)) { const band = [3, 6, 9].some((b) => Math.abs((y - s0[1]) - (x - s0[0]) * 1.17 - b) < 0.7); P.r(band ? 'gold' : 'leather', band ? 4 : 2 + (x - s0[0] < 2 ? 1 : 0), x, y); }
    else if (inPoly(x + 0.5, y + 0.5, block)) { const v = ((x - s0[0]) * 0.6 + (y - s0[1]) * 0.3); const line = open > 0.3 && Math.floor(v) % 3 === 0 && h2(x >> 1, y, 2) > 0.35 && x > s0[0] + 5 && x < f1[0] - 4; P.r('page', line ? 1 : 5 - (x > 34 ? 1 : 0), x, y); } }
  if (open > 0.3) { const turn = (t * 1.4) % 1; if (o.hov > 0.5 && turn < 0.4) { const k = turn / 0.4; const pf0 = lerp2(f0, [s0[0] + 4, s0[1] - 22], Math.sin(k * Math.PI) * 0.9); const pf1 = lerp2(f1, [s1[0] + 6, s1[1] - 22], Math.sin(k * Math.PI) * 0.9); const pg = [s0, [pf0[0] - (pf0[0] - s0[0]) * k * 0.6, pf0[1]], [pf1[0] - (pf1[0] - s1[0]) * k * 0.6, pf1[1]], s1]; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inPoly(x + 0.5, y + 0.5, pg)) P.r('page', 6 - (x % 5 === 0 ? 1 : 0), x, y); } }
  // the ribbon
  for (let k = 0; k < 7; k++) { P.set(32 + (k > 3 ? 1 : 0), 34 + k, hex('#b01c22')); P.set(33 + (k > 3 ? 1 : 0), 34 + k, hex('#701014')); }
  // the cover, turned up about the spine by `ang` (seen edge-on at a right angle, its endpaper beyond)
  const up = [-0.35, -1]; const lift = (p, s) => { const dx = p[0] - s[0], dy = p[1] - s[1]; const L = Math.hypot(dx, dy); const c = Math.cos(ang), sn = Math.sin(ang); return [s[0] + dx * c + up[0] * L * sn * 0.75, s[1] + dy * c + up[1] * L * sn * 0.75]; };
  const c0 = s0, c1 = s1, c2 = lift(f1, s1), c3 = lift(f0, s0); const cover = [c0, c3, c2, c1]; const inside = ang > Math.PI / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!inPoly(x + 0.5, y + 0.5, cover)) continue;
    if (inside) { const m = Math.sin(x * 0.9 + Math.sin(y * 0.6) * 2) > 0.3; P.set(x, y, m ? hex('#2a3e7a') : hex('#8a2a2a')); continue; } // marbled endpaper
    const u = ((x - c0[0]) / (c2[0] - c0[0] + 1e-3)); let tn = 4.2 - u * 1.6 - (y - 14) * 0.02 + (h2(x, y, 7) > 0.8 ? -0.7 : h2(x, y, 9) > 0.85 ? 0.6 : 0) - ang * 0.6; P.r('leather', tn, x, y); }
  if (!inside) { // a tooled border, brass corners and the gilt apple
    const k = 1 - ang / (Math.PI / 2); const cc = (p, q, f) => lerp2(p, q, f); const mid = [(c0[0] + c1[0] + c2[0] + c3[0]) / 4, (c0[1] + c1[1] + c2[1] + c3[1]) / 4];
    for (const p of cover) { const q = cc(p, mid, 0.14); P.r('brass', 5, q[0], q[1]); P.r('brass', 3, q[0] + 1, q[1]); P.r('brass', 2, q[0], q[1] + 1); }
    for (let i = 0; i < 4; i++) { const a = cc(cover[i], mid, 0.22), b = cc(cover[(i + 1) % 4], mid, 0.22); P.line(a[0], a[1], b[0], b[1], (x, y) => P.r('leather', 1, x, y)); }
    if (k > 0.35) { const ax = Math.round(mid[0]), ay = Math.round(mid[1]); const AP = ['..kk..', '.kgk..', 'kgggk.', 'gggggk', 'gGgggk', 'kgggk.', '.kkk..']; AP.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; P.r('gold', ch === 'k' ? 2 : ch === 'G' ? 6 : 4 + (i < 2 ? 1 : 0), ax - 3 + i, ay - 3 + j); } }); }
  }
}

// ---------------------------------------------------------------- SETTINGS: the gear train
function gearPx(P, cx, cy, R, teeth, rot, ramp, x, y) {
  const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const r = Math.hypot(dx, dy); if (r > R + 0.5) return false; const th = Math.atan2(dy, dx) - rot; const f = (((th / (Math.PI * 2)) * teeth) % 1 + 1) % 1; const rr = f > 0.18 && f < 0.62 ? R : R * 0.8;
  if (r > rr) return false; const ri = R * 0.34, ro = R * 0.62; const spokes = teeth > 10 ? 5 : 4; const sf = (((th / (Math.PI * 2)) * spokes) % 1 + 1) % 1; if (r > ri && r < ro && sf > 0.18 && sf < 0.82 && R > 8) return false; // windows between the spokes
  if (r < R * 0.14 && R > 6) { P.r('iron', r < R * 0.07 ? 1 : 4, x, y); return true; } // the axle
  const nx = dx / (r || 1), ny = dy / (r || 1); const edgeOut = rr - r < 1.4; const edgeIn = (r > ri && r < ro + 1.2 && Math.abs(r - ro) < 1.2) || (Math.abs(r - ri) < 1.2 && R > 8); let tn = 3 + (h2(x, y, R) > 0.86 ? 0.6 : 0);
  if (edgeOut) tn = -nx * 0.6 - ny * 0.8 > 0.1 ? 5.5 : 1.2; else if (edgeIn) tn = nx * 0.6 + ny * 0.8 > 0.1 ? 5 : 1.6; else if (Math.abs(r - R * 0.74) < 0.6) tn = 2.2; // bevels and a turned groove
  P.r(ramp, tn, x, y); return true;
}
function gears(P, t, o) {
  const rot = o.spin; const big = [25, 27, 18, 12], small = [44, 43, 10, 8], tiny = [45, 11, 7, 6];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (gearPx(P, big[0], big[1], big[2], big[3], rot, 'brass', x, y)) continue; if (gearPx(P, small[0], small[1], small[2], small[3], -rot * (12 / 8) + 0.2, 'iron', x, y)) continue; gearPx(P, tiny[0], tiny[1], tiny[2], tiny[3], -rot * (12 / 6) + 0.1, 'brass', x, y); }
  // the engraved dial on the big gear: ivory face, ticks, a blued needle
  for (let y = 18; y <= 36; y++) for (let x = 16; x <= 34; x++) { const dx = x + 0.5 - 25, dy = y + 0.5 - 27; const r = Math.hypot(dx, dy); if (r > 6.6) continue; const a = Math.atan2(dy, dx); const tick = r > 4.6 && (Math.round((a / (Math.PI * 2)) * 12 + 12) % 3 === 0); if (r > 5.8) P.r('brass', -dx - dy > 0 ? 6 : 2, x, y); else P.r('page', tick ? 1 : 5 - (dx + dy > 3 ? 1 : 0), x, y); }
  const na = -rot * 0.5 - 1.2; P.line(25, 27, 25 + Math.cos(na) * 4.5, 27 + Math.sin(na) * 4.5, (x, y) => P.set(x, y, hex('#20283e'))); P.set(25, 27, hex('#c8a040'));
  for (const [x, y] of [[13, 15], [14, 14], [15, 13]]) P.set(x, y, [255, 246, 210]); // a glint on the rim
}

export const DRAW = { studies: alembic, stars: crystal, journal: book, settings: gears };

// ---------------------------------------------------------------- LOCKED (menu features open with the first won run):
// the instrument goes cold (desaturated to a dim slate ramp), two iron chains cross it and a brass padlock hangs on the
// crossing; hovering rattles the chains, a press shakes the lock
const SLATE = ['#07080c', '#12141c', '#1e222e', '#2c3140', '#3c4254', '#52586c', '#6e7488'].map(hex);
function chained(P, t, rattle) {
  for (let i = 0; i < P.d.length; i += 4) { if (!P.d[i + 3]) continue; const l = (P.d[i] * 0.3 + P.d[i + 1] * 0.55 + P.d[i + 2] * 0.15) / 255; const c = SLATE[clamp(Math.round(l * 6.4), 0, 6)]; P.d[i] = c[0]; P.d[i + 1] = c[1]; P.d[i + 2] = c[2]; }
  const sway = Math.round(Math.sin(t * 30) * rattle * 1.4);
  const chain = (x0, y0, x1, y1, ph) => { const L = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / L, uy = (y1 - y0) / L; for (let s = 0; s < L; s += 4) { const sag = Math.sin((s / L) * Math.PI) * (2 + sway); const cx = x0 + ux * s, cy = y0 + uy * s + sag; const flat = ((s / 4 + ph) | 0) % 2;
      if (flat) { for (let k = -1; k <= 2; k++) { P.r('iron', k < 1 ? 5 : 3, cx + ux * k, cy + uy * k); P.r('iron', 1, cx + ux * k, cy + uy * k + 1); } }
      else { for (const [dx, dy, tn] of [[0, -1, 6], [1, 0, 4], [0, 1, 2], [-1, 0, 5]]) P.r('iron', tn, cx + dx, cy + dy); P.set(cx, cy, [10, 10, 14], 0); } } };
  chain(4, 10, 52, 40, 0); chain(52, 10, 4, 40, 1);
  // the padlock on the crossing: a squared iron shackle over a hammered brass body with a keyhole
  const lx = 28 + sway, ly = 30; for (let y = ly - 8; y <= ly - 1; y++) for (const x of [lx - 4, lx - 3, lx + 3, lx + 4]) P.r('iron', x < lx ? (x === lx - 4 ? 5 : 4) : (x === lx + 4 ? 2 : 3), x, y);
  for (let x = lx - 4; x <= lx + 4; x++) { P.r('iron', x < lx ? 6 : 4, x, ly - 9); P.r('iron', 3, x, ly - 8); }
  for (let y = ly; y <= ly + 9; y++) for (let x = lx - 6; x <= lx + 6; x++) { let tn = 4 - (x - lx) * 0.22 - (y - ly) * 0.12 + (h2(x, y, 5) > 0.82 ? -0.8 : 0); if (y === ly) tn = 6; if (x === lx - 6) tn += 0.8; if (x === lx + 6 || y === ly + 9) tn = 1.4; P.r('brass', tn, x, y); }
  for (const [dx, dy] of [[0, 3], [0, 4], [-1, 3], [1, 3], [0, 5], [0, 6]]) P.set(lx + dx, ly + dy, [16, 8, 6]);
  P.set(lx - 4, ly + 1, [255, 244, 200]); P.set(lx - 3, ly + 1, [255, 230, 160]);
}
const HALO = { studies: [120, 255, 220], stars: [190, 170, 255], journal: [255, 214, 150], settings: [255, 226, 150] };
const GOLD_HALO = [255, 216, 110];

export class MenuSprites {
  constructor(UI, items) {
    this.UI = UI; const root = (this.el = UI.el('div', '', null, UI.root)); Object.assign(root.style, { position: 'absolute', display: 'flex', alignItems: 'flex-end', pointerEvents: 'none', transition: 'opacity .4s, transform .5s cubic-bezier(.3,1.4,.5,1)' });
    this.items = items.map((it, i) => {
      const box = UI.el('div', '', null, root); Object.assign(box.style, { position: 'relative', pointerEvents: 'auto', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' });
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CW; cv.className = 'lf-cv'; box.appendChild(cv);
      const lab = UI.el('div', 'lf-title lf-gold', it.label, box); Object.assign(lab.style, { position: 'absolute', bottom: '0', left: '50%', transform: 'translate(-50%, 100%)', opacity: 0, transition: 'opacity .2s', pointerEvents: 'none' });
      if (it.locked) { lab.textContent = ''; lab.appendChild(document.createTextNode(it.label)); const hint = UI.el('div', 'lf-body lf-soft', 'Win a run to unlock', lab); hint.style.whiteSpace = 'nowrap'; Object.assign(lab.style, { bottom: 'auto', top: '0', transform: 'translate(-50%, -100%)', textAlign: 'center' }); } // (above the icon: the hint never runs off the screen's foot)
      const S = { ...it, i, box, cv, lab, g: cv.getContext('2d'), P: new Px(CW, CW), off: new Px(N, N), hov: 0, hovOn: false, press: 0, spin: 0, spinV: 0, sparks: [], step: -1, rattle: 0 };
      box.addEventListener('pointerenter', () => { S.hovOn = true; lab.style.opacity = 1; it.onHover?.(S, true); });
      box.addEventListener('pointerleave', () => { S.hovOn = false; lab.style.opacity = 0; it.onHover?.(S, false); });
      box.addEventListener('pointerdown', (e) => { e.stopPropagation(); it.onClick?.(S); });
      return S; });
    this.visible = true; this.place();
  }
  /** the squash and a burst of sparks; the gears get a quick wind */
  press(S) { if (S.locked) { S.rattle = 1; return; } S.press = 1; S.spinV += 9; for (let k = 0; k < 10; k++) S.sparks.push({ x: CW / 2 + (Math.random() - 0.5) * 30, y: CW / 2 + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 25, life: 0.6 + Math.random() * 0.4 }); }
  place() { const k = this.scale(); for (const S of this.items) { S.cv.style.width = S.cv.style.height = CW * k + 'px'; S.box.style.marginRight = 2 * k + 'px'; } Object.assign(this.el.style, { left: 8 * k + 'px', bottom: 24 * k + 'px' }); }
  scale() { return Math.max(1, Math.round(innerHeight / 330)); }
  show(on) { this.visible = on; this.el.style.opacity = on ? 1 : 0; this.el.style.transform = on ? 'none' : `translateY(${this.scale() * 12}px)`; for (const S of this.items) S.box.style.pointerEvents = on ? 'auto' : 'none'; }
  /** screen-space centre of an icon (client px) */
  centerOf(S) { const r = S.cv.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  update(dt, t, state = {}) {
    if (this._k !== this.scale()) { this._k = this.scale(); this.place(); }
    for (const S of this.items) {
      S.hov += ((S.hovOn ? 1 : 0) - S.hov) * Math.min(1, dt * 10); if (S.locked) { if (S.hovOn && S.hov < 0.3) S.rattle = Math.max(S.rattle, 0.5); S.rattle = Math.max(0, S.rattle - dt * 1.6); } S.press = Math.max(0, S.press - dt * 4); S.spinV *= Math.exp(-dt * 2.4); S.spin += dt * (0.25 + S.hov * 1.6) + S.spinV * dt;
      const st = { hov: S.locked ? 0 : S.hov, ready: S.locked ? false : S.key === 'studies' ? state.ready : S.key === 'stars' ? state.fresh : false, open: S.key === 'journal' && state.open, spin: S.locked ? 0 : S.spin };
      if (S.locked) S.sparks.length = 0;
      if (st.ready && Math.random() < dt * 4) S.sparks.push({ x: PAD + 6 + Math.random() * (N - 12), y: PAD + 6 + Math.random() * (N - 20), vx: (Math.random() - 0.5) * 4, vy: -6 - Math.random() * 6, life: 1.1, gold: true });
      if (S.hov > 0.5 && Math.random() < dt * 3) S.sparks.push({ x: PAD + 4 + Math.random() * (N - 8), y: PAD + 4 + Math.random() * (N - 16), vx: (Math.random() - 0.5) * 5, vy: -5 - Math.random() * 6, life: 0.9 });
      for (const p of S.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 12 * dt; p.life -= dt; } S.sparks = S.sparks.filter((p) => p.life > 0);
      // repaint on the 12 fps animation step (and whenever the pointer or the press changes it)
      const step = Math.floor(t * 12); const key = step + '|' + (S.hov > 0.5) + '|' + Math.round(S.press * 6) + '|' + st.ready + '|' + st.open + '|' + S.sparks.length + '|' + Math.round(S.rattle * 8);
      if (key === S.step) continue; S.step = key; const tq = step / 12;
      const O = S.off; O.clear(); DRAW[S.key](O, tq, st); if (S.locked) chained(O, t, S.rattle);
      const P = S.P; P.clear(); const sq = S.press > 0 ? Math.sin(S.press * Math.PI) : 0; const sw = Math.round(N * (1 + sq * 0.1)), sh = Math.round(N * (1 - sq * 0.12)); const lift = 0;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const ox = Math.floor((x * N) / sw), oy = Math.floor((y * N) / sh); const i = (oy * N + ox) * 4; const a = O.d[i + 3]; if (!a) continue; const X = PAD + x - Math.floor((sw - N) / 2), Y = PAD + y + (N - sh) - lift; if (!P.in(X, Y)) continue; const j = (Y * CW + X) * 4; P.d[j] = O.d[i]; P.d[j + 1] = O.d[i + 1]; P.d[j + 2] = O.d[i + 2]; P.d[j + 3] = a; }
      S.box.style.transform = ''; const glow = st.ready ? 0.55 + 0.35 * Math.sin(t * 4) : S.locked ? S.hov * 0.35 : S.hov * 0.85; P.outline(st.ready ? GOLD_HALO : S.locked ? [150, 160, 190] : HALO[S.key], Math.round(glow * 200));
      for (const p of S.sparks) { const x = Math.round(p.x), y = Math.round(p.y); const c = p.gold ? [255, 226, 120] : [255, 248, 220]; const a = Math.round(255 * Math.min(1, p.life * 2)); P.set(x, y, c, a); if (p.life > 0.5) { P.set(x - 1, y, c, a >> 1); P.set(x + 1, y, c, a >> 1); P.set(x, y - 1, c, a >> 1); P.set(x, y + 1, c, a >> 1); } }
      S.g.putImageData(new ImageData(P.d, CW, CW), 0, 0);
      S.box.style.transform = S.locked ? `translateX(${Math.round(Math.sin(t * 38) * S.rattle * 1.5) * this.scale()}px)` : `translateY(${-Math.round(S.hov * 2) * this.scale()}px)`;
    }
  }
  dispose() { this.el.remove(); }
}
