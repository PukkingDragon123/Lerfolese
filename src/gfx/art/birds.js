// Birds of the Greek countryside, built from anatomy rather than blobs:
// egg-shaped torso + neck + head, two-part beak, fanned tail of individual feathers, and articulated wings
// (shoulder -> wrist -> tip with primaries, secondaries, greater and lesser coverts) posed in 3D and projected
// through a camera 25 degrees above the bird, so each wing shows its dorsal or ventral side correctly.
import { Painter, M, N, mat, norm3, clamp, lerp, mix, darken, lighten, stamp } from './core.js';

const EL = 25 * Math.PI / 180, CE = Math.cos(EL), SE = Math.sin(EL);
const proj = (v) => [v[0], -(v[1] * CE - v[2] * SE)]; // bird-local (X fwd, Y up, Z to camera) -> screen offset
const scrN = (n) => [n[0], -(n[1] * CE - n[2] * SE), n[1] * SE + n[2] * CE];
const rot = (u, v, a) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
const F = (arr, o = {}) => mat(arr, { amb: 0.26, dif: 0.78, wrap: 0.28, bounce: 0.16, ...o });

// ---------------------------------------------------------------- palettes
const C = {
  sp_gray: ['#24202a', '#3c3842', '#5a5862', '#7c7c86', '#a2a4aa', '#c6c8c8'],
  sp_chest: ['#24100c', '#43200f', '#6a3418', '#924e26', '#b8703c', '#d8985c'],
  sp_brown: ['#1a100e', '#33211a', '#523726', '#735034', '#986c48', '#bc9064'],
  sp_pale: ['#4a443e', '#726a60', '#9a9284', '#c0b8a8', '#ddd6c6', '#f2eee2'],
  sp_buff: ['#4a3426', '#76583a', '#a27e56', '#c8a474', '#e4c898', '#f6e6c0'],
  black: ['#09080c', '#141218', '#201c24', '#302a32', '#443c44', '#5c525a'],
  white: ['#5a5662', '#8a8690', '#b6b2b8', '#dcd8d8', '#f2f0ea', '#ffffff'],
  sw_blue: ['#06081a', '#0d1634', '#162658', '#20397c', '#2e52a2', '#4a74c4', '#7aa0e0'],
  sw_rufous: ['#300c0a', '#5a170e', '#882a14', '#b44420', '#d66636', '#ee9256'],
  sw_cream: ['#54402e', '#82684e', '#ae9270', '#d2b894', '#ead6b6', '#faf0dc'],
  hp_cinn: ['#36170f', '#5c2a19', '#874428', '#b0623a', '#d08656', '#e8ac7c', '#f8d2a6'],
  hp_belly: ['#4e3426', '#7c5a44', '#a88264', '#ceaa88', '#e8cca8', '#f8e8cc'],
  cr_black: ['#05050a', '#0b0c14', '#13162a', '#1d2440', '#2a3658', '#3e5078', '#6078a4'],
  cr_gray: ['#25232b', '#3e3b44', '#5c5862', '#7e7a82', '#a29ea2', '#c6c2c2', '#e0dcda'],
  dv_gray: ['#1f2232', '#353a4e', '#505a70', '#707c92', '#929eb2', '#b6c0ce', '#dae0e8'],
  dv_head: ['#1d2030', '#30364a', '#485268', '#647088', '#8692a8', '#aab4c6'],
  dv_green: ['#0e2a24', '#18463a', '#24684e', '#3a8c66', '#5cae80', '#92d2a2'],
  dv_purple: ['#1e1030', '#341c4e', '#4e2c70', '#6c4290', '#8e62b0', '#b896d0'],
  dv_pale: ['#3e4250', '#646a7a', '#8c92a2', '#b4bac6', '#d6dae2', '#f0f2f6'],
  beak_dark: ['#0b090c', '#19151a', '#2b2528', '#433a3a', '#5e5250'],
  beak_horn: ['#2c2018', '#4e3c2c', '#77603e', '#a08658', '#c6ae7c'],
  leg: ['#2a1a18', '#4e302a', '#7a4c40', '#a06a58', '#c48a74'],
  leg_dark: ['#0b090c', '#1a1618', '#2a2426', '#3e3638'],
  leg_pink: ['#3a141a', '#6a2630', '#9c3e46', '#c8645e', '#e6948a'],
};
const MT = {}; for (const k in C) MT[k] = F(C[k]);
MT.cr_black = F(C.cr_black, { spec: 0.5, pow: 10 }); MT.sw_blue = F(C.sw_blue, { spec: 0.6, pow: 10 });
MT.beak_dark = F(C.beak_dark, { spec: 0.7, pow: 12, wrap: 0.1 }); MT.beak_horn = F(C.beak_horn, { spec: 0.5, pow: 12 });

// ---------------------------------------------------------------- species
// body: half length a, half height b; head radius; beak; tail; wing bones and feathers; colour zones
export const SPECIES = {
  sparrow: {
    size: 0.82, a: 7.6, b: 5.0, hr: 4.3, beak: { len: 3.4, dep: 3.0, curve: 0.05, m: 'beak_dark' }, eye: 'small',
    tail: { len: 9, n: 5, spread: 0.32, w: 1.25, fork: 0.12, m: 'sp_brown' }, legs: { len: 6, m: 'leg' },
    wing: { arm: 6.5, hand: 6, pn: 7, pl: 9, pw: 1.25, sn: 6, sl: 7, sw: 1.3, cov: 2.6, round: 1 },
    pitchPerch: -0.42, flapFps: 15, glide: 0.35, bound: true,
    head(hx, hy) { if (hy > 0.32 && hx > -0.25) return 'black'; if (hx > 0.35 && Math.abs(hy - 0.02) < 0.14) return 'black'; if (hy < -0.12 && hx > -0.45) return 'sp_gray'; if (hx < -0.1 && hy < 0.45) return 'sp_chest'; return 'sp_pale'; },
    body(u, v) { if (u > 0.5 && v > -0.35 && v < 0.55) return 'black'; if (v < -0.12) return 'sp_chest'; return 'sp_pale'; },
    bodyTex(u, v) { return v < -0.12 && ((Math.floor(u * 9 + v * 3) % 3 === 0) && Math.abs(v + 0.55) < 0.35) ? -0.3 : 0; },
    wingD: { lesser: 'sp_chest', greater: 'sp_chest', sec: 'sp_brown', prim: 'sp_brown', tert: 'sp_brown', median: 'sp_chest', bar: 'white' },
    wingV: { cov: 'sp_pale', sec: 'sp_gray', prim: 'sp_gray' },
  },
  swallow: {
    size: 0.86, a: 7.2, b: 4.2, hr: 3.9, beak: { len: 2.4, dep: 2.6, curve: 0, m: 'beak_dark' }, eye: 'small',
    tail: { len: 12, n: 5, spread: 0.34, w: 1.1, fork: 1, streamer: 9, m: 'sw_blue' }, legs: { len: 4, m: 'leg_dark' },
    wing: { arm: 6, hand: 9.5, pn: 7, pl: 12, pw: 1.15, sn: 6, sl: 6, sw: 1.2, cov: 2.4, round: 0 },
    pitchPerch: -0.3, flapFps: 13, glide: 0.65,
    head(hx, hy) { if (hx > 0.38 && hy < 0.1 && hy > -0.45) return 'sw_rufous'; if (hy > 0.2 && hx > -0.3) return 'sw_rufous'; return 'sw_blue'; },
    body(u, v) { if (u > 0.55 && v > -0.2 && v < 0.35) return 'sw_blue'; if (v < -0.08) return 'sw_blue'; return 'sw_cream'; },
    wingD: { lesser: 'sw_blue', greater: 'sw_blue', sec: 'sw_blue', prim: 'sw_blue', tert: 'sw_blue', median: 'sw_blue' },
    wingV: { cov: 'sw_cream', sec: 'sp_gray', prim: 'sp_gray' },
  },
  hoopoe: {
    size: 1.0, a: 8.4, b: 5.2, hr: 4.4, beak: { len: 9, dep: 2.2, curve: 0.55, m: 'beak_dark' }, eye: 'small', crest: true,
    tail: { len: 10, n: 5, spread: 0.24, w: 1.5, fork: 0, m: 'black', bars: 1 }, legs: { len: 5, m: 'leg_dark' },
    wing: { arm: 7, hand: 7, pn: 7, pl: 9.5, pw: 1.45, sn: 7, sl: 8, sw: 1.45, cov: 2.8, round: 1, bars: 1 },
    pitchPerch: -0.32, flapFps: 11, glide: 0.25,
    head() { return 'hp_cinn'; },
    body(u, v) { if (u < -0.55 && v < 0.1) return 'white'; if (v > 0.25) return 'hp_belly'; return 'hp_cinn'; },
    wingD: { lesser: 'hp_cinn', greater: 'black', sec: 'black', prim: 'black', tert: 'black', median: 'black', bars: true },
    wingV: { cov: 'black', sec: 'black', prim: 'black', bars: true },
  },
  crow: {
    size: 1.2, a: 9.6, b: 6.0, hr: 5.0, beak: { len: 5.8, dep: 3.6, curve: 0.2, m: 'beak_dark' }, eye: 'dark',
    tail: { len: 12, n: 5, spread: 0.3, w: 1.7, fork: -0.25, m: 'cr_black' }, legs: { len: 7, m: 'leg_dark' },
    wing: { arm: 9, hand: 9, pn: 6, pl: 11.5, pw: 1.45, sn: 7, sl: 9, sw: 1.55, cov: 3.4, round: 1, fingers: true },
    pitchPerch: -0.22, flapFps: 9, glide: 0.4,
    head() { return 'cr_black'; },
    body(u, v) { if (u > 0.45 && v > -0.1) return 'cr_black'; return 'cr_gray'; },
    wingD: { lesser: 'cr_black', greater: 'cr_black', sec: 'cr_black', prim: 'cr_black', tert: 'cr_black', median: 'cr_black' },
    wingV: { cov: 'cr_black', sec: 'cr_black', prim: 'cr_black' },
  },
  dove: {
    size: 1.0, a: 8.8, b: 5.6, hr: 3.9, beak: { len: 3.0, dep: 1.8, curve: 0.1, m: 'beak_dark', cere: true }, eye: 'ring',
    tail: { len: 11, n: 5, spread: 0.3, w: 1.6, fork: -0.2, m: 'dv_gray', band: true }, legs: { len: 4.5, m: 'leg_pink' },
    wing: { arm: 8, hand: 9, pn: 7, pl: 11, pw: 1.35, sn: 7, sl: 8, sw: 1.4, cov: 3, round: 0.4 },
    pitchPerch: -0.24, flapFps: 16, glide: 0.45,
    head() { return 'dv_head'; },
    body(u, v) { if (u > 0.42 && v < 0.35 && v > -0.75) return u > 0.62 ? (v < -0.1 ? 'dv_green' : 'dv_purple') : (v < 0.05 ? 'dv_purple' : 'dv_green'); if (u > 0.3 && v > 0.1) return 'dv_purple'; return 'dv_gray'; },
    wingD: { lesser: 'dv_gray', greater: 'dv_gray', sec: 'dv_gray', prim: 'dv_head', tert: 'dv_gray', median: 'dv_gray', dvbars: true },
    wingV: { cov: 'dv_pale', sec: 'dv_pale', prim: 'dv_gray' },
  },
};

// ---------------------------------------------------------------- poses
// flight cycle: [flap angle deg, tip lag deg, wrist fold, body bob px]
const FLAP = [[78, 8, 0.5, 1], [44, 24, 0.22, 0], [6, 20, 0.16, -1], [-32, 14, 0.3, -2], [-58, -6, 0.62, -2], [-36, -40, 1.6, -1], [8, -52, 2.05, 0], [48, -30, 1.3, 1]];
export const FRAMES = ['fly0', 'fly1', 'fly2', 'fly3', 'fly4', 'fly5', 'fly6', 'fly7', 'glide', 'perch', 'breathe', 'blink', 'peck', 'look', 'hop', 'tuck'];

// ---------------------------------------------------------------- feather drawing helpers
function featherN(plane, ax, ay, bx, by, r) { const c = N.cyl(ax, ay, bx, by, r); return (x, y) => { const k = c(x, y); return norm3(plane[0] + k[0] * 0.75, plane[1] + k[1] * 0.75, plane[2] + 0.05); }; }
function feather(P, ax, ay, bx, by, r0, r1, m, plane, o = {}) {
  return P.add(M.capsule(ax, ay, bx, by, r0, r1), { m, n: featherN(plane, ax, ay, bx, by, Math.max(r0, r1) + 0.3), contour: o.contour ?? 1, cast: o.cast ?? 0, shade: o.shade || 0, tex: o.tex });
}
const along = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; return (x, y) => clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); };

// spread wing: side +1 near (toward camera), -1 far
function spreadWing(P, S, root, side, phi, lag, fold, shade) {
  const W = S.wing; const d2r = Math.PI / 180; const p = phi * d2r, pl = (phi + lag) * d2r;
  const span = [0, Math.sin(p), side * Math.cos(p)], span2 = [0, Math.sin(pl), side * Math.cos(pl)];
  const armD = norm3(-0.18 - fold * 0.08, span[1], span[2]); const handD = norm3(-fold * 0.95 - 0.1, span2[1], span2[2]);
  const wrist = [armD[0] * W.arm, armD[1] * W.arm, armD[2] * W.arm]; const tip = [wrist[0] + handD[0] * W.hand, wrist[1] + handD[1] * W.hand, wrist[2] + handD[2] * W.hand];
  const toS = (v) => { const q = proj(v); return [root[0] + q[0], root[1] + q[1]]; };
  const dorsal = [0, Math.cos(p), -side * Math.sin(p)]; let n = scrN(dorsal); let ventral = false; if (n[2] < 0) { n = [-n[0], -n[1], -n[2]]; ventral = true; }
  const plane = norm3(n[0], n[1], Math.max(0.25, n[2]));
  const pal = ventral ? S.wingV : S.wingD; const mt = (k) => MT[k] || MT.black;
  const back = (v, k, len) => { const dir = norm3(lerp(v[0], -1, k), lerp(v[1], 0, k) * 0.9, lerp(v[2], 0, k) * 0.9); return dir.map((c) => c * len); };
  const barTex = (ax, ay, bx, by) => { const t = along(ax, ay, bx, by); return (x, y) => 0 * t(x, y); };
  const barMat = (base, ax, ay, bx, by, phase) => { if (!pal.bars) return mt(base); const t = along(ax, ay, bx, by); return (x, y) => (Math.floor(t(x, y) * 3.2 + phase) % 2 ? MT.white : mt(base)); };
  // secondaries along the arm (outer first so inner ones overlap toward the body)
  for (let i = W.sn - 1; i >= 0; i--) {
    const t = 0.12 + (i / Math.max(1, W.sn - 1)) * 0.88; const b3 = [wrist[0] * t, wrist[1] * t, wrist[2] * t]; const len = W.sl * (i === 0 ? 0.85 : 1);
    const dir = back([span[0] * 0.15, span[1] * 0.15, span[2] * 0.15], 0.92, len); const e3 = [b3[0] + dir[0], b3[1] + dir[1], b3[2] + dir[2]];
    const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    let m = barMat(pal.sec, ax, ay, bx, by, i * 0.5);
    if (pal.dvbars) { const tt = along(ax, ay, bx, by); m = (x, y) => (tt(x, y) > 0.38 && tt(x, y) < 0.56 ? MT.black : MT[pal.sec]); }
    feather(P, ax, ay, bx, by, W.sw, W.sw * 0.95, m, plane, { shade });
  }
  // primaries along the hand: inner ones sweep back, outer ones follow the hand
  for (let i = 0; i < W.pn; i++) {
    const t = i / Math.max(1, W.pn - 1); const b3 = [wrist[0] + handD[0] * W.hand * t * 0.92, wrist[1] + handD[1] * W.hand * t * 0.92, wrist[2] + handD[2] * W.hand * t * 0.92];
    const k = lerp(0.78, 0.04, Math.pow(t, 0.8)); const len = W.pl * (W.round ? lerp(0.85, 1, Math.sin(t * Math.PI * 0.75)) * (t > 0.8 ? lerp(1, 0.78, (t - 0.8) / 0.2 * W.round) : 1) : lerp(0.8, 1.12, t));
    const dir = back(handD, k, len); const e3 = [b3[0] + dir[0], b3[1] + dir[1], b3[2] + dir[2]];
    const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    const r1 = W.fingers && t > 0.3 ? W.pw * 0.7 : W.pw * 0.92;
    feather(P, ax, ay, bx, by, W.pw, r1, barMat(pal.prim, ax, ay, bx, by, 1 + i * 0.4), plane, { shade: shade - (ventral ? 0 : 0) });
  }
  // greater coverts over the bases of the flight feathers
  const gc = W.sn + 2;
  for (let i = gc - 1; i >= 0; i--) {
    const t = 0.1 + (i / (gc - 1)) * 1.05; const onHand = t > 1; const b3 = onHand ? [wrist[0] + handD[0] * W.hand * (t - 1), wrist[1] + handD[1] * W.hand * (t - 1), wrist[2] + handD[2] * W.hand * (t - 1)] : [wrist[0] * t, wrist[1] * t, wrist[2] * t];
    const dir = back(onHand ? handD : span, onHand ? 0.6 : 0.9, W.sl * 0.48); const e3 = [b3[0] + dir[0], b3[1] + dir[1], b3[2] + dir[2]];
    const [ax, ay] = toS(b3), [bx, by] = toS(e3);
    const m = ventral ? mt(pal.cov) : pal.bars ? (i % 2 ? MT.white : MT.black) : mt(pal.greater);
    feather(P, ax, ay, bx, by, W.sw * 1.05, W.sw, m, plane, { shade: shade + (ventral ? 0 : 0) });
  }
  // lesser / marginal coverts: the leading edge band from shoulder to wrist (and a little onto the hand)
  const [sx, sy] = toS([0, 0, 0]), [wx, wy] = toS(wrist); const h1 = toS([wrist[0] + handD[0] * W.hand * 0.35, wrist[1] + handD[1] * W.hand * 0.35, wrist[2] + handD[2] * W.hand * 0.35]);
  const lm = ventral ? mt(pal.cov) : mt(pal.lesser);
  P.add(M.union(M.capsule(sx, sy, wx, wy, W.cov, W.cov * 0.75), M.capsule(wx, wy, h1[0], h1[1], W.cov * 0.7, W.cov * 0.45)), { m: lm, n: (x, y) => norm3(plane[0], plane[1] - 0.25, plane[2]), contour: 1, shade });
  return { wrist: toS(wrist), tip: toS(tip), ventral };
}

// folded wing on the side of the body (perched / bounding flight)
function foldedWing(P, S, B, opts = {}) {
  const { a, b } = S; const W = S.wing; const pal = S.wingD; const mt = (k) => MT[k] || MT.black;
  const L = (u, v) => { const [x, y] = rot(u, v, B.pitch); return [B.x + x, B.y + y]; };
  const plane = norm3(-0.15, -0.35, 1); const ext = W.round ? 1.0 : 1.25; // pointed wings reach further back
  // primaries: long narrow tips beyond the rump
  for (let i = 0; i < 3; i++) { const [ax, ay] = L(-0.1 * a, (-0.02 + i * 0.12) * b), [bx, by] = L((-1.15 - 0.12 * ext + i * 0.12) * a, (-0.2 + i * 0.1) * b); feather(P, ax, ay, bx, by, W.pw * 1.1, W.pw * 0.85, mt(pal.prim), plane, { contour: 1, shade: -1 }); }
  // secondaries + tertials: broad feathers with rounded ends stacked toward the rear
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = L((0.25 - i * 0.12) * a, (-0.3 + i * 0.04) * b), [bx, by] = L((-0.48 - i * 0.12) * a, (0.32 - i * 0.12) * b);
    let m = pal.bars ? (i % 2 ? MT.white : MT.black) : mt(pal.sec); if (pal.dvbars && i < 2) { const tt = along(ax, ay, bx, by); m = (x, y) => (tt(x, y) > 0.7 ? MT.black : MT[pal.sec]); }
    feather(P, ax, ay, bx, by, W.sw * 1.35, W.sw * 1.25, m, plane, { contour: 1 });
  }
  for (let i = 0; i < 2; i++) { const [ax, ay] = L((0.05 - i * 0.15) * a, (-0.62 + i * 0.05) * b), [bx, by] = L((-0.7 - i * 0.14) * a, (-0.32 + i * 0.12) * b); feather(P, ax, ay, bx, by, W.sw * 1.4, W.sw * 1.25, pal.bars ? (i ? MT.white : MT.black) : mt(pal.tert), plane, { contour: 1 }); }
  // greater coverts row
  for (let i = 0; i < 5; i++) {
    const [ax, ay] = L((0.5 - i * 0.13) * a, (-0.32 + i * 0.03) * b), [bx, by] = L((0.25 - i * 0.13) * a, (0.08 + i * 0.02) * b);
    let m = pal.bars ? (i % 2 ? MT.white : MT.black) : mt(pal.greater); if (pal.dvbars) { const tt = along(ax, ay, bx, by); m = (x, y) => (tt(x, y) > 0.62 ? MT.black : MT[pal.greater]); }
    if (pal.bar) { const tt = along(ax, ay, bx, by); const g = mt(pal.greater); m = (x, y) => (tt(x, y) > 0.78 ? MT.sp_buff : g); }
    feather(P, ax, ay, bx, by, W.sw * 1.15, W.sw * 1.05, m, plane, { contour: 1 });
  }
  // median coverts (sparrow: white wing bar at their tips)
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = L((0.55 - i * 0.12) * a, (-0.5 + i * 0.02) * b), [bx, by] = L((0.38 - i * 0.12) * a, (-0.2 + i * 0.02) * b);
    let m = mt(pal.median || pal.lesser); if (pal.bar) { const tt = along(ax, ay, bx, by); const g = m; m = (x, y) => (tt(x, y) > 0.66 ? MT.white : g); }
    feather(P, ax, ay, bx, by, W.sw * 1.0, W.sw * 0.95, m, plane, { contour: 1 });
  }
  // lesser coverts: the shoulder patch
  const [lx, ly] = L(0.55 * a, -0.5 * b); P.add(M.ellipse(lx, ly, a * 0.3, b * 0.27, B.pitch), { m: mt(pal.lesser), n: N.blend(N.sphere(lx, ly, a * 0.3, b * 0.27), N.flat(...plane), 0.4), contour: 1 });
}

// ---------------------------------------------------------------- one frame
export function paintBird(sp, frame) {
  const S = SPECIES[sp]; const P = new Painter(64, 64); const f = FRAMES.indexOf(frame);
  const perched = f >= 9 && f <= 14; const { a, b, hr } = S;
  let pitch = perched ? S.pitchPerch : -0.06, bx = 33, by = 32, bob = 0;
  let headDX = 0, headDY = 0, headPitch = 0, look = false, blink = false, hop = false, breathe = 0;
  if (f < 8) bob = FLAP[f][3];
  if (perched) { const legLen = S.legs.len; by = 51 - legLen - b * 0.92; bx = 32; }
  if (frame === 'breathe') breathe = 0.35;
  if (frame === 'blink') blink = true;
  if (frame === 'peck') { pitch = S.pitchPerch + 0.55; headDX = 1; headDY = 3; headPitch = 0.9; }
  if (frame === 'look') { look = true; }
  if (frame === 'hop') { hop = true; by -= 3; pitch = S.pitchPerch - 0.08; }
  if (frame === 'tuck') { pitch = -0.02; }
  by += bob;
  const B = { x: bx, y: by, pitch };
  const L = (u, v) => { const [x, y] = rot(u, v, pitch); return [bx + x, by + y]; };
  const toL = (x, y) => rot(x - bx, y - by, -pitch);
  const mt = (k) => MT[k] || MT.black;
  const root = L(a * 0.12, -b * 0.62), rootFar = L(a * 0.08, -b * 0.82);
  // far wing (behind everything)
  if (f < 8) spreadWing(P, S, rootFar, -1, FLAP[f][0], FLAP[f][1], FLAP[f][2], -1);
  if (frame === 'glide') spreadWing(P, S, rootFar, -1, 14, 6, 0.32, -1);
  // far leg
  const footY = 51; const legs = (near) => {
    const [hx, hy] = L(-0.02 * a + (near ? 0.12 * a : -0.1 * a), b * 0.78);
    const fx = Math.round(hx + (near ? 1 : -1)), fy = hop ? footY - 3 : footY;
    P.add(M.capsule(hx, hy, fx, fy - 1, 1.6, 0.6), { m: mt(S.legs.m), n: 0.8, contour: 0 });
    if (!hop) P.add(M.union(M.capsule(fx - 1, fy, fx + 3, fy, 0.55, 0.55), M.capsule(fx - 1, fy, fx - 3, fy + 0.4, 0.55, 0.5)), { m: mt(S.legs.m), n: N.flat(0, -0.5, 1), contour: 0, shade: near ? 0 : -1 });
    else P.add(M.capsule(fx, fy - 1, fx + 2, fy + 1, 0.6, 0.5), { m: mt(S.legs.m), n: 0.8, contour: 0 });
  };
  if (perched) legs(false);
  // tail feathers (fan)
  const tail = S.tail; const [rx, ry] = L(-a * 0.82, -b * 0.08);
  const tailAng = Math.PI + pitch + (perched ? 0.12 : -0.04) + (hop ? -0.25 : 0) + (frame === 'peck' ? -0.5 : 0);
  for (let i = 0; i < tail.n; i++) {
    const t = i / Math.max(1, tail.n - 1) - 0.5; const ang = tailAng + t * tail.spread * (perched ? 0.6 : 1);
    let len = tail.len * (1 + Math.abs(t) * 2 * tail.fork * 0.35); if (tail.streamer && Math.abs(t) > 0.45) len += tail.streamer * (perched ? 0.8 : 1);
    const ex = rx + Math.cos(ang) * len, ey = ry + Math.sin(ang) * len * (perched ? 1 : 0.9);
    let m = mt(tail.m); if (tail.bars) { const tt = along(rx, ry, ex, ey); m = (x, y) => (tt(x, y) > 0.48 && tt(x, y) < 0.66 ? MT.white : MT.black); }
    if (tail.band) { const tt = along(rx, ry, ex, ey); m = (x, y) => (tt(x, y) > 0.78 ? MT.cr_black : MT.dv_gray); }
    P.add(M.capsule(rx, ry, ex, ey, tail.w * 1.15, tail.streamer && Math.abs(t) > 0.45 ? 0.5 : tail.w), { m, n: featherN(norm3(0, -0.5, 1), rx, ry, ex, ey, tail.w + 0.5), contour: 1, shade: Math.abs(t) > 0.3 ? -1 : 0 });
  }
  // torso: egg shape, fuller at the breast
  const bodyMask = M.fn((x, y) => { const [u, v] = toL(x, y); const bb = b * (1 + 0.1 * clamp(u / a, -1, 1)) * (v > 0 ? 1 + breathe * 0.12 : 1); return (u / a) ** 2 + (v / bb) ** 2 <= 1; }, bx - a - 2, by - a - 2, bx + a + 2, by + a + 2);
  const bodyN = (x, y) => { const [u, v] = toL(x, y); let nu = u / a, nv = v / (b * 1.05); const d = nu * nu + nv * nv; const nz = Math.sqrt(Math.max(0.02, 1 - Math.min(0.98, d))); const [nx, ny] = rot(nu, nv, pitch); return norm3(nx, ny, nz); };
  P.add(bodyMask, { m: (x, y) => { const [u, v] = toL(x, y); return mt(S.body(u / a, v / b)); }, n: bodyN, tex: S.bodyTex ? (x, y) => { const [u, v] = toL(x, y); return S.bodyTex(u / a, v / b); } : undefined, contour: 1, cast: 1 });
  // crest (hoopoe): fan of feathers behind the head
  const [hcx0, hcy0] = perched ? L(a * 0.86, -b * 0.92) : L(a * 0.98, -b * 0.52);
  const hcx = hcx0 + headDX, hcy = hcy0 + headDY; const hd = look ? Math.PI : 0; const hdir = (look ? -1 : 1);
  if (S.crest) {
    const raised = frame === 'look' || frame === 'hop' ? 1 : 0.55;
    for (let i = 0; i < 6; i++) {
      const t = i / 5; const ang = -Math.PI / 2 - hdir * (0.9 - t * 1.25) * raised - hdir * (1 - raised) * 0.9; const len = hr * (1.3 + Math.sin(t * Math.PI) * 0.7);
      const ax = hcx - hdir * hr * 0.2 + hdir * t * hr * 0.5, ay = hcy - hr * 0.5; const ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len; const tt = along(ax, ay, ex, ey);
      P.add(M.capsule(ax, ay, ex, ey, 1.25, 1.05), { m: (x, y) => (tt(x, y) > 0.82 ? MT.black : tt(x, y) > 0.68 ? MT.white : MT.hp_cinn), n: featherN(norm3(-0.3, -0.4, 1), ax, ay, ex, ey, 1.6), contour: 1 });
    }
  }
  // head + neck
  const [nkx, nky] = L(a * 0.5, -b * 0.35);
  const headMask = M.union(M.ellipse(hcx, hcy, hr, hr * 0.94), M.capsule(nkx, nky, hcx - hdir * 0.5, hcy + 0.5, hr * 0.92, hr * 0.85));
  const hN = N.sphere(hcx, hcy - 0.3, hr * 1.05, hr * 1.0);
  P.add(headMask, { m: (x, y) => { let hx = (x - hcx) / hr * hdir, hy = (y - hcy) / hr; if (headPitch) [hx, hy] = rot(hx, hy, -headPitch); return mt(S.head(hx, hy)); }, n: (x, y) => { const k = hN(x, y); return k; }, contour: 0, cast: 1 });
  // beak: upper + lower mandible
  const bk = S.beak; const bang = hd + headPitch * hdir + (look ? 0 : 0) + 0.12 * hdir; const ca = Math.cos(bang), sa = Math.sin(bang);
  const B2 = (s, t) => [hcx + ca * s - sa * t, hcy + sa * s + ca * t];
  const base = hr * 0.72; const tipCurve = (s) => bk.curve * ((s - base) / bk.len) ** 2 * bk.len * 0.55;
  const upper = []; const lower = [];
  for (let k = 0; k <= 6; k++) { const s = base + (bk.len * k) / 6; const half = (bk.dep / 2) * (1 - k / 6) ** 0.9; upper.push(B2(s, -half + tipCurve(s) - 0.3 + 0.4)); lower.push(B2(s, Math.max(0.3, half * 0.75) + tipCurve(s) + 0.2)); }
  const mid = []; for (let k = 0; k <= 6; k++) { const s = base + (bk.len * k) / 6; mid.push(B2(s, tipCurve(s) + 0.35)); }
  P.add(M.poly([...upper, ...mid.slice().reverse()]), { m: mt(bk.m), n: N.flat(-0.2 * hdir, -0.7, 0.8), contour: 0 });
  P.add(M.poly([...mid.slice(0, 6), ...lower.slice(0, 6).reverse()]), { m: mt(bk.m), n: N.flat(0, 0.6, 0.8), contour: 0, shade: -1 });
  // near leg, near/folded wing
  if (perched) legs(true);
  if (f < 8) spreadWing(P, S, root, 1, FLAP[f][0], FLAP[f][1], FLAP[f][2], 0);
  else if (frame === 'glide') spreadWing(P, S, root, 1, 14, 6, 0.32, 0);
  else foldedWing(P, S, B);
  const pc = P.render();
  // eye (hand placed)
  const ex = Math.round(hcx + hdir * hr * 0.32 - (hdir < 0 ? 1 : 0)), ey = Math.round(hcy - hr * 0.2 - 0.5);
  if (blink) { const lid = S.eye === 'dark' ? C.cr_black[3] : '#2a2228'; pc.px(ex - 1, ey + 1, lid); pc.px(ex, ey + 1, lid); pc.px(ex + 1, ey + 1, lid); }
  else if (S.eye === 'ring') { const ring = '#e07a2a'; pc.px(ex - 1, ey, ring); pc.px(ex + 2, ey, ring); pc.px(ex, ey - 1, ring); pc.px(ex + 1, ey - 1, ring); pc.px(ex, ey + 2, '#a85020'); pc.px(ex + 1, ey + 2, '#a85020'); pc.px(ex - 1, ey + 1, '#a85020'); pc.px(ex + 2, ey + 1, '#a85020'); pc.px(ex, ey, '#ffffff'); pc.px(ex + 1, ey, '#120c10'); pc.px(ex, ey + 1, '#120c10'); pc.px(ex + 1, ey + 1, '#120c10'); }
  else { const dk = S.eye === 'dark' ? '#02020a' : '#0c080a'; pc.px(ex, ey, '#fff8ee'); pc.px(ex + 1, ey, dk); pc.px(ex, ey + 1, dk); pc.px(ex + 1, ey + 1, dk); if (S.eye === 'dark') { pc.px(ex - 1, ey + 1, '#1d2440'); } }
  if (bk.cere) { const [cx, cy] = B2(base + 0.6, -bk.dep * 0.35); pc.px(Math.round(cx), Math.round(cy), '#e8e4e0'); pc.px(Math.round(cx) + hdir, Math.round(cy), '#c8c4c4'); }
  return pc;
}
