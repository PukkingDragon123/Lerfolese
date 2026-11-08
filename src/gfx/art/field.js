// Battlefield objects as low-res, detailed geometric pixel art (shown as lit, alpha-tested standees).
// Faceted gem-like planes with ridge highlights, 6-tone jewel ramps, hand-placed cracks/grain/speckles and glints.
// Grounded objects sit on the bottom row; flat ones (puddle, well) are drawn top-down.
import { PixelCanvas } from '../pixel.js';
import { Painter, M, norm3, clamp, lerp, hash2, glint } from './core.js';
import { roof, plane, gem, facetDisc, prismV, prismH, ngon, blade, bar } from './geo.js';
import { GR, GM } from './ramps.js';
import { nail, grainLines } from './props.js';

// ---------------------------------------------------------------- boulder (48x40): cut-gem limestone, cracks, speckle, moss, pebbles
export function boulder() {
  const P = new Painter(48, 40);
  const rock = [[3, 39], [1, 31], [5, 22], [12, 13], [22, 7], [32, 8], [40, 14], [45, 24], [47, 33], [45, 39]];
  gem(P, rock, GM.stone, { k: 1.25, table: 6, id: 'rock', cast: 2 });
  for (const pts of [[[12, 14], [20, 8], [27, 8], [24, 12], [16, 15]], [[30, 9], [37, 12], [33, 14], [28, 12]]]) gem(P, pts, GM.moss, { k: 1, table: 1, cast: 1, id: 'moss' });
  for (const [x, y, r, s] of [[6, 37, 2.6, 0.3], [43, 37, 3, 1.1], [47, 38, 1.8, 2]]) gem(P, ngon(x, y, r, 5, s, 1, 0.75), GM.stone, { k: 1.2, cast: 1 });
  P.render(); const pc = P.pc;
  P.crack([[18, 18], [21, 23], [20, 28], [23, 33]]); P.crack([[34, 18], [32, 23], [34, 26]]); P.crack([[9, 29], [12, 33]]);
  P.speckle(['rock'], 0.09, 4, -1); P.speckle(['rock'], 0.04, 9, 1);
  for (const [x, y] of [[14, 13], [22, 9], [31, 9]]) pc.px(x, y, GR.moss[5]);
  glint(pc, 15, 19, 1, '#ffffff', GR.stone[5]);
  return pc;
}

// ---------------------------------------------------------------- puddle (64x24, top-down; water or wine)
export function puddle(kind = 'water') {
  const P = new Painter(64, 24); const wine = kind === 'wine'; const R = wine ? GR.wine : GR.water; const m = wine ? GM.wine : GM.water;
  const shore = [[3, 11], [8, 5], [18, 3], [30, 4], [40, 2], [52, 4], [61, 9], [60, 16], [52, 21], [38, 22], [24, 21], [10, 20], [3, 16]];
  const pool = shore.map(([x, y]) => [x + (32 - x) * 0.07, y + (12 - y) * 0.18]);
  P.add(M.poly(shore), { m: GM.dirt, n: plane(0, 0), shade: -1, outline: false, contour: 0 });
  P.add(M.poly(pool), { m, n: (x, y) => norm3(0, y < 9 ? -0.9 : y < 14 ? -0.25 : 0.2, 1), contour: 1, outline: false });
  const pc = P.render({ outline: false });
  for (let x = 0; x < 64; x++) for (let y = 1; y < 23; y++) if (P.partAt(x, y)?.id === 1 && P.partAt(x, y - 1)?.id !== 1) pc.px(x, y, R[5]);
  const rip = ngon(38, 13, 6, 8, Math.PI / 8, 1, 0.45); P.shiftLine([...rip, rip[0]], 1);
  for (const [x, y, n] of [[14, 8, 5], [44, 6, 7], [26, 15, 3], [50, 14, 3]]) for (let i = 0; i < n; i++) pc.px(x + i, y, i === 1 ? '#ffffff' : R[5]);
  if (!wine) { pc.px(54, 12, GR.leaf[4]); pc.px(55, 12, GR.leaf[5]); pc.px(54, 13, GR.leaf[3]); }
  for (const [x, y] of [[6, 18], [58, 7]]) { pc.px(x, y, GR.stone[4]); pc.px(x + 1, y, GR.stone[2]); }
  return pc;
}
export function winePuddle() { // spilled wine and the toppled kylix it came from (top-down)
  const pc = puddle('wine'); const P = new Painter(64, 24);
  P.add(M.sub(M.poly(ngon(55, 6, 5.2, 8, 0, 1, 0.75)), M.poly(ngon(55, 6, 3.2, 8, 0, 1, 0.75))), { m: GM.clay, n: facetDisc(55, 6, 8, [0, 4.2], [-1, 1], { sy: 0.75 }), ridge: 1, cast: 1 });
  P.add(M.poly(ngon(55, 6, 3.2, 8, 0, 1, 0.75)), { m: GM.ink, n: plane(0, 0), contour: 0 });
  const top = P.render(); top.px(53, 3, '#ffd090'); pc.blit(top, 0, 0); return pc;
}

// ---------------------------------------------------------------- firepit (48x24): stone ring, ash, charred logs with ember cracks
export function firepit() {
  const P = new Painter(48, 24); const cx = 24, cy = 16;
  P.add(M.poly(ngon(cx, cy, 17, 10, 0, 1, 0.33)), { m: GM.charred, n: plane(0, -0.4), contour: 0, id: 'ash' });
  const st = []; for (let i = 0; i < 10; i++) { const a = Math.PI + (i / 10) * Math.PI * 2; st.push([cx + Math.cos(a) * 19, cy + Math.sin(a) * 6.2, i]); }
  const stone = ([x, y, i], r) => gem(P, ngon(x, y, r, 5, i * 1.3, 1, 0.8), GM.stone, { k: 1.3, table: 1, cast: 1 });
  for (const s of st) if (s[1] < cy) stone(s, 2.8);
  for (const [x0, y0, x1, y1] of [[10, 17, 31, 11], [37, 17, 17, 11], [15, 14, 34, 14]]) P.add(M.poly(bar(x0, y0, x1, y1, 1.8)), { m: (x, y) => (Math.hypot(x - cx, (y - 13) * 2) < 7 ? GM.charred : GM.oak), n: plane(-0.2, -0.5), ridge: 1, cast: 1, contour: 1 });
  for (const s of st) if (s[1] >= cy) stone(s, 3.6);
  P.render(); const pc = P.pc;
  const ember = ['#fffad0', '#ffd040', '#ff8e22', '#e45018'];
  for (let i = 0; i < 26; i++) { const x = Math.round(cx - 8 + hash2(i, 3) * 16), y = Math.round(10 + hash2(3, i) * 7); if (!pc.alpha(x, y) || (x + y) % 2) continue; pc.px(x, y, ember[1 + (i % 3)]); }
  pc.px(cx, 12, ember[0]); pc.px(cx - 3, 13, ember[0]);
  return pc;
}

// ---------------------------------------------------------------- campfire flames (48x56), 4 frames; base sits on the firepit logs (row 44)
export function campfire(frame = 0) {
  const pc = new PixelCanvas(48, 56); const R = GR.fire; const f = frame % 4; const base = 44, cx = 24;
  const tongue = (ox, h, w, lean, col) => { const pts = [[cx + ox - w, base], [cx + ox - w * 0.7 + lean * 0.3, base - h * 0.45], [cx + ox - w * 0.25 + lean * 0.7, base - h * 0.7], [cx + ox + lean, base - h], [cx + ox + w * 0.3 + lean * 0.6, base - h * 0.62], [cx + ox + w * 0.15 + lean * 0.4, base - h * 0.5], [cx + ox + w * 0.75 + lean * 0.3, base - h * 0.35], [cx + ox + w, base]]; const m = M.poly(pts); for (let y = 0; y < 56; y++) for (let x = 0; x < 48; x++) if (m(x + 0.5, y + 0.5)) pc.px(x, y, col); };
  const sway = [[0, 2, -1, 1], [2, 0, 1, -1], [1, -2, 0, 2], [-1, 1, 2, 0]][f]; const hgt = [[0, 2, -2, 1], [2, -1, 1, 0], [-1, 1, 2, -2], [1, 0, -1, 2]][f];
  tongue(-7, 22 + hgt[0], 7, -3 + sway[0], R[1]); tongue(7, 24 + hgt[1], 7, 3 + sway[1], R[1]); tongue(0, 34 + hgt[2], 11, sway[2], R[1]);
  tongue(-6, 17 + hgt[0], 5, -2 + sway[0], R[2]); tongue(6, 19 + hgt[1], 5, 2 + sway[1], R[2]); tongue(0, 29 + hgt[2], 9, sway[2], R[2]);
  tongue(-4, 12 + hgt[3], 4, -1 + sway[3], R[3]); tongue(3, 21 + hgt[2], 6, sway[2], R[3]); tongue(0, 14 + hgt[1], 5, sway[1], R[4]); tongue(0, 7, 3, sway[3] * 0.5, R[5]);
  const licks = [[[-4, 40], [5, 34], [-1, 46]], [[3, 38], [-5, 44], [2, 50]], [[-2, 42], [4, 47], [0, 36]], [[5, 41], [-3, 37], [1, 48]]][f];
  for (const [ox, h] of licks) { const y = base - h, x = cx + ox; pc.px(x, y, R[3]); pc.px(x, y + 1, R[2]); pc.px(x + 1, y + 1, R[1]); }
  for (const [ox, h] of [[-8, 30], [9, 27], [-3, 50], [6, 52]]) { const y = base - h - f * 2, x = cx + ox + (f % 2); if (y > 0) pc.px(x, y, R[4]); }
  return pc;
}

// ---------------------------------------------------------------- Tesla coil (32x64), 3 frames of arcs
export function coil(frame = 0) {
  const P = new Painter(32, 64); const cx = 16;
  gem(P, [[3, 57], [5, 55], [27, 55], [29, 57], [29, 63], [3, 63]], GM.oak, { k: 1.2, table: 2, cast: 2 });
  for (let i = 0; i < 3; i++) P.add(M.poly(ngon(cx, 52 - i * 2.2, 8, 8, 0, 1, 0.2)), { m: GM.copper, n: prismH(52 - i * 2.2, 1.6, 2), ridge: 1, contour: 1, cast: 1 });
  P.add(M.rect(cx - 3.5, 17, 7, 36), { m: GM.copper, n: prismV(cx, 3.8, 3), ridge: 1, cast: 2, contour: 1, id: 'coil' });
  for (const y of [15, 49]) P.add(M.rect(cx - 4.5, y, 9, 3), { m: GM.walnut, n: prismV(cx, 4.8, 3), ridge: 1, contour: 1 });
  gem(P, ngon(cx, 11, 10, 10, 0, 1, 0.42), GM.brass, { k: 1.3, table: 2, cast: 2 });
  P.add(M.poly(ngon(cx, 10, 4.2, 8, 0, 1, 0.3)), { m: GM.ink, n: plane(0, 0), contour: 0 });
  P.render(); const pc = P.pc;
  for (let y = 18; y < 52; y += 2) P.shiftLine([[cx - 3, y], [cx + 3, y]], -1);
  const bolts = [[[[6, 10], [3, 7], [4, 4], [1, 2]], [[26, 10], [28, 6], [27, 3], [30, 1]]], [[[7, 9], [4, 9], [2, 6], [0, 6]], [[25, 9], [27, 7], [30, 8], [31, 4]]], [[[8, 8], [6, 4], [8, 2], [6, 0]], [[24, 9], [29, 9], [28, 5], [31, 2]]]][frame % 3];
  for (const b of bolts) for (let i = 0; i + 1 < b.length; i++) { pc.line(b[i][0] + 1, b[i][1], b[i + 1][0] + 1, b[i + 1][1], GR.electric[2]); pc.line(b[i][0], b[i][1], b[i + 1][0], b[i + 1][1], '#ffffff'); }
  glint(pc, 11, 8, 1, '#ffffff', GR.brass[5]);
  return pc;
}

// ---------------------------------------------------------------- apple sapling (24x32) and grown apple tree (48x64)
function leafCluster(P, cx, cy, r, seed, id = 'leaf') { // faceted core with leaf-blades breaking the silhouette
  gem(P, ngon(cx, cy, r, 7, seed, 1, 0.9), GM.leaf, { k: 1.2, table: r * 0.4, cast: 2, id });
  for (let i = 0; i < 5; i++) { const a = seed + i * 1.26; const x = cx + Math.cos(a) * r * 0.95, y = cy + Math.sin(a) * r * 0.9; gem(P, blade(x - Math.cos(a) * 1.5, y - Math.sin(a) * 1.5, x + Math.cos(a) * 2.8, y + Math.sin(a) * 2.8, 1.3, 0), GM.leaf, { k: 1, cast: 1, id }); }
}
export function sapling(grown = false) {
  if (!grown) {
    const P = new Painter(24, 32);
    gem(P, [[4, 31], [8, 28], [16, 28], [20, 31]], GM.dirt, { k: 1, table: 1, cast: 0 });
    P.add(M.rect(15, 11, 1.6, 20), { m: GM.oak, n: plane(-0.3, 0), contour: 1 });
    for (const pts of [[[11, 30], [12, 30], [12.6, 12], [11.4, 12]], [[12, 20], [12.8, 20], [7, 14], [6.4, 15]], [[12, 16], [12.6, 17], [17, 11], [16.4, 10.6]]]) P.add(M.poly(pts), { m: GM.walnut, n: plane(-0.4, 0), contour: 1, cast: 1 });
    leafCluster(P, 7, 13, 3.4, 0.3); leafCluster(P, 17, 9, 3.4, 1.1); leafCluster(P, 12, 7, 4, 2.2);
    P.render(); const pc = P.pc;
    for (const [x, y] of [[11, 5], [6, 11], [16, 7]]) pc.px(x, y, GR.leaf[5]);
    pc.px(12, 23, GR.rope[4]); pc.px(13, 23, GR.rope[3]); pc.px(14, 23, GR.rope[3]);
    return pc;
  }
  const P = new Painter(48, 64);
  gem(P, [[10, 63], [16, 60], [32, 60], [38, 63]], GM.dirt, { k: 1, table: 1.5, cast: 0 });
  P.add(M.poly([[19, 63], [21, 52], [21, 36], [27, 36], [27, 52], [30, 63]]), { m: GM.walnut, n: prismV(24, 4.5, 3), ridge: 1, cast: 2, id: 'trunk' });
  for (const pts of [[[22, 38], [24, 37], [12, 24], [10, 25]], [[24, 37], [26, 38], [38, 25], [36, 23]], [[23, 37], [25, 37], [25, 16], [23, 16]]]) P.add(M.poly(pts), { m: GM.walnut, n: plane(-0.3, -0.2), ridge: 1, cast: 1, contour: 1 });
  for (const [x, y, r, s] of [[11, 22, 7, 0.2], [37, 22, 7, 1], [24, 13, 8.5, 2], [16, 13, 6, 3], [32, 12, 6.5, 4], [24, 25, 7.5, 5], [7, 30, 4.5, 6], [41, 30, 4.8, 7], [24, 5, 5, 8]]) leafCluster(P, x, y, r, s);
  const apples = [[15, 25], [30, 18], [36, 27], [21, 15], [9, 26], [29, 29], [25, 26], [41, 23]];
  for (const [x, y] of apples) gem(P, ngon(x, y, 1.9, 6, Math.PI / 6), GM.apple, { k: 1.2, table: 0.6, cast: 1 });
  P.render(); const pc = P.pc;
  for (let y = 38; y < 62; y += 3) P.shiftLine([[22 + (y % 2), y], [22 + (y % 2), y + 1]], -1);
  for (const [x, y] of apples) { pc.px(x - 1, y - 1, '#ffd09a'); pc.px(x, y - 3, GR.walnut[2]); }
  for (const [x, y] of [[20, 7], [8, 18], [33, 8], [18, 20]]) pc.px(x, y, GR.leaf[5]);
  return pc;
}

// ---------------------------------------------------------------- gravity well (64x32, top-down vortex), 4 frames
export function well(frame = 0) {
  const P = new Painter(64, 32); const cx = 32, cy = 16; const ph = (frame % 4) * (Math.PI / 6);
  for (let k = 0; k < 3; k++) {
    const a0 = ph + k * (Math.PI * 2 / 3); const pts = [], pts2 = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; const r = 30 - t * 24; const a = a0 + t * 2.4; const w = 0.5 + Math.sin(t * Math.PI) * 4; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.48]); pts2.push([cx + Math.cos(a - 0.12) * (r + w), cy + Math.sin(a - 0.12) * (r + w) * 0.48]); }
    P.add(M.poly([...pts, ...pts2.reverse()]), { m: GM.glow, n: (x, y) => norm3(0, Math.hypot(x - cx, (y - cy) * 2) < 16 ? -0.9 : -0.2, 1), ridge: 1, contour: 1 });
  }
  gem(P, ngon(cx, cy, 7, 8, Math.PI / 8 + ph, 1, 0.5), GM.glow, { k: 1.4, table: 3, cast: 0 });
  P.add(M.poly(ngon(cx, cy, 4, 8, Math.PI / 8, 1, 0.5)), { m: GM.ink, n: plane(0, 0), contour: 0 });
  const pc = P.render();
  for (let i = 0; i < 6; i++) { const a = i * 2.3 + ph * 2, r = 10 + (i % 3) * 6; pc.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.48), '#f0feff'); }
  return pc;
}

// ---------------------------------------------------------------- steam (64x40), 4 frames of rising faceted puffs
export function steam(frame = 0) {
  const P = new Painter(64, 40); const ph = (frame % 4) / 4; const pf = [];
  for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) { const life = (ph + k / 3 + c * 0.17) % 1; if (life > 0.92) continue; pf.push([14 + c * 18 + Math.sin(life * 5 + c) * 3 * life, 37 - life * 30, 3 + life * 5, c * 3 + k]); }
  pf.sort((a, b) => b[1] - a[1]);
  for (const [x, y, r, i] of pf) gem(P, ngon(x, y, r, 8, i * 0.4, 1, 0.85), GM.smoke, { k: 1.1, table: r * 0.45, cast: 1 });
  const pc = P.render();
  for (const [x, y, r] of pf) pc.px(Math.round(x - r * 0.4), Math.round(y - r * 0.45), '#ffffff');
  return pc;
}

// ---------------------------------------------------------------- rain cloud (48x32), 4 frames
export function rainCloud(frame = 0) {
  const P = new Painter(48, 32); const f = frame % 4;
  for (const [x, y, r, s] of [[11, 13, 6, 0.2], [20, 9, 8, 1], [30, 10, 7.5, 2], [38, 14, 5.6, 3], [25, 15, 7, 4]]) P.add(M.and(M.poly(ngon(x, y, r, 8, s)), (px, py) => py < 19), { m: GM.cloud, n: roof(ngon(x, y, r, 8, s), { k: 1.2, table: r * 0.4 }), ridge: 1, cast: 1, contour: 1 });
  P.add(M.rect(6, 17, 37, 2), { m: GM.cloud, n: plane(0, 0.8), contour: 0 });
  const pc = P.render();
  for (let i = 0; i < 11; i++) { const x0 = 9 + ((i * 7) % 32), y0 = 21 + ((((i * 5) % 3) * 3 + f * 3) % 10); pc.px(x0, y0, GR.water[4]); pc.px(x0 - 1, y0 + 1, GR.water[3]); if (y0 + 2 < 32) pc.px(x0 - 1, y0 + 2, GR.water[5]); }
  if (f === 2) for (const [x, y] of [[29, 19], [28, 20], [28, 21], [27, 22], [28, 23], [27, 24], [26, 25]]) pc.px(x, y, y > 22 ? '#ffd040' : '#fffad0');
  return pc;
}

// ---------------------------------------------------------------- little moon (24x24): faceted 12-gon, craters, dotted orbit
export function moon() {
  const P = new Painter(24, 24); const c = 12;
  gem(P, ngon(c, c, 8.4, 12), GM.moon, { k: 1.25, table: 3.6, id: 'moon', cast: 0 });
  P.render(); const pc = P.pc;
  for (const [x, y] of [[10, 9], [14, 14], [9, 15], [15, 9], [11, 10]]) { P.shift(x, y, -1); P.shift(x + 1, y + 1, 1); }
  for (const [x, y] of [[13, 13], [14, 13], [13, 14]]) P.shift(x, y, -1);
  for (let a = 0; a < Math.PI * 2; a += 0.22) { const x = Math.round(c + Math.cos(a) * 11.4), y = Math.round(c + Math.sin(a) * 3 + 2); if (Math.sin(a) > 0 || !pc.alpha(x, y)) pc.px(x, y, Math.sin(a) > 0 ? '#f0feff' : '#8ee8ff'); }
  pc.px(8, 7, '#ffffff');
  return pc;
}

// ---------------------------------------------------------------- spring catapult (48x40): cocked + loaded / released
export function catapult(loaded = false) {
  const P = new Painter(48, 40);
  const wheel = (x, y, far) => gem(P, ngon(x, y, 4.6, 8, Math.PI / 8), GM.walnut, { k: 1.3, table: 2, cast: 1, shade: far ? -1 : 0 });
  wheel(36, 35, true);
  P.add(M.poly([[3, 30], [45, 30], [46, 33], [2, 33]]), { m: GM.oak, n: prismH(31.5, 1.6, 2), ridge: 1, cast: 2 });
  P.add(M.poly([[20, 30], [23, 15], [25.5, 15], [28, 30], [25.5, 30], [24.3, 20], [22.5, 30]]), { m: GM.oak, n: roof([[20, 30], [23, 15], [25.5, 15], [28, 30]], { k: 1 }), ridge: 1, cast: 2 });
  P.add(M.rect(19, 13, 11, 2.6), { m: GM.oak, n: prismH(14.3, 1.4, 2), ridge: 1, cast: 2, contour: 1 });
  const px = 15, py = 28; const ang = loaded ? -0.12 : -1.2; const ex = px + Math.cos(ang) * 25, ey = py + Math.sin(ang) * 25;
  P.add(M.poly(bar(px, py, ex, ey, 1.3)), { m: GM.oak, n: plane(-0.2, -0.5), ridge: 1, cast: 2, contour: 1 });
  const cx2 = ex + Math.cos(ang - Math.PI / 2) * 1.6, cy2 = ey + Math.sin(ang - Math.PI / 2) * 1.6;
  gem(P, ngon(cx2, cy2, 3, 6, ang, 1, 0.7), GM.leather, { k: 1.2, cast: 1 });
  if (loaded) gem(P, ngon(cx2, cy2 - 2.6, 2.6, 6, Math.PI / 6), GM.apple, { k: 1.2, table: 0.8, cast: 1 });
  wheel(11, 35, false);
  P.render(); const pc = P.pc;
  grainLines(P, 4, 30, 40, 3, 5);
  const I = GR.iron; for (let i = 0; i < 4; i++) { const x0 = px - 4 + i * 2; pc.line(x0 + 2, py - 3, x0 + 1, py + 3, I[1]); pc.line(x0, py - 3, x0 + 1, py + 3, I[4]); }
  for (const [x, y] of [[11, 35], [36, 35]]) { pc.px(x, y, I[4]); pc.px(x + 1, y, I[2]); pc.px(x, y + 1, I[2]); }
  if (loaded) { pc.px(Math.round(cx2) - 1, Math.round(cy2 - 3.6), '#ffd09a'); pc.line(Math.round(ex), Math.round(ey) + 1, 40, 30, GR.rope[3]); }
  nail(pc, 5, 31); nail(pc, 42, 31);
  return pc;
}

// ---------------------------------------------------------------- burning glass (32x48): brass-ringed lens on a tripod, focused sunbeam
export function burningGlass() {
  const P = new Painter(32, 48); const lx = 14, ly = 15;
  for (const [x1, sh] of [[24, -1], [7, 0], [17, 0]]) P.add(M.poly(bar(15, 30, x1, 47, 0.8)), { m: GM.walnut, n: plane(-0.3, 0), shade: sh, cast: 1, contour: 1 });
  P.add(M.rect(13.5, 22, 3, 9), { m: GM.brass, n: prismV(15, 1.6, 2), ridge: 1, cast: 1 });
  P.add(M.sub(M.poly(ngon(lx, ly, 9, 10, 0, 0.75, 1)), M.poly(ngon(lx, ly, 6.6, 10, 0, 0.75, 1))), { m: GM.brass, n: facetDisc(lx, ly, 10, [0, 5.4, 7.6], [-1, 0.6, 1.3]), ridge: 1, cast: 2 });
  P.add(M.poly(ngon(lx, ly, 6.6, 10, 0, 0.75, 1)), { m: GM.lens, n: (x, y) => norm3((x - lx) * 0.12, (y - ly) * 0.12 - 0.2, 1), contour: 1, id: 'glass' });
  P.render(); const pc = P.pc;
  for (let k = 0; k < 5; k++) { P.shift(lx - 3 + k, ly - 1 - k, 2); P.shift(lx - 2 + k, ly - 1 - k, 1); }
  for (let i = 0; i < 12; i += 2) for (const o of [-3, 0, 3]) { const x = 2 + i + Math.round(o * 0.4), y = 2 + i + o; if (!pc.alpha(x, y)) pc.px(x, y, '#ffe058'); }
  for (let i = 0; i <= 10; i += 2) for (const o of [-4, 4]) { const t = i / 10; const x = Math.round(lerp(lx + 4, 29, t)), y = Math.round(lerp(ly + o, 38, t)); if (!pc.alpha(x, y)) pc.px(x, y, t > 0.6 ? '#fffad0' : '#ffd040'); }
  glint(pc, 29, 38, 2, '#ffffff', '#ffd040'); pc.px(30, 34, GR.smoke[3]); pc.px(31, 32, GR.smoke[2]); pc.px(30, 30, GR.smoke[3]);
  return pc;
}

// ---------------------------------------------------------------- whirlwind (32x48), 4 frames: stacked swoosh bands in a funnel
export function whirl(frame = 0) {
  const pc = new PixelCanvas(32, 48); const f = frame % 4; const R = ['#3e4c66', '#62748e', '#94a8bc', '#c4d6e2', '#eaf6fa', '#ffffff'];
  for (let y = 3, band = 0; y < 44; y += 3, band++) {
    const t = (46 - y) / 43; const r = 2 + Math.pow(t, 1.25) * 13; const cx = 16 + Math.round(Math.sin(t * 4 + f) * 1.5 * t); const sh = ((band + f) % 4) / 4;
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI; const x = Math.round(cx - Math.cos(a) * r), yy = y + Math.round(Math.sin(a) * Math.max(1, r * 0.18)); const q = (i / 48 + sh) % 1; if (q < 0.6) pc.px(x, yy, R[q < 0.08 ? 5 : q < 0.3 ? 4 : 3]); else if (q > 0.7 && !pc.alpha(x, yy - 2)) pc.px(x, yy - 2, R[1]); }
  }
  for (let i = 0; i < 14; i++) { const a = i * 0.9 + f * 1.6; const x = Math.round(16 + Math.cos(a) * (3 + (i % 4) * 2)), y = 45 + (i % 2); pc.px(x, y, i % 3 ? GR.dirt[3] : GR.dirt[4]); }
  for (let i = 0; i < 3; i++) { const y = 36 - i * 13 - f; const x = Math.round(16 + Math.cos(i * 2 + f * 1.6) * (5 + i * 3)); pc.px(x, y, GR.leaf[4]); pc.px(x + 1, y, GR.leaf[3]); }
  return pc;
}
