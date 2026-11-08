// Hand-drawn pixel art for every physical object that is not a card or character.
// Each drawing is painted pixel by pixel (shading ramps, dithering, selective outlines, specular glints)
// at native resolution and upscaled with nearest filtering. Nothing here is a raw geometric primitive.
import { PixelCanvas, bayer } from './pixel.js';
import { R, INK } from './palette.js';
import { mulberry32 } from '../core/util.js';

const BRASS = ['#2e1a0a', '#5e3c16', '#93652a', '#c99a46', '#ecc874', '#fff0c0'];
const WOOD = ['#24120a', '#4a2a16', '#6e4024', '#8a5634', '#b07444', '#d39a62'];
const LEATHER = ['#1e0e08', '#3e2012', '#5e3420', '#80502e', '#a46e42', '#c89060'];
const WICKER = ['#2a1608', '#5a3414', '#8a5a26', '#b88440', '#dcb066', '#f2d494'];
const PAPER = ['#8a7a5a', '#b8a882', '#d8caa4', '#efe4c6', '#fbf6e6'];
const STONE = ['#1e1a20', '#3a3540', '#575160', '#78717e', '#9c94a0', '#c4bcc4'];
const pick = (ramp, t, x, y, d = 1) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1) + (bayer(x, y) - 0.5) * d)))];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// lit annulus (bezels, rims): light from top-left, bevel inside/outside
function bezel(pc, cx, cy, r0, r1, ramp, { bolts = 0 } = {}) {
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy); if (d < r0 || d > r1) continue;
    const t = (d - r0) / (r1 - r0); const nx = dx / d, ny = dy / d; const ridge = Math.sin(t * Math.PI);
    const l = 0.5 + (-nx * 0.5 - ny * 0.7) * (t < 0.5 ? -1 : 1) * 0.55 + ridge * 0.25;
    pc.px(x, y, pick(ramp, clamp01(l), x, y, 0.8));
  }
  for (let i = 0; i < bolts; i++) { const a = (i / bolts) * Math.PI * 2 + Math.PI / 4; const bx = cx + Math.cos(a) * (r0 + r1) / 2, by = cy + Math.sin(a) * (r0 + r1) / 2; screw(pc, bx, by, 2.6, ramp); }
}
function screw(pc, x, y, r, ramp) { pc.ball(x, y, r, r, ramp, { ditherAmt: 0 }); pc.line(x - r * 0.6, y + r * 0.6, x + r * 0.6, y - r * 0.6, ramp[0]); }
function glint(pc, x, y, s = 2) { pc.px(x, y, '#ffffff'); for (let i = 1; i <= s; i++) { pc.px(x - i, y, '#fff6d0'); pc.px(x + i, y, '#fff6d0'); pc.px(x, y - i, '#fff6d0'); pc.px(x, y + i, '#fff6d0'); } }
function woodGrain(pc, x0, y0, w, h, ramp = WOOD, seed = 1, vertical = false) {
  const rnd = mulberry32(seed); const knots = [[rnd() * w, rnd() * h], [rnd() * w, rnd() * h]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = vertical ? y : x, v = vertical ? x : y; let warp = Math.sin(u * 0.05 + v * 0.02) * 2;
    for (const [kx, ky] of knots) { const dd = Math.hypot(x - kx, (y - ky) * 2); if (dd < 7) warp += (7 - dd) * 0.8; }
    const g = Math.sin((v + warp) * 0.9) * 0.5 + 0.5; const edge = Math.min(y, h - 1 - y) < 1 ? -0.3 : (y === 1 ? 0.15 : 0);
    pc.px(x0 + x, y0 + y, pick(ramp, clamp01(0.35 + g * 0.35 + edge + (rnd() - 0.5) * 0.12), x0 + x, y0 + y, 0.6));
  }
}
function nail(pc, x, y) { pc.px(x, y, '#2a2a30'); pc.px(x + 1, y, '#6a6a78'); pc.px(x, y + 1, '#4a4a58'); pc.px(x + 1, y + 1, '#2a2a30'); pc.px(x, y - 1, '#9a9aaa'); }

const DRAW = {
  // ---------------------------------------------------------------- UI objects
  gauge() { // brass pressure gauge (needle drawn separately)
    const pc = new PixelCanvas(128, 140); const cx = 64, cy = 62;
    // pipe & valve underneath
    for (let y = 104; y < 136; y++) for (let x = 56; x < 72; x++) pc.px(x, y, pick(BRASS, 0.3 + (x - 56) / 16 * 0.5 - (x > 66 ? 0.3 : 0), x, y));
    for (let x = 40; x < 88; x++) for (let y = 120; y < 128; y++) pc.px(x, y, pick(BRASS, 0.55 - (y - 120) * 0.06 + (x < 46 || x > 82 ? -0.2 : 0), x, y));
    for (const vx of [42, 86]) { pc.ball(vx, 124, 6, 6, BRASS, { ditherAmt: 0.4 }); screw(pc, vx, 124, 2.4, BRASS); }
    bezel(pc, cx, cy, 44, 58, BRASS, { bolts: 6 });
    // dial face: ivory with paper grain
    for (let y = cy - 44; y <= cy + 44; y++) for (let x = cx - 44; x <= cx + 44; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > 44) continue; const vign = d / 44; pc.px(x, y, pick(PAPER, 0.92 - vign * vign * 0.45 - (y - cy) * 0.002, x, y, 1.2)); }
    // ticks + numerals, danger arc
    for (let i = 0; i <= 40; i++) {
      const a = -Math.PI * 1.25 + (i / 40) * Math.PI * 1.5; const big = i % 5 === 0; const r1 = 40, r0 = big ? 32 : 36;
      const col = i <= 8 ? '#a8241e' : '#2a160c'; pc.thickLine(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, big ? 1.6 : 1, col);
    }
    for (let i = 0; i < 60; i++) { const a = -Math.PI * 1.25 + (i / 60) * Math.PI * 0.3; for (let r = 41; r < 44; r++) pc.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 ? '#c8443a' : '#8f2a2e'); }
    pc.text('PLUMB', cx, cy + 14, { font: 'Silkscreen', size: 8, color: '#5a3622', align: 'center' });
    pc.text('& CO.', cx, cy + 23, { font: 'Silkscreen', size: 8, color: '#5a3622', align: 'center' });
    // glass reflection
    for (let i = 0; i < 26; i++) { const a = -2.4 + i * 0.03; for (let r = 30; r < 38; r++) if ((r + i) % 3) pc.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, '#ffffffaa'); }
    glint(pc, cx - 26, cy - 24, 3);
    pc.outline(INK); return pc;
  },
  needle() { const pc = new PixelCanvas(16, 64); for (let y = 4; y < 54; y++) { const w = Math.max(1, Math.round((y - 4) / 50 * 3)); for (let x = 8 - w; x <= 8 + w; x++) pc.px(x, y, x < 8 ? '#e8705a' : x > 8 ? '#8f2a2e' : '#c8443a'); } pc.ball(8, 54, 6, 6, BRASS, { ditherAmt: 0 }); glint(pc, 6, 52, 1); pc.outline(INK); return pc; },
  bell(frame = 0) { // brass desk bell on a carved walnut base; frame 1 = pressed
    const pc = new PixelCanvas(128, 108); const cx = 64, press = frame ? 4 : 0;
    // base: carved walnut with brass edge band
    for (let y = 80; y < 104; y++) { const inset = y < 84 ? 84 - y : y > 99 ? y - 99 : 0; for (let x = 14 + inset; x < 114 - inset; x++) { const band = y >= 86 && y <= 88; const t = band ? 0.75 + Math.sin(x * 0.4) * 0.1 : 0.4 + Math.sin((x + y * 3) * 0.35) * 0.08 - (y - 80) * 0.012 + (x < 22 || x > 106 ? -0.15 : 0); pc.px(x, y, pick(band ? BRASS : WOOD, t, x, y)); } }
    for (const x of [24, 104]) screw(pc, x, 94, 2.2, BRASS);
    // plunger
    for (let y = 18 + press; y < 32; y++) for (let x = cx - 3; x <= cx + 3; x++) pc.px(x, y, pick(BRASS, 0.75 - (x - cx + 3) * 0.08, x, y));
    pc.ball(cx, 16 + press, 7, 5, BRASS, { ditherAmt: 0.3 }); glint(pc, cx - 3, 14 + press, 1);
    // dome: shaded hemisphere with environment reflections
    const rx = 44, ry = 50, cy = 82 + press * 0.5;
    for (let y = Math.floor(cy - ry); y < cy; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; const d = nx * nx + ny * ny; if (d > 1) continue;
      const nz = Math.sqrt(1 - d); let l = 0.45 + (-nx * 0.45 - ny * 0.35 + nz * 0.4) * 0.6;
      if (Math.abs(nx + 0.42) < 0.06 && ny < -0.15) l = 1; // window reflection streak
      if (Math.abs(nx - 0.55) < 0.03 && ny < -0.3) l += 0.3;
      if (ny > -0.18) l -= 0.12; // horizon band reflection of the desk
      pc.px(x, y, pick(BRASS, clamp01(l), x, y, 0.7));
    }
    for (let x = cx - rx; x <= cx + rx; x++) { pc.px(x, cy, BRASS[1]); pc.px(x, cy - 1, BRASS[4]); }
    glint(pc, cx - 18, cy - 38, 3);
    if (frame) for (let i = 0; i < 3; i++) { const a = -0.9 - i * 0.6; pc.thickLine(cx + Math.cos(a) * 52, cy - 52 + Math.sin(a) * 6, cx + Math.cos(a) * 62, cy - 58 + Math.sin(a) * 8, 1.5, '#ffe08a'); }
    pc.outline(INK); return pc;
  },
  basket() { // wicker basket of crumpled theories
    const pc = new PixelCanvas(128, 116); const top = 36, bot = 110;
    const half = (y) => 50 - (y - top) * 0.16;
    // crumpled papers peeking out (behind rim)
    const balls = [[38, 34, 14], [62, 26, 16], [86, 34, 13], [52, 38, 11], [76, 40, 11]];
    for (const [bx, by, r] of balls) { for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) { const nx = (x - bx) / r, ny = (y - by) / r; const d = nx * nx + ny * ny; if (d > 1) continue; const crease = Math.sin(nx * 9 + ny * 5) * Math.cos(nx * 4 - ny * 8); pc.px(x, y, pick(PAPER, clamp01(0.75 - nx * 0.2 - ny * 0.35 + crease * 0.18), x, y)); } for (let k = 0; k < 4; k++) pc.line(bx - r * 0.5 + k * 3, by - r * 0.4 + k, bx - r * 0.2 + k * 4, by + r * 0.3, PAPER[1]); }
    pc.text('E=?', 60, 20, { font: 'Silkscreen', size: 8, color: '#3a3a8a' });
    // woven body
    for (let y = top; y < bot; y++) { const h = half(y); for (let x = Math.round(64 - h); x <= 64 + h; x++) {
      const u = (x - 64) / h; const row = Math.floor((y - top) / 5), col = Math.floor((x + (row % 2) * 4) / 8); const over = (row + col) % 2 === 0;
      const lx = (x + (row % 2) * 4) % 8, ly = (y - top) % 5; let t = over ? 0.62 - Math.abs(lx - 3.5) * 0.06 : 0.42 - Math.abs(ly - 2) * 0.08;
      t += -u * 0.18 + (ly === 0 ? -0.2 : 0) - (y - top) / (bot - top) * 0.18;
      pc.px(x, y, pick(WICKER, clamp01(t), x, y, 0.5));
    } }
    // braided rim
    for (let x = 10; x <= 118; x++) for (let y = top - 6; y < top + 2; y++) { const ph = (x * 0.5 + y * 0.9) % 3.14; pc.px(x, y, pick(WICKER, clamp01(0.4 + Math.sin(ph * 2) * 0.3 - (y - top + 6) * 0.04), x, y)); }
    pc.outline(INK); return pc;
  },
  pouch() { // stitched leather coin pouch with drawstring and spilled coins
    const pc = new PixelCanvas(112, 112); const cx = 54;
    for (let y = 30; y < 106; y++) { const t = (y - 30) / 76; const w = Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62) * 42 + 10; for (let x = Math.round(cx - w); x <= cx + w; x++) { const u = (x - cx) / w; const fold = Math.sin(u * 7 + t * 3) * 0.08; pc.px(x, y, pick(LEATHER, clamp01(0.55 - u * 0.3 - t * 0.25 + fold + (t < 0.15 ? 0.1 : 0)), x, y)); } }
    // gathered neck + drawstring
    for (let y = 18; y < 34; y++) { const w = 14 + (y - 18) * 0.5 + Math.sin(y) * 1.5; for (let x = Math.round(cx - w); x <= cx + w; x++) pc.px(x, y, pick(LEATHER, clamp01(0.5 - (x - cx) / w * 0.3 + Math.sin(x * 1.3) * 0.12), x, y)); }
    for (let x = cx - 18; x <= cx + 20; x++) { const y = 31 + Math.sin((x - cx) * 0.3) * 1.2; pc.px(x, y, '#c8a060'); pc.px(x, y + 1, '#8a6030'); }
    pc.thickLine(cx + 18, 32, cx + 30, 48, 2, '#c8a060'); pc.thickLine(cx + 16, 32, cx + 22, 50, 2, '#a88040');
    // stitching
    for (let y = 40; y < 98; y += 4) { const t = (y - 30) / 76; const w = Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62) * 42 + 10; pc.px(cx - w + 4, y, '#e0c090'); pc.px(cx + w - 4, y + 2, '#e0c090'); }
    // coins
    for (const [x, y, r] of [[86, 96, 9], [98, 102, 8], [74, 104, 7]]) { pc.ellipse(x, y, r, r * 0.55, BRASS[1]); pc.ellipse(x, y - 1, r, r * 0.55, BRASS[4]); pc.ellipse(x, y - 1, r - 2, r * 0.55 - 1.5, BRASS[3]); glint(pc, x - r * 0.4, y - 2, 1); }
    glint(pc, cx - 24, 50, 2);
    pc.outline(INK); return pc;
  },
  sign(w = 160, h = 44, seed = 1, tint = null) { // carved wooden plank sign with nails and rope
    const pc = new PixelCanvas(w, h); const ramp = tint === 'red' ? ['#2a0a0c', '#4a1418', '#6e2024', '#8f2a2e', '#b8443a', '#d87050'] : tint === 'teal' ? ['#0a2020', '#163b3c', '#245a58', '#2d6e6a', '#4fa79a', '#7cc8b8'] : tint === 'purple' ? ['#140d26', '#22183f', '#3e2b6b', '#553a8a', '#6b4c9a', '#9b7cc8'] : WOOD;
    woodGrain(pc, 2, 4, w - 4, h - 8, ramp, seed);
    for (let x = 2; x < w - 2; x++) { pc.px(x, 4, ramp[5] || ramp[4]); pc.px(x, h - 5, ramp[0]); }
    // chipped corners
    for (const [x, y] of [[2, 4], [w - 3, 4], [2, h - 5], [w - 3, h - 5]]) { pc.erase(x, y); }
    nail(pc, 6, h / 2 - 1); nail(pc, w - 8, h / 2 - 1);
    pc.outline(INK); return pc;
  },
  token() { const pc = new PixelCanvas(32, 32); bezel(pc, 16, 16, 9, 14, BRASS); for (let y = 7; y < 26; y++) for (let x = 7; x < 26; x++) { const d = Math.hypot(x - 16, y - 16); if (d < 9) pc.px(x, y, pick(BRASS, 0.55 - (x + y - 32) * 0.02, x, y)); } for (let a = 0; a < 9; a += 0.25) pc.px(16 + Math.cos(a) * a * 0.8, 16 + Math.sin(a) * a * 0.8, BRASS[1]); glint(pc, 11, 10, 1); pc.outline(INK); return pc; },

  // ---------------------------------------------------------------- map standees (HD-2D)
  mk_battle() { const pc = new PixelCanvas(64, 96); woodGrain(pc, 29, 30, 6, 64, WOOD, 3, true); for (const s of [-1, 1]) { pc.thickLine(32 - s * 18, 20, 32 + s * 16, 52, 3, STONE[4]); pc.thickLine(32 - s * 18, 20, 32 + s * 16, 52, 1, '#e8e8f0'); pc.thickLine(32 + s * 12, 46, 32 + s * 20, 54, 3, WOOD[3]); pc.ball(32 + s * 21, 55, 2.5, 2.5, BRASS); } for (let y = 30; y < 50; y++) for (let x = 35; x < 35 + 22 - (y - 30) * 0.6; x++) pc.px(x, y + Math.sin(x * 0.3) * 1.5, pick(R.red, 0.6 - (y - 30) * 0.015 + Math.sin(x * 0.5) * 0.1, x, y)); pc.outline(INK); return pc; },
  mk_elite() { const pc = new PixelCanvas(72, 112); woodGrain(pc, 33, 40, 7, 70, WOOD, 4, true);
    for (let y = 44; y < 80; y++) for (let x = 40; x < 66; x++) { if ((x * 7 + y * 3) % 11 === 0 && y > 70) continue; pc.px(x, y + Math.sin(x * 0.4) * 2, pick(R.red, 0.55 - (x - 40) * 0.01 + Math.sin(y * 0.3) * 0.1, x, y)); }
    for (let y = 8; y < 44; y++) for (let x = 20; x < 54; x++) { const nx = (x - 37) / 15, ny = (y - 24) / 18; if (nx * nx + ny * ny * (ny > 0 ? 1.6 : 1) > 1) continue; pc.px(x, y, pick(['#6a604a', '#a89c80', '#d8ccb0', '#f0e8d4'], clamp01(0.7 - nx * 0.2 - ny * 0.3), x, y)); }
    for (const s of [-1, 1]) { pc.ellipse(37 + s * 7, 22, 3.5, 4, '#1a1010'); pc.px(37 + s * 7, 21, '#ff4020'); pc.thickLine(37 + s * 13, 12, 37 + s * 26, 4, 4, '#e8dcc0'); pc.thickLine(37 + s * 26, 4, 37 + s * 30, 10, 3, '#c8b898'); }
    pc.line(33, 34, 41, 34, '#3a2a20'); pc.line(34, 36, 40, 36, '#3a2a20'); pc.outline(INK); return pc; },
  mk_event() { const pc = new PixelCanvas(64, 100); woodGrain(pc, 29, 36, 6, 62, WOOD, 5, true); woodGrain(pc, 10, 14, 44, 26, WOOD, 6);
    pc.text('?', 32, 13, { font: 'Pixelify', size: 26, color: '#ffe08a', align: 'center', weight: 700, outline: '#3a2410' }); nail(pc, 13, 26); nail(pc, 49, 26);
    // hanging lantern
    pc.line(48, 40, 48, 50, '#3a3a40'); for (let y = 50; y < 64; y++) for (let x = 43; x < 54; x++) pc.px(x, y, (x === 43 || x === 53 || y === 50 || y === 63) ? '#3a3a40' : pick(R.fire, 0.6 + (y - 50) * 0.02, x, y)); glint(pc, 47, 55, 1);
    pc.outline(INK); return pc; },
  mk_shop() { const pc = new PixelCanvas(96, 96);
    // barrel lying on its side
    for (let y = 46; y < 90; y++) for (let x = 14; x < 82; x++) { const ny = (y - 68) / 22; const bulge = 1 - ny * ny * 0.25; const nx = (x - 48) / 34; if (Math.abs(nx) > bulge) continue; const hoop = [24, 38, 58, 72].some((h) => Math.abs(x - h) < 2); pc.px(x, y, pick(hoop ? STONE : WOOD, clamp01(0.55 - ny * 0.35 + Math.sin(x * 0.9) * 0.06 + (hoop ? 0.1 : 0)), x, y)); }
    for (let y = 52; y < 84; y++) for (let x = 80; x < 88; x++) { const d = Math.hypot((x - 80) * 3, y - 68); if (d < 16) pc.px(x, y, pick(WOOD, 0.3 + Math.sin(d) * 0.1, x, y)); }
    // awning on poles
    woodGrain(pc, 12, 18, 4, 30, WOOD, 7, true); woodGrain(pc, 80, 18, 4, 30, WOOD, 8, true);
    for (let x = 8; x < 88; x++) for (let y = 10; y < 22 + Math.floor((x % 16) / 8) * 2; y++) pc.px(x, y, pick(Math.floor(x / 8) % 2 ? R.red : PAPER, 0.7 - (y - 10) * 0.03, x, y));
    pc.text('ΔΙΟΓ', 48, 64, { font: 'VT323', size: 16, color: '#f3e6c4', align: 'center' });
    pc.outline(INK); return pc; },
  mk_lab() { const pc = new PixelCanvas(96, 96);
    for (let y = 20; y < 88; y++) { const w = (y - 20) * 0.62 + 4; for (let x = Math.round(48 - w); x <= 48 + w; x++) { const u = (x - 48) / w; const flap = y > 56 && Math.abs(u) < 0.22; pc.px(x, y, flap ? pick(STONE, 0.15, x, y) : pick(['#6a5a3a', '#9a8a60', '#c8b88a', '#e8dcb4'], clamp01(0.65 - u * 0.35 + Math.sin(x * 0.7 + y * 0.2) * 0.05), x, y)); } }
    pc.line(48, 12, 48, 22, WOOD[2]);
    // glowing flask by the entrance + smoke
    for (let y = 72; y < 90; y++) for (let x = 64; x < 80; x++) { const nx = (x - 72) / 8, ny = (y - 82) / 8; if (nx * nx + ny * ny <= 1 || (Math.abs(x - 72) < 2 && y < 78)) pc.px(x, y, pick(R.glow, 0.7 - ny * 0.2, x, y)); }
    for (let i = 0; i < 4; i++) pc.ellipse(70 + i * 3, 64 - i * 8, 4 + i, 3 + i * 0.6, ['#e8e8f0', '#d0d0dc', '#b8b8c8', '#a0a0b4'][i]);
    glint(pc, 69, 79, 1); pc.outline(INK); return pc; },
  mk_guardian() { const pc = new PixelCanvas(128, 128);
    for (const sx of [14, 94]) for (let y = 30; y < 124; y++) for (let x = sx; x < sx + 20; x++) { const brick = ((y >> 3) + (x >> 4)) % 2; pc.px(x, y, pick(STONE, 0.55 - (x - sx) / 20 * 0.25 + (y % 8 === 0 ? -0.2 : 0) + brick * 0.05, x, y)); }
    for (let x = 10; x < 118; x++) for (let y = 14; y < 34; y++) { const arch = Math.hypot(x - 64, y - 52) < 34 && y > 22; if (arch) continue; pc.px(x, y, pick(STONE, 0.6 - (y - 14) * 0.01 + (x % 10 === 0 ? -0.15 : 0), x, y)); }
    for (const bx of [24, 104]) { for (let y = 0; y < 14; y++) for (let x = bx - 5; x <= bx + 5; x++) pc.px(x, y, pick(R.fire, clamp01(0.95 - y * 0.05 - Math.abs(x - bx) * 0.12), x, y)); }
    for (let y = 36; y < 80; y++) for (let x = 52; x < 76; x++) pc.px(x, y + Math.sin(x * 0.3) * 2, pick(R.purple, 0.6 + Math.sin(y * 0.2) * 0.1, x, y));
    pc.outline(INK); return pc; },
  sheep(frame = 0) { const pc = new PixelCanvas(48, 40); const bob = frame % 2;
    for (let y = 8 - bob; y < 28 - bob; y++) for (let x = 6; x < 38; x++) { const nx = (x - 22) / 16, ny = (y - 18 + bob) / 10; if (nx * nx + ny * ny > 1) continue; const curl = Math.sin(x * 1.3) * Math.cos(y * 1.5); pc.px(x, y, pick(['#8a8478', '#c4bcae', '#e8e2d6', '#fbf8f0'], clamp01(0.7 - nx * 0.15 - ny * 0.35 + curl * 0.15), x, y)); }
    const hx = frame === 3 ? 40 : 38, hy = frame === 3 ? 22 : 14; for (let y = hy - 5; y < hy + 6; y++) for (let x = hx - 5; x < hx + 6; x++) { const d = Math.hypot((x - hx) / 5, (y - hy) / 5.5); if (d <= 1) pc.px(x, y, pick(['#1a1414', '#2e2626', '#4a4040'], clamp01(0.6 - (x - hx) * 0.05 - (y - hy) * 0.06), x, y)); }
    pc.px(hx + 2, hy - 1, '#f0e8d0'); pc.px(hx - 4, hy - 4, '#2e2626'); pc.px(hx - 5, hy - 3, '#2e2626');
    const lg = [[12, 14], [16, 10], [26, 30], [30, 26]]; lg.forEach(([a, b], i) => { const x = i < 2 ? (frame % 2 ? a : b) : (frame % 2 ? b : a); pc.thickLine(x, 26, x + (frame % 2 ? 1 : -1), 36, 2, '#2e2626'); });
    pc.outline(INK); return pc; },

  // ---------------------------------------------------------------- battle field objects
  boulder() { const pc = new PixelCanvas(96, 80); const rnd = mulberry32(3); const pts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const r = 36 + rnd() * 8; pts.push([48 + Math.cos(a) * r, 46 + Math.sin(a) * r * 0.72]); }
    const tmp = new PixelCanvas(96, 80); tmp.poly(pts, '#fff');
    for (let y = 0; y < 80; y++) for (let x = 0; x < 96; x++) if (tmp.alpha(x, y)) { const nx = (x - 48) / 40, ny = (y - 46) / 30; const facet = Math.floor((Math.atan2(ny, nx) + 3.2) * 2.2) % 2; let l = 0.55 - nx * 0.25 - ny * 0.35 + facet * 0.08 + (rnd() - 0.5) * 0.06; if (ny < -0.3 && Math.sin(x * 0.5) > 0.2) { pc.px(x, y, pick(R.leaf, clamp01(l + 0.1), x, y)); continue; } pc.px(x, y, pick(STONE, clamp01(l), x, y)); }
    for (let i = 0; i < 4; i++) { let x = 30 + i * 12, y = 40; for (let k = 0; k < 10; k++) { pc.px(x, y, STONE[1]); x += rnd() < 0.5 ? 1 : 0; y += 1; } }
    pc.outline(INK); return pc; },
  puddle(kind = 'water') { const pc = new PixelCanvas(128, 48); const ramp = kind === 'wine' ? R.wine : R.water;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 128; x++) { const nx = (x - 64) / 60, ny = (y - 24) / 20; const wob = Math.sin(x * 0.15) * 0.08 + Math.cos(y * 0.4 + x * 0.05) * 0.06; if (nx * nx + ny * ny > 1 + wob) continue; const ref = Math.sin(x * 0.3 - y * 0.8) > 0.85; pc.px(x, y, ref ? ramp[ramp.length - 1] : pick(ramp, clamp01(0.45 - ny * 0.3 + Math.sin(x * 0.1) * 0.08), x, y)); }
    pc.outline(kind === 'wine' ? '#1e0614' : '#0f2440'); return pc; },
  campfire(frame = 0) { const pc = new PixelCanvas(96, 112);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI; pc.thickLine(48 - Math.cos(a) * 34, 100 - Math.sin(a) * 6, 48 + Math.cos(a) * 34, 96 + Math.sin(a) * 6, 6, WOOD[2 + (i % 2)]); }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; pc.ellipse(48 + Math.cos(a) * 38, 100 + Math.sin(a) * 9, 6, 4, STONE[2 + (i % 3)]); }
    const rnd = mulberry32(frame * 13 + 5); const layers = [[R.fire[1], 30, 70], [R.fire[2], 24, 62], [R.fire[3], 17, 52], [R.fire[4], 10, 40], [R.fire[5], 5, 26]];
    for (const [c, w, hgt] of layers) for (let y = 0; y < hgt; y++) { const t = y / hgt; const ww = w * Math.sin((1 - t) * Math.PI * 0.55 + 0.25) * (1 - t * 0.6); const sway = Math.sin(t * 6 + frame * 1.6) * 4 * t; for (let x = -ww; x <= ww; x++) if (rnd() > t * 0.25) pc.px(48 + x + sway, 96 - y, c); }
    for (let i = 0; i < 6; i++) pc.px(36 + rnd() * 24, 20 + rnd() * 30, R.fire[4]);
    return pc; },
  coil(frame = 0) { const pc = new PixelCanvas(64, 128);
    for (let y = 96; y < 124; y++) for (let x = 16; x < 48; x++) pc.px(x, y, pick(WOOD, 0.5 - (y - 96) * 0.01 + Math.sin(x) * 0.05, x, y));
    for (let y = 30; y < 96; y++) { const w = 7 + Math.sin(y * 0.8) * 1.5; for (let x = 32 - w; x <= 32 + w; x++) pc.px(x, y, (y % 4 < 2) ? pick(['#5a2a10', '#a85a20', '#d08040', '#f0b070'], clamp01(0.6 - (x - 32) / w * 0.4), x, y) : pick(STONE, 0.3, x, y)); }
    pc.ball(32, 22, 14, 11, BRASS); glint(pc, 26, 16, 2);
    const rnd = mulberry32(frame + 2); for (let k = 0; k < 3; k++) { let x = 32, y = 14; for (let i = 0; i < 9; i++) { const nx = x + (rnd() - 0.5) * 10, ny = y - 3 - rnd() * 3; pc.line(x, y, nx, ny, '#e8fbff'); pc.px(nx + 1, ny, '#8fe3ff'); x = nx; y = ny; if (y < 1) break; } }
    pc.outline(INK); return pc; },
  sapling(grown = false) { const pc = new PixelCanvas(96, 128); const rnd = mulberry32(grown ? 9 : 4);
    const trunkH = grown ? 70 : 34; for (let y = 0; y < trunkH; y++) { const w = (grown ? 6 : 2.5) * (1 - y / trunkH * 0.5); for (let x = -w; x <= w; x++) pc.px(48 + x + Math.sin(y * 0.08) * 3, 124 - y, pick(WOOD, clamp01(0.5 - x / w * 0.25 + Math.sin(y * 0.7) * 0.05), 48 + x, y)); }
    const blobs = grown ? 16 : 5; for (let i = 0; i < blobs; i++) { const a = rnd() * Math.PI * 2, r = rnd() * (grown ? 26 : 9); const bx = 48 + Math.cos(a) * r * 1.2, by = 124 - trunkH - (grown ? 18 : 4) + Math.sin(a) * r * 0.8; const br = grown ? 9 + rnd() * 6 : 4 + rnd() * 3;
      for (let y = by - br; y <= by + br; y++) for (let x = bx - br; x <= bx + br; x++) { const nx = (x - bx) / br, ny = (y - by) / br; if (nx * nx + ny * ny > 1) continue; const leaf = Math.sin(x * 1.7 + y * 0.9) * 0.12; pc.px(x, y, pick(R.leaf, clamp01(0.6 - nx * 0.15 - ny * 0.35 + leaf), x, y)); } }
    if (grown) for (let i = 0; i < 7; i++) { const x = 30 + rnd() * 36, y = 30 + rnd() * 34; pc.ball(x, y, 3.5, 3.5, R.red, { ditherAmt: 0 }); pc.px(x - 1, y - 1, '#ffffff'); }
    pc.outline(INK); return pc; },
  well(frame = 0) { const pc = new PixelCanvas(128, 64); for (let i = 0; i < 360; i += 2) { const a = (i / 180) * Math.PI + frame * 0.4; for (let k = 0; k < 4; k++) { const r = 8 + k * 12 + (i / 360) * 12; const x = 64 + Math.cos(a + k) * r * 1.8, y = 32 + Math.sin(a + k) * r * 0.5; pc.px(x, y, R.glow[Math.min(5, 2 + k)]); } } pc.ellipse(64, 32, 10, 4, '#0b0716'); pc.ellipse(64, 32, 6, 2.5, '#000000'); return pc; },
  steam(frame = 0) { const pc = new PixelCanvas(128, 80); const rnd = mulberry32(frame + 11); for (let i = 0; i < 14; i++) { const x = 16 + rnd() * 96, y = 20 + rnd() * 40 - frame * 2, r = 8 + rnd() * 10; for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const nx = (xx - x) / r, ny = (yy - y) / r; if (nx * nx + ny * ny > 1) continue; pc.px(xx, yy, pick(['#9a9aa8', '#c4c4d0', '#e4e4ec', '#f8f8fc'], clamp01(0.7 - ny * 0.4 - nx * 0.1), xx, yy)); } } return pc; },
};

const cache = new Map();
export function drawn(name, ...args) {
  const k = name + ':' + args.join(','); if (cache.has(k)) return cache.get(k);
  const pc = DRAW[name](...args); cache.set(k, pc); return pc;
}
export const DRAWN_NAMES = Object.keys(DRAW);
