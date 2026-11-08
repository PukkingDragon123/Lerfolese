// Low-res geometric birds (32px cells). Every part is an angular polygon with flat facet planes:
// a 7-gon torso, a hexagonal head, a triangle beak, a wedge/fork tail, and wings built as one polygon from the
// projected 3D wing skeleton (shoulder -> wrist -> tip, sawtooth primary tips), so the flap cycle keeps real key poses.
import { Painter, M, norm3, clamp, lerp } from './core.js';
import { roof, plane, gmat } from './geo.js';

const EL = 36 * Math.PI / 180, CE = Math.cos(EL), SE = Math.sin(EL);
const proj = (v) => [v[0], -(v[1] * CE - v[2] * SE)];
const scrN = (n) => [n[0], -(n[1] * CE - n[2] * SE), n[1] * SE + n[2] * CE];
const rot = (u, v, a) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];

// ---------------------------------------------------------------- palettes: 4 tones each (shadow, dark, mid, lit)
const C = {
  sp_gray: ['#2a2630', '#55545e', '#8a8c94', '#c0c2c4'], sp_chest: ['#2e140c', '#6e3418', '#a85a2a', '#d8904c'],
  sp_brown: ['#1e120e', '#4a3224', '#785438', '#a88058'], sp_dark: ['#100b0c', '#2c2020', '#4a3a30', '#6e5a44'],
  sp_pale: ['#4e4840', '#8a8274', '#c4bca8', '#ede8da'], sp_buff: ['#5a4030', '#9c7a52', '#d0aa74', '#f2deb0'],
  black: ['#08070a', '#16131a', '#28222c', '#3e3540'], white: ['#5c5864', '#9e9aa2', '#dad6d2', '#fdfcf6'],
  sw_blue: ['#060818', '#12204e', '#1f3c8a', '#3a6ac4'], sw_rufous: ['#320c0a', '#7a2010', '#b84420', '#e2743a'],
  sw_cream: ['#5a4430', '#9a7e5c', '#d4ba94', '#f8ecd4'],
  hp_cinn: ['#3a180e', '#7a3c22', '#b8663a', '#e6a26c'], hp_belly: ['#5a3c2a', '#9a7656', '#d0aa84', '#f6e2c4'],
  cr_black: ['#050508', '#11121a', '#20232f', '#384056'], cr_gray: ['#24222a', '#4a464e', '#76727a', '#a8a4a6'],
  dv_gray: ['#222536', '#47506a', '#7a869e', '#b4bece'], dv_head: ['#1e2232', '#3c4560', '#66708a', '#9aa4ba'],
  dv_green: ['#0e2c24', '#1e5a44', '#3a9068', '#7cc49a'], dv_purple: ['#22123a', '#44286c', '#6c4a9c', '#a688c8'],
  dv_pale: ['#44485a', '#7c8294', '#b8bec8', '#eef0f4'],
  beak_dark: ['#0a080a', '#221c1e', '#3e3434', '#5e5050'], leg: ['#2a1a18', '#5a3830', '#8e5c4c', '#bc8a74'],
  leg_dark: ['#0a080a', '#1c1618', '#302828', '#463c3c'], leg_pink: ['#3a141a', '#7a2c34', '#b84a4e', '#e88276'],
};
const MT = {}; for (const k in C) MT[k] = gmat(C[k], { amb: 0.24, dif: 0.84 });
const mt = (k) => MT[k] || MT.black;

// ---------------------------------------------------------------- species (sizes in pixels for a 32px cell)
export const SPECIES = {
  sparrow: {
    size: 0.74, a: 5.2, b: 3.5, hr: 2.7, beak: { len: 2.2, dep: 1.9, m: 'beak_dark' }, eye: 'small', leg: 'leg',
    tail: { len: 6, w0: 1.2, w1: 1.8, kind: 'notch', m: 'sp_brown' },
    wing: { arm: 4.2, hand: 4, pn: 4, pl: 5.6, sl: 4.4, cov: 1.6, round: 1, reach: 1.2 },
    pitchPerch: -0.42, flapFps: 15, glide: 0.35, bound: true,
    head(hx, hy) { if (hy > 0.3 && hx > -0.2) return 'black'; if (hx > 0.35 && hy > -0.2 && hy < 0.15) return 'black'; if (hy < -0.25 && hx > -0.55) return 'sp_gray'; if (hx < -0.2 && hy < 0.5) return 'sp_chest'; return 'sp_pale'; },
    body(u, v) { if (u > 0.45 && v > -0.4 && v < 0.45) return 'black'; if (v < -0.25) return 'sp_chest'; if (u < -0.55 && v < 0.25) return 'sp_brown'; return 'sp_pale'; },
    fold: { lesser: 'sp_chest', bar: 'white', greater: 'sp_dark', tert: 'sp_dark', edge: 'sp_buff', prim: 'sp_brown' },
    wingD: { cov: 'sp_chest', bar: 'white', flight: 'sp_dark' }, wingV: { cov: 'sp_pale', flight: 'sp_gray' },
  },
  swallow: {
    size: 0.78, a: 5, b: 2.9, hr: 2.5, beak: { len: 1.5, dep: 2, m: 'beak_dark' }, eye: 'small', leg: 'leg_dark',
    tail: { len: 6.5, w0: 1.1, w1: 1.4, kind: 'fork', streamer: 5, m: 'sw_blue' },
    wing: { arm: 4, hand: 6.2, pn: 4, pl: 7, sl: 3.6, cov: 1.5, round: 0, reach: 1.7 },
    pitchPerch: -0.3, flapFps: 13, glide: 0.65,
    head(hx, hy) { if (hx > 0.42 && hy < 0.1 && hy > -0.55) return 'sw_rufous'; if (hy > 0.25 && hx > -0.3) return 'sw_rufous'; return 'sw_blue'; },
    body(u, v) { if (u > 0.55 && v > -0.3 && v < 0.3) return 'sw_blue'; if (v < -0.05) return 'sw_blue'; return 'sw_cream'; },
    fold: { lesser: 'sw_blue', greater: 'sw_blue', tert: 'sw_blue', edge: 'sw_blue', prim: 'sw_blue' },
    wingD: { cov: 'sw_blue', flight: 'sw_blue' }, wingV: { cov: 'sw_cream', flight: 'sp_gray' },
  },
  hoopoe: {
    size: 0.86, a: 5.6, b: 3.6, hr: 2.8, beak: { len: 5.6, dep: 1.4, curve: 1.2, m: 'beak_dark' }, eye: 'small', crest: true, leg: 'leg_dark',
    tail: { len: 6.4, w0: 1.6, w1: 2.2, kind: 'square', m: 'black', band: 'white', bandAt: 0.5 },
    wing: { arm: 4.6, hand: 4.6, pn: 4, pl: 6, sl: 5, cov: 1.8, round: 1, bars: true, reach: 1.05 },
    pitchPerch: -0.32, flapFps: 11, glide: 0.25,
    head() { return 'hp_cinn'; },
    body(u, v) { if (u < -0.6 && v < 0) return 'white'; if (v > 0.3) return 'hp_belly'; return 'hp_cinn'; },
    fold: { lesser: 'hp_cinn', zebra: true }, wingD: { cov: 'hp_cinn', flight: 'black', bars: true }, wingV: { cov: 'black', flight: 'black', bars: true },
  },
  crow: {
    size: 0.98, a: 6.4, b: 4.1, hr: 3.2, beak: { len: 3.6, dep: 2.6, curve: 0.5, m: 'beak_dark' }, eye: 'dark', leg: 'leg_dark',
    tail: { len: 7.4, w0: 1.8, w1: 2.6, kind: 'round', m: 'cr_black' },
    wing: { arm: 5.6, hand: 5.6, pn: 5, pl: 7.4, sl: 6, cov: 2.1, round: 1, fingers: true, reach: 1.2 },
    pitchPerch: -0.22, flapFps: 9, glide: 0.4,
    head() { return 'cr_black'; },
    body(u, v) { if (u > 0.42 && v > -0.2) return 'cr_black'; if (u < -0.62) return 'cr_black'; return 'cr_gray'; },
    fold: { lesser: 'cr_black', greater: 'cr_black', tert: 'cr_black', edge: 'cr_black', prim: 'cr_black' },
    wingD: { cov: 'cr_black', flight: 'cr_black' }, wingV: { cov: 'cr_black', flight: 'cr_black' },
  },
  dove: {
    size: 0.84, a: 5.8, b: 3.8, hr: 2.5, beak: { len: 1.7, dep: 1.2, m: 'beak_dark', cere: true }, eye: 'ring', leg: 'leg_pink',
    tail: { len: 7, w0: 1.8, w1: 2.5, kind: 'round', m: 'dv_gray', band: 'cr_black', bandAt: 0.75 },
    wing: { arm: 5.2, hand: 6, pn: 4, pl: 7, sl: 5, cov: 1.9, round: 0.4, reach: 1.25 },
    pitchPerch: -0.24, flapFps: 16, glide: 0.45,
    head() { return 'dv_head'; },
    body(u, v) { if (u > 0.38 && v < 0.35 && v > -0.85) return v < -0.2 ? 'dv_green' : 'dv_purple'; if (u < -0.55 && v < -0.2) return 'dv_pale'; return 'dv_gray'; },
    fold: { lesser: 'dv_gray', greater: 'dv_gray', tert: 'dv_gray', edge: 'dv_gray', prim: 'dv_head', dvbars: true },
    wingD: { cov: 'dv_gray', flight: 'dv_gray', dvbars: true }, wingV: { cov: 'dv_pale', flight: 'dv_gray' },
  },
};

// ---------------------------------------------------------------- poses
// [flap deg, tip lag deg, wrist fold, body bob px]: 0 top | 1-3 downstroke (spread, tips lag) | 4 bottom | 5-7 upstroke (wrist folds)
const FLAP = [[80, 10, 0.45, 1], [46, 24, 0.2, 0], [8, 20, 0.14, 0], [-30, 14, 0.26, -1], [-56, -4, 0.6, -1], [-34, -42, 1.55, 0], [8, -54, 2.0, 0], [50, -32, 1.25, 1]];
export const FRAMES = ['fly0', 'fly1', 'fly2', 'fly3', 'fly4', 'fly5', 'fly6', 'fly7', 'glide', 'perch', 'breathe', 'blink', 'peck', 'look', 'hop', 'tuck'];
export const FOOT_ROW = 27;

// ---------------------------------------------------------------- wings
function spreadWing(P, S, root, sd, phi, lag, fold, shade) {
  const W = S.wing; const d2r = Math.PI / 180; const p = phi * d2r, pl = (phi + lag) * d2r;
  const span = [0, Math.sin(p), sd * Math.cos(p)], span2 = [0, Math.sin(pl), sd * Math.cos(pl)];
  const armD = norm3(-0.16 - fold * 0.1, span[1], span[2]); const handD = norm3(-fold * 0.95 - 0.12, span2[1], span2[2]);
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const wrist = armD.map((c) => c * W.arm), tip = add(wrist, handD, W.hand);
  const toS = (v) => { const q = proj(v); return [root[0] + q[0], root[1] + q[1]]; };
  const dorsal = [0, Math.cos(p), -sd * Math.sin(p)]; let n = scrN(dorsal); let ventral = false; if (n[2] < 0) { n = n.map((c) => -c); ventral = true; }
  const nP = norm3(n[0], n[1], Math.max(0.3, n[2]));
  const back = (v, k, len) => norm3(lerp(v[0], -1, k), lerp(v[1], 0, k) * 0.9, lerp(v[2], 0, k) * 0.9).map((c) => c * len);
  // trailing edge: primary tips (outer -> inner) with notches between them, then the secondaries' edge back to the body
  const trail = [];
  for (let i = W.pn - 1; i >= 0; i--) {
    const t = i / Math.max(1, W.pn - 1); const b3 = add(wrist, handD, W.hand * t * 0.92); const k = lerp(0.8, 0.05, Math.pow(t, 0.8));
    const len = W.pl * (W.round ? lerp(0.82, 1, Math.sin(t * Math.PI * 0.72)) * (t > 0.8 ? lerp(1, 0.82, ((t - 0.8) / 0.2) * W.round) : 1) : lerp(0.8, 1.12, t));
    trail.push(toS(add(b3, back(handD, k, len))));
    if (i > 0) { const tn = (i - 0.5) / Math.max(1, W.pn - 1); const bn = add(wrist, handD, W.hand * tn * 0.92); trail.push(toS(add(bn, back(handD, lerp(0.8, 0.05, Math.pow(tn, 0.8)), len * (W.fingers ? 0.55 : 0.78))))); }
  }
  const secOut = toS(add(wrist.map((c) => c * 0.95), back(span.map((c) => c * 0.15), 0.93, W.sl))); const secIn = toS(add(wrist.map((c) => c * 0.12), back(span.map((c) => c * 0.15), 0.93, W.sl * 0.8)));
  const S0 = toS([0, 0, 0]), W0 = toS(wrist), T0 = toS(tip);
  const outline = [S0, W0, T0, ...trail, secOut, secIn];
  const pal = ventral ? S.wingV : S.wingD;
  // zones: coverts band along the leading edge, flight feathers behind; hoopoe and dove bars as straight stripes
  const dLead = (x, y) => { let d = 1e9; for (const [a, b] of [[S0, W0], [W0, T0]]) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1; const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1); d = Math.min(d, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t)); } return d; };
  const m = (x, y) => {
    const d = dLead(x, y);
    if (pal.bars) { if (d < W.cov * 0.9 && !ventral) return mt(pal.cov); return Math.floor(d / 1.6) % 2 ? MT.white : MT.black; }
    if (d < W.cov) return mt(pal.cov); if (pal.bar && d < W.cov + 1) return mt(pal.bar); if (pal.dvbars && ((d > W.cov + 1 && d < W.cov + 2) || (d > W.cov + 3 && d < W.cov + 4))) return MT.black; return mt(pal.flight);
  };
  P.add(M.poly(outline), { m, n: (x, y) => (dLead(x, y) < W.cov ? norm3(nP[0], nP[1] - 0.4, nP[2]) : nP), contour: 1, cast: sd > 0 ? 1 : 0, shade });
}
function foldedWing(P, S, L, toL) { // one angular blade with crisp tract bands
  const { a, b } = S; const f = S.fold; const R = S.wing.reach;
  const pts = [[0.66, -0.78], [-0.1, -0.98], [-R, -0.42], [-R + 0.12, -0.12], [-0.35, 0.42], [0.25, 0.4], [0.72, -0.12]].map(([u, v]) => L(u * a, v * b));
  const m = (x, y) => {
    const [uu, vv] = toL(x, y); const u = uu / a, v = vv / b;
    if (f.zebra) { if (u > 0.3) return mt(f.lesser); return Math.floor(((0.3 - u) * a) / 1.5) % 2 ? MT.white : MT.black; }
    if (u > 0.3) return mt(f.lesser); if (f.bar && u > 0.18) return mt(f.bar); if (u > -0.1) return mt(f.greater);
    if (f.dvbars && ((u > -0.05 && u < 0.12) || (u > -0.42 && u < -0.28))) return MT.black;
    if (u > -0.62) return mt(f.tert);
    return mt(f.prim);
  };
  P.add(M.poly(pts), { m, n: roof(pts, { k: 0.8, table: 1.2, top: [-0.1, -0.35, 1] }), contour: 2, cast: 1 });
}

// ---------------------------------------------------------------- one frame (32x32)
export function paintBird(sp, frame) {
  const S = SPECIES[sp]; const P = new Painter(32, 32); const fi = FRAMES.indexOf(frame);
  const perched = fi >= 9 && fi <= 14; const { a, b, hr } = S;
  let pitch = perched ? S.pitchPerch : -0.07, bx = 16.5, by = 15.5;
  let headDX = 0, headDY = 0, headPitch = 0, look = false, blink = false, hop = false, breathe = 0;
  if (fi < 8) by += FLAP[fi][3];
  if (perched) { by = FOOT_ROW - 2.2 - b * 0.95 - (sp === 'crow' ? 1 : 0); bx = 16; }
  if (frame === 'breathe') breathe = 1;
  if (frame === 'blink') blink = true;
  if (frame === 'peck') { pitch = S.pitchPerch + 0.62; headDX = 1; headDY = 2; headPitch = 0.95; }
  if (frame === 'look') look = true;
  if (frame === 'hop') { hop = true; by -= 2; pitch = S.pitchPerch - 0.1; }
  const L = (u, v) => { const [x, y] = rot(u, v, pitch); return [bx + x, by + y]; };
  const toL = (x, y) => rot(x - bx, y - by, -pitch);
  const root = L(a * 0.2, -b * 0.6), rootFar = L(a * 0.14, -b * 0.86);
  if (fi < 8) spreadWing(P, S, rootFar, -1, FLAP[fi][0], FLAP[fi][1], FLAP[fi][2], -1);
  if (frame === 'glide') spreadWing(P, S, rootFar, -1, 16, 6, 0.3, -1);
  // tail: wedge / notch / fork / fan polygons
  const T = S.tail; const tAng = Math.PI + pitch + (perched ? -0.38 : -0.03) + (hop ? 0.3 : 0) + (frame === 'peck' ? 0.4 : 0);
  const [rx, ry] = L(-a * 0.72, -b * 0.08); const c = Math.cos(tAng), s = Math.sin(tAng); const TL = (t, w) => [rx + c * t - s * w, ry + s * t + c * w];
  const l = T.len; let tp;
  if (T.kind === 'fork') { const st = T.streamer; tp = [[0, -T.w0], [l * 0.6, -T.w1], [l + st, -T.w1 - 0.9], [l + st - 0.6, -T.w1 + 0.1], [l * 0.65, 0], [l + st - 0.6, T.w1 - 0.1], [l + st, T.w1 + 0.9], [l * 0.6, T.w1], [0, T.w0]]; }
  else if (T.kind === 'notch') tp = [[0, -T.w0], [l, -T.w1], [l - 0.9, 0], [l, T.w1], [0, T.w0]];
  else if (T.kind === 'square') tp = [[0, -T.w0], [l, -T.w1], [l, T.w1], [0, T.w0]];
  else tp = [[0, -T.w0], [l * 0.85, -T.w1], [l + 0.6, -T.w1 * 0.4], [l + 0.6, T.w1 * 0.4], [l * 0.85, T.w1], [0, T.w0]];
  const tailPts = tp.map(([t, w]) => TL(t, w));
  P.add(M.poly(tailPts), { m: (x, y) => { const t = ((x - rx) * c + (y - ry) * s) / l; if (T.band && t > T.bandAt && t < T.bandAt + (T.band === 'white' ? 0.2 : 0.3)) return mt(T.band); return mt(T.m); }, n: (x, y) => (((x - rx) * -s + (y - ry) * c) < 0 ? norm3(-0.3, -0.7, 1) : norm3(0.2, 0.5, 1)), contour: 1, cast: 1 });
  // torso: angular egg (7-gon), faceted planes
  const bodyU = [[1.0, -0.25], [0.78, 0.72], [0.1, 1.0 + breathe * 0.12], [-0.62, 0.72], [-1.0, 0.02], [-0.55, -0.86], [0.35, -0.96]];
  const bodyPts = bodyU.map(([u, v]) => L(u * a, v * b));
  P.add(M.poly(bodyPts), { m: (x, y) => { const [u, v] = toL(x, y); return mt(S.body(u / a, v / b)); }, n: roof(bodyPts, { k: 1.2, table: 1.4 }), contour: 1, cast: 1 });
  // head
  const [hcx0, hcy0] = perched ? L(a * 0.86, -b * 0.95) : L(a * 0.98, -b * 0.55);
  const hcx = hcx0 + headDX, hcy = hcy0 + headDY; const hdir = look ? -1 : 1; const hd = look ? Math.PI : 0;
  if (S.crest) {
    const raised = frame === 'look' || frame === 'hop' || frame === 'blink' ? 1 : 0.4;
    for (let i = 0; i < 4; i++) {
      const t = i / 3; const ang = -Math.PI / 2 - hdir * ((1 - t) * 1.25 - 0.3) * raised - hdir * (1 - raised) * 1.15; const ln = hr * (1.5 + Math.sin(t * Math.PI) * 0.7);
      const ax = hcx - hdir * hr * 0.3 + hdir * t * hr * 0.8, ay = hcy - hr * 0.55; const ex = ax + Math.cos(ang) * ln, ey = ay + Math.sin(ang) * ln; const px = -Math.sin(ang) * 0.75, py = Math.cos(ang) * 0.75;
      P.add(M.poly([[ax - px, ay - py], [ax + px, ay + py], [ex, ey]]), { m: (x, y) => { const tt = ((x - ax) * (ex - ax) + (y - ay) * (ey - ay)) / (ln * ln); return tt > 0.72 ? MT.black : tt > 0.55 ? MT.white : MT.hp_cinn; }, n: plane(-0.3, -0.5), contour: 1 });
    }
  }
  const hU = [[1.0, -0.15], [0.55, -0.95], [-0.45, -1.0], [-1.0, -0.25], [-0.75, 0.8], [0.4, 0.95]];
  const headPts = hU.map(([u, v]) => [hcx + u * hr * hdir, hcy + v * hr]);
  const neck = [L(a * 0.42, -b * 0.62), [hcx - hdir * hr * 0.5, hcy - hr * 0.6], [hcx - hdir * hr * 0.2, hcy + hr * 0.9], L(a * 0.8, b * 0.25)];
  P.add(M.union(M.poly(headPts), M.poly(neck)), { m: (x, y) => { let hx = ((x - hcx) / hr) * hdir, hy = (y - hcy) / hr; if (headPitch) [hx, hy] = rot(hx, hy, -headPitch); return mt(S.head(hx, hy)); }, n: roof(headPts, { k: 1.1, table: 1.1 }), contour: 0, cast: 1 });
  // beak: two triangles (upper lit, lower shaded)
  const bk = S.beak; const bang = hd + headPitch * hdir + 0.08 * hdir; const ca = Math.cos(bang), sa = Math.sin(bang);
  const B2 = (s2, t) => [hcx + ca * s2 - sa * t, hcy + sa * s2 + ca * t]; const base = hr * 0.72, tipC = bk.curve || 0;
  P.add(M.poly([B2(base, -bk.dep / 2), B2(base + bk.len, tipC + 0.3), B2(base, 0.25)]), { m: mt(bk.m), n: plane(-0.2 * hdir, -0.8), contour: 0 });
  P.add(M.poly([B2(base, 0.25), B2(base + bk.len * 0.92, tipC + 0.6), B2(base, bk.dep / 2)]), { m: mt(bk.m), n: plane(0, 0.6), contour: 0, shade: -1 });
  // near wing
  if (fi < 8) spreadWing(P, S, root, 1, FLAP[fi][0], FLAP[fi][1], FLAP[fi][2], 0);
  else if (frame === 'glide') spreadWing(P, S, root, 1, 16, 6, 0.3, 0);
  else foldedWing(P, S, L, toL);
  const pc = P.render();
  // legs: 1px tarsi + toes
  if (perched) for (const near of [false, true]) {
    const legC = C[S.leg]; const [lx, ly] = L(a * (near ? 0.08 : -0.15), b * 0.8); const x0 = Math.round(lx), y0 = Math.round(ly) + 1, fy = hop ? FOOT_ROW - 2 : FOOT_ROW; const col = near ? legC[2] : legC[1];
    for (let y = y0; y <= fy; y++) pc.px(x0 + (near && y > (y0 + fy) / 2 ? 1 : 0), y, col);
    const fx = x0 + (near ? 1 : 0); if (!hop) { pc.px(fx + 1, fy, col); pc.px(fx + 2, fy, legC[0]); pc.px(fx - 1, fy, legC[0]); }
  }
  // eye: one dark pixel (+ ring / cheek spot where the species has one); closed lid for blinks
  const ex = Math.round(hcx + hdir * hr * 0.28 - 0.5), ey = Math.round(hcy - hr * 0.25 - 0.5);
  if (blink) { pc.px(ex, ey, S.eye === 'dark' ? C.cr_black[3] : '#4a3c3c'); }
  else { pc.px(ex, ey, S.eye === 'dark' ? '#020206' : '#0c0808'); if (S.eye === 'ring') { pc.px(ex - hdir, ey, '#e8822e'); pc.px(ex, ey - 1, '#f2a24a'); } else if (sp === 'sparrow') pc.px(ex - hdir * 2, ey, '#ece6da'); else if (S.eye === 'dark') pc.px(ex, ey - 1, '#2a3248'); }
  if (bk.cere) { const [cx, cy] = B2(base + 0.4, -bk.dep * 0.5); pc.px(Math.round(cx), Math.round(cy), '#ecebe6'); }
  return pc;
}
