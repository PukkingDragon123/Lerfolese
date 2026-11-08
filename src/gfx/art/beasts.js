// Ground life: a dark-faced sheep with clustered-curl wool, a chamoisee goat with ridged horns and a beard,
// and a Balkan green lizard. Side view facing right, feet on row `foot` of a 64px cell.
// Walks use diagonal leg pairs (4 frames) with the body rising on the passing poses and the head nodding against it.
import { Painter, M, N, mat, norm3, clamp, lerp, hash2, fbm } from './core.js';
import { RAMP, MAT } from './ramps.js';

const W = (arr, o = {}) => mat(arr, { amb: 0.26, dif: 0.8, wrap: 0.3, bounce: 0.16, ...o });
const MT = {
  wool: W(['#3a2f42', '#5a4c60', '#80727a', '#a89c8c', '#cdc2aa', '#e8e0c8', '#faf5e6'], { wrap: 0.3, amb: 0.2 }),
  face: W(['#0e0a0e', '#1c1519', '#2d2226', '#403236', '#584648', '#76605c'], { spec: 0.4, pow: 8 }),
  hoof: W(['#0a0709', '#191214', '#2a2022', '#3e3234']),
  goat: W(['#1a0d0b', '#331a12', '#53291a', '#7a3e22', '#a05a2e', '#c27c44', '#dca26a']),
  goatBlack: W(['#08070a', '#121014', '#1d191e', '#2b2529', '#3d3438', '#524548']),
  horn: W(RAMP.horn, { spec: 0.6, pow: 12 }),
  beard: W(['#0c0a0c', '#1a1618', '#2a2426', '#3e3638', '#564c4c']),
  lizard: W(['#0a1a0e', '#123216', '#1e5420', '#327826', '#4f9e2c', '#80c43c', '#bce26e'], { spec: 0.7, pow: 14, wrap: 0.15 }),
  lizBelly: W(['#3a3a1a', '#62622c', '#8e8c42', '#bab45e', '#dcd684']),
  lizThroat: W(['#0c1838', '#18306a', '#2850a0', '#4278c8', '#78a8e4']),
  pink: W(['#3a1820', '#6a2c36', '#9c4a52', '#c8706e', '#e8a096']),
};

export const BEASTS = {
  sheep: { frames: ['walk0', 'walk1', 'walk2', 'walk3', 'graze0', 'graze1', 'idle', 'blink'], size: 1.25, foot: 60, speed: 1, shadow: 0.62, walk: [0, 1, 2, 3], graze: [4, 5], idle: [6, 7, 6] },
  goat: { frames: ['walk0', 'walk1', 'walk2', 'walk3', 'graze0', 'graze1', 'idle', 'blink'], size: 1.3, foot: 60, speed: 1.15, shadow: 0.55, walk: [0, 1, 2, 3], graze: [4, 5], idle: [6, 7, 6] },
  lizard: { frames: ['bask', 'push', 'look', 'dash0', 'dash1'], size: 0.55, foot: 60, bask: 0, pushup: [1, 0], look: 2, dash: [3, 4] },
};

// leg: hip -> knee -> foot, with a hoof. Drawn as tapered segments (thin, dark), far legs shaded back.
function leg(P, hx, hy, fx, fy, { knee = 1, kneeDx = 0, w0 = 1.8, w1 = 1.1, m = MT.face, hoof = MT.hoof, shade = 0, lift = 0 }) {
  const kx = lerp(hx, fx, 0.5) + kneeDx * knee, ky = lerp(hy, fy, 0.55) - lift * 0.4;
  P.add(M.union(M.capsule(hx, hy, kx, ky, w0, w1 * 1.1), M.capsule(kx, ky, fx, fy - 1.6, w1 * 1.1, w1)), { m, n: N.cyl(hx, hy, fx, fy, w0 + 0.4), shade, contour: 1 });
  P.add(M.poly([[fx - w1 - 0.4, fy - 2.2], [fx + w1 + 0.5, fy - 2.2], [fx + w1 + 1.1, fy + 0.1], [fx - w1 - 0.6, fy + 0.1]]), { m: hoof, n: N.flat(0.2, -0.3, 1), shade, contour: 1 });
}
// four legs for a walk frame: diagonal pairs (near-front + far-hind) and (far-front + near-hind)
function walkLegs(f) {
  // per leg: [dx of foot from hip, lift]; f0 contact A, f1 passing (A lifted), f2 contact B, f3 passing (B lifted)
  const A = [[4.5, 0], [0.5, 2.6], [-4, 0], [0, 0]][f], Bp = [[-4, 0], [0, 0], [4.5, 0], [0.5, 2.6]][f];
  return { nf: A, fh: A, ff: Bp, nh: Bp };
}

// ---------------------------------------------------------------- sheep
function wool(P, cx, cy, rx, ry, seed, opts = {}) {
  const bumps = []; for (let i = 0; i < 15; i++) { const a = Math.PI * 0.95 + (i / 14) * Math.PI * 1.15; bumps.push([cx + Math.cos(a) * rx * 0.94, cy + Math.sin(a) * ry * 0.92, 2.8 + hash2(i, seed) * 1.2]); }
  for (let i = 0; i < 5; i++) { const a = Math.PI * 0.12 + (i / 4) * Math.PI * 0.74; bumps.push([cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.95, 2 + hash2(i + 30, seed)]); }
  const mask = M.union(M.ellipse(cx, cy, rx, ry), ...bumps.map(([x, y, r]) => M.ellipse(x, y, r, r)));
  const G = N.sphere(cx, cy - ry * 0.1, rx * 1.05, ry * 1.12); const sp = 4.1;
  const curl = (x, y) => { const row = Math.round((y - cy) / (sp * 0.86)); const off = row & 1 ? sp / 2 : 0; const col = Math.round((x - cx - off) / sp); let best = null, bd = 1e9; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const r = row + j; const o = r & 1 ? sp / 2 : 0; const ccx = cx + o + (col + i) * sp + (hash2(col + i, r, seed) - 0.5) * 1.4, ccy = cy + r * sp * 0.86 + (hash2(r, col + i, seed + 3) - 0.5) * 1.2; const d = (x - ccx) ** 2 + (y - ccy) ** 2; if (d < bd) { bd = d; best = [ccx, ccy]; } } return [x - best[0], y - best[1], Math.sqrt(bd)]; };
  P.add(mask, {
    m: MT.wool, n: (x, y) => { const g = G(x, y); const [dx, dy, d] = curl(x, y); const r = 2.6; const k = Math.min(1, d / r); const cz = Math.sqrt(Math.max(0, 1 - k * k)); return norm3(g[0] * 0.75 + (dx / r) * 0.62, g[1] * 0.75 + (dy / r) * 0.62, g[2] * 0.6 + cz * 0.5); },
    tex: (x, y) => { const [, , d] = curl(x, y); return d > 2.45 ? -0.14 : 0; }, contour: 1, cast: 2, ...opts,
  });
}
function sheepHead(P, hx, hy, ang, blink, graze) {
  // dark face: a tapered wedge toward the muzzle, ears out to the side, woolly topknot
  const ca = Math.cos(ang), sa = Math.sin(ang); const T = (u, v) => [hx + ca * u - sa * v, hy + sa * u + ca * v];
  const pts = [T(-4.5, -4), T(1, -4.6), T(5.5, -2.6), T(7.6, -0.4), T(7.6, 1.8), T(5.4, 3.6), T(0, 4.4), T(-4.4, 3.4)];
  // far ear behind
  const [e1x, e1y] = T(-2.2, -3.4), [e2x, e2y] = T(-7.2, -5.4); P.add(M.capsule(e1x, e1y, e2x, e2y, 1.5, 1.6), { m: MT.face, n: 1.2, shade: -1, contour: 1 });
  P.add(M.poly(pts), { m: MT.face, n: N.blend(N.sphere(...T(0.5, -0.6), 6.5, 5.2), N.flat(0, -0.2, 1), 0.25), contour: 1, cast: 1 });
  // near ear sticking out sideways
  const [n1x, n1y] = T(-2, -2.6), [n2x, n2y] = T(-6.4, -1.2); P.add(M.capsule(n1x, n1y, n2x, n2y, 1.45, 1.75), { m: MT.face, n: 1.4, contour: 1, cast: 1 });
  const [i1x, i1y] = T(-3.4, -2.2), [i2x, i2y] = T(-5.6, -1.4); P.add(M.capsule(i1x, i1y, i2x, i2y, 0.6, 0.7), { m: MT.pink, n: N.flat(0, 0, 1), contour: 0, clip: true });
  // topknot of wool on the poll
  const [tx, ty] = T(-2.6, -4.2); for (const [dx, dy, r] of [[0, 0, 2.6], [2.2, -0.6, 2.1], [-1.6, 1.6, 2]]) P.add(M.ellipse(tx + dx, ty + dy, r, r), { m: MT.wool, n: N.sphere(tx + dx - 0.4, ty + dy - 0.4, r + 0.4, r + 0.4), contour: 1 });
  return { T };
}
function paintSheep(frame) {
  const P = new Painter(64, 64); const foot = 60;
  const walk = frame.startsWith('walk') ? +frame[4] : -1; const graze = frame.startsWith('graze') ? +frame[5] : -1; const blink = frame === 'blink';
  const bob = walk === 1 || walk === 3 ? -1 : 0; const cx = 29, cy = 39 + bob;
  const hipF = [cx + 10, cy + 7], hipH = [cx - 11, cy + 7];
  const L = walk >= 0 ? walkLegs(walk) : { nf: [0.5, 0], fh: [-0.5, 0], ff: [-1, 0], nh: [1.5, 0] };
  const legY = foot - 1;
  const lg = (hip, [dx, lift], far, front) => leg(P, hip[0] + (far ? (front ? 2.5 : 2) : 0), hip[1] - (far ? 1 : 0), hip[0] + dx + (far ? (front ? 2.5 : 2) : 0), legY - lift - (far ? 1 : 0), { knee: front ? 1 : -1, kneeDx: lift ? (front ? 1.6 : -1.6) : 0.4 * (front ? 1 : -1), lift, shade: far ? -1 : 0, w0: 2.2, w1: 1.15 });
  lg(hipF, L.ff, true, true); lg(hipH, L.fh, true, false); lg(hipF, L.nf, false, true); lg(hipH, L.nh, false, false);
  // woolly tail
  P.add(M.ellipse(cx - 19, cy - 1, 2.4, 3.4), { m: MT.wool, n: N.sphere(cx - 19, cy - 1.5, 2.6, 3.6), contour: 1 });
  wool(P, cx, cy, 17.5, 11, 5);
  // head
  let hx, hy, ang;
  if (graze >= 0) { hx = cx + 21; hy = 51 + graze * 0.6; ang = 1.15 - graze * 0.08; }
  else { hx = cx + 21 + (walk === 0 || walk === 2 ? 0.5 : 0); hy = cy - 9 + (walk === 0 || walk === 2 ? 1 : 0); ang = 0.55; }
  // neck wool bridging body and head
  P.add(M.capsule(cx + 13, cy - 4, hx - 3, hy - 0.5, 6.5, 4.6), { m: MT.wool, n: 4, contour: 0, tex: (x, y) => ((Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? -0.06 : 0.04) });
  const { T } = sheepHead(P, hx, hy, ang, blink, graze >= 0);
  const pc = P.render();
  // eye, nostril, mouth (hand placed)
  const [ex, ey] = T(1.6, -1.4).map(Math.round);
  if (blink) { pc.px(ex, ey, '#4a3c3e'); pc.px(ex + 1, ey, '#4a3c3e'); } else { pc.px(ex, ey, '#e8d8a8'); pc.px(ex + 1, ey, '#120c10'); pc.px(ex, ey + 1, '#2a1e20'); }
  const [nx, ny] = T(6.6, 0.6).map(Math.round); pc.px(nx, ny, '#08060a');
  const [mx, my] = T(5.6, 2.6).map(Math.round); pc.px(mx, my, '#5a4446');
  if (graze === 1) { for (const [dx, dy, c] of [[0, 0, '#6e8a30'], [1, -1, '#94a83c'], [-1, -1, '#4f6c28'], [1, 1, '#4f6c28']]) pc.px(mx + dx + 1, my + dy, c); }
  return pc;
}

// ---------------------------------------------------------------- goat
function paintGoat(frame) {
  const P = new Painter(64, 64); const foot = 60;
  const walk = frame.startsWith('walk') ? +frame[4] : -1; const graze = frame.startsWith('graze') ? +frame[5] : -1; const blink = frame === 'blink';
  const bob = walk === 1 || walk === 3 ? -1 : 0; const cx = 28, cy = 37 + bob;
  const hipF = [cx + 10, cy + 5], hipH = [cx - 10, cy + 4];
  const L = walk >= 0 ? walkLegs(walk) : { nf: [0.5, 0], fh: [-0.5, 0], ff: [-1, 0], nh: [1.5, 0] };
  const legY = foot - 1;
  // chamoisee: brown upper legs, black lower legs
  const legM = (hip) => (x, y) => (y > hip[1] + 6 ? MT.goatBlack : MT.goat);
  const lg = (hip, [dx, lift], far, front) => leg(P, hip[0] + (far ? 2 : 0), hip[1] - (far ? 1 : 0), hip[0] + dx + (far ? 2 : 0), legY - lift - (far ? 1 : 0), { knee: front ? 1 : -1, kneeDx: lift ? (front ? 1.6 : -1.8) : 0.5 * (front ? 1 : -1), lift, shade: far ? -1 : 0, w0: 2.4, w1: 1.15, m: legM(hip) });
  lg(hipF, L.ff, true, true); lg(hipH, L.fh, true, false);
  // upright tail
  P.add(M.capsule(cx - 15, cy - 6, cx - 17.5, cy - 11, 1.6, 1.2), { m: MT.goatBlack, n: 1.2, contour: 1 });
  // body: lean barrel with a shaggy belly fringe and a black dorsal stripe
  const body = M.fn((x, y) => { const dx = (x - cx) / 16.5, dy = (y - cy) / 8.6; const fr = y > cy + 4 ? Math.abs(Math.sin(x * 1.3)) * 1.6 : 0; return dx * dx + ((y - cy - fr * 0.5) / (8.6 + fr)) ** 2 <= 1 && dx * dx + dy * dy <= 1.35; }, cx - 18, cy - 10, cx + 18, cy + 12);
  const bodyN = N.sphere(cx, cy - 1, 17, 9.5);
  P.add(body, { m: (x, y) => { const top = cy - 8.6 * Math.sqrt(Math.max(0, 1 - ((x - cx) / 16.5) ** 2)); return y < top + 2.1 && x < cx + 12 ? MT.goatBlack : MT.goat; }, n: bodyN, tex: (x, y) => (((x * 0.8 + y * 0.35) % 3 + 3) % 3 < 0.7 ? -0.12 : 0), contour: 1, cast: 2 });
  lg(hipF, L.nf, false, true); lg(hipH, L.nh, false, false);
  // neck + head
  let hx, hy, ang;
  if (graze >= 0) { hx = cx + 21; hy = 50 + graze * 0.6; ang = 1.25 - graze * 0.08; }
  else { hx = cx + 20 + (walk === 0 || walk === 2 ? 0.5 : 0); hy = cy - 13 + (walk === 0 || walk === 2 ? 1 : 0); ang = 0.6; }
  P.add(M.capsule(cx + 12, cy - 2, hx - 2, hy + 1, 5.2, 3.6), { m: MT.goat, n: 3, contour: 0 });
  const ca = Math.cos(ang), sa = Math.sin(ang); const T = (u, v) => [hx + ca * u - sa * v, hy + sa * u + ca * v];
  // horns (far then near): ridged, sweeping back
  for (const far of [true, false]) {
    const o = far ? 1.2 : 0; const hp = [T(-1 + o, -3.6 - o * 0.5), T(-4 + o, -7.5), T(-8 + o, -8.6), T(-11 + o, -7)];
    const hm = M.bezier(hp[0], hp[1], hp[2], hp[3], 1.7, 0.6, 14);
    P.add(hm, { m: MT.horn, n: 1.2, tex: (x, y) => (Math.floor((x + y) * 0.9) % 2 ? -0.12 : 0.04), shade: far ? -1 : 0, contour: 1, cast: 1 });
  }
  // far ear
  const [e1x, e1y] = T(-2.4, -2.2), [e2x, e2y] = T(-6.6, 0.6); P.add(M.capsule(e1x, e1y, e2x, e2y, 1.2, 1.5), { m: MT.goat, n: 1.2, shade: -1, contour: 1 });
  // head: long straight profile, black face stripe
  const pts = [T(-4, -3.6), T(1.5, -3.6), T(6.6, -1.8), T(8.6, 0.2), T(8, 2.4), T(4.8, 3.4), T(-0.5, 3.6), T(-4.2, 2.6)];
  P.add(M.poly(pts), { m: (x, y) => { const dx = x - hx, dy = y - hy; const v = -sa * dx + ca * dy; return Math.abs(v + 0.6) < 1.2 ? MT.goatBlack : MT.goat; }, n: N.sphere(...T(1, -0.6), 6.8, 4.6), contour: 1, cast: 1 });
  // beard
  const [b1x, b1y] = T(3.6, 3.2), [b2x, b2y] = T(2.6, 7.6); P.add(M.capsule(b1x, b1y, b2x, b2y, 1.3, 0.6), { m: MT.beard, n: 1, contour: 1 });
  // near ear (drooping sideways)
  const [n1x, n1y] = T(-2.2, -1.6), [n2x, n2y] = T(-6.2, 2.2); P.add(M.capsule(n1x, n1y, n2x, n2y, 1.2, 1.6), { m: MT.goat, n: 1.2, contour: 1, cast: 1 });
  const pc = P.render();
  // eye: amber with the goat's horizontal pupil
  const [ex, ey] = T(1.4, -1.4).map(Math.round);
  if (blink) { pc.px(ex - 1, ey, '#1d191e'); pc.px(ex, ey, '#1d191e'); pc.px(ex + 1, ey, '#1d191e'); } else { pc.px(ex - 1, ey, '#e0b030'); pc.px(ex, ey, '#120c0a'); pc.px(ex + 1, ey, '#f2cc58'); pc.px(ex, ey - 1, '#7a3e22'); }
  const [nx, ny] = T(7.6, 0.6).map(Math.round); pc.px(nx, ny, '#060406');
  if (graze === 1) { const [mx, my] = T(7, 2.8).map(Math.round); for (const [dx, dy, c] of [[0, 0, '#6e8a30'], [1, -1, '#94a83c'], [1, 1, '#4f6c28']]) pc.px(mx + dx, my + dy, c); }
  return pc;
}

// ---------------------------------------------------------------- lizard
function paintLizard(frame) {
  const P = new Painter(64, 64); const foot = 60; const push = frame === 'push', look = frame === 'look', dash = frame.startsWith('dash') ? +frame[4] : -1;
  const by = foot - 3.6 - (push ? 1.6 : 0); const bx = 36;
  // tail: long tapering curve (swishes when dashing)
  const sw = dash === 0 ? 2 : dash === 1 ? -2 : 0;
  P.add(M.bezier([bx - 7, by], [bx - 15, by + 1], [bx - 22, by + 1.5 + sw], [bx - 31, by - 0.5 + sw * 1.5], 2.9, 0.5, 22), { m: MT.lizard, n: N.cylH(by, 2.6), tex: (x) => (Math.floor(x / 2) % 2 ? -0.06 : 0.02), contour: 1 });
  // legs: splayed, elbows up
  const legs = dash >= 0 ? (dash ? [[1, 4], [-1, -3]] : [[-1, -4], [1, 3]]) : [[0, 0], [0, 0]];
  const far = (x0, y0, dx) => P.add(M.stroke([[x0, y0, 1], [x0 + dx * 0.5, y0 - 1.2, 0.9], [x0 + dx, foot - 1, 0.7]]), { m: MT.lizard, n: 0.8, shade: -2, contour: 1 });
  far(bx + 5, by + 0.5, 2.5 + legs[0][1]); far(bx - 5, by + 0.5, -3 + legs[1][1]);
  // body: low, flattened, a pale dorsal line
  const body = M.fn((x, y) => { const dx = (x - bx) / 8.6, dy = (y - by) / (3.3 + (x > bx ? 0.2 : 0)); return dx * dx + dy * dy <= 1; }, bx - 10, by - 5, bx + 10, by + 5);
  P.add(body, { m: (x, y) => (y > by + 1.2 ? MT.lizBelly : MT.lizard), n: N.sphere(bx, by - 0.6, 9, 3.9), tex: (x, y) => (hash2(x | 0, y | 0, 7) > 0.86 ? -0.4 : 0), contour: 1, cast: 1 });
  // head: wedge with blue throat
  const ha = push ? -0.35 : look ? -0.55 : 0.05; const hx = bx + 10, hy = by - 0.6 - (push ? 1.2 : 0);
  const ca = Math.cos(ha), sa = Math.sin(ha); const T = (u, v) => [hx + ca * u - sa * v, hy + sa * u + ca * v];
  P.add(M.capsule(bx + 5, by, hx, hy, 3.1, 2.6), { m: MT.lizard, n: 2, contour: 0 });
  P.add(M.poly([T(-2.4, -2.8), T(3, -2.6), T(6.6, -0.8), T(7.1, 0.7), T(3.6, 2.3), T(-2.4, 2.8)]), { m: (x, y) => { const v = -sa * (x - hx) + ca * (y - hy); return v > 0.9 ? MT.lizThroat : MT.lizard; }, n: N.sphere(...T(1, -0.6), 4.5, 2.8), contour: 1, cast: 1 });
  // near legs
  const near = (x0, y0, dx) => P.add(M.stroke([[x0, y0 + 1, 1.1], [x0 + dx * 0.5, y0 + 0.4, 1], [x0 + dx, foot - 0.5 - (push && dx > 0 ? 0 : 0), 0.8]]), { m: MT.lizard, n: 0.9, contour: 1 });
  near(bx + 4, by + (push ? -0.5 : 0.6), 2 + legs[1][1] + (push ? 1 : 0)); near(bx - 4.5, by + 0.6, -2.6 + legs[0][1]);
  const pc = P.render();
  // toes, eye, dorsal speckle line
  const [ex, ey] = T(2.8, -1.1).map(Math.round); pc.px(ex, ey, '#f2e8a0'); pc.px(ex + 1, ey, '#0a0a06'); pc.px(ex, ey - 1, '#1e5420');
  for (let x = bx - 6; x <= bx + 6; x += 2) pc.px(x, Math.round(by - 2.3 + Math.abs(x - bx) * 0.06), '#cde88a');
  return pc;
}

export function paintBeast(kind, frame) {
  if (kind === 'sheep') return paintSheep(frame);
  if (kind === 'goat') return paintGoat(frame);
  return paintLizard(frame);
}
