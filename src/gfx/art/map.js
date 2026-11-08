// Map standees for the diorama: little physical pieces standing on the board (bottom row = ground).
import { PixelCanvas } from '../pixel.js';
import { Painter, M, N, mat, norm3, clamp, lerp, mix, darken, hash2, fbm, glint, text, getHex } from './core.js';
import { RAMP, MAT } from './ramps.js';
import { grain, nail, screwHead } from './props.js';
import { campfire } from './field.js';

const soil = mat(RAMP.dirt, { amb: 0.24 }); const grassM = mat(RAMP.grass, { amb: 0.24, wrap: 0.25 });
function mound(P, cx, w, H) { // dirt mound with grass tufts
  P.add(M.ellipse(cx, H - 2, w, 5), { m: soil, n: N.sphere(cx, H + 2, w, 9), tex: (x, y) => (hash2(x | 0, y | 0, 5) > 0.82 ? -0.2 : 0), cast: 1 });
  for (let i = 0; i < 7; i++) { const x = cx - w * 0.8 + (i / 6) * w * 1.6, h = 3 + hash2(i, 2) * 3; P.add(M.poly([[x - 1.6, H - 3], [x + 0.4, H - 3 - h], [x + 1.6, H - 3]]), { m: grassM, n: N.flat(-0.3, -0.5, 1), contour: 0 }); }
}
function flagCloth(P, x0, y0, w, h, m, seed = 1, torn = false) { // waving pennant hanging from a pole
  P.add(M.fn((x, y) => { const u = (x - x0) / w; if (u < 0 || u > 1) return false; const wave = Math.sin(u * 5 + seed) * 2.2 * u; const top = y0 + wave, bot = y0 + h * (1 - u * 0.35) + wave; if (torn && u > 0.6 && Math.floor(y * 0.6) % 2 && (u > 0.8)) return false; return y >= top && y <= bot && !(u > 0.85 && Math.abs(y - (top + bot) / 2) < (u - 0.85) * h * 1.2); }, x0, y0 - 3, x0 + w, y0 + h + 3), { m, n: (x) => { const u = (x - x0) / w; return norm3(-Math.cos(u * 5 + seed) * 0.6, -0.2, 1); }, cast: 2, contour: 1 });
}

export function mk_battle() { // bronze aspis on a post, crossed spears behind, red pennant
  const W = 64, H = 96; const P = new Painter(W, H);
  P.add(M.capsule(10, 22, 52, 88, 1.3, 1.3), { m: MAT.oak, n: 1.2, shade: -1, cast: 1 }); P.add(M.capsule(54, 22, 12, 88, 1.3, 1.3), { m: MAT.oak, n: 1.2, shade: -1, cast: 1 });
  for (const [x, y, bx, by] of [[10, 22, 52, 88], [54, 22, 12, 88]]) { const L = Math.hypot(x - bx, y - by), dx = (x - bx) / L, dy = (y - by) / L, px = -dy, py = dx; P.add(M.poly([[x + dx * 9, y + dy * 9], [x + dx * 3 + px * 2.6, y + dy * 3 + py * 2.6], [x - dx * 1, y - dy * 1], [x + dx * 3 - px * 2.6, y + dy * 3 - py * 2.6]]), { m: MAT.iron, n: (X, Y) => { const sd = (X - x) * px + (Y - y) * py; return norm3(px * Math.sign(sd) * 0.6, py * Math.sign(sd) * 0.6 - 0.2, 0.8); }, cast: 1, contour: 1 }); }
  P.add(M.rect(30, 30, 5, 60), { m: MAT.oak, n: N.cylV(32.5, 2.8), tex: grain(3, { vertical: true, w: 5, h: 60, x0: 30, y0: 30 }), cast: 2 });
  flagCloth(P, 35, 30, 22, 13, MAT.clothRed, 1);
  P.add(M.ellipse(32.5, 48, 15, 15), { m: mat(['#3a1c10', '#6a3618', '#9c5a26', '#c8843c', '#e8b064', '#fbdc9c'], { metal: 0.5, spec: 1, pow: 16 }), n: N.torus(32.5, 48, 13, 2.4), cast: 3 });
  P.add(M.ellipse(32.5, 48, 11, 11), { m: MAT.clothRed, n: N.sphere(31, 46, 15, 15), contour: 1 });
  mound(P, 32, 22, H);
  const pc = P.render();
  // painted emblem: a black pegasus-wing chevron (simplified) and bronze rivets
  for (const [x, y] of [[32, 40], [31, 41], [33, 41], [30, 42], [34, 42], [29, 43], [35, 43], [32, 44], [32, 45], [32, 46], [31, 47], [33, 47], [32, 48], [32, 49], [32, 50]]) pc.px(x, y, '#2a0a10');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pc.px(Math.round(32.5 + Math.cos(a) * 13), Math.round(48 + Math.sin(a) * 13), '#fbdc9c'); }
  glint(pc, 24, 39, 1);
  return pc;
}

export function mk_elite() { // bucranium (horned bull skull) on a post with a torn banner
  const W = 72, H = 112; const P = new Painter(W, H);
  P.add(M.rect(33, 40, 6, 68), { m: MAT.walnut, n: N.cylV(36, 3.2), tex: grain(5, { vertical: true, w: 6, h: 70, x0: 33, y0: 40 }), cast: 2 });
  P.add(M.rect(18, 46, 36, 4), { m: MAT.walnut, n: N.cylH(48, 2.2), cast: 2, contour: 1 });
  flagCloth(P, 39, 52, 22, 26, MAT.clothRed, 2, true);
  // horns: long curving, ridged
  for (const s of [-1, 1]) P.add(M.bezier([36 + s * 9, 24], [36 + s * 22, 22], [36 + s * 30, 12], [36 + s * 26, 2], 3.6, 1, 22), { m: MAT.horn, n: 2.2, tex: (x, y) => (Math.floor((x * s + y) * 0.7) % 2 ? -0.1 : 0.04), cast: 2, contour: 1 });
  // skull: broad brow, long snout
  P.add(M.union(M.ellipse(36, 26, 12, 10), M.superellipse(36, 40, 7, 10, 2.6), M.ellipse(36, 50, 5.6, 4)), { m: MAT.bone, n: N.sphere(34, 28, 14, 18), cast: 2, contour: 1 });
  for (const s of [-1, 1]) P.add(M.ellipse(36 + s * 5.6, 29, 3.2, 3.8), { m: mat(['#0a0608', '#1a1012', '#2a1a1c']), n: N.flat(), contour: 0 });
  P.add(M.ellipse(34, 49, 1.1, 1.6), { m: mat(['#0a0608', '#1a1012']), n: N.flat(), contour: 0 }); P.add(M.ellipse(38, 49, 1.1, 1.6), { m: mat(['#0a0608', '#1a1012']), n: N.flat(), contour: 0 });
  mound(P, 36, 20, H);
  const pc = P.render();
  pc.px(31, 29, '#ff5a2a'); pc.px(41, 29, '#ff5a2a'); pc.px(30, 28, '#ffb060'); pc.px(40, 28, '#ffb060');
  pc.line(36, 16, 37, 22, RAMP.bone[1]); pc.line(37, 22, 35, 25, RAMP.bone[1]);
  return pc;
}

export function mk_event() { // signpost with a carved question board and a glowing lantern
  const W = 64, H = 100; const P = new Painter(W, H);
  P.add(M.rect(29, 18, 6, 80), { m: MAT.oak, n: N.cylV(32, 3.2), tex: grain(7, { vertical: true, w: 6, h: 80, x0: 29, y0: 18 }), cast: 2 });
  P.add(M.poly([[8, 12], [54, 12], [60, 25], [54, 38], [8, 38]]), { m: MAT.oak, n: 2.4, tex: grain(9, { w: 56, h: 26, y0: 12 }), cast: 3 });
  // lantern on a bracket
  P.add(M.rect(35, 48, 14, 2.2), { m: MAT.iron, n: N.cylH(49, 1.2), cast: 1, contour: 1 });
  P.add(M.rect(45, 50, 1.4, 4), { m: MAT.iron, n: N.flat(), contour: 0 });
  P.add(M.poly([[41, 54], [51, 54], [52, 57], [40, 57]]), { m: MAT.iron, n: N.flat(0, -0.7, 0.7), cast: 1 });
  P.add(M.rect(41.5, 57, 9, 11), { m: mat(RAMP.fire, { amb: 0.75, dif: 0.25 }), n: N.cylV(46, 5), contour: 1 });
  P.add(M.rect(40, 68, 12, 3), { m: MAT.iron, n: N.cylH(69.5, 1.6), cast: 1, contour: 1 });
  mound(P, 32, 20, H);
  const pc = P.render();
  // carved, gilded question mark on the board
  const q = [[28, 16], [29, 16], [30, 16], [31, 16], [27, 17], [32, 17], [32, 18], [32, 19], [31, 20], [30, 21], [29, 22], [29, 23], [29, 26], [29, 27]];
  for (const [x, y] of q) { pc.px(x, y, '#ffd75c'); pc.px(x + 1, y + 1, '#5a2e12'); } for (const [x, y] of q) pc.px(x, y, '#ffd75c'); pc.px(28, 16, '#fff6cc');
  nail(pc, 12, 25); nail(pc, 50, 25);
  for (const x of [43, 46, 49]) for (let y = 58; y < 67; y++) pc.px(x, y, '#5a2010');
  glint(pc, 44, 60, 1, '#ffffff', '#fff6cc');
  return pc;
}

export function mk_shop() { // Diogenes' pithos lying on its side, his lamp, a striped awning
  const W = 96, H = 96; const P = new Painter(W, H);
  // awning poles + striped cloth
  for (const x of [12, 84]) P.add(M.rect(x - 1.5, 22, 3.2, 72), { m: MAT.oak, n: N.cylV(x, 1.8), cast: 1 });
  P.add(M.fn((x, y) => x >= 8 && x <= 88 && y >= 16 && y <= 26 + (Math.floor((x - 8) / 8) % 2 ? 0 : 2) + Math.sin((x - 8) / 8 * Math.PI) * 0, 6, 14, 90, 30), { m: (x) => (Math.floor((x - 8) / 8) % 2 ? MAT.cream : MAT.clothRed), n: (x, y) => norm3(Math.sin((x - 8) / 8 * Math.PI) * 0.5, -0.3 + (y - 16) * 0.05, 1), cast: 3 });
  // the pithos: big ceramic jar on its side, mouth toward the viewer-right
  const jar = M.fn((x, y) => { const u = (x - 46) / 34; if (Math.abs(u) > 1) return false; const r = 19 * Math.sqrt(1 - u * u * 0.85) * (1 - Math.max(0, u - 0.7) * 1.2); return Math.abs(y - 68) <= r; }, 10, 46, 82, 90);
  P.add(jar, { m: mat(['#2a0e08', '#55200f', '#86381a', '#b45a2a', '#d4824a', '#ecb07a']), n: N.blend(N.cylH(68, 19), N.sphere(46, 68, 36, 22), 0.5), tex: (x, y) => (Math.abs(((x - 12) % 13) - 6.5) < 0.6 ? -0.25 : 0) + (Math.abs(y - 68) < 1 ? 0.06 : 0), cast: 3 });
  P.add(M.ellipse(80, 68, 5.4, 10), { m: mat(['#2a0e08', '#55200f', '#86381a', '#b45a2a', '#d4824a']), n: N.torus(80, 68, 8, 2.4), cast: 2, contour: 1 });
  P.add(M.ellipse(81, 68, 3.4, 7.6), { m: mat(['#08040a', '#140a0c', '#22120e']), n: N.flat(), contour: 0 });
  // little oil lamp (Diogenes searching for an honest man) on the ground
  P.add(M.ellipse(20, 90, 6, 3), { m: MAT.bronze, n: N.sphere(19, 88, 7, 4), cast: 1, contour: 1 });
  P.add(M.capsule(25, 89, 28, 87, 1.2, 1), { m: MAT.bronze, n: 1, contour: 1 });
  mound(P, 48, 44, H);
  const pc = P.render();
  // meander band painted on the jar + flame on the lamp + sign
  for (let x = 16; x < 76; x++) { const y = 60 + ((Math.floor((x - 16) / 4) % 2) ? 0 : 2); const c = getHex(pc, x, y); if (c) pc.px(x, y, '#1e0a08'); }
  for (const [x, y, c] of [[28, 85, '#fff6cc'], [28, 84, '#ffd75c'], [29, 84, '#fa9c2c'], [28, 83, '#fa9c2c']]) pc.px(x, y, c);
  text(pc, 'ΔΙΟΓΕΝΗΣ', 48, 18, '#3a0e10', { align: 'center' });
  return pc;
}

export function mk_lab() { // canvas field tent, glowing flask on a crate, rising vapour
  const W = 96, H = 96; const P = new Painter(W, H);
  P.add(M.rect(46, 6, 3, 14), { m: MAT.oak, n: N.cylV(47.5, 1.6), cast: 1 });
  P.add(M.poly([[47.5, 12], [86, 88], [10, 88]]), { m: MAT.canvas, n: (x, y) => (x < 47.5 ? norm3(-0.55, -0.35, 0.8) : norm3(0.55, -0.35, 0.8)), tex: (x, y) => (Math.abs(x - 47.5) < 1 ? -0.12 : 0) + (Math.floor(y / 9) % 2 ? 0.03 : 0), cast: 2 });
  P.add(M.poly([[47.5, 46], [60, 88], [35, 88]]), { m: mat(['#0c0a0e', '#1a1418', '#2a2024', '#3c3034']), n: N.flat(), contour: 1 });
  P.add(M.poly([[47.5, 46], [35, 88], [28, 88], [44, 50]]), { m: MAT.canvas, n: N.flat(0.6, -0.2, 0.8), shade: 1, cast: 2, contour: 1 });
  for (const [x0, y0, x1, y1] of [[12, 88, 4, 94], [84, 88, 92, 94]]) P.add(M.capsule(x0, y0, x1, y1, 0.6, 0.6), { m: MAT.rope, n: 0.6, contour: 0 });
  // crate + flask
  P.add(M.rect(62, 76, 20, 14), { m: MAT.oak, n: N.flat(0.1, -0.1, 1), tex: grain(13, { w: 20, h: 14, x0: 62, y0: 76 }), cast: 2 });
  P.add(M.union(M.ellipse(72, 68, 6.5, 6.5), M.rect(70.5, 56, 3, 8)), { m: mat(RAMP.glow, { amb: 0.6, dif: 0.35, spec: 1.2, pow: 20 }), n: N.sphere(70.5, 66, 7.5, 7.5), contour: 1, cast: 2 });
  mound(P, 48, 44, H);
  const pc = P.render();
  // vapour curls rising from the flask, a brass rim and a gleam
  for (const [x, y, c] of [[72, 52, '#e4fbff'], [73, 50, '#c0c8dc'], [72, 48, '#e4fbff'], [71, 46, '#9a9ab4'], [72, 44, '#c0c8dc'], [74, 42, '#9a9ab4'], [73, 39, '#c0c8dc']]) pc.px(x, y, c);
  pc.line(70, 56, 73, 56, RAMP.brass[4]); glint(pc, 69, 65, 1, '#ffffff', '#e4fbff');
  for (const [x, y] of [[66, 79], [78, 79], [66, 87], [78, 87]]) pc.px(x, y, RAMP.iron[4]);
  return pc;
}

export function mk_guardian() { // the Lion Gate: cyclopean jambs, lintel, relieving triangle with lions, braziers
  const W = 128, H = 128; const P = new Painter(W, H);
  const stoneT = (seed) => (x, y) => { const row = Math.floor(y / 9); const off = (row % 2) * 7; const col = Math.floor((x + off) / 14 + hash2(row, seed) * 0.5); const fx = (x + off) % 14, fy = y % 9; let v = (hash2(col, row, seed) - 0.5) * 0.12; if (fx < 1 || fy < 1) v -= 0.28; return v; };
  // jambs
  for (const x0 of [18, 86]) P.add(M.poly([[x0, 126], [x0 + 2, 44], [x0 + 22, 44], [x0 + 24, 126]]), { m: MAT.stone, n: N.cylV(x0 + 12, 16), tex: stoneT(x0), cast: 3 });
  // dark passage
  P.add(M.rect(42, 48, 44, 80), { m: mat(['#08060a', '#120e14', '#1e181e', '#2a2228']), n: N.flat(0, 0, 1), tex: (x, y) => -((y - 48) / 80) * 0.3, contour: 1 });
  // lintel
  P.add(M.poly([[12, 44], [116, 44], [114, 54], [14, 54]]), { m: MAT.stone, n: N.flat(0, -0.2, 1), tex: stoneT(3), cast: 3 });
  // relieving triangle with the lions relief (a column between two rampant lions)
  P.add(M.poly([[64, 6], [94, 44], [34, 44]]), { m: MAT.marble, n: N.flat(0, -0.1, 1), cast: 2 });
  P.add(M.union(M.rect(62, 20, 4, 22), M.rect(59, 18, 10, 3), M.rect(59, 41, 10, 3)), { m: MAT.marble, n: 1.2, cast: 1, contour: 1 });
  for (const s of [-1, 1]) P.add(M.union(M.ellipse(64 + s * 11, 30, 4.4, 7, s * 0.3), M.ellipse(64 + s * 8.4, 22, 3, 3), M.capsule(64 + s * 13, 36, 64 + s * 15, 42, 1.4, 1.2)), { m: MAT.marble, n: 2, cast: 1, contour: 1 });
  // braziers on top of the jambs
  for (const x of [30, 98]) { P.add(M.poly([[x - 7, 36], [x + 7, 36], [x + 4, 42], [x - 4, 42]]), { m: MAT.bronze, n: N.cylV(x, 7), cast: 2, contour: 1 }); P.add(M.rect(x - 1.5, 42, 3, 3), { m: MAT.bronze, n: N.cylV(x, 1.6), contour: 1 }); }
  // purple banners
  flagCloth(P, 22, 56, 14, 30, MAT.clothPurple, 3); flagCloth(P, 92, 56, 14, 30, MAT.clothPurple, 5);
  const pc = P.render();
  // brazier flames (small campfire frames scaled down by sampling)
  const fl = campfire(1);
  for (const x0 of [30, 98]) for (let y = 0; y < 30; y++) for (let x = -10; x <= 10; x++) { const sx = 48 + x * 2, sy = 30 + y * 2; const v = fl.data[sy * fl.w + sx]; if (v >>> 24) pc.data[(y + 7) * W + x0 + x] = v; }
  return pc;
}
