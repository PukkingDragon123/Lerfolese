// Birds of the Greek countryside, built from anatomy rather than blobs:
// egg-shaped torso + neck + head, two-part beak, a wedge tail with feather lines, and articulated wings
// (shoulder -> wrist -> tip with primaries, secondaries, greater and lesser coverts) posed in 3D and projected through
// a camera above the bird, so each wing shows its dorsal or ventral side correctly. Folded wings are one shape mapped
// into feather tracts (lesser/median/greater coverts, tertials, primaries) with scalloped edges and fringes.
import { Painter, M, N, mat, norm3, clamp, lerp, smooth } from './core.js';

const EL = 36 * Math.PI / 180, CE = Math.cos(EL), SE = Math.sin(EL);
const proj = (v) => [v[0], -(v[1] * CE - v[2] * SE)]; // bird-local (X fwd, Y up, Z to camera) -> screen offset
const scrN = (n) => [n[0], -(n[1] * CE - n[2] * SE), n[1] * SE + n[2] * CE];
const rot = (u, v, a) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
const F = (arr, o = {}) => mat(arr, { amb: 0.27, dif: 0.78, wrap: 0.3, bounce: 0.16, ...o });

// ---------------------------------------------------------------- palettes (hue-shifted)
const C = {
  sp_gray: ['#23202b', '#3a3844', '#575864', '#787c88', '#9ea2aa', '#c4c6c6'],
  sp_chest: ['#230f0c', '#421e10', '#6a3318', '#954e25', '#ba703a', '#d8985a'],
  sp_brown: ['#170e0d', '#2e1d18', '#4b3224', '#6c4a33', '#906848', '#b48c64'],
  sp_dark: ['#0e0a0c', '#1d1516', '#2f2420', '#45362c', '#5e4a3a'],
  sp_pale: ['#47423e', '#6e675f', '#958e82', '#bcb5a6', '#dbd5c5', '#f1ede2'],
  sp_buff: ['#4a3426', '#76583a', '#a27e56', '#c8a474', '#e4c898', '#f6e6c0'],
  black: ['#09080c', '#131117', '#1e1b22', '#2d2830', '#403941', '#574e56'],
  white: ['#5c5864', '#8a8690', '#b4b0b6', '#d8d4d4', '#efede6', '#fdfcf6'],
  sw_blue: ['#06081a', '#0c1534', '#152558', '#1e387c', '#2c50a2', '#4672c4', '#78a0e2'],
  sw_rufous: ['#300c0a', '#5a170e', '#882a14', '#b44420', '#d66636', '#ee9256'],
  sw_cream: ['#54402e', '#82684e', '#ae9270', '#d2b894', '#ead6b6', '#faf0dc'],
  hp_cinn: ['#36170f', '#5c2a19', '#874428', '#b0623a', '#d08656', '#e8ac7c', '#f8d2a6'],
  hp_belly: ['#4e3426', '#7c5a44', '#a88264', '#ceaa88', '#e8cca8', '#f8e8cc'],
  cr_black: ['#050507', '#0c0c12', '#15161f', '#20222f', '#2e3244', '#424a62', '#62708e'],
  cr_gray: ['#201e25', '#35323a', '#4e4a52', '#69656c', '#86828a', '#a4a0a4', '#c2bebe'],
  dv_gray: ['#1f2232', '#353a4e', '#505a70', '#707c92', '#929eb2', '#b6c0ce', '#dae0e8'],
  dv_head: ['#1d2030', '#30364a', '#485268', '#647088', '#8692a8', '#aab4c6'],
  dv_green: ['#0e2a24', '#18463a', '#24684e', '#3a8c66', '#5cae80', '#92d2a2'],
  dv_purple: ['#1e1030', '#341c4e', '#4e2c70', '#6c4290', '#8e62b0', '#b896d0'],
  dv_pale: ['#3e4250', '#646a7a', '#8c92a2', '#b4bac6', '#d6dae2', '#f0f2f6'],
  beak_dark: ['#0b090c', '#19151a', '#2b2528', '#433a3a', '#5e5250'],
  leg: ['#2a1a18', '#4e302a', '#7a4c40', '#a06a58', '#c48a74'],
  leg_dark: ['#0b090c', '#1a1618', '#2a2426', '#3e3638'],
  leg_pink: ['#3a141a', '#6a2630', '#9c3e46', '#c8645e', '#e6948a'],
};
const MT = {}; for (const k in C) MT[k] = F(C[k]);
MT.cr_black = F(C.cr_black, { spec: 0.5, pow: 10 }); MT.sw_blue = F(C.sw_blue, { spec: 0.6, pow: 10 });
MT.beak_dark = F(C.beak_dark, { spec: 0.8, pow: 10, wrap: 0.1 });
const mt = (k) => MT[k] || MT.black;

// ---------------------------------------------------------------- species
// a/b: torso half length/height; hr: head radius; wing: bones + feathers; fold: folded-wing tract colours
export const SPECIES = {
  sparrow: {
    size: 0.74, a: 9.4, b: 6.3, hr: 5.3, beak: { len: 4.2, dep: 3.8, curve: 0.05, m: 'beak_dark' }, eye: 'small', leg: 'leg',
    tail: { len: 11, w0: 2.6, w1: 3.6, notch: 1, m: 'sp_brown', edge: 'sp_buff' },
    wing: { arm: 8, hand: 7.5, pn: 7, pl: 11, pw: 1.4, sn: 6, sl: 8.5, sw: 1.5, cov: 3.1, round: 1, reach: 1.15 },
    pitchPerch: -0.42, flapFps: 15, glide: 0.35, bound: true,
    head(hx, hy) { if (hy > 0.36 && hx > -0.2) return 'black'; if (hx > 0.42 && hy > -0.12 && hy < 0.12) return 'black'; if (hy < -0.18 && hx > -0.5) return 'sp_gray'; if (hx < -0.15 && hy < 0.5) return 'sp_chest'; return 'sp_pale'; },
    body(u, v) { if (u > 0.5 && v > -0.35 && v < 0.5) return 'black'; if (v < -0.2) return 'sp_chest'; if (u < -0.5 && v < 0.2) return 'sp_brown'; return 'sp_pale'; },
    bodyTex(u, v) { return v < -0.25 && Math.abs(((u * 7 + v * 2.5) % 1 + 1) % 1 - 0.5) < 0.13 ? -0.35 : 0; },
    fold: { lesser: 'sp_chest', median: 'sp_dark', bar: 'white', greater: 'sp_dark', gEdge: 'sp_chest', tert: 'sp_dark', tEdge: 'sp_buff', prim: 'sp_brown' },
    wingD: { lesser: 'sp_chest', median: 'sp_dark', mTip: 'white', greater: 'sp_dark', gEdge: 'sp_buff', sec: 'sp_brown', prim: 'sp_dark' },
    wingV: { cov: 'sp_pale', sec: 'sp_gray', prim: 'sp_gray' },
  },
  swallow: {
    size: 0.78, a: 8.8, b: 5.2, hr: 4.7, beak: { len: 2.6, dep: 3.2, curve: 0, m: 'beak_dark', wide: true }, eye: 'small', leg: 'leg_dark',
    tail: { len: 12, w0: 2.4, w1: 3.0, fork: 7, streamer: 9, m: 'sw_blue', spots: true },
    wing: { arm: 7, hand: 11.5, pn: 7, pl: 14, pw: 1.3, sn: 6, sl: 7, sw: 1.4, cov: 2.8, round: 0, reach: 1.62 },
    pitchPerch: -0.32, flapFps: 13, glide: 0.65,
    head(hx, hy) { if (hx > 0.42 && hy < 0.05 && hy > -0.5) return 'sw_rufous'; if (hy > 0.22 && hx > -0.3) return 'sw_rufous'; return 'sw_blue'; },
    body(u, v) { if (u > 0.55 && v > -0.3 && v < 0.3) return 'sw_blue'; if (v < -0.1) return 'sw_blue'; return 'sw_cream'; },
    fold: { lesser: 'sw_blue', median: 'sw_blue', greater: 'sw_blue', gEdge: 'sw_blue', tert: 'sw_blue', tEdge: 'sw_blue', prim: 'sw_blue' },
    wingD: { lesser: 'sw_blue', greater: 'sw_blue', sec: 'sw_blue', prim: 'sw_blue' },
    wingV: { cov: 'sw_cream', sec: 'sp_gray', prim: 'sp_gray' },
  },
  hoopoe: {
    size: 0.86, a: 10, b: 6.4, hr: 5.4, beak: { len: 11, dep: 2.8, curve: 0.6, m: 'beak_dark' }, eye: 'small', crest: true, leg: 'leg_dark',
    tail: { len: 12, w0: 3.2, w1: 4.2, notch: 0, m: 'black', band: 'white', bandAt: 0.55 },
    wing: { arm: 8.5, hand: 8.5, pn: 7, pl: 11, pw: 1.7, sn: 7, sl: 9.5, sw: 1.7, cov: 3.4, round: 1, bars: true, reach: 1.05 },
    pitchPerch: -0.32, flapFps: 11, glide: 0.25,
    head() { return 'hp_cinn'; },
    body(u, v) { if (u < -0.6 && v < 0) return 'white'; if (v > 0.3) return 'hp_belly'; return 'hp_cinn'; },
    fold: { lesser: 'hp_cinn', median: 'black', greater: 'black', gEdge: 'white', tert: 'black', tEdge: 'white', prim: 'black', zebra: true },
    wingD: { lesser: 'hp_cinn', greater: 'black', sec: 'black', prim: 'black', bars: true },
    wingV: { cov: 'black', sec: 'black', prim: 'black', bars: true },
  },
  crow: {
    size: 0.98, a: 11.6, b: 7.4, hr: 6.1, beak: { len: 7, dep: 4.6, curve: 0.22, m: 'beak_dark' }, eye: 'dark', leg: 'leg_dark',
    tail: { len: 14, w0: 3.6, w1: 5, notch: -1, m: 'cr_black' },
    wing: { arm: 10.5, hand: 10.5, pn: 6, pl: 14, pw: 1.7, sn: 7, sl: 11, sw: 1.8, cov: 4, round: 1, fingers: true, reach: 1.2 },
    pitchPerch: -0.22, flapFps: 9, glide: 0.4,
    head() { return 'cr_black'; },
    body(u, v) { if (u > 0.42 && v > -0.2) return 'cr_black'; if (u < -0.62) return 'cr_black'; return 'cr_gray'; },
    fold: { lesser: 'cr_black', median: 'cr_black', greater: 'cr_black', gEdge: 'cr_black', tert: 'cr_black', tEdge: 'cr_black', prim: 'cr_black' },
    wingD: { lesser: 'cr_black', greater: 'cr_black', sec: 'cr_black', prim: 'cr_black' },
    wingV: { cov: 'cr_black', sec: 'cr_black', prim: 'cr_black' },
  },
  dove: {
    size: 0.84, a: 10.6, b: 6.9, hr: 4.8, beak: { len: 3.6, dep: 2.2, curve: 0.12, m: 'beak_dark', cere: true }, eye: 'ring', leg: 'leg_pink',
    tail: { len: 13, w0: 3.4, w1: 4.6, notch: -1, m: 'dv_gray', band: 'cr_black', bandAt: 0.8 },
    wing: { arm: 9.5, hand: 11, pn: 7, pl: 13, pw: 1.6, sn: 7, sl: 9.5, sw: 1.65, cov: 3.6, round: 0.4, reach: 1.25, lesserLift: 0 },
    pitchPerch: -0.24, flapFps: 16, glide: 0.45,
    head() { return 'dv_head'; },
    body(u, v) { if (u > 0.4 && v < 0.4 && v > -0.8) return ((u * 10 + v * 6) % 3 < 1.5) ? 'dv_green' : 'dv_purple'; if (u < -0.55 && v < -0.2) return 'dv_pale'; return 'dv_gray'; },
    fold: { lesser: 'dv_gray', median: 'dv_gray', greater: 'dv_gray', gEdge: 'dv_gray', tert: 'dv_gray', tEdge: 'dv_pale', prim: 'dv_head', dvbars: true },
    wingD: { lesser: 'dv_gray', greater: 'dv_gray', gEdge: 'black', sec: 'dv_gray', prim: 'dv_head', dvbars: true },
    wingV: { cov: 'dv_pale', sec: 'dv_pale', prim: 'dv_gray' },
  },
};

// ---------------------------------------------------------------- poses
// flight cycle key poses: [flap angle deg, tip lag deg, wrist fold, body bob px]
// 0 top | 1-3 downstroke (spread, tips lag) | 4 bottom | 5-7 upstroke (wrist folds, primaries trail)
const FLAP = [[80, 10, 0.45, 1], [46, 24, 0.2, 0], [8, 20, 0.14, -1], [-30, 14, 0.26, -2], [-56, -4, 0.6, -2], [-34, -42, 1.55, -1], [8, -54, 2.0, 0], [50, -32, 1.25, 1]];
export const FRAMES = ['fly0', 'fly1', 'fly2', 'fly3', 'fly4', 'fly5', 'fly6', 'fly7', 'glide', 'perch', 'breathe', 'blink', 'peck', 'look', 'hop', 'tuck'];

// ---------------------------------------------------------------- helpers
function featherN(plane, ax, ay, bx, by, r, k = 0.7) { const c = N.cyl(ax, ay, bx, by, r); return (x, y) => { const q = c(x, y); return norm3(plane[0] + q[0] * k, plane[1] + q[1] * k, plane[2] + 0.05); }; }
const along = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; return (x, y) => clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); };
const side = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1; return (x, y) => ((x - ax) * -dy + (y - ay) * dx) / L; };

// spread wing: side +1 near (toward camera), -1 far. Returns screen points.
function spreadWing(P, S, root, sd, phi, lag, fold, shade) {
  const W = S.wing; const d2r = Math.PI / 180; const p = phi * d2r, pl = (phi + lag) * d2r;
  const span = [0, Math.sin(p), sd * Math.cos(p)], span2 = [0, Math.sin(pl), sd * Math.cos(pl)];
  const armD = norm3(-0.16 - fold * 0.1, span[1], span[2]); const handD = norm3(-fold * 0.95 - 0.12, span2[1], span2[2]);
  const wrist = armD.map((c) => c * W.arm);
  const toS = (v) => { const q = proj(v); return [root[0] + q[0], root[1] + q[1]]; };
  const dorsal = [0, Math.cos(p), -sd * Math.sin(p)]; let n = scrN(dorsal); let ventral = false; if (n[2] < 0) { n = n.map((c) => -c); ventral = true; }
  const plane = norm3(n[0], n[1], Math.max(0.3, n[2]));
  const pal = ventral ? S.wingV : S.wingD;
  const back = (v, k, len) => norm3(lerp(v[0], -1, k), lerp(v[1], 0, k) * 0.9, lerp(v[2], 0, k) * 0.9).map((c) => c * len);
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const barred = (base, ax, ay, bx, by, phase) => { if (!pal.bars) return mt(base); const t = along(ax, ay, bx, by); return (x, y) => (Math.floor(t(x, y) * 3.2 + phase) % 2 ? MT.white : mt(base)); };
  const fringe = (ax, ay, bx, by, w) => { const sdist = side(ax, ay, bx, by); return (x, y) => (sdist(x, y) > w * 0.45 ? 0.16 : 0); };
  // secondaries along the arm (outer first so inner ones overlap toward the body)
  for (let i = W.sn - 1; i >= 0; i--) {
    const t = 0.1 + (i / Math.max(1, W.sn - 1)) * 0.9; const b3 = wrist.map((c) => c * t); const len = W.sl * (i === 0 ? 0.82 : 1);
    const e3 = add3(b3, back(span.map((c) => c * 0.15), 0.93, len)); const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    let m = barred(pal.sec, ax, ay, bx, by, i * 0.5);
    if (pal.dvbars) { const tt = along(ax, ay, bx, by); m = (x, y) => (tt(x, y) > 0.34 && tt(x, y) < 0.5 ? MT.black : MT[pal.sec]); }
    P.add(M.capsule(ax, ay, bx, by, W.sw, W.sw * 0.92), { m, n: featherN(plane, ax, ay, bx, by, W.sw + 0.4), contour: 1, shade, tex: fringe(ax, ay, bx, by, W.sw) });
  }
  // primaries along the hand: inner ones sweep back, outer ones follow the hand; fingered tips for crows
  for (let i = 0; i < W.pn; i++) {
    const t = i / Math.max(1, W.pn - 1); const b3 = add3(wrist, handD.map((c) => c * W.hand * t * 0.9));
    const k = lerp(0.8, 0.05, Math.pow(t, 0.8));
    const len = W.pl * (W.round ? lerp(0.82, 1, Math.sin(t * Math.PI * 0.72)) * (t > 0.8 ? lerp(1, 0.8, ((t - 0.8) / 0.2) * W.round) : 1) : lerp(0.78, 1.12, t));
    const e3 = add3(b3, back(handD, k, len)); const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    const r1 = W.fingers && t > 0.3 ? W.pw * 0.62 : W.pw * 0.85;
    P.add(M.capsule(ax, ay, bx, by, W.pw, r1), { m: barred(pal.prim, ax, ay, bx, by, 1 + i * 0.4), n: featherN(plane, ax, ay, bx, by, W.pw + 0.4), contour: 1, shade: shade - (ventral ? 0 : 1), tex: fringe(ax, ay, bx, by, W.pw) });
  }
  // greater coverts over the bases of the flight feathers
  const gc = W.sn + 2;
  for (let i = gc - 1; i >= 0; i--) {
    const t = 0.08 + (i / (gc - 1)) * 1.08; const onHand = t > 1; const b3 = onHand ? add3(wrist, handD.map((c) => c * W.hand * (t - 1))) : wrist.map((c) => c * t);
    const e3 = add3(b3, back(onHand ? handD : span, onHand ? 0.6 : 0.9, W.sl * 0.5)); const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    let m = ventral ? mt(pal.cov) : pal.bars ? (i % 2 ? MT.white : MT.black) : mt(pal.greater);
    if (!ventral && pal.gEdge) { const tt = along(ax, ay, bx, by); const g = m; m = (x, y) => (tt(x, y) > 0.8 ? mt(pal.gEdge) : g); }
    P.add(M.capsule(ax, ay, bx, by, W.sw * 1.08, W.sw * 0.98), { m, n: featherN(plane, ax, ay, bx, by, W.sw + 0.4), contour: 1, shade });
  }
  // median coverts: a short row over the greater coverts (white tips make the sparrow's wing bar)
  if (!ventral && pal.median) for (let i = W.sn - 1; i >= 0; i--) {
    const t = 0.12 + (i / Math.max(1, W.sn - 1)) * 0.85; const b3 = wrist.map((c) => c * t); const e3 = add3(b3, back(span, 0.9, W.sl * 0.3)); const [ax, ay] = toS(b3), [bx, by] = toS(e3); const tt = along(ax, ay, bx, by);
    P.add(M.capsule(ax, ay, bx, by, W.sw * 0.95, W.sw * 0.9), { m: (x, y) => (tt(x, y) > 0.7 && pal.mTip ? mt(pal.mTip) : mt(pal.median)), n: featherN(plane, ax, ay, bx, by, W.sw + 0.4), contour: 1, shade });
  }
  // lesser / marginal coverts: the leading-edge band from shoulder to wrist and onto the hand
  const [sx, sy] = toS([0, 0, 0]), [wx, wy] = toS(wrist); const h1 = toS(add3(wrist, handD.map((c) => c * W.hand * 0.4)));
  P.add(M.union(M.capsule(sx, sy, wx, wy, W.cov, W.cov * 0.72), M.capsule(wx, wy, h1[0], h1[1], W.cov * 0.68, W.cov * 0.42)), { m: ventral ? mt(pal.cov) : mt(pal.lesser), n: () => norm3(plane[0], plane[1] - 0.35, plane[2]), contour: 2, shade: shade + (S.wing.lesserLift ?? 1) });
  return { ventral };
}

// folded wing: one shape mapped into feather tracts (s: shoulder->tip, t: top edge->bottom edge)
function foldedWing(P, S, B, L, toL) {
  const { a, b } = S; const W = S.wing; const f = S.fold;
  const u0 = 0.66 * a, Lw = (0.66 + W.reach) * a;
  const vTop = (s) => -0.7 * b + 0.42 * b * s;
  const width = (s) => b * (s < 0.5 ? 0.25 + 0.72 * Math.sin((s / 0.5) * Math.PI / 2) : 0.97 * Math.pow((1 - s) / 0.5, 0.75));
  const st = (x, y) => { const [u, v] = toL(x, y); const s = (u0 - u) / Lw; return [s, (v - vTop(s)) / Math.max(0.3, width(s))]; };
  const mask = M.fn((x, y) => { const [s, t] = st(x, y); if (s < 0 || s > 1 || t < 0 || t > 1) return false; if (s < 0.1) return Math.hypot((0.1 - s) / 0.1, (t - 0.45) / 0.6) <= 1; return true; }, B.x - 2 * a, B.y - 2 * a, B.x + 2 * a, B.y + 2 * a);
  // tracts along the slanted wing coordinate: lesser coverts, (median bar), greater coverts with fringed tips,
  // tertials as diagonal feathers with light fringes, then a bundle of primaries with fine parallel edges
  const zone = (x, y) => {
    const [s, t] = st(x, y); const q = s - 0.07 * (t - 0.5);
    if (q < 0.17) return 'lesser';
    if (q < 0.215) return f.bar ? 'bar' : 'median';
    if (q < 0.4) return q > 0.355 - 0.018 * Math.cos(t * Math.PI * 5) ? 'gEdge' : 'greater';
    if (q < 0.74) { const k = t * 2.3 - ((q - 0.4) / 0.34) * 0.9; const fr = k - Math.floor(k); return fr > 0.76 ? 'tEdge' : 'tert'; }
    return ((t * 4.2 + q * 2) % 1) < 0.22 ? 'pLine' : 'prim';
  };
  const m = (x, y) => {
    const z = zone(x, y);
    if (f.zebra) { if (z === 'lesser') return mt(f.lesser); const [s] = st(x, y); return Math.floor(s * 8.5) % 2 ? MT.white : MT.black; }
    if (z === 'lesser') return mt(f.lesser); if (z === 'bar') return mt(f.bar); if (z === 'median') return mt(f.median);
    if (z === 'greater') return mt(f.greater); if (z === 'gEdge') return mt(f.gEdge); if (z === 'tert') return mt(f.tert); if (z === 'tEdge') return mt(f.tEdge);
    return mt(f.prim);
  };
  const tex = (x, y) => { const z = zone(x, y); if (z === 'pLine') return 0.12; if (f.dvbars) { const [s, t] = st(x, y); const q = s - 0.07 * (t - 0.5); if ((q > 0.33 && q < 0.39) || (q > 0.5 && q < 0.57)) return -0.7; } return 0; };
  const nB = (x, y) => { const [s, t] = st(x, y); const ny = (t - 0.35) * 0.9; return norm3(-0.15, ny - 0.25, 1); };
  P.add(mask, { m, n: nB, tex, contour: 2, cast: 1 });
}

// ---------------------------------------------------------------- one frame
export function paintBird(sp, frame) {
  const S = SPECIES[sp]; const P = new Painter(64, 64); const fi = FRAMES.indexOf(frame);
  const perched = fi >= 9 && fi <= 14; const { a, b, hr } = S;
  const footY = 52;
  let pitch = perched ? S.pitchPerch : -0.07, bx = 34, by = 31, breathe = 0;
  let headDX = 0, headDY = 0, headPitch = 0, look = false, blink = false, hop = false;
  if (fi < 8) by += FLAP[fi][3];
  if (perched) { by = footY - 4 - b * 0.95 - (sp === 'crow' ? 2 : 0); bx = 32; }
  if (frame === 'breathe') breathe = 1;
  if (frame === 'blink') blink = true;
  if (frame === 'peck') { pitch = S.pitchPerch + 0.62; headDX = 2; headDY = 4; headPitch = 0.95; }
  if (frame === 'look') look = true;
  if (frame === 'hop') { hop = true; by -= 3; pitch = S.pitchPerch - 0.1; }
  const B = { x: bx, y: by, pitch };
  const L = (u, v) => { const [x, y] = rot(u, v, pitch); return [bx + x, by + y]; };
  const toL = (x, y) => rot(x - bx, y - by, -pitch);
  const root = L(a * 0.18, -b * 0.62), rootFar = L(a * 0.12, -b * 0.86);
  // far wing (behind everything)
  if (fi < 8) spreadWing(P, S, rootFar, -1, FLAP[fi][0], FLAP[fi][1], FLAP[fi][2], -1);
  if (frame === 'glide') spreadWing(P, S, rootFar, -1, 16, 6, 0.3, -1);
  // tail: overlapping feathers that widen toward rounded tips (outer pair first, central pair on top)
  const T = S.tail; const tAng = Math.PI + pitch + (perched ? -0.38 : -0.03) + (hop ? 0.3 : 0) + (frame === 'peck' ? 0.4 : 0);
  const [rx, ry] = L(-a * 0.76, -b * 0.1); const len = T.len * (perched ? 1.02 : 1);
  const tf = T.fork ? [[-1, 0.13, 1 + T.streamer / T.len, 0.55], [1, -0.13, 1 + T.streamer / T.len, 0.55], [0, 0, 1 - T.fork / T.len, 1]] : T.notch < 0 ? [[-1, 0.12, 0.82, 1], [1, -0.12, 0.82, 1], [0, 0, 1.02, 1.05]] : [[-1, 0.1, 0.98, 1], [1, -0.1, 0.98, 1], [0, 0, 0.93, 1.05]];
  for (const [k, da, lm, wm] of tf) {
    const ang = tAng + da; const ex = rx + Math.cos(ang) * len * lm, ey = ry + Math.sin(ang) * len * lm; const tt = along(rx, ry, ex, ey); const sd = side(rx, ry, ex, ey);
    const r1 = (T.w1 * 0.46) * wm, r0 = T.w0 * 0.48;
    P.add(M.capsule(rx, ry, ex, ey, r0, r1), {
      m: (x, y) => { const t = tt(x, y); if (T.band && t > T.bandAt && t < T.bandAt + (T.band === 'white' ? 0.17 : 0.26)) return mt(T.band); return mt(T.m); },
      n: featherN(norm3(-0.05, -0.6, 1), rx, ry, ex, ey, r1 + 0.8, 0.22),
      tex: (x, y) => { const t = tt(x, y); let v = Math.abs(sd(x, y)) < 0.5 && k === 0 && t > 0.25 ? -0.2 : 0; if (t > 0.88 && T.edge) v += 0.14; if (T.spots && t > 0.62 && t < 0.72 && k !== 0) v += 0.55; return v; },
      contour: 1, cast: 1, shade: k === 1 ? -1 : 0,
    });
  }
  // far leg (perched)
  const legPts = [];
  if (perched) for (const near of [false, true]) { const [lx, ly] = L(a * (near ? 0.05 : -0.12), b * 0.8); legPts.push({ near, x: Math.round(lx + (near ? 1 : 0)), y: Math.round(ly) }); }
  // torso: egg shape, fuller at the breast; breathing swells the belly by a pixel
  const bodyMask = M.fn((x, y) => { const [u, v] = toL(x, y); const bb = b * (1 + 0.1 * clamp(u / a, -1, 1)) * (v > 0 ? 1 + breathe * 0.09 : 1); return (u / a) ** 2 + (v / bb) ** 2 <= 1; }, bx - a - 3, by - a - 3, bx + a + 3, by + a + 3);
  const bodyN = (x, y) => { const [u, v] = toL(x, y); const nu = u / a, nv = v / (b * 1.06); const d = Math.min(0.97, nu * nu + nv * nv); const [nx, ny] = rot(nu, nv, pitch); return norm3(nx, ny, Math.sqrt(1 - d)); };
  P.add(bodyMask, { m: (x, y) => { const [u, v] = toL(x, y); return mt(S.body(u / a, v / b)); }, n: bodyN, tex: S.bodyTex ? (x, y) => { const [u, v] = toL(x, y); return S.bodyTex(u / a, v / b); } : undefined, contour: 1, cast: 1 });
  // head position
  const [hcx0, hcy0] = perched ? L(a * 0.84, -b * 0.95) : L(a * 0.98, -b * 0.55);
  const hcx = hcx0 + headDX, hcy = hcy0 + headDY; const hdir = look ? -1 : 1; const hd = look ? Math.PI : 0;
  // hoopoe crest: a fan of cinnamon feathers with white then black tips
  if (S.crest) {
    const raised = frame === 'look' || frame === 'hop' || frame === 'blink' ? 1 : 0.45;
    for (let i = 0; i < 6; i++) {
      const t = i / 5; const ang = -Math.PI / 2 - hdir * ((1 - t) * 1.3 - 0.35) * raised - hdir * (1 - raised) * 1.15; const ln = hr * (1.25 + Math.sin(t * Math.PI) * 0.75);
      const ax = hcx - hdir * hr * 0.35 + hdir * t * hr * 0.85, ay = hcy - hr * 0.55; const ex = ax + Math.cos(ang) * ln, ey = ay + Math.sin(ang) * ln; const tt = along(ax, ay, ex, ey);
      P.add(M.capsule(ax, ay, ex, ey, 1.5, 1.2), { m: (x, y) => (tt(x, y) > 0.8 ? MT.black : tt(x, y) > 0.64 ? MT.white : MT.hp_cinn), n: featherN(norm3(-0.3, -0.4, 1), ax, ay, ex, ey, 1.8), contour: 1 });
    }
  }
  // head + neck
  const [nkx, nky] = L(a * 0.5, -b * 0.3);
  const headMask = M.union(M.ellipse(hcx, hcy, hr, hr * 0.94), M.capsule(nkx, nky, hcx - hdir * 0.8, hcy + 0.8, hr * 0.95, hr * 0.85));
  const hN = N.sphere(hcx - hdir * 0.4, hcy - 0.4, hr * 1.08, hr * 1.02);
  P.add(headMask, { m: (x, y) => { let hx = (x - hcx) / hr * hdir, hy = (y - hcy) / hr; if (headPitch) [hx, hy] = rot(hx, hy, -headPitch); return mt(S.head(hx, hy)); }, n: hN, contour: 0, cast: 1 });
  // beak: upper + lower mandible
  const bk = S.beak; const bang = hd + headPitch * hdir + 0.1 * hdir; const ca = Math.cos(bang), sa = Math.sin(bang);
  const B2 = (s, t) => [hcx + ca * s - sa * t, hcy + sa * s + ca * t];
  const base = hr * 0.7; const curveAt = (s) => bk.curve * ((s - base) / bk.len) ** 2 * bk.len * 0.5;
  const up = [], mid = [], lo = [];
  for (let k = 0; k <= 8; k++) { const s = base + (bk.len * k) / 8; const half = (bk.dep / 2) * Math.pow(1 - k / 8, bk.wide ? 0.6 : 0.85); const c = curveAt(s); up.push(B2(s, -half + c + 0.2)); mid.push(B2(s, c + 0.45)); lo.push(B2(s, half * 0.8 + c + 0.5)); }
  P.add(M.poly([...up, ...mid.slice().reverse()]), { m: mt(bk.m), n: N.flat(-0.25 * hdir, -0.75, 0.75), contour: 0 });
  P.add(M.poly([...mid.slice(0, 8), ...lo.slice(0, 8).reverse()]), { m: mt(bk.m), n: N.flat(0, 0.5, 0.85), contour: 0, shade: -1 });
  // near wing
  if (fi < 8) spreadWing(P, S, root, 1, FLAP[fi][0], FLAP[fi][1], FLAP[fi][2], 0);
  else if (frame === 'glide') spreadWing(P, S, root, 1, 16, 6, 0.3, 0);
  else foldedWing(P, S, B, L, toL);
  const pc = P.render();
  // legs: thin tarsi with gripping toes (hand placed so they stay one pixel wide)
  const legC = C[S.leg]; const thick = sp === 'crow' || sp === 'dove';
  for (const lp of legPts) {
    const col = lp.near ? legC[2] : legC[1], hi = lp.near ? legC[3] : legC[2]; const fy = hop ? footY - 3 : footY; const x0 = lp.x, y0 = lp.y + 1;
    for (let y = y0; y <= fy - 1; y++) { const x = Math.round(lerp(x0, x0 + (lp.near ? 1 : -1), (y - y0) / Math.max(1, fy - y0))); if (!pc.alpha(x, y) || y > y0 + 1) pc.px(x, y, col); if (thick) pc.px(x + 1, y, legC[0]); }
    const fx = Math.round(x0 + (lp.near ? 1 : -1));
    if (!hop) { for (let i = -1; i <= 3; i++) pc.px(fx + i, fy, i === 3 ? legC[0] : col); pc.px(fx - 2, fy, legC[0]); pc.px(fx + 1, fy - 1 + 0, hi); pc.px(fx + 2, fy + 1, legC[0]); pc.px(fx - 1, fy + 1, legC[0]); }
    else { pc.px(fx + 1, fy, col); pc.px(fx + 2, fy + 1, col); }
  }
  // eye (hand placed): dark iris with a top-left catchlight; ring for doves; closed lid for blinks
  const ex = Math.round(hcx + hdir * hr * 0.3 - (hdir < 0 ? 1 : 0) - 0.5), ey = Math.round(hcy - hr * 0.22 - 0.5);
  if (blink) { const lid = sp === 'crow' ? C.cr_black[3] : sp === 'swallow' ? C.sw_blue[3] : sp === 'dove' ? C.dv_head[3] : '#3a3234'; pc.px(ex, ey + 1, lid); pc.px(ex + 1, ey + 1, lid); pc.px(ex - 1, ey + 1, lid); pc.px(ex, ey, C.black[4]); pc.px(ex + 1, ey, C.black[4]); }
  else if (S.eye === 'ring') { const ring = '#e8822e', rd = '#b8561e'; pc.px(ex - 1, ey, ring); pc.px(ex - 1, ey + 1, rd); pc.px(ex + 2, ey, ring); pc.px(ex + 2, ey + 1, rd); pc.px(ex, ey - 1, ring); pc.px(ex + 1, ey - 1, ring); pc.px(ex, ey + 2, rd); pc.px(ex + 1, ey + 2, rd); pc.px(ex, ey, '#ffffff'); pc.px(ex + 1, ey, '#120c10'); pc.px(ex, ey + 1, '#120c10'); pc.px(ex + 1, ey + 1, '#2a1a18'); }
  else { const dk = S.eye === 'dark' ? '#020208' : '#0c080a'; pc.px(ex, ey, '#ffffff'); pc.px(ex + 1, ey, dk); pc.px(ex, ey + 1, dk); pc.px(ex + 1, ey + 1, dk); if (S.eye === 'dark') pc.px(ex + 1, ey + 1, '#2a3658'); if (sp === 'sparrow') { pc.px(ex - hdir * 2 + (hdir < 0 ? 1 : 0), ey - 1, '#e8e4dc'); } }
  if (bk.cere) { const [cx, cy] = B2(base + 0.8, -bk.dep * 0.32); pc.px(Math.round(cx), Math.round(cy), '#ecebe6'); pc.px(Math.round(cx) + hdir, Math.round(cy), '#c8c6c4'); }
  return pc;
}
