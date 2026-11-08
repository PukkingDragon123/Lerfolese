// Backdrops for the 106x63 art window: pixel-art scenes, never cartoon effects.
// NATURE (matter / instrument / move cards): Greek meadows with olive groves, a sea horizon at dusk under
// limestone cliffs, a river valley and a starry night over the hills. Layers recede with atmospheric
// perspective (far ridges sit close to the sky colour); every material is a short hue-shifted ramp.
// SPACE (energy / law / power cards and named combos): nebulae, a spiral galaxy, a gas giant, Earth rising
// over a cratered moon, and star fields in three depths. Each card picks a variant from its seed.
import { Spr, ell, rng, dk, ramp } from './kit.js';
import { makeNoise } from '../pixel.js';
import { earth } from './subjects.js';

export const BW = 106, BH = 63;
const GY = 53; // ground line for scenes that have one

// ---------- palettes (all registered ramps so shadows can darken them) ----------
const P = {
  // golden-hour meadow
  daySky: ramp('#3a62a8', '#4874b6', '#5a88c2', '#729ccc', '#8eb0d4', '#acc4d8', '#cad4d2', '#e6dcc0'),
  dayFar: ramp('#5e6e9c', '#7282ac', '#8898ba', '#a0aec8'),
  dayMid: ramp('#465c5a', '#566e62', '#6a8268', '#82966e'),
  dayNear: ramp('#2c4426', '#3e5a2c', '#547234', '#6e8c3c', '#8ca648', '#aebe5e'),
  olive: ramp('#1e281e', '#2e3a28', '#46553a', '#62724a', '#82905c', '#a4ae78', '#c8cc9a'),
  oliveFar: ramp('#3a4c4a', '#4a5e56', '#5e7262', '#748870'),
  trunk: ramp('#22160f', '#3a2a20', '#5a4230', '#7a5a40'),
  cypress: ramp('#14221a', '#1e3224', '#2a442e', '#3a5a3a', '#4e7246'),
  meadow: ramp('#1a2a12', '#26401a', '#345a20', '#487428', '#628e30', '#80aa3e', '#a8c65a'),
  soil: ramp('#1c120e', '#2e1e16', '#46301e', '#5e4228', '#7a5a36'),
  cloud: ramp('#6a7ca4', '#8a9cbc', '#aebcd0', '#d0d8e2', '#eef0f0', '#ffffff'),
  poppy: ramp('#4a0c14', '#8a1a1e', '#c8302c', '#ec5a3a', '#ff9a6a'),
  // dusk sea and cliffs
  duskSky: ramp('#241a48', '#35225e', '#4c2a6e', '#6e3478', '#984278', '#c05a76', '#e47c6e', '#f6a86c', '#fcd08a'),
  sun: ramp('#e87a50', '#f8a860', '#ffd890', '#fff4c8'),
  sea: ramp('#1c1a40', '#24224e', '#2e2a5c', '#3a3268', '#4a3c76', '#5e4882'),
  glow: ramp('#8a4a6a', '#c46a6a', '#f09a70', '#ffd090', '#fff0c0'),
  cliff: ramp('#2a1a36', '#3e2648', '#583656', '#7a4a60', '#a0645e', '#c88466', '#e6aa7a'),
  headland: ramp('#20142a', '#322036', '#4a2e3e', '#664048', '#86584e', '#a8745a'),
  marble: ramp('#5a3a50', '#8a6070', '#c09090', '#ecc8b0', '#fff0dc'),
  // river valley morning
  valSky: ramp('#3c70b8', '#4c82c2', '#6096cc', '#7aaad4', '#98bedc', '#b8d2e2', '#d6e4e6'),
  valFar: ramp('#6e86b0', '#8298bc', '#98acc8', '#e2eaf2'),
  valMid: ramp('#3e5e56', '#4a705e', '#5a8466', '#6c9870'),
  river: ramp('#2c4a6a', '#3e6a8a', '#5a8eae', '#7cb0cc', '#a6d0e2', '#dcf0f8'),
  // starry night
  nightSky: ramp('#05061a', '#080b24', '#0c112e', '#111838', '#162042', '#1c284e', '#24325a'),
  star: ramp('#3a4478', '#5a68a8', '#8a9ad0', '#c8d4f4', '#ffffff'),
  moon: ramp('#8a8a9a', '#c2bea8', '#e8e2c4', '#fbf6e0'),
  nightFar: ramp('#1a2648', '#22305a', '#2c3c6c'),
  nightMid: ramp('#101a34', '#16223e', '#1e2c4e', '#3a5080'),
  nightNear: ramp('#080e1c', '#0c1426', '#121c32', '#1a283e', '#2a3e5a', '#3e5878'),
  lamp: ramp('#5a2a10', '#c87a28', '#ffd070'),
  // space
  void: ramp('#020208', '#05040e', '#090718', '#0e0b22', '#15102e'),
  sstar: ramp('#2a2a52', '#4a4a80', '#7a80b8', '#b8c4ec', '#ffffff'),
  nebV: ramp('#0e0a22', '#1a1236', '#2a1a4e', '#3e2468', '#583284', '#7a46a2', '#a468c0'),
  nebM: ramp('#140818', '#2a0e2c', '#461640', '#682058', '#8e2c6e', '#b84886', '#e07aa6'),
  nebC: ramp('#06101e', '#0a1c30', '#0e2c44', '#14425a', '#1c5c72', '#2a7a8a', '#48a0a6'),
  nebO: ramp('#140a10', '#2c1218', '#4a1c20', '#702a26', '#9a3e2a', '#c45e32', '#ea8c46'),
  gal: ramp('#141a3e', '#232c5c', '#36427e', '#5262a0', '#7a8ac2', '#b0bce0', '#f2e8d0', '#fff8e8'),
  giant: ramp('#1a0e10', '#3a1e1a', '#5e3222', '#86502e', '#ae7440', '#cc9a5e', '#e6c28a', '#f6e2b8'),
  giantB: ramp('#160a0e', '#301414', '#4e2018', '#743020', '#9a4628', '#bc6234', '#d88a50', '#ecb27a'),
  ring: ramp('#3a2e2a', '#6a5a4a', '#9a8668', '#c4b088', '#e6d4aa'),
  rock: ramp('#0e0c14', '#1c1a24', '#2c2a36', '#403e4c', '#585666', '#747284', '#9896a6', '#c0beca'),
  dust: ramp('#120e10', '#22181a', '#342426', '#4a3434', '#664a44', '#866456', '#a6826a'),
};
export const BGR = P;

// ---------- helpers ----------
const nz = (seed) => makeNoise(seed);
// horizontal colour bands with stepped, hand-like boundaries
function sky(s, cols, stops, n, y1 = BH) {
  s.fill((x, y) => y < y1, (x, y) => { let k = 0; while (k + 1 < stops.length && y >= stops[k + 1] + (n(x * 0.05 + k * 7, k * 3.1) > 0.56 ? 1 : 0)) k++; return cols[Math.min(cols.length - 1, k)]; });
}
// a ridge line y = h(x)
const ridge = (n, base, amp, f, off = 0, oct = 4) => (x) => base - amp * n.fbm(x * f + off, off * 0.37, oct);
// a faceted range: lit where the terrain rises to the right (faces the light from the left)
function range(s, h, lit, shade, { rim = null, snow = null, snowLine = -1, until = BH, deep = null, deepAt = 99 } = {}) {
  for (let x = 0; x < BW; x++) {
    const top = Math.round(h(x));
    for (let y = Math.max(0, top); y < until; y++) {
      const k = y - h(x); const L = h(x + k * 0.8 + 1) < h(x - k * 0.8 - 1);
      let c = L ? lit : shade;
      if (deep && k > deepAt) c = deep;
      if (snow && top < snowLine && k < (snowLine - top) * 0.6 + 1) c = L ? snow[1] : snow[0];
      if (rim && y === top && L) c = rim;
      s.px(x, y, c);
    }
  }
}
// rolling hill band filled with a flat tone, a lit crest and a shaded lower edge
function hill(s, h, cols, until = BH) {
  for (let x = 0; x < BW; x++) { const top = Math.round(h(x)); for (let y = Math.max(0, top); y < until; y++) { const k = y - top; const slope = h(x + 2) - h(x - 2); s.px(x, y, k === 0 ? cols[slope > 0.4 ? 2 : 3] : k < 3 && slope < -0.3 ? cols[2] : cols[1]); } }
}
// cumulus built from noise: rounded billows, lit tops, cool shaded bellies
function cumulus(s, n, cx, cy, w, h, C) {
  const inside = (x, y) => { const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h / 2); const e = dx * dx + dy * dy * (dy > 0 ? 3 : 1); return e < 1 && n.fbm(x * 0.22, y * 0.3, 3) + (1 - e) * 0.55 > 0.68; };
  s.fill(inside, (x, y) => { const dy = (y + 0.5 - cy) / (h / 2); if (!inside(x, y - 1)) return C[5]; if (!inside(x, y - 2) || !inside(x - 1, y - 1)) return C[4]; return dy > 0.35 ? C[2] : C[3]; });
  s.fill((x, y) => inside(x, y) && !inside(x, y + 1), C[1]);
}
// stratus streak: a thin cloud line with a lit top
function streak(s, x0, y, len, top, body) { for (let x = x0; x < x0 + len; x++) { s.px(x, y, body); if (x > x0 + 1 && x < x0 + len - 2) s.px(x, y - 1, top); } }

const OLIVE = ['...aab...', '.aabbbcb.', 'abbbcbccd', '.bccdccd.', '..dd.cdd.', '....e....', '...ef....', '..eeff...'];
const OLIVE_S = ['.ab..', 'abbc.', '.ccd.', '..e..'];
const CYPRESS = ['.a.', '.ab', 'abb', 'abc', 'abc', 'bbc', 'bcc', 'bcc', '.c.', '.e.'];
function olive(s, x, y, small = false, O = P.olive, T = P.trunk) { s.grid(small ? OLIVE_S : OLIVE, { a: O[6], b: O[5], c: O[4], d: O[3], e: T[2], f: T[1] }, x, y); }
function oliveFar(s, x, y) { s.grid(OLIVE_S, { a: P.oliveFar[3], b: P.oliveFar[2], c: P.oliveFar[1], d: P.oliveFar[0], e: P.oliveFar[0] }, x, y); }
function cypress(s, x, y, C = P.cypress) { s.grid(CYPRESS, { a: C[4], b: C[3], c: C[2], e: P.trunk[1] }, x, y); }

// foreground meadow with grass blades, flowers and stones
function meadow(s, r, G = P.meadow, S = P.soil, flowers = true) {
  s.fill((x, y) => y >= GY, (x, y) => { const d = y - GY; if (d === 0) return G[5]; if (d === 1) return G[4]; if (d < 4) return (x * 7 + d * 3) % 9 === 0 ? G[4] : G[3]; if (d < 6) return (x * 5 + d) % 7 === 0 ? G[3] : G[2]; return d < 8 ? S[3] : S[2]; });
  for (let x = 1; x < BW - 1; x += 2 + Math.floor(r() * 3)) { const h = 1 + Math.floor(r() * 3); for (let j = 1; j <= h; j++) s.px(x + (j === 3 ? 1 : 0), GY - j, j === h ? G[6] : G[5]); }
  if (flowers) for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(r() * (BW - 4)), y = GY + 1 + Math.floor(r() * 4); if (r() < 0.55) { s.px(x, y, P.poppy[3]); s.px(x, y + 1, P.poppy[1]); s.px(x + 1, y, P.poppy[2]); } else { s.px(x, y, '#f4f0e0'); s.px(x + 1, y, '#e8c040'); } }
  for (let i = 0; i < 4; i++) { const x = 3 + Math.floor(r() * (BW - 6)), y = GY + 7 + Math.floor(r() * 2); s.px(x, y, S[4]); s.px(x + 1, y, S[3]); s.px(x, y + 1, S[1]); }
}

// ---------- NATURE scenes ----------
function meadowScene(s, r, n) {
  sky(s, P.daySky, [0, 7, 14, 20, 25, 30, 34, 38], n);
  streak(s, 8, 9, 14, P.cloud[5], P.cloud[3]); streak(s, 66, 5, 22, P.cloud[5], P.cloud[3]); streak(s, 74, 13, 10, P.cloud[4], P.cloud[2]);
  range(s, ridge(n, 38, 16, 0.045, 3.1), P.dayFar[3], P.dayFar[1], { rim: P.dayFar[3] });
  hill(s, ridge(n, 44, 7, 0.03, 7.7, 3), P.dayMid);
  for (let x = 3; x < BW; x += 6 + Math.floor(r() * 5)) { const h = ridge(n, 44, 7, 0.03, 7.7, 3)(x); if (r() < 0.7) oliveFar(s, x, Math.round(h) - 2); }
  hill(s, ridge(n, 50, 5, 0.025, 13.3, 3), P.dayNear);
  for (const [x, sm] of [[6, 0], [18, 1], [84, 0], [97, 1]]) { const h = Math.round(ridge(n, 50, 5, 0.025, 13.3, 3)(x + 4)); olive(s, x, h - (sm ? 3 : 7), !!sm); }
  cypress(s, 31, Math.round(ridge(n, 50, 5, 0.025, 13.3, 3)(32)) - 9); cypress(s, 74, Math.round(ridge(n, 50, 5, 0.025, 13.3, 3)(75)) - 9);
  meadow(s, r);
}
function seaScene(s, r, n) {
  const hz = 37;
  sky(s, P.duskSky, [0, 5, 10, 15, 20, 25, 29, 33, 35], n, hz);
  // setting sun sitting on the horizon, a band of glow either side
  const sx = 24 + Math.floor(r() * 50);
  s.fill(ell(sx, hz, 6, 6), (x, y) => (y < hz ? P.sun[(x + y) % 5 === 0 ? 2 : 3] : null)); s.fill((x, y) => y === hz - 1 && Math.abs(x - sx) < 9 && !(Math.abs(x - sx) < 6), P.sun[1]);
  streak(s, sx - 16, 18, 12, P.duskSky[7], P.duskSky[6]); streak(s, sx + 6, 13, 18, P.duskSky[6], P.duskSky[5]); streak(s, 4, 26, 10, P.duskSky[8], P.duskSky[7]);
  // sea: darkening toward the viewer, the sun's road in broken strokes, wave glints
  s.fill((x, y) => y >= hz, (x, y) => P.sea[Math.max(0, 5 - Math.floor((y - hz) / 3))]);
  for (let y = hz; y < GY; y += 1 + ((y - hz) > 6 ? 1 : 0)) { const w = 3 + (y - hz) * 0.6; const c = P.glow[y - hz < 2 ? 4 : y - hz < 6 ? 3 : 2]; let x = Math.round(sx - w + r() * 2); while (x < sx + w) { const len = 2 + Math.floor(r() * 4); for (let i = 0; i < len && x + i <= sx + w; i++) s.px(x + i, y, c); x += len + 1 + Math.floor(r() * 3); } }
  for (let i = 0; i < 12; i++) { const x = Math.floor(r() * BW), y = hz + 3 + Math.floor(r() * 12); for (let j = 0; j < 3; j++) s.px(x + j, y, P.sea[5]); }
  // limestone cliff on one side: faceted face with strata, a ruined temple on the flat top
  const left = r() < 0.5; const cx = (x) => (left ? x : BW - 1 - x);
  const ct = (x) => (x < 26 ? 15 + Math.round(2 * n.fbm(x * 0.15, 4.4, 2)) : 15 + (x - 26) * 2.6);
  for (let x = 0; x < 40; x++) {
    const top = Math.round(ct(x));
    for (let y = top; y < GY; y++) {
      const k = y - top; const facetLit = x > 25 ? true : ((x + Math.floor((y - top) * 0.5)) % 11) < 5; let c = P.cliff[facetLit ? 4 : 3];
      if (x > 25) c = P.cliff[k < 1 ? 6 : 5]; if (k === 0) c = P.cliff[6]; else if (y > GY - 6) c = P.cliff[x > 25 ? 3 : 2];
      if ((y + Math.floor(x / 7)) % 7 === 0 && k > 1 && ((x * 13) % 5) < 3) c = P.cliff[x > 25 ? 4 : 2];
      s.px(cx(x), y, c);
    }
  }
  s.grid(['...aaaaa...', '.aabbbbbcc.', 'abbbbbbbbcc', 'a.b.b.b...c', 'a.b.b.b...c', 'a.b.b.b..b.', 'aaaaaaaaacc'], { a: P.marble[4], b: P.marble[3], c: P.marble[2] }, left ? 7 : BW - 18, Math.round(ct(12)) - 7);
  // headland in the foreground
  s.fill((x, y) => y >= GY - (Math.sin(x * 0.2) > 0.6 ? 1 : 0), (x, y) => { const d = y - GY; return d <= 0 ? P.headland[5] : d === 1 ? P.headland[4] : (x * 3 + y * 5) % 11 === 0 ? P.headland[3] : d > 6 ? P.headland[1] : P.headland[2]; });
  for (let x = 2; x < BW; x += 3 + Math.floor(r() * 4)) { s.px(x, GY - 1, P.headland[5]); if (r() < 0.4) s.px(x, GY - 2, P.headland[5]); }
}
function valleyScene(s, r, n) {
  sky(s, P.valSky, [0, 8, 15, 21, 26, 30, 34], n);
  cumulus(s, n, 22 + r() * 10, 9, 26, 11, P.cloud); cumulus(s, n, 80 + r() * 10, 6, 20, 8, P.cloud);
  range(s, ridge(n, 37, 18, 0.05, 5.3), P.valFar[2], P.valFar[0], { snow: [P.valFar[2], P.valFar[3]], snowLine: 27, rim: P.valFar[3] });
  // valley sides sloping down to the river
  const L = (x) => 40 + Math.max(0, x - 30) * 0.35 + 2 * n.fbm(x * 0.1, 2, 2), R = (x) => 40 + Math.max(0, 76 - x) * 0.35 + 2 * n.fbm(x * 0.1, 5, 2);
  for (let x = 0; x < BW; x++) { const t = Math.round(Math.min(L(x), R(x))); for (let y = t; y < GY; y++) s.px(x, y, y === t ? P.valMid[3] : y > t + 6 ? P.dayNear[2] : P.valMid[1]); }
  // the river: narrow far away, widening and bending toward us
  for (let y = 44; y < GY + 10; y++) { const t = (y - 44) / 19; const c = 53 + Math.sin(t * 3.2 + 0.5) * 9 * t; const w = 1 + t * 9; for (let x = Math.round(c - w); x <= Math.round(c + w); x++) { const e = Math.abs(x - c) > w - 1; const rip = (y % 3 === 0) && Math.abs(x - c + (y % 5) - 2) < w * 0.4; s.px(x, y, e ? P.river[1] : rip ? P.river[5] : y < 48 ? P.river[4] : P.river[3]); } }
  for (const [x, sm] of [[8, 0], [22, 1], [80, 0], [94, 1], [36, 1]]) { const h = Math.round(Math.min(L(x + 4), R(x + 4))); olive(s, x, h - (sm ? 3 : 7), !!sm); }
  cypress(s, 66, Math.round(R(67)) - 9); cypress(s, 70, Math.round(R(71)) - 8);
  meadow(s, r);
  for (let y = GY; y < BH; y++) { const t = (y - 44) / 19; const c = 53 + Math.sin(t * 3.2 + 0.5) * 9 * t; const w = 1 + t * 9; for (let x = Math.round(c - w); x <= Math.round(c + w); x++) s.px(x, y, Math.abs(x - c) > w - 1 ? P.river[1] : (y % 3 === 1 && Math.abs(x - c - (y % 4) + 1) < w * 0.45) ? P.river[4] : P.river[2]); }
}
function nightScene(s, r, n) {
  sky(s, P.nightSky, [0, 8, 16, 23, 29, 34, 38], n);
  // the milky way: a diagonal band of faint dust and dense small stars
  s.fill((x, y) => { const d = Math.abs(y - (4 + x * 0.32)); return d < 6 + 3 * n.fbm(x * 0.15, y * 0.15, 3) - 1.5; }, (x, y, o) => (n.fbm(x * 0.2, y * 0.25, 3) > 0.52 ? P.nightSky[Math.min(6, (P.nightSky.indexOf(o) + 2))] : P.nightSky[Math.min(6, (P.nightSky.indexOf(o) + 1))]));
  for (let i = 0; i < 70; i++) { const x = Math.floor(r() * BW), y = Math.floor(r() * 40); const band = Math.abs(y - (4 + x * 0.32)) < 6; if (!band && r() < 0.5) continue; s.px(x, y, P.star[band ? Math.floor(r() * 3) : Math.floor(r() * 2) + 1]); }
  for (let i = 0; i < 9; i++) { const x = 3 + Math.floor(r() * (BW - 6)), y = 2 + Math.floor(r() * 30); s.px(x, y, P.star[4]); if (i < 3) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.px(x + a, y + b, P.star[2]); }
  // crescent moon
  const mx = 14 + Math.floor(r() * 76), my = 9;
  s.fill((x, y) => ell(mx, my, 5, 5)(x, y) && !ell(mx + 2.4, my - 1.4, 4.6, 4.6)(x, y), (x, y) => P.moon[x < mx - 2 ? 3 : 2]);
  range(s, ridge(n, 40, 9, 0.04, 2.2), P.nightFar[2], P.nightFar[1], { rim: P.nightMid[3] });
  hill(s, ridge(n, 46, 5, 0.03, 8.8, 3), [P.nightMid[0], P.nightMid[1], P.nightMid[3], P.nightMid[2]]);
  const hx = 60 + Math.floor(r() * 30), hh = Math.round(ridge(n, 46, 5, 0.03, 8.8, 3)(hx + 3));
  s.grid(['..aa...', '.aaaa..', 'abbbbb.', 'bbcbbb.', 'bbcbbb.'], { a: P.nightMid[3], b: P.nightMid[1], c: P.lamp[2] }, hx, hh - 4);
  hill(s, ridge(n, 50, 4, 0.025, 15.1, 3), [P.nightNear[1], P.nightNear[2], P.nightNear[4], P.nightNear[3]]);
  for (const x of [10, 88]) olive(s, x, Math.round(ridge(n, 50, 4, 0.025, 15.1, 3)(x + 4)) - 7, false, ramp('#060a14', '#0a101e', '#101a2c', '#16223a', '#1e2e4a', '#2e4466', '#466088'), ramp('#04060c', '#080c16', '#0e1420', '#141c2c'));
  meadow(s, r, P.nightNear, ramp('#04060c', '#080c16', '#0c1220', '#121a2a', '#1a2434'), false);
  for (let i = 0; i < 6; i++) { const x = 4 + Math.floor(r() * (BW - 8)), y = GY - 6 + Math.floor(r() * 4); s.px(x, y, '#d8f07a'); } // fireflies
}

// ---------- SPACE scenes ----------
function starfield(s, r, n, dens = 1) {
  for (let i = 0; i < 110 * dens; i++) s.px(Math.floor(r() * BW), Math.floor(r() * BH), P.sstar[0]);
  for (let i = 0; i < 40 * dens; i++) s.px(Math.floor(r() * BW), Math.floor(r() * BH), P.sstar[r() < 0.5 ? 1 : 2]);
  for (let i = 0; i < 7 * dens; i++) { const x = 2 + Math.floor(r() * (BW - 4)), y = 2 + Math.floor(r() * (BH - 4)); const tint = ['#ffffff', '#cfe4ff', '#fff0c8', '#ffd0d0'][i % 4]; s.px(x, y, tint); if (i % 3 === 0) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.px(x + a, y + b, P.sstar[2]); }
}
// emission nebula: noise thresholded into clean tone bands inside a soft envelope, with dark dust lanes
function nebula(s, n, R, cx, cy, rx, ry, f = 0.07, warp = 0) {
  s.fill(() => true, (x, y, o) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; const env = 1 - Math.sqrt(dx * dx + dy * dy); if (env <= -0.2) return o;
    const v = n.fbm(x * f + warp, y * f * 1.2 + warp * 0.5, 3) + env * 0.55; const t = v < 0.64 ? -1 : v < 0.72 ? 1 : v < 0.8 ? 2 : v < 0.87 ? 3 : v < 0.93 ? 4 : v < 0.99 ? 5 : 6;
    if (t < 0) return o; const lane = n.fbm(x * 0.05 + 40, y * 0.09 + 40, 2); return R[Math.max(1, t - (lane > 0.6 ? 2 : lane > 0.55 ? 1 : 0))];
  });
}
function galaxy(s, r, cx, cy, size, tilt = 0.42, rot = 0.4) {
  const G = P.gal; const pts = [];
  for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 160; i++) { const t = i / 160; const a = rot + arm * Math.PI + t * 4.2; const rr = 2 + t * size; const jx = (r() - 0.5) * 3 * t, jy = (r() - 0.5) * 3 * t; pts.push([cx + Math.cos(a) * rr + jx, cy + Math.sin(a) * rr * tilt + jy, t]); }
  s.fill(ell(cx, cy, size * 1.05, size * 1.05 * tilt + 1), (x, y, o) => (P.void.includes(o) || P.sstar.includes(o) ? G[0] : o));
  s.fill(ell(cx, cy, size * 0.7, size * 0.7 * tilt + 1), (x, y, o) => (o === G[0] ? G[1] : o));
  for (const [x, y, t] of pts) { const c = t < 0.25 ? G[5] : t < 0.5 ? G[4] : t < 0.75 ? G[3] : G[2]; s.px(x, y, c); }
  s.fill(ell(cx, cy, size * 0.35, size * 0.35 * tilt + 0.5), (x, y, o) => (o === G[5] || o === G[4] ? o : G[4]));
  s.fill(ell(cx, cy, size * 0.2, size * 0.2 * tilt + 0.5), G[6]); s.fill(ell(cx, cy, 1.6, 1.1), G[7]);
}
function gasGiant(s, cx, cy, rad, ringTilt = 0.22) {
  const Gt = P.giant, Gb = P.giantB; const L = [-0.75, -0.35, 0.56];
  const ringPts = (front) => { for (let a = 0; a < Math.PI * 2; a += 0.004) { const isFront = Math.sin(a) > 0; if (isFront !== front) continue; for (const k of [1.45, 1.55, 1.62, 1.75]) { const x = cx + Math.cos(a) * rad * k, y = cy + Math.sin(a) * rad * k * ringTilt; if (k === 1.62) continue; s.px(x, y, P.ring[k > 1.7 ? 2 : front ? 4 : 3]); } } };
  ringPts(false);
  s.fill(ell(cx, cy, rad, rad), (x, y) => {
    const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / rad; const nzv = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)); const l = dx * L[0] + dy * L[1] + nzv * L[2];
    const lat = Math.asin(Math.max(-1, Math.min(1, dy))); const band = Math.floor((lat + 1.6) * 5.5 + Math.sin(dx * 3 + lat * 6) * 0.6) % 3; const R = band === 1 ? Gb : Gt;
    const t = l < -0.25 ? 1 : l < 0.05 ? 2 : l < 0.3 ? 3 : l < 0.55 ? 4 : l < 0.75 ? 5 : 6; return R[t];
  });
  ringPts(true);
}
function moonGround(s, r, n) {
  const R = P.rock; const top = (x) => GY - 1 + Math.round(((x - 53) / 53) ** 2 * 2.2 + 1.2 * n.fbm(x * 0.06, 11, 2) - 0.6);
  for (let x = 0; x < BW; x++) { const t = top(x); for (let y = t; y < BH; y++) { const d = y - t; const patch = n.fbm(x * 0.09, y * 0.22 + 5, 2); s.px(x, y, d === 0 ? R[6] : d === 1 ? R[5] : patch > 0.6 ? R[3] : patch < 0.38 ? R[5] : R[4]); } }
  s.clean((x, y) => y > GY, 2);
  // craters: raised rim lit on the far edge, a shadowed inner wall toward the light, a lit inner wall opposite
  const craters = [];
  for (let i = 0; i < 5; i++) { const y = GY + 2 + Math.floor(r() * 7); const rx = 2 + (y - GY) * 0.7 + r() * 2; craters.push([4 + Math.floor(r() * (BW - 8)), y, rx]); }
  for (const [x, y, rx] of craters.sort((a, b) => a[1] - b[1])) {
    const ry = Math.max(1, rx * 0.32);
    s.fill(ell(x, y - 0.4, rx + 1, ry + 1), (px, py) => (py < y ? R[6] : R[5]));
    s.fill(ell(x, y, rx, ry), R[3]);
    s.fill((px, py) => ell(x, y, rx, ry)(px, py) && !ell(x + rx * 0.35, y + ry * 0.3, rx, ry)(px, py), R[1]);
    s.fill((px, py) => ell(x, y, rx, ry)(px, py) && !ell(x - rx * 0.3, y - ry * 0.2, rx, ry)(px, py), R[5]);
  }
  for (let i = 0; i < 5; i++) { const x = Math.floor(r() * BW), y = GY + 1 + Math.floor(r() * 9); s.px(x, y, R[7]); s.px(x + 1, y, R[5]); s.px(x, y + 1, R[2]); s.px(x + 1, y + 1, R[2]); }
}

function nebulaScene(s, r, n, ground) {
  s.fill(() => true, P.void[1]);
  const which = Math.floor(r() * 3); const A = [P.nebM, P.nebC, P.nebO][which], Bn = [P.nebV, P.nebM, P.nebV][which];
  nebula(s, n, Bn, 72 + r() * 20, 16 + r() * 10, 34, 20, 0.05, 3);
  nebula(s, n, A, 24 + r() * 20, 26 + r() * 10, 34, 18, 0.06, 11);
  s.clean(undefined, 3);
  starfield(s, r, n);
  if (ground) moonGround(s, r, n);
}
function galaxyScene(s, r, n, ground) {
  s.fill(() => true, P.void[1]);
  nebula(s, n, P.nebV, 20, 44, 34, 18, 0.05, 21); s.clean(undefined, 3);
  starfield(s, r, n, 0.8);
  galaxy(s, r, 30 + r() * 46, 22 + r() * 8, 22 + r() * 6, 0.38 + r() * 0.12, r() * 6);
  for (let i = 0; i < 3; i++) { const x = 6 + Math.floor(r() * (BW - 12)), y = 4 + Math.floor(r() * 40); s.fill(ell(x, y, 2.2, 0.9), P.gal[2]); s.px(x, y, P.gal[4]); }
  if (ground) moonGround(s, r, n);
}
function planetScene(s, r, n, ground) {
  s.fill(() => true, P.void[1]);
  nebula(s, n, P.nebC, 26, 40, 40, 18, 0.05, 31); s.clean(undefined, 3);
  starfield(s, r, n, 0.8);
  if (ground) { // Earth rising over the moon
    const e = earth(7); e.draw(s, 66 + Math.floor(r() * 20), 6 + Math.floor(r() * 6));
    gasGiant(s, 14 + r() * 10, 12, 6, 0.3);
    moonGround(s, r, n);
  } else {
    const left = r() < 0.5; gasGiant(s, left ? 18 : 88, 44, 22, 0.24);
    const m = new Spr(BW, BH); m.fill(ell(left ? 86 : 22, 12, 4, 4), (x, y) => P.rock[x + y < (left ? 98 : 34) ? 6 : 4]); m.outline({ col: P.rock[1] }); m.draw(s);
  }
}
function deepFieldScene(s, r, n, ground) {
  s.fill(() => true, P.void[1]);
  nebula(s, n, P.nebV, 60, 26, 46, 22, 0.045, 41); s.clean(undefined, 3);
  starfield(s, r, n, 1.4);
  for (let i = 0; i < 6; i++) { const x = 6 + Math.floor(r() * (BW - 12)), y = 4 + Math.floor(r() * 44); const big = i < 2; s.fill(ell(x, y, big ? 3.5 : 2, big ? 1.4 : 0.9), P.gal[big ? 3 : 2]); s.fill(ell(x, y, big ? 1.6 : 1, 0.7), P.gal[big ? 5 : 4]); s.px(x, y, P.gal[6]); }
  if (ground) moonGround(s, r, n);
}

const NATURE = [meadowScene, seaScene, valleyScene, nightScene];
const SPACE = [nebulaScene, galaxyScene, planetScene, deepFieldScene];

export function backdrop(kind, seed = 1) {
  const s = new Spr(BW, BH); const r = rng(seed * 7 + 3); const n = nz(seed % 997 + 1);
  const pick = (arr) => arr[((seed >>> 3) ^ (seed >>> 11)) % arr.length];
  if (kind === 'matter' || kind === 'tool' || kind === 'move') { pick(NATURE)(s, r, n); s.ground = GY; }
  else if (kind === 'energy' || kind === 'law') { pick(SPACE)(s, r, n, true); s.ground = GY - 1; }
  else { pick(SPACE)(s, r, n, false); s.ground = null; }
  return s;
}

// contact shadow on the ground under a subject: two flat steps darker than whatever is there
export function shadow(s, cx, gy, w) {
  if (gy == null) return;
  const rx = Math.max(6, w / 2), ry = Math.max(1.5, w / 14);
  s.fill(ell(cx, gy + 0.5, rx, ry), (x, y, o) => (o ? dk(o, 1) : o));
  s.fill(ell(cx, gy + 0.5, rx * 0.68, ry * 0.7), (x, y, o) => (o ? dk(o, 1) : o));
}
