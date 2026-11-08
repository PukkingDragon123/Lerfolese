// Battlefield objects (shown as lit, alpha-tested standees): boulder, puddles, firepit + campfire flames, Tesla coil,
// apple sapling/tree, gravity well, steam, rain cloud, little moon, spring catapult, burning glass, whirlwind.
// Grounded objects sit on the bottom row; flat ones (puddle, well) are drawn top-down.
import { PixelCanvas } from '../pixel.js';
import { Painter, M, N, mat, norm3, clamp, lerp, smooth, mix, darken, lighten, hash2, vnoise, fbm, glint, getHex, tint, LIGHT } from './core.js';
import { RAMP, MAT } from './ramps.js';
import { grain, nail, rivet } from './props.js';

const pickRamp = (ramp, v) => ramp[clamp(Math.round(v * (ramp.length - 1)), 0, ramp.length - 1)];

// ---------------------------------------------------------------- boulder: faceted limestone with moss, lichen, cracks
export function boulder() {
  const W = 96, H = 80; const P = new Painter(W, H);
  const outline = [[6, 79], [3, 66], [8, 50], [18, 34], [32, 22], [50, 15], [66, 18], [80, 28], [90, 44], [93, 60], [90, 79]];
  const seeds = [[22, 40], [40, 26], [60, 24], [78, 40], [86, 62], [66, 46], [44, 50], [22, 64], [48, 70], [70, 70], [12, 56]];
  const sph = N.sphere(46, 60, 48, 52);
  const facetN = seeds.map(([x, y], i) => { const b = sph(x, y); return norm3(b[0] + (hash2(i, 3) - 0.5) * 0.7, b[1] + (hash2(i, 7) - 0.5) * 0.6, b[2]); });
  const cell = (x, y) => { let best = 0, bd = 1e9, second = 1e9; for (let i = 0; i < seeds.length; i++) { const d = (x - seeds[i][0]) ** 2 + ((y - seeds[i][1]) * 1.2) ** 2; if (d < bd) { second = bd; bd = d; best = i; } else if (d < second) second = d; } return [best, Math.sqrt(second) - Math.sqrt(bd)]; };
  const mossy = (x, y) => { const [i] = cell(x, y); const n = facetN[i]; return n[1] < -0.45 && fbm(x * 0.12, y * 0.12, 5) > 0.42 - (n[1] + 0.45) * -0.5; };
  P.add(M.poly(outline), {
    m: (x, y) => (mossy(x, y) ? MAT.moss : MAT.stone), n: (x, y) => facetN[cell(x, y)[0]],
    tex: (x, y) => { const [, edge] = cell(x, y); let v = edge < 1.1 ? -0.12 : 0; if (hash2(x | 0, y | 0, 9) > 0.93) v -= 0.1; if (hash2(x | 0, y | 0, 4) > 0.965) v += 0.1; return v; }, cast: 2,
  });
  // pebbles at the foot
  for (const [x, y, r] of [[10, 77, 3.5], [86, 77, 4], [94, 78, 2.2], [3, 78, 2]]) P.add(M.ellipse(x, y, r, r * 0.7), { m: MAT.stone, n: N.sphere(x, y - 0.6, r, r * 0.8), cast: 1 });
  const pc = P.render();
  // cracks: dark line with a lit lip on the upper side
  const crack = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)); if (!pc.alpha(x, y)) continue; pc.px(x, y, RAMP.stone[1]); const up = getHex(pc, x, y - 1); if (up && up !== RAMP.stone[1]) pc.px(x, y - 1, mix(up, '#ffffff', 0.18)); } } };
  crack([[38, 30], [42, 38], [40, 46], [45, 54]]); crack([[70, 34], [66, 42], [68, 48]]); crack([[24, 60], [30, 66], [29, 74]]);
  // lichen speckles on the lit faces
  for (let i = 0; i < 26; i++) { const x = Math.round(14 + hash2(i, 41) * 70), y = Math.round(26 + hash2(41, i) * 40); const c = getHex(pc, x, y); if (c && RAMP.stone.indexOf(c) >= 5) { pc.px(x, y, '#c8c890'); if (i % 3 === 0) pc.px(x + 1, y, '#a8a870'); } }
  return pc;
}

// ---------------------------------------------------------------- puddle (top-down; water or wine)
export function puddle(kind = 'water') {
  const W = 128, H = 48; const P = new Painter(W, H); const wine = kind === 'wine';
  const blobs = wine ? [[50, 26, 40, 15], [86, 22, 30, 12], [24, 30, 16, 9], [104, 30, 14, 8], [64, 36, 22, 8]] : [[52, 24, 44, 16], [90, 26, 32, 14], [22, 26, 18, 11], [70, 14, 22, 8], [108, 30, 14, 9]];
  const inside = (x, y, g = 0) => blobs.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + g)) ** 2 + ((y - cy) / (ry + g)) ** 2 <= 1 + Math.sin(x * 0.3 + y) * 0.04);
  // wet margin (darkened earth) then the liquid
  P.add(M.fn((x, y) => inside(x, y, 2.6), 0, 0, W, H), { m: mat(wine ? ['#1e0a0e', '#3a1a16', '#5a2e22', '#6e4030', '#86583e'] : RAMP.dirt || ['#1e140e', '#38261a', '#563c26', '#6e5232', '#8a6c44'], { amb: 0.5, dif: 0.3 }), n: N.flat(0, 0, 1), tex: (x, y) => (hash2(x, y, 3) > 0.8 ? -0.2 : 0), outline: false });
  const R = wine ? RAMP.wine : RAMP.water;
  P.add(M.fn((x, y) => inside(x, y), 0, 0, W, H), {
    m: mat(R, { amb: 0.4, dif: 0.4 }), n: N.flat(0, 0, 1), contour: 0, outline: false,
    tex: (x, y) => { const sky = smooth(H * 0.7, 2, y) * 0.32; const ripple = Math.sin(Math.hypot((x - 54) / 2.6, y - 24) * 1.1) > 0.92 ? 0.14 : 0; return -0.16 + sky + ripple + (fbm(x * 0.08, y * 0.2, 2) - 0.5) * 0.12; },
  });
  const pc = P.render({ outline: false });
  // light lip on the far edge, highlight dashes, ripple rings, floating leaf/pebbles
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (inside(x + 0.5, y + 0.5) && !inside(x + 0.5, y - 0.5)) pc.px(x, y, R[R.length - 1]); if (!inside(x + 0.5, y + 0.5) && inside(x + 0.5, y - 0.5) && pc.alpha(x, y)) pc.px(x, y, wine ? '#5e1a26' : '#6c8890'); }
  const dash = (x, y, n, c) => { for (let i = 0; i < n; i++) if (inside(x + i + 0.5, y + 0.5)) pc.px(x + i, y, c); };
  dash(30, 14, 7, R[6]); dash(40, 16, 3, R[5]); dash(82, 17, 9, R[6]); dash(95, 19, 4, R[5]); dash(60, 30, 5, R[5]); dash(18, 24, 4, R[5]);
  for (let a = 0; a < Math.PI * 2; a += 0.04) { const x = Math.round(70 + Math.cos(a) * 9), y = Math.round(28 + Math.sin(a) * 3.4); if (Math.sin(a * 3) > -0.2 && inside(x + 0.5, y + 0.5)) pc.px(x, y, R[4]); }
  if (!wine) { for (const [x, y, c] of [[100, 26, '#9cb84a'], [101, 26, '#cfe07a'], [100, 27, '#5f8a3a'], [102, 27, '#9cb84a']]) pc.px(x, y, c); }
  else { for (const [x, y] of [[40, 22], [41, 22], [88, 27]]) pc.px(x, y, '#f0a0b0'); }
  return pc;
}
// spilled wine with a toppled kylix shard at the edge (top-down)
export function winePuddle() {
  const pc = puddle('wine'); const P = new Painter(128, 48);
  P.add(M.fn((x, y) => { const d = Math.hypot((x - 112) / 9, (y - 13) / 7); return d <= 1 && d >= 0.55 && x < 116 + (y - 13) * 0.2; }, 100, 4, 124, 22), { m: mat(['#2a0e08', '#5a1e0e', '#8e3414', '#c0541e', '#e07c34', '#f4a660']), n: N.torus(112, 13, 7.5, 2.2), cast: 2 });
  P.add(M.fn((x, y) => Math.hypot((x - 112) / 6.6, (y - 13) / 5) <= 1, 104, 7, 120, 19), { m: mat(['#100608', '#1e0c10', '#2e1418', '#3e1c20']), n: N.flat(), contour: 1 });
  const top = P.render(); pc.blit(top, 0, 0);
  return pc;
}

// ---------------------------------------------------------------- firepit: ring of stones, ash bed, charred logs with glowing cracks (96x48)
export function firepit() {
  const W = 96, H = 48; const P = new Painter(W, H);
  const cx = 48, cy = 34, rx = 40, ry = 11;
  // ash bed
  P.add(M.ellipse(cx, cy, rx - 4, ry - 2.5), { m: mat(['#1a1418', '#2c2426', '#45393a', '#625452', '#82746c']), n: N.flat(0, -0.8, 0.6), tex: (x, y) => (hash2(x, y, 5) > 0.75 ? 0.15 : 0) - (Math.hypot((x - cx) / 20, (y - cy) / 5) < 1 ? 0.25 : 0) });
  // back stones
  const stones = []; for (let i = 0; i < 12; i++) { const a = Math.PI + (i / 12) * Math.PI * 2; stones.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, i]); }
  const stone = ([x, y, i], back) => { const r = (back ? 5 : 7.2) + hash2(i, 9) * 1.6; P.add(M.fn((px, py) => { const a = Math.atan2(py - y, px - x); const rr = r * (0.86 + 0.14 * Math.sin(a * 3 + i)); return Math.hypot(px - x, (py - y) * 1.35) <= rr; }, x - r - 1, y - r, x + r + 1, y + r), { m: MAT.stone, n: (px, py) => { const f = Math.floor((Math.atan2(py - y, px - x) + 4) * 1.1 + i); return norm3(Math.cos(f * 1.7) * 0.5 + (px - x) / r * 0.4, -0.55 + Math.sin(f * 2.3) * 0.25, 0.8); }, cast: 2 }); };
  for (const s of stones) if (s[1] < cy) stone(s, true);
  // charred logs crossing, glowing cracks toward the middle
  const log = (x0, y0, x1, y1, r) => P.add(M.capsule(x0, y0, x1, y1, r, r * 0.92), { m: (x, y) => { const d = Math.hypot(x - cx, y - (cy - 4)) / 22; return d < 0.55 && hash2(x | 0, y | 0, 2) > 0.55 ? MAT.charred : MAT.oak; }, n: N.cyl(x0, y0, x1, y1, r + 0.5), tex: (x, y) => { const d = Math.hypot(x - cx, y - (cy - 4)) / 22; return -d < -0.6 ? 0 : -0.25 * (1 - d); }, cast: 2, contour: 1 });
  log(18, 34, 64, 22, 4.2); log(78, 35, 34, 21, 4.2); log(30, 30, 70, 30, 3.6);
  for (const s of stones) if (s[1] >= cy) stone(s, false);
  const pc = P.render();
  // glowing embers in the cracks and under the logs
  const glowC = ['#ffd75c', '#fa9c2c', '#e8641a'];
  for (let i = 0; i < 46; i++) { const x = Math.round(cx - 18 + hash2(i, 77) * 36), y = Math.round(cy - 12 + hash2(77, i) * 12); const c = getHex(pc, x, y); if (!c) continue; const d = Math.hypot(x - cx, (y - cy + 4) * 1.6) / 20; if (d < 1 && hash2(i, 5) > d * 0.6) { pc.px(x, y, glowC[Math.min(2, Math.floor(d * 3))]); if (hash2(i, 9) > 0.6) pc.px(x + 1, y, glowC[2]); } }
  return pc;
}

// ---------------------------------------------------------------- campfire flames (96x112), 4 frames; base sits on the firepit logs
export function campfire(frame = 0) {
  const W = 96, H = 112; const pc = new PixelCanvas(W, H); const R = RAMP.fire; const base = 86, cx = 48; const ph = (frame % 4) / 4;
  const tongues = [[0, 1, 46, 13], [-11, 0.8, 32, 9], [11, 0.85, 36, 10], [-20, 0.55, 20, 7], [19, 0.6, 22, 7], [4, 0.7, 26, 7]];
  const I = (x, y) => {
    let v = 0; const h = base - y;
    for (let i = 0; i < tongues.length; i++) {
      const [ox, k, len, wid] = tongues[i]; const wob = Math.sin(h * 0.16 - (ph + i * 0.21) * Math.PI * 2) * (h / len) * 4.2 + Math.sin(h * 0.07 + i) * 1.6;
      const t = h / (len * (0.85 + 0.15 * Math.sin((ph + i * 0.37) * Math.PI * 2))); if (t < -0.12 || t > 1) continue;
      const w = wid * Math.sqrt(Math.max(0, 1 - t)) * (t < 0 ? 1 + t * 6 : 1) * (0.86 + 0.28 * Math.sin(t * 3 + i));
      const dx = Math.abs(x - (cx + ox + wob)); if (dx < w) v = Math.max(v, k * (1 - dx / w) * (1 - t * 0.55));
    }
    // detached flame licks rising off the top
    for (let j = 0; j < 3; j++) { const fy = base - 44 - ((ph * 26 + j * 13) % 34), fx = cx + Math.sin((ph + j * 0.3) * 6.3 + j) * 9 + (j - 1) * 6; const r = 3.2 - ((ph * 26 + j * 13) % 34) / 14; if (r > 0.6) { const d = Math.hypot(x - fx, (y - fy) * 0.6) / r; if (d < 1) v = Math.max(v, 0.55 * (1 - d) + 0.25); } }
    return v + (vnoise(x * 0.18, y * 0.12 + ph * 6, 3) - 0.5) * 0.18;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = I(x + 0.5, y + 0.5); if (v < 0.16) continue; const c = v > 0.78 ? R[6] : v > 0.62 ? R[5] : v > 0.46 ? R[4] : v > 0.32 ? R[3] : v > 0.22 ? R[2] : R[1]; pc.px(x, y, c); }
  // sparks
  for (let i = 0; i < 7; i++) { const t = (ph + i / 7) % 1; const x = Math.round(cx + Math.sin(i * 2.3 + t * 5) * (10 + i * 2)), y = Math.round(base - 40 - t * 50); pc.px(x, y, t < 0.5 ? R[5] : R[4]); if (t < 0.3) pc.px(x, y + 1, R[3]); }
  return pc;
}

// ---------------------------------------------------------------- Tesla coil (64x128), 3 frames of arcs
export function coil(frame = 0) {
  const W = 64, H = 128, cx = 32; const P = new Painter(W, H);
  // oak base with brass corners
  P.add(M.poly([[8, 112], [56, 112], [60, 118], [60, 127], [4, 127], [4, 118]]), { m: MAT.oak, n: (x, y) => (y < 118 ? norm3(0, -0.8, 0.6) : norm3(0, 0, 1)), tex: grain(3, { w: 64, h: 16, y0: 112 }), cast: 2 });
  for (const x of [6, 58]) P.add(M.rect(x - 2, 118, 4, 9), { m: MAT.brass, n: N.cylV(x, 2.2), contour: 1 });
  // primary: a few thick copper turns
  for (let i = 0; i < 4; i++) { const y = 106 - i * 3.4; P.add(M.ellipse(cx, y, 15, 2.2), { m: MAT.copper, n: N.cylH(y, 2.2), contour: 1, cast: 1 }); }
  // secondary: tall tube wound with fine enamelled copper wire (1px turns catch the light)
  P.add(M.rect(cx - 7, 34, 14, 72), { m: mat(RAMP.copper, { metal: 0.12, spec: 0.9, pow: 12, amb: 0.28 }), n: N.cylV(cx, 7.6), tex: (x, y) => (y % 2 ? -0.22 : 0.1), cast: 2, contour: 1, noClean: true });
  P.add(M.rect(cx - 8, 98, 16, 6), { m: MAT.walnut, n: N.cylV(cx, 8.4), contour: 1 });
  P.add(M.rect(cx - 8, 31, 16, 5), { m: MAT.walnut, n: N.cylV(cx, 8.4), contour: 1 });
  // toroid top load: a fat brass ring seen from slightly above, the hole a dark slit
  const tcx = cx, tcy = 23; const ring = (x, y) => { const dx = (x - tcx) / 19, dy = (y - tcy) / 8.5; return Math.hypot(dx, dy); };
  P.add(M.fn((x, y) => ring(x, y) <= 1, tcx - 20, tcy - 9, tcx + 20, tcy + 9), { m: MAT.brass, n: (x, y) => { const dx = (x - tcx) / 19, dy = (y - tcy) / 8.5; const r = Math.hypot(dx, dy) || 1e-3; const t = clamp((r - 0.6) / 0.4, -0.999, 0.999); return norm3((dx / r) * t, (dy / r) * t * 0.8 - 0.25 * (1 - Math.abs(t)), Math.sqrt(1 - t * t)); }, cast: 2 });
  P.add(M.ellipse(tcx, tcy - 1.6, 7, 1.8), { m: mat(['#0c0806', '#1e140c', '#3a2614']), n: N.flat(), contour: 0 });
  const pc = P.render();
  // arcs: jagged bolts from the toroid with a white core and cyan glow
  let s = frame * 977 + 13; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const bolt = (x, y, dx, dy, n) => { const pts = [[x, y]]; for (let i = 0; i < n; i++) { x += dx * 3 + (rnd() - 0.5) * 5; y += dy * 3 + (rnd() - 0.5) * 4; pts.push([x, y]); } for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; pc.line(Math.round(x0) + 1, Math.round(y0), Math.round(x1) + 1, Math.round(y1), '#3474cc'); pc.line(Math.round(x0), Math.round(y0) + 1, Math.round(x1), Math.round(y1) + 1, '#6cb8f2'); } for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; pc.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4feff'); } return pts[pts.length - 1]; };
  const arcs = [[[-1, -0.6, 5], [1, -0.9, 4], [0.3, -1, 3]], [[-1, -0.2, 4], [1, -0.4, 5], [-0.4, -1, 4]], [[1, -0.1, 5], [-0.8, -0.8, 4], [0.6, -1, 3]]][frame % 3];
  for (const [dx, dy, n] of arcs) { const end = bolt(cx + dx * 16, 22, dx, dy, n); pc.px(Math.round(end[0]), Math.round(end[1]), '#b4ecff'); }
  for (const [x, y] of [[cx - 12, 18], [cx + 10, 17], [cx + 3, 14]]) pc.px(x, y, '#ffffff');
  return pc;
}

// ---------------------------------------------------------------- apple sapling (48x64) and grown apple tree (96x128)
function leafCanopy(P, clusters, { leaf = MAT.leaf, seed = 1, apples = [] } = {}) {
  // each cluster is a volume (lit top-left); leaves break the silhouette and texture the surface
  clusters.forEach(([x, y, r], i) => {
    const sph = N.sphere(x - r * 0.15, y - r * 0.2, r * 1.15, r * 1.1);
    const leafy = (px, py) => { const a = Math.atan2(py - y, px - x); const rr = r * (0.84 + 0.2 * Math.abs(Math.sin(a * 4.5 + i * 1.7)) + 0.08 * Math.sin(a * 11 + i)); return Math.hypot(px - x, py - y) <= rr; };
    P.add(M.fn(leafy, x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3), {
      m: leaf, n: (px, py) => { const b = sph(px, py); const lx = Math.floor((px + i * 3) / 3.2), ly = Math.floor((py + (lx % 2) * 1.6) / 2.6); const h = hash2(lx, ly, seed + i); return norm3(b[0] + (h - 0.5) * 0.7, b[1] + (hash2(ly, lx, seed) - 0.5) * 0.6, b[2]); },
      tex: (px, py) => { const lx = (px + i * 3) / 3.2, ly = (py + (Math.floor(lx) % 2) * 1.6) / 2.6; const fx = lx - Math.floor(lx), fy = ly - Math.floor(ly); return fx < 0.18 || fy < 0.2 ? -0.12 : 0; }, contour: 1, cast: 2,
    });
  });
  for (const [x, y, r] of apples) { P.add(M.ellipse(x, y, r, r * 0.95), { m: MAT.apple, n: N.sphere(x - 0.3, y - 0.3, r + 0.3, r + 0.3), contour: 1, cast: 1 }); }
}
export function sapling(grown = false) {
  if (!grown) {
    const W = 48, H = 64; const P = new Painter(W, H);
    P.add(M.ellipse(24, 63, 13, 3.6), { m: mat(['#1e140e', '#38261a', '#563c26', '#6e5232', '#8a6c44']), n: N.flat(0, -0.9, 0.5), tex: (x, y) => (hash2(x, y, 2) > 0.8 ? -0.2 : 0) });
    // support stake + tie
    P.add(M.rect(30, 22, 2, 41), { m: MAT.driftwood, n: N.cylV(31, 1.2), contour: 1 });
    P.add(M.bezier([24, 62], [23, 50], [26, 40], [24, 26], 1.6, 1, 14), { m: MAT.oak, n: 1.4, cast: 1 });
    P.add(M.bezier([24, 40], [20, 36], [16, 34], [13, 30], 0.9, 0.6, 10), { m: MAT.oak, n: 1, cast: 1 });
    P.add(M.bezier([25, 33], [29, 30], [32, 27], [35, 24], 0.9, 0.6, 10), { m: MAT.oak, n: 1, cast: 1 });
    P.add(M.rect(25, 41, 6, 1.5), { m: MAT.rope, n: N.flat(), contour: 1 });
    leafCanopy(P, [[12, 27, 5.5], [35, 21, 5.6], [24, 21, 6.8], [17, 16, 5], [29, 12, 5.2]], { seed: 4 });
    const pc = P.render();
    pc.px(21, 14, '#e8f2a0'); pc.px(33, 18, '#e8f2a0');
    return pc;
  }
  const W = 96, H = 128; const P = new Painter(W, H);
  P.add(M.ellipse(48, 126, 30, 4), { m: mat(['#1e140e', '#38261a', '#563c26', '#6e5232', '#8a6c44']), n: N.flat(0, -0.9, 0.5), tex: (x, y) => (hash2(x, y, 7) > 0.8 ? -0.2 : 0) });
  // trunk with flared roots, bark grooves, and limbs into the crown
  const bark = (x, y) => (Math.floor(x * 0.7 + Math.sin(y * 0.35) * 1.4) % 3 === 0 ? -0.2 : 0);
  P.add(M.union(M.poly([[38, 126], [42, 104], [43, 80], [41, 62], [55, 62], [53, 80], [54, 104], [60, 126]]), M.ellipse(34, 124, 6, 3), M.ellipse(62, 124, 7, 3)), { m: MAT.walnut, n: N.cylV(48, 9), tex: bark, cast: 2 });
  for (const [p0, p1, p2, p3, r0, r1] of [[[44, 70], [36, 58], [26, 50], [18, 40], 4, 1.8], [[51, 68], [60, 56], [70, 50], [78, 42], 4, 1.8], [[48, 66], [47, 52], [50, 40], [48, 26], 4.2, 2], [[44, 60], [38, 48], [34, 36], [30, 24], 2.6, 1.4]]) P.add(M.bezier(p0, p1, p2, p3, r0, r1, 18), { m: MAT.walnut, n: 2, tex: bark, cast: 2, contour: 1 });
  leafCanopy(P, [[22, 40, 12], [74, 40, 12.5], [48, 24, 15], [30, 22, 11], [66, 20, 11.5], [48, 46, 13], [16, 54, 8], [80, 56, 8.5], [36, 52, 9], [62, 54, 9.5], [48, 10, 9]], { seed: 9, apples: [[30, 46, 3.4], [58, 34, 3.6], [72, 50, 3.4], [42, 30, 3.2], [20, 50, 3], [64, 60, 3.4], [50, 54, 3.2], [80, 46, 3]] });
  const pc = P.render();
  for (const [x, y] of [[29, 45], [57, 33], [71, 49], [41, 29], [19, 49], [63, 59], [49, 53], [79, 45]]) { pc.px(x - 1, y - 1, '#ffd8b0'); pc.px(x + 1, y - 4, '#3a2416'); pc.px(x + 2, y - 5, '#6a9e32'); }
  return pc;
}

// ---------------------------------------------------------------- gravity well (top-down vortex, 128x64), 4 frames
export function well(frame = 0) {
  const W = 128, H = 64; const pc = new PixelCanvas(W, H); const R = RAMP.glow; const ph = (frame % 4) / 4 * Math.PI * 2 / 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - 64) / 62, dy = (y + 0.5 - 32) / 30; const r = Math.hypot(dx, dy); if (r > 1) continue;
    const a = Math.atan2(dy, dx); const arm = Math.sin(3 * (a + ph) + Math.log(r + 0.02) * 5.2);
    if (r < 0.13) { pc.px(x, y, r < 0.09 ? '#05030c' : '#2a1458'); continue; }
    if (r < 0.2) { pc.px(x, y, r < 0.16 ? R[6] : R[5]); continue; }
    const v = arm * 0.5 + 0.5 - r * 0.55 + (1 - r) * 0.25; if (v < 0.42 - (1 - r) * 0.2) continue;
    pc.px(x, y, v > 0.95 ? R[6] : v > 0.82 ? R[5] : v > 0.7 ? R[4] : v > 0.58 ? R[3] : v > 0.48 ? R[2] : R[1]);
  }
  // in-falling motes
  for (let i = 0; i < 10; i++) { const a = i * 2.4 + ph * 1.5, r = 0.35 + (i % 4) * 0.15; pc.px(Math.round(64 + Math.cos(a) * r * 62), Math.round(32 + Math.sin(a) * r * 30), '#e4fbff'); }
  return pc;
}

// ---------------------------------------------------------------- steam (128x80), 4 frames of billowing puffs
export function steam(frame = 0) {
  const W = 128, H = 80; const P = new Painter(W, H); const ph = (frame % 4) / 4;
  const sm = mat(['#4a4c5c', '#6c6e7e', '#9496a4', '#bcbec8', '#dddfe4', '#f4f4f6', '#ffffff'], { amb: 0.4, dif: 0.62, wrap: 0.5, bounce: 0.06 });
  // three rising columns of billows; each billow is a cluster of round lobes that grows as it rises and breaks up at the top
  const billows = [];
  for (let c = 0; c < 3; c++) for (let k = 0; k < 4; k++) {
    const life = (ph + k / 4 + c * 0.13) % 1; if (life > 0.94) continue; const x0 = 28 + c * 36 + Math.sin(life * 5 + c * 2) * 5 * life, y0 = 74 - life * 60; const r = 5 + life * 8;
    billows.push([x0, y0, r, c * 10 + k, life]);
  }
  billows.sort((a, b) => b[1] - a[1]);
  for (const [x, y, r, id, life] of billows) {
    const lobes = []; const n = 4 + (id % 3); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + id; lobes.push([x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.42, r * (0.5 + hash2(i, id) * 0.25)]); }
    lobes.push([x, y - r * 0.1, r * 0.72]); const scale = life > 0.8 ? 1 - (life - 0.8) * 2.5 : 1;
    const mask = M.union(...lobes.map(([lx, ly, lr]) => M.ellipse(lx, ly, lr * scale, lr * scale * 0.9)));
    P.add(mask, { m: sm, n: (px, py) => { let best = null, bd = 1e9; for (const [lx, ly, lr] of lobes) { const d = Math.hypot(px - lx, py - ly) / lr; if (d < bd) { bd = d; best = [lx, ly, lr]; } } const a = N.sphere(best[0], best[1] - best[2] * 0.15, best[2] * 1.2, best[2] * 1.1)(px, py), b = N.sphere(x, y, r * 1.3, r * 1.2)(px, py); return norm3(a[0] * 0.5 + b[0] * 0.5, a[1] * 0.5 + b[1] * 0.5, a[2] * 0.5 + b[2] * 0.5); }, contour: 1, cast: 1, shade: life > 0.6 ? 0 : -1 });
  }
  return P.render();
}

// ---------------------------------------------------------------- rain cloud (96x64), 4 frames
export function rainCloud(frame = 0) {
  const W = 96, H = 64; const P = new Painter(W, H); const ph = frame % 4;
  const puffs = [[22, 26, 12], [40, 18, 15], [60, 20, 14], [76, 28, 11], [50, 30, 13], [30, 32, 10], [68, 33, 9]];
  for (const [x, y, r] of puffs) P.add(M.fn((px, py) => Math.hypot(px - x, py - y) <= r && py <= 37, x - r, y - r, x + r, y + r), { m: MAT.cloud, n: N.sphere(x - r * 0.25, y - r * 0.3, r * 1.15, r * 1.2), contour: 1, cast: 2 });
  P.add(M.rect(12, 35, 74, 3), { m: MAT.cloud, n: N.flat(0, 0.8, 0.6), contour: 0, shade: -1 });
  const pc = P.render();
  // rain: short slanted streaks falling in staggered rows
  for (let i = 0; i < 22; i++) { const x0 = 16 + ((i * 37) % 66), y0 = 40 + (((i * 13) % 4) * 6 + ph * 6) % 24; for (let k = 0; k < 3; k++) { const y = y0 + k, x = x0 - Math.floor((y0 + k) / 6); if (y < H) pc.px(x, y, k === 2 ? '#c4ecf6' : '#72c2e0'); } }
  if (ph === 2) { pc.line(60, 38, 57, 44, '#fff6cc'); pc.line(57, 44, 60, 47, '#fff6cc'); pc.line(60, 47, 56, 54, '#ffd75c'); }
  return pc;
}

// ---------------------------------------------------------------- little moon (48x48): cratered gibbous moon with a faint orbit
export function moon() {
  const W = 48, H = 48; const P = new Painter(W, H); const c = 24, r = 15;
  const craters = [[19, 18, 3.6], [29, 27, 4.4], [17, 30, 2.6], [30, 15, 2.2], [24, 35, 2.4]];
  P.add(M.ellipse(c, c, r, r), {
    m: MAT.moon, n: (x, y) => { let n = N.sphere(c, c, r, r)(x, y); for (const [cx, cy, cr] of craters) { const d = Math.hypot(x - cx, y - cy) / cr; if (d < 1) { const k = d < 0.75 ? -0.7 : 0.6; n = norm3(n[0] + (x - cx) / cr * k, n[1] + (y - cy) / cr * k, n[2]); } } return n; },
    tex: (x, y) => { const mare = fbm(x * 0.09, y * 0.09, 12); return mare > 0.56 ? -0.16 : 0; },
  });
  const pc = P.render();
  // orbit trail: a thin dotted ellipse behind and in front
  for (let a = 0; a < Math.PI * 2; a += 0.05) { const x = Math.round(c + Math.cos(a) * 22.5), y = Math.round(c + Math.sin(a) * 6 + 4); if ((Math.floor(a * 9) % 2) && (Math.sin(a) > 0 || !pc.alpha(x, y))) pc.px(x, y, Math.sin(a) > 0 ? '#e4fbff' : '#8ee2ff'); }
  glint(pc, 16, 14, 1, '#ffffff', '#f6f0dc');
  return pc;
}

// ---------------------------------------------------------------- spring catapult (96x80): cocked + loaded / released
export function catapult(loaded = false) {
  const W = 96, H = 80; const P = new Painter(W, H);
  const wood = MAT.oak; const g = grain(11, { w: 96, h: 80 });
  // base skid + wheels (far wheel first, darker)
  const wheel = (x, y, far) => { P.add(M.ring(x, y, 4.2, 8.4), { m: MAT.walnut, n: N.torus(x, y, 6.3, 2.2), shade: far ? -1 : 0, cast: 1 }); P.add(M.ellipse(x, y, 4.2, 4.2), { m: MAT.oak, n: N.flat(), shade: far ? -2 : -1, contour: 1 }); P.add(M.ellipse(x, y, 2.2, 2.2), { m: MAT.iron, n: N.sphere(x - 0.4, y - 0.4, 2.4, 2.4), contour: 1 }); };
  wheel(72, 70, true);
  P.add(M.poly([[6, 62], [90, 62], [92, 68], [4, 68]]), { m: wood, n: N.flat(0, -0.4, 1), tex: g, cast: 2 });
  // A-frame upright and crossbar
  P.add(M.poly([[40, 62], [46, 30], [51, 30], [56, 62], [51, 62], [48.5, 40], [46, 62]]), { m: wood, n: 1.5, tex: g, cast: 2 });
  P.add(M.rect(38, 27, 22, 5), { m: wood, n: N.cylH(29.5, 2.8), tex: g, cast: 2, contour: 1 });
  // the spring: side view of a steel coil between two iron plates (strokes drawn after render)
  const px = 30, py = 56;
  P.add(M.rect(px - 11, py - 7, 2.4, 14), { m: MAT.iron, n: N.cylV(px - 9.8, 1.4), contour: 1, cast: 1 });
  P.add(M.rect(px + 9, py - 7, 2.4, 14), { m: MAT.iron, n: N.cylV(px + 10.2, 1.4), contour: 1, cast: 1 });
  // throwing arm with a cup
  const ang = loaded ? -0.12 : -1.2; const len = 50; const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
  P.add(M.capsule(px, py, ex, ey, 2.6, 2.2), { m: wood, n: N.cyl(px, py, ex, ey, 3), tex: g, cast: 2, contour: 1 });
  const cupX = ex + Math.cos(ang - Math.PI / 2) * 3.4, cupY = ey + Math.sin(ang - Math.PI / 2) * 3.4;
  P.add(M.ellipse(cupX, cupY, 6, 4, ang), { m: MAT.leather, n: N.sphere(cupX, cupY + 1, 6, 4.6), cast: 1, contour: 1 });
  if (loaded) { P.add(M.ellipse(cupX, cupY - 4, 5, 5), { m: MAT.apple, n: N.sphere(cupX - 0.5, cupY - 4.5, 5.4, 5.4), cast: 1, contour: 1 }); }
  // trigger rope (loaded) pinning the arm down
  if (loaded) P.add(M.capsule(ex - 4, ey + 2, 76, 62, 0.7, 0.7), { m: MAT.rope, n: 0.6, contour: 0 });
  // near wheel
  wheel(22, 70, false);
  const pc = P.render();
  for (const [x, y] of [[10, 64], [86, 64], [45, 34], [52, 34]]) nail(pc, x, y);
  { const px = 30, py = 56; const I = RAMP.iron; // coil: back strokes dark, front strokes lit with a highlight pixel
    for (let i = 0; i < 6; i++) { const x0 = px - 8 + i * 3; pc.line(x0 + 3, py - 6, x0 + 1, py + 6, I[1]); }
    for (let i = 0; i < 6; i++) { const x0 = px - 8 + i * 3; pc.line(x0, py - 6, x0 + 2, py + 6, I[3]); pc.line(x0 + 1, py - 6, x0 + 3, py + 6, I[2]); pc.px(x0, py - 5, I[5]); } }
  for (const [wx, wy, c] of [[22, 70, RAMP.walnut[2]], [72, 70, RAMP.walnut[1]]]) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; pc.line(Math.round(wx + Math.cos(a) * 2.5), Math.round(wy + Math.sin(a) * 2.5), Math.round(wx + Math.cos(a) * 4.5), Math.round(wy + Math.sin(a) * 4.5), c); }
  if (loaded) { const ax = Math.round(cupX), ay = Math.round(cupY - 4); pc.px(ax - 2, ay - 2, '#ffd2b0'); pc.px(ax, ay - 5, '#4a2c18'); pc.px(ax + 1, ay - 6, '#6a9e32'); }
  return pc;
}

// ---------------------------------------------------------------- burning glass (64x96): brass-ringed lens on a stand, focused sunbeam
export function burningGlass() {
  const W = 64, H = 96; const P = new Painter(W, H); const lx = 30, ly = 30, ra = 12, rb = 16; // lens tilted toward the sun
  // brass stand: tripod legs + column + yoke holding the lens
  P.add(M.capsule(31, 60, 47, 95, 1.5, 1.3), { m: MAT.walnut, n: 1.2, shade: -1, cast: 1 });
  P.add(M.capsule(31, 60, 15, 95, 1.7, 1.5), { m: MAT.walnut, n: 1.4, cast: 1 });
  P.add(M.capsule(31, 60, 33, 95, 1.7, 1.5), { m: MAT.walnut, n: 1.4, cast: 1 });
  P.add(M.rect(29, 46, 5, 16), { m: MAT.brass, n: N.cylV(31.5, 2.8), cast: 2, contour: 1 });
  P.add(M.bezier([lx - ra - 1, ly + 4], [lx - ra - 3, ly + 18], [lx + ra + 3, ly + 18], [lx + ra + 1, ly + 4], 1.4, 1.4, 18), { m: MAT.brass, n: 1.2, cast: 2 });
  // lens: thick brass bezel, pale glass that shows a bright sky reflection and a dark refracted rim
  P.add(M.ellipse(lx, ly, ra + 3, rb + 3, -0.35), { m: MAT.brass, n: N.torus(lx, ly, (ra + rb) / 2 + 1.5, 2.4), cast: 2 });
  P.add(M.ellipse(lx, ly, ra, rb, -0.35), { m: mat(['#2a4a58', '#4a7a86', '#7cb0b4', '#b2dcd6', '#e0f6f0', '#ffffff'], { amb: 0.5, dif: 0.45 }), n: N.sphere(lx - 3, ly - 4, ra * 1.4, rb * 1.3), contour: 1, tex: (x, y) => { const d = Math.hypot((x - lx) / ra, (y - ly) / rb); return d > 0.82 && x + y > lx + ly ? -0.45 : 0; } });
  const pc = P.render();
  // sun rays entering from the upper left, converging cone leaving toward the focus (dotted light)
  const fx = 57, fy = 77; const ray = (x0, y0, x1, y1, c1, c2, step) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i += step) { const x = Math.round(lerp(x0, x1, i / n)), y = Math.round(lerp(y0, y1, i / n)); if (!pc.alpha(x, y)) pc.px(x, y, i / n > 0.6 ? c1 : c2); } };
  for (const o of [-7, 0, 7]) ray(lx - 26 + o * 0.6, ly - 26 - o, lx - 6 + o * 0.6, ly - 6 - o, '#ffe08a', '#fff6cc', 2);
  for (const o of [-9, -3, 3, 9]) ray(lx + 6 + o * 0.5, ly + 6 - o * 0.7, fx, fy, '#fff6cc', '#ffd75c', 2);
  // the focus: a blazing point with a curl of smoke
  glint(pc, fx, fy, 2, '#ffffff', '#ffd75c'); pc.px(fx - 1, fy - 1, '#fff6cc'); pc.px(fx + 1, fy + 1, '#fa9c2c');
  for (const [x, y, c] of [[fx + 1, fy - 4, '#bebac0'], [fx + 2, fy - 5, '#96929a'], [fx + 2, fy - 7, '#bebac0'], [fx + 1, fy - 8, '#96929a'], [fx + 2, fy - 10, '#6e6a74']]) pc.px(x, y, c);
  // glass glints
  glint(pc, lx - 6, ly - 8, 2); pc.px(lx - 3, ly - 3, '#ffffff'); pc.px(lx + 6, ly + 9, '#e0f6f0');
  return pc;
}

// ---------------------------------------------------------------- whirlwind (64x96), 4 frames
export function whirl(frame = 0) {
  const W = 64, H = 96; const pc = new PixelCanvas(W, H); const ph = (frame % 4) / 4;
  const R = ['#3e4c62', '#5c6e86', '#8ca2b8', '#bcd0de', '#e2f0f6', '#ffffff'];
  const rows = []; for (let y = 6; y < 88; y += 3) rows.push(y);
  const radius = (y) => 3 + Math.pow((90 - y) / 84, 1.35) * 25; const center = (y) => 32 + Math.sin((90 - y) * 0.07 + ph * 6.28) * 2.5 * ((90 - y) / 84);
  // back arcs first (dim), then front arcs (bright): each band is an elliptical swoosh whose gap rotates with the frame
  for (const front of [false, true]) for (const y of rows) {
    const r = radius(y), cx = center(y), e = Math.max(1, r * 0.18); const spin = ph * Math.PI * 2 + y * 0.35;
    for (let a = 0; a < Math.PI * 2; a += 0.03) {
      const isFront = Math.sin(a) > 0; if (isFront !== front) continue; const gap = Math.sin(a * 1 + spin); if (gap < -0.2) continue;
      const x = Math.round(cx + Math.cos(a) * r), yy = Math.round(y + Math.sin(a) * e);
      const lvl = front ? (gap > 0.75 ? 5 : gap > 0.35 ? 4 : 3) : (gap > 0.6 ? 2 : 1); if (!front && pc.alpha(x, yy)) continue; pc.px(x, yy, R[lvl]);
    }
  }
  // dust skirt and debris at the base
  for (let i = 0; i < 40; i++) { const a = i * 0.77 + ph * 6.28; const r = 4 + (i % 6) * 2.6; const x = Math.round(32 + Math.cos(a) * r), y = Math.round(90 + Math.sin(a) * 2.2 - (i % 3)); pc.px(x, y, i % 4 ? '#a8845a' : i % 3 ? '#86643a' : '#c8a87a'); }
  for (let i = 0; i < 5; i++) { const a = i * 1.7 + ph * 6.28 * (1 + i * 0.1); const y = Math.round(80 - i * 15); const r = radius(y) + 2; const x = Math.round(center(y) + Math.cos(a) * r); pc.px(x, y, '#6e8a30'); pc.px(x + 1, y, '#94a83c'); pc.px(x, y + 1, '#4f6c28'); }
  return pc;
}
