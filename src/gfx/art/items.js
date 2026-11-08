// Curio icons (64x64, iconic silhouettes with bright cores so they read on a dark brass token),
// Schrodinger's crate (menu hero sprite, 2 frames) and Newton's apple (hero sprite).
import { PixelCanvas } from '../pixel.js';
import { Painter, M, N, mat, norm3, clamp, lerp, mix, darken, lighten, hash2, fbm, glint, text, getHex, arc } from './core.js';
import { RAMP, MAT } from './ramps.js';
import { grain, nail, screwHead } from './props.js';

const S = 64;
const glowM = mat(RAMP.glow, { amb: 0.7, dif: 0.3 });
const verdigris = mat(['#0e1e1a', '#1a3a30', '#2c5e4a', '#4a8a6a', '#7ab894', '#b4e0c0']);
const bronzeOld = mat(['#2a160c', '#4e2c14', '#7a4a20', '#a46a32', '#c8904c', '#e6bc7c'], { metal: 0.45, spec: 0.9, pow: 14 });
const string = (pc, x0, y0, x1, y1, c1, c2) => { pc.line(x0, y0, x1, y1, c1); pc.line(x0 + 1, y0, x1 + 1, y1, c2); };

// ---------------------------------------------------------------- apples (shared by golden apple + hero apple)
function apple(P, cx, cy, r, m, { leaf = true, stem = true } = {}) {
  // two lobes at the top, a dimple, slightly narrower base: an apple silhouette, not a ball
  const shape = M.fn((x, y) => { const dx = (x - cx) / r, dy = (y - cy) / r; const a = Math.atan2(dy, dx); let rr = 1 - 0.1 * Math.max(0, Math.sin(-a)) * (Math.abs(dx) < 0.28 ? 1.6 : 0.4) - (dy > 0.55 ? (dy - 0.55) * 0.35 : 0); rr *= 1 - 0.06 * Math.cos(2 * a); return dx * dx + dy * dy <= rr * rr; }, cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1);
  P.add(shape, { m, n: (x, y) => { const s = N.sphere(cx - r * 0.06, cy + r * 0.04, r * 1.04, r * 1.02)(x, y); const dd = Math.hypot(x - cx, y - (cy - r * 0.78)) / (r * 0.34); const k = dd < 1 ? (1 - dd) * 0.9 : 0; return norm3(s[0] - (x - cx) / r * k, s[1] + k * 0.8, s[2]); }, cast: 2, tex: (x, y) => (Math.sin((x - cx) * 0.9 + Math.sin(y * 0.3) * 2) > 0.88 && y > cy - r * 0.6 && y < cy + r * 0.2 ? -0.06 : 0) });
  if (stem) P.add(M.bezier([cx, cy - r * 0.7], [cx - 0.5, cy - r * 0.95], [cx + r * 0.05, cy - r * 1.15], [cx + r * 0.16, cy - r * 1.3], r * 0.07 + 0.6, r * 0.05 + 0.5, 10), { m: MAT.walnut, n: 1, cast: 2, contour: 1 });
  if (leaf) { const lx = cx + r * 0.42, ly = cy - r * 1.06; P.add(M.fn((x, y) => { const u = (x - (cx + r * 0.12)) / (r * 0.62), v = (y - ly) / (r * 0.24) + u * 0.9 - 0.4; return u > 0 && u < 1 && Math.abs(v) < Math.sin(u * Math.PI) * 1.05; }, cx, ly - r * 0.6, cx + r, ly + r * 0.4), { m: MAT.leaf, n: (x, y) => norm3(-0.3, -0.5 + ((y - ly) > (x - lx) * -0.4 ? 0.6 : 0), 1), cast: 2, contour: 1 }); }
}

// ---------------------------------------------------------------- the curios
const ITEM = {
  spirit_cross() { // marionette control bar with six glowing gravity strings
    const P = new Painter(S, S);
    P.add(M.poly([[8, 18], [56, 12], [57, 17], [9, 23]]), { m: MAT.walnut, n: N.cyl(8, 20.5, 56, 14.5, 3), tex: grain(3, { w: 64, h: 12, y0: 12 }), cast: 3 });
    P.add(M.poly([[29, 4], [34, 4], [36, 32], [31, 32]]), { m: MAT.walnut, n: N.cylV(32.5, 3), tex: grain(5, { vertical: true, w: 6, h: 30, x0: 29, y0: 4 }), cast: 3, contour: 1 });
    for (const [x, y] of [[32, 6], [33, 29], [11, 20], [53, 15]]) P.add(M.ellipse(x, y, 2.2, 2.2), { m: MAT.brass, n: N.sphere(x - 0.4, y - 0.4, 2.4, 2.4), contour: 1 });
    const pc = P.render();
    const ends = [[11, 23, 6, 58], [20, 22, 18, 61], [28, 21, 28, 56], [37, 20, 38, 61], [46, 18, 47, 57], [54, 18, 58, 60]];
    for (const [x0, y0, x1, y1] of ends) { string(pc, x0, y0, x1, y1, '#8ee2ff', '#6a46c4'); pc.px(x1, y1, '#e4fbff'); pc.px(x1, y1 + 1, '#8ee2ff'); pc.px(x1 - 1, y1, '#9a7cf0'); pc.px(x1 + 1, y1, '#9a7cf0'); }
    for (const [x, y] of [[14, 40], [42, 44], [24, 50], [52, 36]]) glint(pc, x, y, 1, '#e4fbff', '#9a7cf0');
    return pc;
  },
  golden_apple() {
    const P = new Painter(S, S); apple(P, 31, 37, 21, mat(RAMP.gold, { metal: 0.32, spec: 1.2, pow: 22, amb: 0.18 })); const pc = P.render();
    glint(pc, 20, 26, 2); pc.px(23, 24, '#ffffff'); pc.px(40, 48, '#fff08a');
    return pc;
  },
  lever() { // "give me a place to stand": plank on a stone fulcrum lifting a little Earth
    const P = new Painter(S, S);
    P.add(M.poly([[26, 58], [36, 40], [46, 58]]), { m: MAT.marble, n: (x) => (x < 36 ? norm3(-0.6, -0.3, 0.8) : norm3(0.6, -0.3, 0.8)), cast: 2 });
    P.add(M.poly([[2, 28], [60, 44], [59, 48], [1, 32]]), { m: MAT.oak, n: N.cyl(2, 30, 60, 46, 2.4), tex: grain(9, { w: 64, h: 20, y0: 28 }), cast: 3, contour: 1 });
    P.add(M.ellipse(11, 20, 9, 9), { m: mat(['#0c1e40', '#163a70', '#2060a4', '#3a8ac8', '#7cc0e8', '#c8ecfa']), n: N.sphere(10, 18, 10, 10), cast: 2, tex: (x, y) => (fbm(x * 0.25, y * 0.25, 4) > 0.55 ? 1 : 0) * 0.0, contour: 1 });
    P.add(M.fn((x, y) => Math.hypot(x - 11, y - 20) < 8.5 && fbm(x * 0.22, y * 0.22, 4) > 0.53, 2, 11, 20, 29), { m: MAT.leaf, n: N.sphere(10, 18, 10, 10), contour: 0, clip: true });
    P.add(M.ellipse(56, 52, 4.8, 3.2), { m: MAT.bronze, n: N.sphere(55, 51, 5, 4), cast: 1, contour: 1 });
    const pc = P.render(); glint(pc, 7, 15, 1); for (const [x, y] of [[50, 30], [52, 26], [54, 22]]) pc.px(x, y, '#ffe08a');
    return pc;
  },
  pendulum() { // Foucault pendulum: heavy brass bob on a long wire, swing arc
    const P = new Painter(S, S);
    P.add(M.rect(18, 3, 28, 4), { m: MAT.walnut, n: N.cylH(5, 2.2), cast: 2 });
    P.add(M.union(M.ellipse(40, 46, 9, 9), M.poly([[33, 50], [47, 50], [40, 61]]), M.rect(38.5, 34, 3, 4)), { m: MAT.brass, n: N.sphere(38, 44, 10.5, 12), cast: 2 });
    const pc = P.render();
    string(pc, 32, 7, 40, 34, '#d8d4cc', '#7a746e');
    for (let a = -0.5; a <= 0.5; a += 0.012) { const x = Math.round(32 + Math.sin(a) * 52), y = Math.round(7 + Math.cos(a) * 52); if (Math.abs(a) > 0.08 && (Math.floor(a * 60) % 3 !== 0) && !pc.alpha(x, y)) pc.px(x, y, a < 0 ? '#9a7cf0' : '#8ee2ff'); }
    glint(pc, 36, 41, 1); screwHead(pc, 32, 5, 2, RAMP.brass, 0.5);
    return pc;
  },
  leyden() { // Leyden jar: glass with tin foil, brass rod and knob, sparks
    const P = new Painter(S, S);
    P.add(M.superellipse(32, 41, 15, 19, 3.2), { m: MAT.jar, n: N.cylV(32, 15.5), contour: 1, cast: 2 });
    P.add(M.fn((x, y) => y > 44 && Math.pow(Math.abs(x - 32) / 15, 3.2) + Math.pow(Math.abs(y - 41) / 19, 3.2) <= 1, 16, 44, 48, 61), { m: MAT.iron, n: N.cylV(32, 15.5), clip: true, contour: 1 });
    P.add(M.rect(22, 20, 20, 5), { m: MAT.walnut, n: N.cylV(32, 10.5), cast: 2, contour: 1 });
    P.add(M.rect(30.5, 9, 3, 12), { m: MAT.brass, n: N.cylV(32, 1.8), cast: 1, contour: 1 });
    P.add(M.ellipse(32, 8, 5, 5), { m: MAT.brass, n: N.sphere(31, 7, 5.4, 5.4), cast: 2 });
    const pc = P.render();
    for (let y = 25; y < 52; y += 2) pc.px(32 + ((y >> 1) % 2), y, '#c8a040');
    pc.line(22, 30, 22, 44, '#d4eedf'); pc.line(23, 28, 23, 31, '#ffffff');
    const bolt = [[39, 5], [44, 3], [42, 8], [48, 6]]; for (let i = 0; i + 1 < bolt.length; i++) pc.line(...bolt[i], ...bolt[i + 1], '#e4fbff');
    const b2 = [[25, 5], [21, 2], [22, 7], [17, 5]]; for (let i = 0; i + 1 < b2.length; i++) pc.line(...b2[i], ...b2[i + 1], '#8ee2ff');
    glint(pc, 30, 6, 1);
    return pc;
  },
  wings() { // Icarus' wax wings: an upswept pair on a wooden frame, feathers set in dripping wax
    const P = new Painter(S, S); const wax = mat(['#4a3a12', '#7a6020', '#b08e34', '#dcbc58', '#f4e08c', '#fff8cc']); const fth = mat(['#4a4038', '#7a7064', '#aaa08e', '#d4ccb6', '#eee8d6', '#fffcf0'], { wrap: 0.25 });
    for (const sd of [-1, 1]) {
      const sh = sd < 0 ? -1 : 0; const rx = 32 + sd * 5, ry = 40;
      // primaries fanning up and out (back to front), then secondaries, then waxed coverts
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + sd * (0.25 + i * 0.17); const len = 30 - i * 2.4; const bx = rx + sd * i * 1.6, by = ry - i * 0.6; const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len; P.add(M.capsule(bx, by, ex, ey, 2.4, 1.6), { m: fth, n: N.cyl(bx, by, ex, ey, 2.8), contour: 1, cast: 1, shade: sh }); }
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + sd * (0.55 + i * 0.22); const len = 15 - i; const bx = rx + sd * i * 1.4, by = ry - 2; const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len; P.add(M.capsule(bx, by, ex, ey, 2.6, 2.2), { m: i % 2 ? fth : wax, n: N.cyl(bx, by, ex, ey, 3), contour: 1, cast: 1, shade: sh }); }
      P.add(M.ellipse(rx + sd * 4, ry - 6, 7, 5, sd * 0.5), { m: wax, n: N.sphere(rx + sd * 3, ry - 8, 8, 6), contour: 1, cast: 2, shade: sh });
    }
    P.add(M.rect(24, 38, 16, 5), { m: MAT.walnut, n: N.cylH(40.5, 2.6), contour: 1, cast: 2 });
    P.add(M.union(M.capsule(27, 43, 22, 58, 1.6, 1.4), M.capsule(37, 43, 42, 58, 1.6, 1.4)), { m: MAT.leather, n: 1.2, contour: 1, cast: 1 });
    const pc = P.render();
    for (const [x, y, n] of [[20, 37, 5], [45, 36, 6], [29, 45, 3], [36, 45, 4]]) for (let k = 0; k < n; k++) pc.px(x, y + k, k === n - 1 ? '#fff8cc' : k === 0 ? '#b08e34' : '#dcbc58');
    nail(pc, 27, 40); nail(pc, 37, 40);
    return pc;
  },
  antikythera() { // corroded bronze gear train with a dial
    const P = new Painter(S, S);
    const gear = (cx, cy, r, teeth, m, rot = 0) => { P.add(M.fn((x, y) => { const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx) + rot; const tooth = Math.cos(a * teeth) > 0.1 ? 1.8 : 0; if (d > r + tooth) return false; if (d < r * 0.22) return false; if (d < r * 0.72 && d > r * 0.3 && Math.abs(Math.sin(a * 2)) > 0.32) return false; return true; }, cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), { m, n: (x, y) => { const d = Math.hypot(x - cx, y - cy); return d > r - 2 ? norm3((x - cx) / d * 0.5, (y - cy) / d * 0.5, 0.85) : norm3(0, 0, 1); }, cast: 2, tex: (x, y) => (fbm(x * 0.3, y * 0.3, 8) > 0.6 ? 0.2 : 0) }); };
    gear(44, 42, 13, 14, verdigris, 0.1); gear(24, 26, 17, 18, bronzeOld, 0); gear(48, 16, 8, 9, bronzeOld, 0.2);
    const pc = P.render();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) { const x = Math.round(24 + Math.cos(a) * 3), y = Math.round(26 + Math.sin(a) * 3); pc.px(x, y, '#e6bc7c'); }
    pc.line(24, 26, 31, 20, '#2a160c'); glint(pc, 15, 15, 1, '#ffffff', '#e6bc7c');
    for (const [x, y] of [[40, 38], [47, 46], [45, 35]]) pc.px(x, y, '#b4e0c0');
    return pc;
  },
  schrodinger() { // tin lunchbox, lid ajar, ψ on the front, a cat tail curling out
    const P = new Painter(S, S); const tin = mat(['#1a2230', '#2e3a4e', '#4a5a72', '#6e8098', '#9cb0c4', '#d0dce6'], { metal: 0.35, spec: 1, pow: 16 });
    P.add(M.bezier([46, 32], [58, 30], [60, 18], [52, 12], 2.2, 1.6, 16), { m: mat(['#1a120e', '#3a2618', '#5e3e22', '#8a5e34', '#b0804c']), n: 1.6, cast: 2, tex: (x, y) => (Math.floor((x + y) / 3) % 2 ? -0.15 : 0.05) });
    P.add(M.poly([[8, 32], [56, 32], [56, 58], [8, 58]]), { m: tin, n: (x, y) => (x > 50 ? norm3(0.7, 0, 0.7) : norm3(0, 0, 1)), cast: 2 });
    P.add(M.poly([[6, 26], [54, 20], [58, 26], [10, 32]]), { m: tin, n: N.flat(0, -0.9, 0.5), cast: 3, contour: 1 });
    P.add(M.poly([[24, 20], [40, 18], [40, 21], [24, 23]]), { m: MAT.leather, n: N.flat(0, -0.6, 0.8), cast: 1, contour: 1 });
    P.add(M.ellipse(32, 26, 4, 1.4), { m: glowM, n: N.flat(), contour: 0 });
    const pc = P.render();
    const psi = [[26, 38], [26, 39], [26, 40], [27, 41], [28, 42], [29, 42], [30, 42], [31, 42], [32, 41], [33, 40], [33, 39], [33, 38], [29, 36], [29, 37], [29, 38], [29, 39], [29, 40], [29, 41], [29, 43], [29, 44], [29, 45], [29, 46], [30, 36], [30, 46]];
    for (const [x, y] of psi) { pc.px(x + 1, y + 1, '#1a2230'); } for (const [x, y] of psi) pc.px(x, y, '#ffe08a');
    for (const x of [12, 52]) for (const y of [36, 54]) pc.px(x, y, '#d0dce6');
    pc.px(30, 26, '#e4fbff'); pc.px(34, 26, '#e4fbff');
    return pc;
  },
  owl() { // Athena's little owl, frontal: big yellow eyes, spotted plumage, olive sprig
    const P = new Painter(S, S); const plum = mat(['#1e140e', '#3a2618', '#5e4028', '#86603c', '#ac845a', '#d0aa80']);
    P.add(M.union(M.ellipse(32, 40, 15, 17), M.ellipse(32, 22, 14, 12)), { m: plum, n: N.sphere(30, 30, 17, 24), cast: 2, tex: (x, y) => (y > 30 && hash2(Math.floor(x / 3), Math.floor(y / 3), 6) > 0.55 && (x + y) % 3 === 0 ? 0.35 : 0) });
    for (const s of [-1, 1]) P.add(M.ellipse(32 + s * 6, 21, 6.4, 6.4), { m: mat(['#5a4a34', '#8a7656', '#b8a47e', '#e0d0aa', '#f6ecd0']), n: N.sphere(32 + s * 6, 21, 7, 7), contour: 1 });
    for (const s of [-1, 1]) P.add(M.ellipse(32 + s * 6, 21, 3.6, 3.6), { m: mat(['#5a3a06', '#a87010', '#e0a820', '#fcd84a']), n: N.sphere(32 + s * 6 - 1, 20, 4, 4), contour: 1 });
    P.add(M.poly([[30, 26], [34, 26], [32, 31]]), { m: mat(['#3a3020', '#6a5a3a', '#a08a5c', '#c8b47e']), n: N.flat(0, -0.3, 1), contour: 1 });
    P.add(M.bezier([12, 58], [22, 56], [40, 57], [54, 56], 1.6, 1.2, 12), { m: MAT.walnut, n: 1.2, cast: 1, contour: 1 });
    for (const [x, y] of [[18, 54], [44, 53], [50, 59]]) P.add(M.ellipse(x, y, 3.6, 1.6, 0.4), { m: MAT.moss, n: N.flat(-0.3, -0.5, 1), contour: 1 });
    const pc = P.render();
    for (const s of [-1, 1]) { pc.px(32 + s * 6, 21, '#0a0606'); pc.px(32 + s * 6 + 1, 21, '#0a0606'); pc.px(32 + s * 6, 22, '#0a0606'); pc.px(32 + s * 6 + 1, 22, '#1a1006'); pc.px(32 + s * 6 - 1, 20, '#ffffff'); }
    for (const [x, y] of [[26, 13], [38, 13], [24, 15], [40, 15]]) pc.px(x, y, '#d0aa80');
    for (const x of [27, 31, 35, 37]) { pc.px(x, 56, '#3a2618'); pc.px(x, 57, '#1e140e'); }
    return pc;
  },
  pan_flute() { // syrinx: seven reeds bound with cord, a floating note
    const P = new Painter(S, S); const reed = mat(['#3a2a10', '#6a5020', '#9a7a34', '#c6a24e', '#e2c676', '#f6e6a8']);
    for (let i = 0; i < 7; i++) { const x = 12 + i * 6, top = 16 + i * 4, bot = 56; P.add(M.rect(x, top, 5, bot - top), { m: reed, n: N.cylV(x + 2.5, 3), tex: (px, py) => (Math.abs(py - (top + 12)) < 0.8 || Math.abs(py - (top + 28)) < 0.8 ? -0.2 : 0), cast: 1, contour: 1 }); P.add(M.ellipse(x + 2.5, top + 0.5, 2.4, 1.2), { m: mat(['#140c06', '#2a1c0e', '#3e2a14']), n: N.flat(), contour: 0 }); }
    P.add(M.poly([[10, 38], [54, 46], [54, 50], [10, 42]]), { m: MAT.rope, n: N.flat(0, -0.3, 1), tex: (x) => (x % 3 === 0 ? -0.25 : 0), cast: 1, contour: 1 });
    const pc = P.render();
    const note = [[50, 6], [50, 7], [50, 8], [50, 9], [50, 10], [50, 11], [51, 6], [52, 7], [53, 8], [48, 11], [49, 11], [48, 12], [49, 12]];
    for (const [x, y] of note) pc.px(x, y, '#ffe08a'); for (const [x, y] of note) if (!note.some(([a, b]) => a === x + 1 && b === y)) pc.px(x + 1, y, '#5a3a10');
    return pc;
  },
  horn() { // the Minotaur's horn: big curved, ridged, cracked base with a brass band
    const P = new Painter(S, S);
    P.add(M.bezier([14, 54], [10, 30], [30, 8], [56, 10], 9, 1.2, 26), { m: MAT.horn, n: 6, tex: (x, y) => { const t = Math.atan2(y - 54, x - 14); return Math.sin((x + y) * 0.55) > 0.65 ? -0.16 : 0; }, cast: 2 });
    P.add(M.bezier([12, 50], [11, 44], [12, 40], [14, 36], 8.6, 8.4, 6), { m: mat(['#2a2220', '#4a3c30', '#6e5c44', '#94805e']), n: 5, contour: 1, clip: true });
    P.add(M.fn((x, y) => Math.abs((x - 14) * 0.25 + (y - 46) * 1.0) < 2.2 && Math.hypot(x - 14, y - 46) < 11, 2, 34, 26, 58), { m: MAT.brass, n: N.flat(-0.3, -0.5, 1), clip: true, contour: 1 });
    const pc = P.render(); glint(pc, 40, 13, 1); pc.px(26, 28, '#ddd0a6'); pc.px(27, 26, '#ddd0a6');
    pc.line(9, 56, 13, 52, '#211a16'); pc.line(17, 58, 19, 53, '#211a16');
    return pc;
  },
  fang() { // hydra fang: long curved tooth with a gum root, venom drop
    const P = new Painter(S, S); const tooth = mat(['#3a3a2a', '#6a6a4c', '#9a9a72', '#c6c49a', '#e6e4c2', '#fafae6'], { spec: 0.9, pow: 18 });
    P.add(M.bezier([20, 8], [34, 18], [42, 34], [34, 58], 8.6, 0.8, 24), { m: tooth, n: 5, tex: (x, y) => (y < 20 ? -0.1 : 0), cast: 2 });
    P.add(M.ellipse(22, 9, 11, 7, 0.5), { m: MAT.slime || mat(['#081a12', '#10321e', '#1c522a', '#2e7636', '#4c9c42']), n: N.sphere(21, 7, 12, 8), contour: 1, cast: 2 });
    const pc = P.render();
    for (const [x, y, c] of [[33, 58, '#80c454'], [33, 59, '#c4e88a'], [34, 60, '#4c9c42'], [33, 61, '#80c454'], [32, 62, '#2e7636']]) pc.px(x, y, c);
    pc.line(25, 18, 32, 34, '#fafae6'); glint(pc, 27, 21, 1);
    return pc;
  },
  mirror() { // Medusa's mirror: polished bronze hand mirror reflecting snaky hair
    const P = new Painter(S, S); const pol = mat(['#3a2412', '#6a4422', '#9c6a3a', '#c8965a', '#e8c48a', '#fff0d0'], { metal: 0.6, spec: 1.2, pow: 20 });
    P.add(M.union(M.rect(29, 42, 6, 16), M.ellipse(32, 59, 5, 3)), { m: MAT.bronze, n: N.cylV(32, 3.4), cast: 2, tex: (x, y) => ((y % 4) === 0 ? -0.2 : 0) });
    P.add(M.ellipse(32, 24, 20, 20), { m: MAT.bronze, n: N.torus(32, 24, 18.4, 2.2), cast: 2 });
    P.add(M.ellipse(32, 24, 16.6, 16.6), { m: pol, n: N.sphere(28, 20, 26, 26), contour: 1 });
    for (let i = 0; i < 6; i++) { const a = -2.4 + i * 0.5; const x0 = 32 + Math.cos(a) * 4, y0 = 26 + Math.sin(a) * 4, x1 = 32 + Math.cos(a) * 12, y1 = 26 + Math.sin(a) * 11; P.add(M.bezier([x0, y0], [x0 + 3, y0 - 2], [x1 - 3, y1 + 2], [x1, y1], 1.4, 1, 10), { m: mat(['#0e2414', '#1c4422', '#2e6a32', '#4a9044']), n: 1, contour: 0, clip: true }); }
    const pc = P.render();
    for (let y = 9; y < 22; y++) for (let x = 19; x < 25; x++) if (Math.abs(x - 21.5 + (y - 15) * 0.3) < 1.3) { const c = getHex(pc, x, y); if (c) pc.px(x, y, mix(c, '#ffffff', 0.45)); }
    glint(pc, 20, 12, 2);
    return pc;
  },
  prism() { // Newton's prism splitting a white beam into the spectrum
    const P = new Painter(S, S);
    P.add(M.poly([[32, 10], [52, 46], [12, 46]]), { m: MAT.glass, n: (x, y) => (x < 32 - (y - 10) * 0.25 ? norm3(-0.55, -0.35, 0.8) : x > 32 + (y - 10) * 0.25 ? norm3(0.6, -0.3, 0.75) : norm3(0, -0.2, 1)), cast: 2 });
    P.add(M.poly([[12, 46], [52, 46], [56, 50], [16, 50]]), { m: MAT.glass, n: N.flat(0, 0.6, 0.8), shade: -1, contour: 1 });
    const pc = P.render();
    for (let x = 0; x < 22; x++) { const y = Math.round(30 + (x - 22) * -0.18); if (!pc.alpha(x, y)) { pc.px(x, y, '#ffffff'); pc.px(x, y + 1, '#d8d8e0'); } }
    const cols = ['#e84a3a', '#f29a2a', '#f6e04a', '#5ac04a', '#3a8ae8', '#6a4ac8']; cols.forEach((c, i) => { for (let x = 44; x < 64; x++) { const y = Math.round(28 + i * 1.4 + (x - 44) * (0.25 + i * 0.12)); if (y < 64 && !pc.alpha(x, y)) pc.px(x, y, c); } });
    pc.line(32, 12, 22, 30, '#e0f2e6'); pc.line(33, 13, 24, 30, '#a8c8bc'); glint(pc, 30, 18, 1);
    return pc;
  },
  sack() { // the kobalos's swag sack: patched burlap, rope tie, coins spilling
    const P = new Painter(S, S); const burlap = mat(['#2a1c10', '#4a3420', '#6e5034', '#94704a', '#b89466', '#d6b688'], { wrap: 0.25 });
    P.add(M.fn((x, y) => { const t = clamp((y - 20) / 40, 0, 1); const w = 9 + Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.6) * 18; return y >= 20 && y <= 60 && Math.abs(x - 32) <= w && y <= 60 - ((x - 32) / 26) ** 2 * 4; }, 4, 18, 60, 61), { m: burlap, n: N.bump(N.sphere(30, 44, 26, 22), (x, y) => Math.sin(Math.atan2(y - 14, x - 32) * 16) * 0.5 * clamp(1 - (y - 20) / 30, 0, 1), 1.4), tex: (x, y) => ((x + y * 2) % 4 === 0 ? -0.12 : 0) + ((x * 2 - y) % 5 === 0 ? 0.06 : 0), cast: 2 });
    P.add(M.fn((x, y) => { const a = (x - 32) / 13; if (Math.abs(a) > 1) return false; return y >= 8 - Math.cos(a * 1.5) * 2 + Math.abs(Math.sin(x)) * 2 && y <= 19; }, 18, 4, 46, 20), { m: burlap, n: N.flat(0, -0.5, 1), cast: 1, contour: 1 });
    P.add(M.rect(20, 18, 24, 3), { m: MAT.rope, n: N.cylH(19.5, 1.8), tex: (x) => (x % 3 === 0 ? -0.25 : 0), cast: 2, contour: 1 });
    P.add(M.rect(36, 36, 11, 10), { m: MAT.clothPurple, n: N.flat(0.2, -0.1, 1), cast: 1, contour: 1 });
    for (const [x, y, r] of [[52, 58, 5], [12, 59, 4.4], [45, 61, 4]]) { P.add(M.ellipse(x, y, r, r * 0.55), { m: MAT.gold, n: N.flat(0, -0.9, 0.4), cast: 1, contour: 1 }); }
    const pc = P.render();
    for (const [x, y] of [[37, 36], [39, 36], [41, 36], [43, 36], [45, 36], [36, 38], [36, 40], [36, 42], [36, 44], [46, 38], [46, 40], [46, 42], [46, 44]]) pc.px(x, y, '#e2b27a');
    text(pc, '$', 28, 40, '#3a2410');
    return pc;
  },
  thread() { // Ariadne's ball of golden thread unspooling into a little labyrinth path
    const P = new Painter(S, S); const yarn = mat(['#3a1408', '#6e2a0e', '#a84a18', '#d8762a', '#f2a84a', '#ffd88a'], { wrap: 0.3 });
    P.add(M.ellipse(24, 26, 16, 16), { m: yarn, n: N.sphere(22, 24, 17, 17), tex: (x, y) => { const a = Math.sin((x * 0.8 + y * 0.45) * 1.4), b = Math.sin((x * -0.5 + y * 0.9) * 1.3); return (y < 26 ? a : b) > 0.55 ? -0.2 : 0; }, cast: 2 });
    const pc = P.render();
    const path = [[36, 36], [44, 42], [44, 50], [32, 50], [32, 56], [56, 56], [56, 44], [50, 44]];
    for (let i = 0; i + 1 < path.length; i++) { pc.line(...path[i], ...path[i + 1], '#ffd88a'); pc.line(path[i][0] + 1, path[i][1] + 1, path[i + 1][0] + 1, path[i + 1][1] + 1, '#a84a18'); }
    pc.px(50, 44, '#fffbe8'); glint(pc, 16, 17, 1, '#ffffff', '#ffd88a');
    return pc;
  },
  wineskin() { // goatskin askos with a stopper and a dribble of wine
    const P = new Painter(S, S);
    P.add(M.fn((x, y) => { const u = (x - 32) / 24, v = (y - 38) / 17; return u * u + v * v * (1 + (u > 0 ? 0.3 : 0)) <= 1 || Math.hypot(x - 14, y - 50) < 5 || Math.hypot(x - 50, y - 51) < 4.5; }, 6, 18, 58, 58), { m: MAT.leather, n: N.bump(N.sphere(30, 34, 26, 20), (x, y) => Math.sin(x * 0.4 + Math.cos(y * 0.3) * 2) * 0.6, 1.2), cast: 2, tex: (x, y) => (fbm(x * 0.2, y * 0.2, 7) - 0.5) * 0.15 });
    P.add(M.poly([[44, 22], [52, 14], [56, 18], [50, 26]]), { m: MAT.leather, n: 2, cast: 2, contour: 1 });
    P.add(M.ellipse(54.5, 15.5, 3.4, 3.4), { m: MAT.oak, n: N.sphere(54, 15, 3.6, 3.6), cast: 1, contour: 1 });
    P.add(M.rect(44, 24, 9, 2.6), { m: MAT.rope, n: N.flat(), contour: 1, cast: 1 });
    const pc = P.render();
    for (const [x, y, c] of [[57, 19, '#ae2e58'], [58, 21, '#851a44'], [58, 23, '#ae2e58'], [59, 26, '#d35a7a'], [58, 27, '#851a44']]) pc.px(x, y, c);
    for (let i = 0; i < 18; i++) { const x = 20 + i * 1.4, y = Math.round(42 + Math.sin(i * 0.6) * 1.2); pc.px(Math.round(x), y, '#dc9e62'); }
    glint(pc, 21, 27, 1, '#ffffff', '#dca266');
    return pc;
  },
  plumb_bob() { // brass plumb bob on a string, with its cap
    const P = new Painter(S, S);
    P.add(M.union(M.poly([[22, 26], [42, 26], [44, 34], [32, 60], [20, 34]]), M.rect(28, 20, 8, 7)), { m: MAT.brass, n: (x, y) => { const dx = (x - 32) / 12; return norm3(dx * 0.85, y < 34 ? -0.3 : 0.25, Math.sqrt(Math.max(0.05, 1 - dx * dx * 0.7))); }, cast: 2 });
    P.add(M.rect(24, 24, 16, 3), { m: MAT.brass, n: N.cylV(32, 8.4), shade: 1, contour: 1 });
    const pc = P.render();
    string(pc, 31, 2, 31, 20, '#ece4d0', '#8a7e6a'); glint(pc, 26, 30, 2);
    for (let y = 36; y < 56; y += 3) pc.px(32, y, '#fff4c4');
    return pc;
  },
};
export const ITEM_IDS = Object.keys(ITEM);
export function itemIcon(id) { return (ITEM[id] || ITEM.spirit_cross)(); }

// ---------------------------------------------------------------- Schrodinger's crate (96x96): 0 closed with eyes in the gap, 1 lid popped with a cat
export function crate(frame = 0) {
  const W = 96, H = 96; const P = new Painter(W, H); const open = frame === 1;
  const plank = mat(RAMP.oak, { amb: 0.22, dif: 0.82 });
  const g = grain(17, { w: 96, h: 96 });
  // body: front face + right side + top rim (3/4 view)
  P.add(M.poly([[10, 40], [70, 40], [70, 94], [10, 94]]), { m: plank, n: N.flat(-0.05, 0, 1), tex: (x, y) => g(x, y) + (Math.abs(((y - 40) % 13.5) - 0) < 1 ? -0.3 : 0), cast: 2 });
  P.add(M.poly([[70, 40], [88, 30], [88, 82], [70, 94]]), { m: plank, n: N.flat(0.8, 0, 0.6), tex: (x, y) => g(x, y) * 0.8, cast: 2 });
  // corner battens + diagonal brace
  for (const [x, w] of [[10, 6], [64, 6]]) P.add(M.rect(x, 40, w, 54), { m: plank, n: N.flat(-0.1, 0, 1), shade: 1, tex: g, cast: 1, contour: 1 });
  P.add(M.poly([[16, 88], [22, 88], [64, 46], [58, 46]]), { m: plank, n: N.flat(-0.1, 0, 1), shade: 1, tex: g, cast: 1, contour: 1 });
  // the interior shadow (visible through the gap or open top)
  if (!open) {
    P.add(M.poly([[10, 34], [70, 34], [88, 24], [28, 24]]), { m: mat(['#08060a', '#140e10', '#20161a']), n: N.flat(), contour: 0 });
    P.add(M.poly([[6, 30], [72, 34], [90, 22], [24, 18], [6, 26]]), { m: plank, n: N.flat(-0.1, -0.85, 0.5), tex: g, cast: 3 });
    P.add(M.poly([[8, 34], [72, 38], [72, 41], [8, 37]]), { m: plank, n: N.flat(0, 0, 1), shade: 1, contour: 1, cast: 1 });
  } else {
    P.add(M.poly([[10, 40], [70, 40], [88, 30], [28, 30]]), { m: mat(['#08060a', '#140e10', '#20161a', '#2c2024']), n: N.flat(), contour: 0 });
    // the cat: head + ears + paws on the rim
    const fur = mat(['#1a1212', '#3a2a24', '#6a4c3a', '#9a7454', '#c49e74', '#e8c89c'], { wrap: 0.3 });
    P.add(M.union(M.ellipse(46, 26, 15, 13), M.poly([[33, 20], [34, 4], [44, 15]]), M.poly([[59, 20], [58, 4], [48, 15]])), { m: fur, n: N.sphere(44, 24, 17, 15), cast: 2, tex: (x, y) => ((Math.floor(x / 4) + Math.floor((y + x * 0.3) / 3)) % 4 === 0 && y < 24 ? -0.25 : 0) });
    for (const x of [36, 56]) P.add(M.ellipse(x, 39, 5, 3.4), { m: fur, n: N.sphere(x - 1, 38, 5.4, 4), cast: 2, contour: 1 });
    // popped lid flying up-left
    P.add(M.poly([[2, 14], [44, 2], [48, 8], [6, 20]]), { m: plank, n: N.flat(-0.3, -0.7, 0.6), tex: g, cast: 3, contour: 1 });
  }
  const pc = P.render();
  if (!open) { // glowing cat eyes peeking through the gap
    for (const x of [40, 52]) { pc.px(x, 30, '#c8ff6a'); pc.px(x + 1, 30, '#c8ff6a'); pc.px(x, 31, '#7ad040'); pc.px(x + 1, 31, '#e8ffb0'); pc.px(x, 32, '#3a8a20'); pc.px(x + 1, 32, '#7ad040'); }
  } else { // face: eyes, nose, whiskers, inner ears
    for (const [x, y] of [[39, 24], [52, 24]]) { pc.px(x, y, '#c8ff6a'); pc.px(x + 1, y, '#0a0806'); pc.px(x, y + 1, '#7ad040'); pc.px(x + 1, y + 1, '#c8ff6a'); pc.px(x, y - 1, '#1a1212'); pc.px(x + 1, y - 1, '#1a1212'); }
    pc.px(46, 29, '#e88a8a'); pc.px(47, 29, '#c86a6a'); pc.px(46, 30, '#3a2a24'); pc.px(47, 31, '#3a2a24'); pc.px(45, 31, '#3a2a24');
    for (const s of [-1, 1]) { pc.line(46 + s * 4, 30, 46 + s * 12, 28, '#f4ead0'); pc.line(46 + s * 4, 31, 46 + s * 12, 32, '#f4ead0'); }
    for (const [x, y] of [[36, 12], [37, 14], [56, 12], [55, 14]]) pc.px(x, y, '#e8a0a0');
  }
  for (const [x, y] of [[13, 44], [13, 90], [67, 44], [67, 90]]) nail(pc, x, y);
  // stencilled "?" on the side
  for (const [x, y] of [[77, 52], [78, 51], [79, 51], [80, 52], [80, 53], [79, 54], [78, 55], [78, 56], [78, 59]]) pc.px(x, y, '#2a1612');
  return pc;
}

// ---------------------------------------------------------------- Newton's apple (96x96 hero)
export function newtonApple() {
  const P = new Painter(96, 96); apple(P, 46, 54, 33, MAT.apple); const pc = P.render();
  // yellow-green blush on the lit side, speckles (lenticels), window highlight
  for (let y = 24; y < 70; y++) for (let x = 14; x < 50; x++) { const c = getHex(pc, x, y); if (!c) continue; const d = Math.hypot(x - 26, y - 40) / 18; if (d < 1 && hash2(x, y, 4) > 0.2 + d * 0.8 && RAMP.apple.indexOf(c) >= 3) pc.px(x, y, mix(c, '#f6c84e', 0.32)); }
  for (let i = 0; i < 30; i++) { const x = Math.round(20 + hash2(i, 8) * 52), y = Math.round(30 + hash2(8, i) * 46); const c = getHex(pc, x, y); if (c && RAMP.apple.indexOf(c) >= 2 && RAMP.apple.indexOf(c) <= 4) pc.px(x, y, mix(c, '#ffd8a0', 0.4)); }
  for (let y = 30; y < 42; y++) for (let x = 24; x < 34; x++) if (Math.hypot((x - 28.5) / 4.6, (y - 36) / 6) < 1 && Math.abs(x - 28.5) > 0.8 && Math.abs(y - 36) > 0.7) pc.px(x, y, (y < 36) ? '#ffe8c8' : '#ffc8a0');
  glint(pc, 24, 30, 3);
  return pc;
}
