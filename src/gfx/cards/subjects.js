// Card subjects (basics + mutants): each returns a Spr with an anchor (ax, ay) at the ground contact point.
import { Spr, ell, poly, and, or, not, seg, box, orb, vol, glint, rng, dk, lt, rampOf, half, bevel, rod, layer, letters, ramp, tube } from './kit.js';
import { K } from './pal.js';
import { Glow, arc, mote, ARC, VIO } from './magic.js';

const tone = (c) => (rampOf(c) ? rampOf(c)[1] : -1);
const anchor = (s, ax, ay) => { s.ax = ax; s.ay = ay; return s; };

// ---------- faceted volumes (convex polytope tangent to an ellipsoid) ----------
const LV = (() => { const v = [-0.62, -0.72, 0.62]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
export function gem(s, cx, cy, a, b, c, normals, R, { lo = 1, hi = 5, thr = [-0.3, 0.05, 0.38, 0.68], ridge = true, clip = null, floor = null, light = LV } = {}) {
  const P = normals.map((n) => { const L = Math.hypot(...n); const [nx, ny, nz] = n.map((v) => v / L); const k = Math.sqrt(a * a * nx * nx + b * b * ny * ny + c * c * nz * nz); return { nx, ny, nz, d: k }; });
  const W = s.w, H = s.h; const fid = new Int16Array(W * H).fill(-1); const tn = new Int8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + 0.5 - cx, Y = y + 0.5 - cy; if (floor != null && Y > floor) continue; if (clip && !clip(x, y)) continue;
    let best = 1e9, bi = -1, side = false;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.nz < 0.05) { if (p.nx * X + p.ny * Y > p.d) { side = true; break; } continue; }
      const z = (p.d - p.nx * X - p.ny * Y) / p.nz; if (z < best) { best = z; bi = i; }
    }
    if (side || bi < 0 || best < 0) continue;
    const p = P[bi]; const l = p.nx * light[0] + p.ny * light[1] + p.nz * light[2];
    let t = lo; for (const th of thr) if (l >= th) t++; t = Math.min(hi, t);
    fid[y * W + x] = bi; tn[y * W + x] = t;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (fid[i] < 0) continue; let t = tn[i];
    if (ridge) { // catch-light on ridges between strongly different planes
      const r = x + 1 < W ? i + 1 : -1, d = y + 1 < H ? i + W : -1;
      for (const j of [r, d]) if (j >= 0 && fid[j] >= 0 && fid[j] !== fid[i] && tn[j] < t - 1 && t >= lo + 2) { t = Math.min(hi, t + 1); break; }
    }
    s.d[i] = R[t];
  }
  s.facetId = fid; return s;
}

// ---------- apple family ----------
export function appleShape(cx, cy, k = 1) {
  const body = or(ell(cx - 5 * k, cy - 1 * k, 14 * k, 15.5 * k), ell(cx + 5 * k, cy - 1 * k, 14 * k, 15.5 * k), ell(cx, cy + 4 * k, 15.5 * k, 13 * k));
  return and(body, not(ell(cx + 0.5 * k, cy - 17.6 * k, 4.6 * k, 3.6 * k)), not(ell(cx, cy + 18.2 * k, 3 * k, 1.7 * k)));
}
function leafTest(bx, by, tx, ty, wmax) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  return (x, y) => { const px = x + 0.5 - bx, py = y + 0.5 - by; const t = (px * ux + py * uy) / L; if (t < 0 || t > 1) return 0; const q = -px * uy + py * ux; const w = wmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75); if (Math.abs(q) > w) return 0; return q < -0.4 ? 1 : q > 0.6 ? 2 : 3; };
}
function drawLeaf(s, bx, by, tx, ty, wmax, L) {
  const lf = leafTest(bx, by, tx, ty, wmax);
  s.fill((x, y) => lf(x, y) === 1, L[4]); s.fill((x, y) => lf(x, y) === 2, L[3]); s.fill((x, y) => lf(x, y) === 3, L[5]);
  // underside shadow along the lower edge
  s.fill((x, y) => lf(x, y) === 2 && !lf(x, y + 1), L[2]);
}
export function apple({ R = K.red, L = K.leaf, S = K.stem, leaf = true, streaks = true, specks = true, seed = 7, extra = null } = {}) {
  const s = new Spr(46, 50); const cx = 22, cy = 30;
  const shape = appleShape(cx, cy);
  vol(s, shape, R, { lo: 1, hi: 5, round: 19, smooth: 3, thr: [-0.22, 0.3, 0.68, 0.88] });
  s.clean(undefined, 2);
  if (extra) extra(s, cx, cy);
  const r = rng(seed);
  if (streaks) { // short meridian streaks following the curvature, only on the local colour
    for (const [u, y0, len] of [[-0.3, -12, 4], [0.12, -13, 3], [0.4, -11, 4], [-0.15, 2, 4], [0.3, 5, 3], [0.55, -3, 4]]) {
      for (let y = cy + y0; y < cy + y0 + len; y++) {
        const k = 1 - ((y - cy) / 17.5) ** 2; if (k <= 0) continue; const x = Math.round(cx + u * 17 * Math.sqrt(k));
        const c = s.get(x, y); if (rampOf(c)?.[0] !== R) continue; const t = tone(c); if (t === 3) s.px(x, y, R[2]); else if (t === 4) s.px(x, y, R[3]);
      }
    }
  }
  if (specks) for (let i = 0, n = 0; i < 300 && n < 9; i++) {
    const x = Math.floor(cx - 14 + r() * 26), y = Math.floor(cy - 10 + r() * 22); const c = s.get(x, y); if (rampOf(c)?.[0] !== R) continue; const t = tone(c);
    if (t === 3 && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].every(([a, b]) => s.get(x + a, y + b) === c)) { s.px(x, y, R[4]); n++; }
  }
  s.over(ell(cx + 1.5, cy - 14.6, 4.5, 1.6), (x, y, o) => (rampOf(o)?.[0] === R ? R[2] : o)); s.px(cx + 1, cy - 15, R[1]); s.px(cx + 2, cy - 15, R[1]);
  s.grid(['.WW', 'WWw', 'Ww.', 'w..'], { w: R[5], W: R[6] }, cx - 12, cy - 11);
  s.px(cx - 13, cy - 5, R[5]); s.px(cx + 7, cy - 13, R[5]); s.px(cx + 8, cy - 13, R[5]);
  s.grid(['....bc', '...ab.', '...ab.', '..ab..', '..ab..', '..ab..', '..ab..'], { a: S[4], b: S[2], c: S[3] }, cx - 1, cy - 23);
  s.px(cx + 3, cy - 23, S[5]);
  if (leaf) drawLeaf(s, cx + 3, cy - 18.5, cx + 20, cy - 25.5, 4, L);
  s.outline();
  return anchor(s, cx, cy + 18);
}

// hand-pixelled 13x16 apple for small appearances (falling apples, orrery, overlays)
const MINI_APPLE = [
  '.......c.....',
  '......cbkkk..',
  '......bkgggk.',
  '..ooo.bkgGGk.',
  '.ohhlo.okkk..',
  'ohwhllobmsmo.',
  'ohwllmmmmmsso',
  'olllmmmmmmsso',
  'olllmmmmmmsdo',
  'olmmmmmmmssdo',
  'osmmmmmmmssdo',
  'osmmmmmmssddo',
  '.osmmmmsssdo.',
  '.ossmsssdddo.',
  '..odsssdddo..',
  '...ooo.ooo...',
];
export function miniApple(R = K.red, L = K.leaf, S = K.stem) {
  const s = new Spr(13, 16);
  s.grid(MINI_APPLE, { o: R[0], d: R[1], s: R[2], m: R[3], l: R[4], h: R[5], w: R[6], b: S[2], c: S[4], g: L[4], G: L[3], k: L[0] });
  return anchor(s, 6, 15);
}

// ---------- stone family ----------
// a boulder built from hand-placed facets (light from the top-left), with granite flecks, a chip, a crack and lichen
const ROCK_V = { A: [3, 30], B: [2, 22], C: [6, 14], D: [12, 8], E: [20, 5], F: [29, 4], G: [37, 7], H: [42, 13], I: [45, 21], J: [44, 29], Kk: [40, 33], L: [8, 33], P: [15, 13], Q: [27, 10], Rr: [36, 15], S: [22, 21], T: [33, 23], U: [11, 22], V: [26, 30] };
const ROCK_F = [['DEFQP', 5], ['BCDPU', 4], ['FGHRrQ', 4], ['PQRrTS', 3], ['UPSVLAB', 3], ['HIJTRr', 1], ['STJKkV', 2], ['LVKk', 1]];
const RK = 1.2; const rp = (x, y) => [Math.round((x - 2) * RK + 1), Math.round((y - 3) * RK + 1)]; // old layout -> scaled rock
export function stone({ R = K.stone, seed = 3, vein = true, crack = true, tuft = true } = {}) {
  const s = new Spr(60, 46);
  const V = (k) => [ROCK_V[k][0] * RK + 1, ROCK_V[k][1] * RK + 1];
  const keys = (str) => str.match(/[A-Z][a-z]?/g).map(V);
  for (const [f, t] of ROCK_F) s.fill(poly(keys(f)), R[t]);
  // lit ridges where light catches an edge, shadowed creases below them
  for (const [a, b] of [['P', 'Q'], ['P', 'S'], ['Q', 'Rr'], ['U', 'P']]) s.line(...V(a), ...V(b), (x, y) => (s.get(x, y) ? lt(s.get(x, y)) : null));
  for (const [a, b] of [['Rr', 'T'], ['T', 'S'], ['S', 'V'], ['T', 'J']]) s.line(...V(a), ...V(b), (x, y) => (s.get(x, y) ? dk(s.get(x, y)) : null));
  const r = rng(seed);
  // granite flecks: a dark grain with a lit lower lip, never touching
  const ok = (x, y) => { const c = s.get(x, y); return c && rampOf(c)?.[0] === R && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => s.get(x + a, y + b) === c); };
  for (let i = 0, n = 0; i < 600 && n < 13; i++) { const x = Math.floor(6 + r() * 48), y = Math.floor(9 + r() * 30); if (!ok(x, y)) continue; const t = tone(s.get(x, y)); if (t < 3) continue; s.px(x, y, R[t - 1]); if (s.get(x + 1, y + 1)) s.px(x + 1, y + 1, R[Math.min(6, t + 1)]); n++; }
  if (crack) { const pts = [[29, 15], [28, 18], [30, 20], [29, 23], [31, 26]].map(([x, y]) => rp(x, y)); for (let i = 0; i + 1 < pts.length; i++) s.line(...pts[i], ...pts[i + 1], R[1]); for (const [x, y] of pts.slice(1)) if (s.get(x - 1, y)) s.px(x - 1, y, lt(s.get(x - 1, y))); }
  // chipped corner on the top-right shoulder
  s.grid(['...ab', '..ab.', '.ab..', 'ab...'], { a: R[6], b: R[5] }, ...rp(34, 9));
  if (vein) { const M = K.moss; s.grid(['....aab..', '..aabbbc.', '.abbbcc.c', 'abbcc.c..', 'bc..c....'], { a: M[5], b: M[4], c: M[3] }, ...rp(11, 9)); s.grid(['.ab', 'abc', '.c.'], { a: K.lichen[5], b: K.lichen[4], c: K.lichen[3] }, ...rp(33, 17)); }
  s.outline();
  if (tuft) { // grass tufts at the foot
    const G = K.leaf; s.grid(['..a....', '.ab.a..', '.bb.ab.', 'bcbbcb.'], { a: G[5], b: G[4], c: G[3] }, 2, 38);
    s.grid(['...a.', '.a.ba', 'abcbb'], { a: G[5], b: G[4], c: G[3] }, 49, 39);
  }
  return anchor(s, 29, 42);
}


// ---------- water ----------
const dropShape = (cx, cy, r, top) => or(ell(cx, cy, r, r), (x, y) => { const py = y + 0.5; if (py < top || py > cy) return false; const t = (py - top) / (cy - top); return Math.abs(x + 0.5 - cx) <= r * Math.pow(t, 1.35); });
export function droplet({ W = K.water, r = 13, small = false } = {}) {
  const s = new Spr(small ? 16 : 44, small ? 22 : 52); const cx = small ? 8 : 22, cy = small ? 14 : 33, top = small ? 1 : 4; const rr = small ? 6.5 : r;
  if (!small) { // a little puddle the drop stands in
    s.fill(ell(cx, cy + rr + 1, 20, 4), W[3]); s.fill(ell(cx, cy + rr + 0.5, 17, 2.6), W[4]); s.fill(ell(cx - 3, cy + rr - 0.5, 9, 1.2), W[5]);
    s.outline();
  }
  const body = dropShape(cx, cy, rr, top);
  const t = new Spr(s.w, s.h);
  // transparent body: light refracts to the lower-right, the upper-left rim stays dark
  orb(t, body, cx, cy - rr * 0.2, rr, rr * 1.35, W, { lo: 2, hi: 5, thr: [-0.1, 0.35, 0.72], light: [0.5, 0.62, 0.6], rim: false });
  t.clean();
  if (!small) {
    t.over(and(ell(cx + 2, cy + 4, 9.5, 7), not(ell(cx + 0.5, cy + 2, 9, 7))), W[5]); // caustic crescent
    t.grid(['..WW', '.Ww.', 'Ww..', 'W...', 'w...', 'w...'], { w: W[5], W: W[6] }, cx - 9, cy - 7);
    t.grid(['W', 'w'], { w: W[5], W: W[6] }, cx - 3, top + 9); t.px(cx + 7, cy + 7, W[6]); t.px(cx + 8, cy + 6, W[6]);
  } else { t.px(cx - 3, cy - 2, W[6]); t.px(cx - 3, cy - 1, W[5]); t.px(cx - 2, cy - 3, W[6]); }
  t.outline(); t.draw(s, 0, 0);
  if (!small) { // satellite droplets
    for (const [x, y] of [[cx + 13, cy - 13], [cx - 18, cy - 4]]) s.grid(['..o..', '.ooo.', '.oco.', 'owcbo', 'ocbbo', 'obbao', '.ooo.'], { o: W[1], a: W[2], b: W[3], c: W[4], w: W[6] }, x, y);
  }
  return anchor(s, cx, small ? s.h - 1 : cy + rr + 4);
}

// ---------- spark ----------
const BOLT = [[25, 1], [12, 25], [20, 25], [13, 47], [33, 18], [24, 18], [32, 1]];
export function bolt({ E = K.elec, pts = BOLT, w = 40, h = 50, extras = true } = {}) {
  const s = new Spr(w, h);
  const core = new Spr(w, h); bevel(core, pts, E, { width: 2.2, face: 4, litT: 5, sideT: 5, sideD: 3, darkT: 3 });
  // white-hot spine down the middle
  const spine = [[28.5, 3], [19, 22], [21, 23], [16, 42], [27, 22], [25, 21]];
  for (let i = 0; i + 1 < spine.length; i++) core.line(...spine[i], ...spine[i + 1], (x, y) => (core.get(x, y) ? E[6] : null));
  core.outline();
  if (extras) { // glow halo: a soft second rim in the bolt's lightest tone
    const halo = new Spr(w, h); halo.fill((x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) + Math.abs(j) <= 3 && core.get(x + i, y + j)) return true; return false; }, E[5]);
    halo.fill((x, y) => !!core.get(x, y), null); halo.draw(s, 0, 0, (c, x, y) => (core.get(x, y) ? null : (x + y) % 2 === 0 && false ? null : '#fff6b2'));
    s.fill((x, y) => s.get(x, y) === '#fff6b2', (x, y) => { let n = 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (core.get(x + a, y + b)) n++; return n ? '#fff6b2' : '#ffe58a'; });
  }
  core.draw(s, 0, 0);
  if (extras) { // stray sparks
    const sp = (x, y, g) => s.grid(g, { a: E[6], b: E[5], c: E[3] }, x, y);
    sp(2, 12, ['..a', '.ab', 'ab.', '.ba', 'a..']); sp(33, 30, ['a..', '.ab', '..a', '.a.']); sp(4, 38, ['.b.', 'bab', '.b.']); sp(34, 6, ['.b.', 'bab', '.b.']);
  }
  s.float = true; return anchor(s, 22, 47);
}

// ---------- Earth (shared by gravity / antigravity / powers) ----------
export function earth(r = 13, { aura = null } = {}) {
  const d = Math.ceil(r * 2 + 4); const s = new Spr(d, d); const c = d / 2;
  orb(s, ell(c, c, r, r), c, c, r, r, K.ocean, { lo: 1, hi: 5, thr: [-0.25, 0.15, 0.5, 0.82] });
  // continents: designed blobs, tone-mapped so they keep the sphere's light
  const land = or(ell(c - r * 0.35, c - r * 0.3, r * 0.42, r * 0.3), ell(c - r * 0.15, c + r * 0.05, r * 0.22, r * 0.38), ell(c + r * 0.45, c + r * 0.35, r * 0.3, r * 0.22), ell(c + r * 0.3, c - r * 0.55, r * 0.22, r * 0.14), ell(c - r * 0.6, c + r * 0.55, r * 0.16, r * 0.12));
  s.over(land, (x, y, o) => K.land[Math.max(1, Math.min(5, tone(o)))]);
  s.over(ell(c, c - r * 0.95, r * 0.5, r * 0.18), (x, y, o) => K.snow[Math.max(2, Math.min(6, tone(o) + 1))]);
  // cloud streaks
  for (const [y, x0, x1] of [[-0.62, -0.1, 0.35], [0.22, -0.7, -0.35], [0.6, 0.05, 0.4], [-0.15, 0.4, 0.75]]) for (let x = Math.round(c + x0 * r); x <= Math.round(c + x1 * r); x++) { const yy = Math.round(c + y * r); const o = s.get(x, yy); if (o) s.px(x, yy, K.snow[Math.max(2, Math.min(6, tone(o) + 1))]); }
  s.clean();
  s.px(Math.round(c - r * 0.5), Math.round(c - r * 0.55), K.ocean[6]); s.px(Math.round(c - r * 0.5) + 1, Math.round(c - r * 0.55), K.ocean[5]);
  s.outline({ col: K.ocean[0] });
  // atmosphere: a bright rim on the lit side
  s.fill((x, y) => s.get(x, y) === K.ocean[0] && x + y < 2 * c - 2, aura || K.cyan[4]);
  return s;
}
const ARROW_DOWN = ['.aaaaa.', '.abbba.', '.abbba.', '.abbba.', 'aabbbaa', 'abbbbba', '.abbba.', '..aba..', '...a...'];
export function arrow(s, x, y, up = false, a = '#3a1c2c', b = '#fff4d0') { const g = up ? [...ARROW_DOWN].reverse() : ARROW_DOWN; s.grid(g, { a, b }, x, y); }
export function gravity({ anti = false } = {}) {
  const s = new Spr(60, 56); const e = earth(12, { aura: anti ? K.violet[5] : null }); const ey = 40;
  if (anti) { s.fill(ell(30, ey, 17, 15), K.violet[2]); s.fill(ell(30, ey, 15.5, 13.5), K.violet[3]); s.fill((x, y) => s.get(x, y) === K.violet[3] && (x * 3 + y * 5) % 11 === 0, K.violet[5]); }
  e.draw(s, 30 - Math.floor(e.w / 2), ey - Math.floor(e.h / 2));
  const a = miniApple(); const ay = anti ? 4 : 8; a.draw(s, 24, ay);
  // motion streaks trailing the apple
  const trail = anti ? [[27, 21, 24], [30, 21, 26], [33, 21, 23]] : [[27, ay - 3, ay + 1], [33, ay - 5, ay + 1], [30, ay - 4, ay - 1]];
  for (const [x, y0, y1] of trail) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) s.px(x, y, '#fff4d0');
  arrow(s, 9, 11, anti); arrow(s, 44, 11, anti);
  if (anti) for (const [x, y] of [[8, 4], [50, 6], [46, 0]]) { s.grid(['.ab', 'abc', 'bcc'], { a: K.stone[5], b: K.stone[4], c: K.stone[2] }, x, y); s.px(x + 1, y + 4, '#fff4d0'); s.px(x + 1, y + 5, '#fff4d0'); }
  s.float = true; return anchor(s, 30, 53);
}

// ---------- mass: a cast-iron 1 kg weight ----------
const WEIGHT_BODY = [[10, 17], [30, 17], [33, 20], [38, 38], [37, 40], [3, 40], [2, 38], [7, 20]];
export function weight({ dark = false } = {}) {
  const s = new Spr(42, 44); const I = dark ? K.violet : K.iron;
  if (!dark) {
    // handle: a thick arch, shaded like a torus
    layer(s, (t) => {
      t.fill(and(ell(20, 16, 8.5, 11), not(ell(20, 16, 4.5, 6.5)), (x, y) => y < 18), (x, y) => {
        const a = Math.atan2(y + 0.5 - 16, x + 0.5 - 20); const rr = Math.hypot((x + 0.5 - 20) / 8.5, (y + 0.5 - 16) / 11);
        const inner = rr < 0.66; const lit = Math.cos(a + 2.3);
        return I[inner ? (lit > 0.3 ? 3 : 2) : lit > 0.6 ? 6 : lit > 0.2 ? 5 : lit > -0.3 ? 4 : 2];
      });
    });
    // top face (seen slightly from above)
    layer(s, (t) => { bevel(t, [[10, 15], [30, 15], [33, 18], [7, 18]], I, { width: 1, face: 5, litT: 6, sideT: 5, sideD: 4, darkT: 3 }); });
    layer(s, (t) => { bevel(t, WEIGHT_BODY, I, { width: 2, face: 3, litT: 5, sideT: 4, sideD: 2, darkT: 1 }); });
    // casting texture: a few pits, rust bloom along the foot, embossed 1KG
    for (const [x, y] of [[9, 30], [29, 23], [26, 35], [12, 35], [32, 31], [17, 22]]) { s.px(x, y, I[2]); s.px(x + 1, y + 1, I[4]); }
    for (const [x, y, c] of [[6, 38, 3], [7, 37, 4], [8, 38, 4], [10, 38, 2], [31, 37, 3], [32, 38, 4], [33, 37, 2], [34, 38, 3], [20, 38, 3], [21, 38, 4]]) s.px(x, y, K.rust[c]);
    letters(s, '1', 11, 26, I[4], { hi: I[5], lo: I[1] }); letters(s, 'KG', 17, 26, I[4], { hi: I[5], lo: I[1] });
    s.grid(['WW', 'W.'], { W: I[6] }, 8, 21); s.px(16, 7, I[6]); s.px(15, 8, I[6]);
  } else {
    // dark matter: the same weight cut out of the night sky, rimmed in violet glow
    const m = new Spr(42, 44);
    m.fill(and(ell(20, 16, 8.5, 11), not(ell(20, 16, 4.5, 6.5)), (x, y) => y < 18), K.night[2]);
    m.fill(poly([[10, 15], [30, 15], [33, 18], [7, 18]]), K.night[3]); m.fill(poly(WEIGHT_BODY), K.night[1]);
    const r = rng(11); m.fill((x, y) => !!m.get(x, y) && r() < 0.05, (x, y) => (r() < 0.3 ? '#ffffff' : K.violet[4]));
    // swirling galaxy inside
    for (let a = 0; a < 9; a += 0.15) { const rr = 1 + a * 0.85; const x = Math.round(20 + Math.cos(a) * rr), y = Math.round(29 + Math.sin(a) * rr * 0.55); if (m.get(x, y)) m.px(x, y, a < 3 ? K.magenta[5] : a < 6 ? K.violet[5] : K.violet[4]); }
    m.px(20, 29, '#ffffff'); m.px(19, 29, K.magenta[6]);
    m.innerEdge(() => true, 0); m.fill((x, y) => !!m.get(x, y) && (!m.get(x - 1, y) || !m.get(x, y - 1)), K.violet[5]);
    m.fill((x, y) => !!m.get(x, y) && (!m.get(x + 1, y) || !m.get(x, y + 1)), K.violet[3]);
    m.outline({ col: K.violet[1] });
    // dashed "hypothetical" outer contour
    m.fill((x, y) => !m.get(x, y) && (m.get(x + 1, y) === K.violet[1] || m.get(x - 1, y) === K.violet[1] || m.get(x, y + 1) === K.violet[1] || m.get(x, y - 1) === K.violet[1]) && (x + y) % 3 === 0, K.violet[4]);
    m.draw(s, 0, 0);
    letters(s, '?', 17, 22, K.violet[6]);
  }
  return anchor(s, 20, 41);
}

// ---------- inertia: a brass ball rolling along rails ----------
export function railBall({ steel = false, len = 124, ballX = 66 } = {}) {
  const s = new Spr(len, 40); const B = steel ? K.steel : K.brass;
  // sleepers
  for (let x = 2; x < len - 2; x += 8) layer(s, (t) => { t.fill(poly([[x, 32], [x + 5, 32], [x + 4, 36], [x - 1, 36]]), (px, py) => K.oak[py === 32 ? 5 : py > 34 ? 2 : 3]); });
  // back rail, ball, front rail
  layer(s, (t) => { t.fill(box(0, 28, len, 2), (x, y) => K.steel[y === 28 ? 5 : 3]); });
  // motion lines behind the ball
  for (const [x0, y, n] of [[ballX - 26, 16, 10], [ballX - 30, 21, 14], [ballX - 24, 26, 8]]) for (let x = x0; x < x0 + n; x++) s.px(x, y, x < x0 + 3 ? K.cream[3] : K.cream[5]);
  layer(s, (t) => {
    orb(t, ell(ballX, 21, 10.5, 10.5), ballX, 21, 10.5, 10.5, B, { lo: 1, hi: 5, thr: [-0.3, 0.1, 0.5, 0.8] });
    t.clean();
    // reflection of the rail and sky, bright window glint
    for (let x = ballX - 7; x <= ballX + 6; x++) { const y = Math.round(25 + ((x - ballX) / 10) ** 2 * 3); if (t.get(x, y)) t.px(x, y, B[4]); }
    t.grid(['.WW', 'WWw', 'Ww.'], { W: B[6], w: B[5] }, ballX - 6, 13); t.px(ballX + 5, 26, B[4]);
  });
  layer(s, (t) => { t.fill(box(0, 31, len, 3), (x, y) => K.steel[y === 31 ? 6 : y === 32 ? 4 : 2]); for (let x = 6; x < len; x += 16) t.px(x, 32, K.steel[1]); });
  return anchor(s, ballX, 36);
}

// ---------- heat: flames in a bronze brazier ----------
export function flameShape(bx, by, w, h, sway = 0) {
  return (x, y) => { const t = (by - (y + 0.5)) / h; if (t < -0.12 || t > 1) return false; const cx = bx + sway * t * t; const hw = (w / 2) * Math.pow(Math.max(0, 1 - t), 0.85) * Math.min(1, Math.sqrt(Math.max(0, t + 0.12) / 0.3)); return Math.abs(x + 0.5 - cx) <= hw; };
}
export function flames(s, tongues, F = K.flame) {
  const t = new Spr(s.w, s.h);
  for (const [bx, by, w, h, sw] of tongues) t.fill(flameShape(bx, by, w, h, sw), F[3]);
  for (const [bx, by, w, h, sw] of tongues) t.fill(flameShape(bx + sw * 0.05, by, w * 0.66, h * 0.72, sw * 0.6), F[4]);
  for (const [bx, by, w, h, sw] of tongues) t.fill(flameShape(bx, by, w * 0.42, h * 0.45, sw * 0.3), F[5]);
  for (const [bx, by, w, h] of tongues) t.fill(flameShape(bx, by, w * 0.2, h * 0.2, 0), F[6]);
  t.outline({ col: F[1] }); t.draw(s, 0, 0); return s;
}
export function brazier({ F = K.flame } = {}) {
  const s = new Spr(48, 54); const cx = 24;
  // legs (tripod with lion-paw feet)
  layer(s, (t) => { rod(t, cx - 8, 36, cx - 13, 50, 1.2, K.bronze, [4, 3, 2]); rod(t, cx + 8, 36, cx + 13, 50, 1.2, K.bronze, [4, 3, 2]); rod(t, cx, 38, cx, 49, 1.2, K.bronze, [5, 3, 2]); for (const x of [cx - 15, cx + 12, cx - 1]) t.grid(['.ab.', 'abbc'], { a: K.bronze[5], b: K.bronze[3], c: K.bronze[2] }, x, 49); });
  flames(s, [[cx - 7, 27, 9, 17, -3], [cx + 7, 27, 9, 16, 3], [cx, 27, 13, 26, 1], [cx - 3, 27, 7, 13, -2], [cx + 4, 27, 6, 12, 2]], F);
  layer(s, (t) => {
    // bowl body with a frieze band
    const bowl = and(ell(cx, 27, 16, 12), (x, y) => y >= 27);
    t.fill(bowl, (x, y) => { const u = (x + 0.5 - cx) / 16; const tb = [5, 5, 4, 4, 3, 3, 3, 2, 2, 1]; const ti = tb[Math.max(0, Math.min(9, Math.floor(((u + 1) / 2) * 10)))]; return K.bronze[y > 34 ? Math.max(1, ti - 1) : ti]; });
    for (let x = cx - 14; x <= cx + 14; x++) { const c = t.get(x, 30); if (c) t.px(x, 30, dk(c, 2)); const c2 = t.get(x, 33); if (c2) t.px(x, 33, dk(c2, 2)); }
    for (let x = cx - 13; x <= cx + 12; x += 4) { const c = t.get(x, 31); if (c) { t.px(x, 31, lt(c)); t.px(x + 1, 32, lt(c)); t.px(x + 2, 31, lt(c)); } }
    // rim: an ellipse lip with glowing coals inside
    t.fill(and(ell(cx, 27, 17, 3.5), not(ell(cx, 26.6, 14.5, 2.4))), (x, y) => K.bronze[y < 26 ? 6 : x < cx ? 5 : 4]);
    t.fill(ell(cx, 26.6, 14.5, 2.4), (x, y) => (y < 26 ? K.flame[2] : (x * 3 + y) % 4 === 0 ? K.flame[5] : K.flame[4]));
    t.px(cx - 13, 26, K.bronze[6]); t.px(cx - 12, 25, K.bronze[6]);
  });
  // embers
  for (const [x, y, c] of [[cx - 12, 6, 5], [cx + 11, 3, 4], [cx + 6, 0, 5], [cx - 6, 2, 3], [cx + 14, 10, 5]]) s.px(x, y, F[c]);
  return anchor(s, cx, 50);
}

// ---------- lens: a brass magnifying glass ----------
export function magnifier({ prism = false } = {}) {
  const s = new Spr(48, 48); const cx = 18, cy = 18, R0 = 15, R1 = 11.5;
  layer(s, (t) => { // handle: brass ferrule + turned dark wood grip
    rod(t, 28, 28, 44, 44, 3.6, K.oak, [5, 4, 3, 3, 2, 2, 1]);
    for (const k of [0.35, 0.65]) { const x = 28 + 16 * k, y = 28 + 16 * k; for (let i = -3; i <= 3; i++) { const c = t.get(Math.round(x + i * 0.7), Math.round(y - i * 0.7)); if (c) t.px(Math.round(x + i * 0.7), Math.round(y - i * 0.7), dk(c)); } }
    t.fill(ell(44, 44, 3.5, 3.5), K.oak[2]); t.px(43, 43, K.oak[4]);
    rod(t, 26, 26, 31, 31, 4.2, K.brass, [6, 5, 4, 3, 3, 2, 1]);
  });
  layer(s, (t) => { // glass with reflections
    t.fill(ell(cx, cy, R1, R1), (x, y) => { const d = (x - cx) + (y - cy); return d > 9 ? K.ice[3] : d > 2 ? K.ice[4] : K.ice[5]; });
    t.fill((x, y) => { const d = (x - cx) - (y - cy); const e = (x - cx) + (y - cy); return ell(cx, cy, R1, R1)(x, y) && Math.abs(d) <= 1 && e < 0 && e > -14; }, '#ffffff');
    t.fill((x, y) => { const d = (x - cx) - (y - cy); const e = (x - cx) + (y - cy); return ell(cx, cy, R1, R1)(x, y) && Math.abs(d - 5) <= 0 && e < -2 && e > -10; }, K.ice[6]);
    t.fill((x, y) => { const d = (x - cx) - (y - cy); return ell(cx, cy, R1, R1)(x, y) && Math.abs(d + 3) < 1 && (x - cx) + (y - cy) > 8; }, K.ice[5]);
    if (prism) for (let i = 0; i < 6; i++) { const C = [K.paint_red, K.flame, K.gold, K.leaf, K.paint_blue, K.violet][i]; t.fill((x, y) => ell(cx, cy, R1, R1)(x, y) && Math.round((x - cx) * 0.7 + (y - cy) * 0.7) === 3 + i, C[4]); }
  }, false);
  layer(s, (t) => { // brass rim, shaded as a ring: lit outer top-left, inner lip shadowed
    t.fill(and(ell(cx, cy, R0, R0), not(ell(cx, cy, R1, R1))), (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const d = Math.hypot(dx, dy); const a = (dx * -0.66 + dy * -0.75) / d;
      if (d < R1 + 1) return K.brass[a > 0 ? 2 : 4];
      if (d > R0 - 1) return K.brass[a > 0.3 ? 6 : a > -0.3 ? 4 : 2];
      return K.brass[a > 0.5 ? 5 : a > -0.2 ? 4 : a > -0.7 ? 3 : 2];
    });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const x = Math.round(cx - 0.5 + Math.cos(a) * 13.2), y = Math.round(cy - 0.5 + Math.sin(a) * 13.2); const c = t.get(x, y); if (c) t.px(x, y, dk(c)); }
  });
  glint(s, 'star', cx - 7, cy - 8, '#ffffff', '#ffffff');
  return anchor(s, 26, 46);
}

// ---------- spring: a steel coil ----------
export function coil({ C = K.steel, turns = 5, rx = 12, top = 6, pitch = 7.5, w = 34, thick = 1.7, ry = 3.6 } = {}) {
  const s = new Spr(w, Math.ceil(top + turns * pitch + 10)); const cx = w / 2;
  const ring = (i, front) => { const pts = []; for (let k = 0; k <= 40; k++) { const a = front ? (k / 40) * Math.PI : Math.PI + (k / 40) * Math.PI; const f = front ? k / 80 : 0.5 + k / 80; pts.push([cx - Math.cos(a) * rx, top + (i + f) * pitch + Math.sin(a) * ry]); } return pts; };
  const back = new Spr(s.w, s.h); for (let i = 0; i < turns; i++) tube(back, ring(i, false), thick * 0.8, C, [2, 2, 1, 1]);
  back.outline({ col: C[0] }); back.draw(s);
  for (let i = 0; i < turns; i++) { const t = new Spr(s.w, s.h); tube(t, ring(i, true), thick, C, [6, 5, 4, 3, 3, 2]); t.outline({ col: C[0] }); t.draw(s); }
  // flat ground ends
  for (const yy of [top - 0.5, top + turns * pitch + 0.5]) layer(s, (t) => { tube(t, [[cx - rx, yy], [cx + rx, yy]], 1.4, C, [5, 4, 3, 2]); }, { col: C[0] });
  return anchor(s, Math.round(cx), Math.ceil(top + turns * pitch + 2));
}

// ---------- mutants ----------
export function goldenApple() {
  const s = new Spr(56, 52); const a = apple({ R: K.gold, specks: false, streaks: false }); a.draw(s, 5, 1);
  glint(s, 'big', 9, 12, K.gold[5], '#ffffff'); glint(s, 'star', 49, 22, K.gold[5], '#ffffff'); glint(s, 'small', 46, 42, K.gold[5], '#ffffff'); glint(s, 'small', 6, 34, K.gold[4], K.gold[6]);
  return anchor(s, 27, 49);
}
const WORM = ramp('#3a0e1e', '#6e2234', '#a8445a', '#d8707e', '#f4a6a8', '#ffd6d0', '#fff2ee');
export function rottenApple() {
  const s = new Spr(60, 54);
  const a = apple({ L: K.rot, streaks: false, specks: false, leaf: false, extra: (t, cx, cy) => {
    const R = K.red; const patch = or(ell(cx + 7, cy + 4, 8.5, 7.5), ell(cx - 9, cy + 9, 4.5, 3.5), ell(cx - 4, cy - 9, 3, 2.2));
    t.over(patch, (x, y, o) => K.rot[Math.max(1, Math.min(5, tone(o)))]);
    t.over((x, y) => patch(x, y) && (!patch(x + 1, y) || !patch(x - 1, y) || !patch(x, y + 1) || !patch(x, y - 1)), (x, y, o) => K.rot[Math.max(1, tone(o) - 1)]);
    for (const [x, y] of [[cx + 4, cy + 2], [cx + 9, cy + 5], [cx + 6, cy + 8], [cx + 11, cy + 1], [cx - 9, cy + 9], [cx + 3, cy + 6]]) t.px(x, y, K.bile[5]);
    for (const [x, y] of [[cx + 8, cy + 3], [cx + 5, cy + 5]]) t.px(x, y, K.bile[3]);
    void R;
  } });
  a.draw(s, 4, 4);
  const cx = 26, cy = 34;
  // wilted leaf drooping off the stem
  layer(s, (t) => drawLeaf(t, cx + 3, cy - 18.5, cx + 15, cy - 11, 3.4, K.rot));
  // worm hole + worm curling out
  layer(s, (t) => {
    t.fill(ell(cx + 4.5, cy - 3.5, 2.2, 1.8), K.red[0]);
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([cx + 5 + u * 9 + Math.sin(u * 5) * 1.5, cy - 4 - u * 9 + Math.cos(u * 4) * 1.2]); }
    pts.forEach(([x, y], i) => t.fill(ell(x, y, 1.6, 1.6), (px, py) => WORM[(px + py) % 3 === 0 && i % 3 === 0 ? 2 : py < y ? 4 : 3]));
    const [hx, hy] = pts[pts.length - 1]; t.px(hx, hy - 1, WORM[5]); t.px(hx + 1, hy, '#1a0c14');
  });
  // flies on looping paths
  for (const [fx, fy] of [[10, 10], [48, 18]]) {
    for (let a2 = 0; a2 < 6.2; a2 += 0.5) { const x = Math.round(fx + Math.cos(a2) * 5), y = Math.round(fy + 4 + Math.sin(a2) * 3); if (!s.get(x, y)) s.px(x, y, K.cream[3]); }
    s.grid(['w.w', '.b.', '.b.'], { w: '#d8ecff', b: '#1a1018' }, fx - 1, fy - 1);
  }
  // stink wisps
  for (const [x0, y0] of [[18, 6], [24, 2], [36, 8]]) for (let j = 0; j < 7; j++) s.px(x0 + Math.round(Math.sin(j * 0.9) * 1.5), y0 + j, K.bile[j < 2 ? 3 : 4]);
  return anchor(s, cx, 51);
}
export function superposition() {
  const s = new Spr(70, 56);
  const ghost = apple({ R: K.ghost, L: K.cyan, S: K.ghost, streaks: false, specks: false });
  ghost.draw(s, 22, 0, (c, x, y) => (y % 3 === 0 ? lt(c) : c));
  // glitch: shift every third scanline of the ghost
  for (let y = 0; y < s.h; y += 3) { const row = []; for (let x = 0; x < s.w; x++) row.push(s.get(x, y)); for (let x = s.w - 1; x > 0; x--) { s.d[y * s.w + x] = row[x - 1]; } s.d[y * s.w] = null; }
  apple().draw(s, 2, 6);
  // a probability orbit around both, with an electron mote
  const g = new Glow(s.w, s.h); const pts = arc(34, 32, 32, 9, -0.2, Math.PI * 1.05); g.path(pts, ARC, [0.5, 1.1], [5, 3]); g.draw(s);
  mote(s, 66, 28, ARC, true); mote(s, 4, 38, VIO);
  s.grid(['....aa', '...ab.', '..abb.', '.abbbb', 'aaaab.', '...ab.', '..ab..', '.ab...', '.a....'].map((r) => r), { a: K.elec[2], b: K.elec[5] }, 31, 10);
  s.px(35, 13, '#ffffff'); s.px(33, 16, '#ffffff');
  return anchor(s, 24, 55);
}
export function pumice() {
  const s = new Spr(54, 42); const cx = 27; const P = K.pumice;
  // pool and ripples
  layer(s, (t) => { t.fill(ell(cx, 33, 25, 6), K.water[3]); t.fill(ell(cx, 32.5, 22, 4.5), K.water[4]); for (const [rx, ry] of [[19, 3.6], [24.5, 5.6]]) t.fill(and(ell(cx, 32.5, rx, ry), not(ell(cx, 32.5, rx - 1.2, ry - 0.8)), (x, y) => y < 33), K.water[5]); });
  const rock = or(ell(cx, 22, 15, 11), ell(cx - 8, 25, 8.5, 7), ell(cx + 9, 24, 8.5, 7.5), ell(cx - 3, 14, 7, 4));
  layer(s, (t) => {
    vol(t, and(rock, (x, y) => y < 33), P, { lo: 1, hi: 5, round: 9, smooth: 2, thr: [-0.2, 0.25, 0.6, 0.85] });
    t.clean();
    // pores: dark pits with a lit lower-right lip, bigger toward the middle
    const r = rng(4);
    for (let gy = 9; gy < 31; gy += 3) for (let gx = cx - 20; gx < cx + 20; gx += 3) {
      const x = gx + Math.floor(r() * 2) + (gy % 2), y = gy + Math.floor(r() * 2); const c = t.get(x, y); if (!c || !t.get(x + 2, y + 2) || !t.get(x - 1, y - 1) || r() < 0.3) continue;
      const big = Math.abs(x - cx) < 10 && r() < 0.4; const tt = tone(c);
      t.px(x, y, P[Math.max(1, tt - 3)]); if (big) { t.px(x + 1, y, P[Math.max(1, tt - 3)]); t.px(x, y + 1, P[Math.max(1, tt - 2)]); }
      t.px(x + (big ? 2 : 1), y + (big ? 1 : 0), P[Math.min(6, tt + 1)]); t.px(x + (big ? 1 : 0), y + (big ? 2 : 1), P[Math.min(6, tt + 1)]);
    }
    // waterline: the submerged part takes on the water's colour
    t.over((x, y) => y >= 30, (x, y, o) => K.water[Math.max(2, Math.min(4, tone(o)))]);
    for (let x = 0; x < t.w; x++) if (t.get(x, 30)) t.px(x, 30, K.water[5]);
  });
  glint(s, 'small', cx - 7, 15, P[6], '#ffffff');
  return anchor(s, cx, 38);
}
const LODE = ramp('#0a0814', '#1a1630', '#2e2a4c', '#4a466a', '#6e6c8e', '#9ea4c0', '#dce4f0');
export function lodestone() {
  const s = new Spr(64, 46); const cx = 32, cy = 27;
  // field lines arching between the poles
  for (const [rx, ry] of [[24, 18], [18, 12]]) for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.025) { const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy - 2 + Math.sin(a) * ry); if (Math.floor(a * 60) % 4 < 2) s.px(x, y, a < Math.PI * 1.5 ? '#f08a8a' : '#8ab8f0'); }
  layer(s, (t) => {
    gem(t, cx, cy, 18, 12, 12, [[-0.4, -0.85, 0.4], [0.45, -0.8, 0.4], [-0.2, -0.3, 0.95], [0.5, -0.2, 0.85], [-0.7, 0.1, 0.7], [0.15, 0.35, 0.95], [0.75, 0.3, 0.6], [-0.4, 0.75, 0.55], [0.4, 0.8, 0.5], [-0.95, -0.2, 0.2], [0.95, -0.1, 0.25], [0, 1, 0.05]], LODE, { floor: 10, thr: [-0.3, 0.1, 0.45, 0.75] });
    t.clean();
    // metallic sheen streaks on the lit planes
    for (const [x, y, n] of [[cx - 8, cy - 7, 4], [cx + 2, cy - 9, 3], [cx - 12, cy - 1, 2]]) for (let i = 0; i < n; i++) t.px(x + i, y + Math.floor(i / 2), LODE[6]);
  });
  // iron filings bristling at the poles, nails clinging on
  for (const [x, y, dx, dy] of [[cx - 19, cy - 4, -1, -1], [cx - 20, cy, -1, 0], [cx - 19, cy + 4, -1, 1], [cx - 17, cy - 7, -1, -1], [cx + 19, cy - 4, 1, -1], [cx + 20, cy, 1, 0], [cx + 19, cy + 4, 1, 1], [cx + 17, cy - 7, 1, -1]]) { s.px(x, y, K.iron[2]); s.px(x + dx, y + dy, K.iron[4]); }
  layer(s, (t) => { rod(t, cx - 25, cy - 13, cx - 15, cy - 6, 0.9, K.steel, [5, 3, 2]); t.fill(seg(cx - 27, cy - 12, cx - 24, cy - 16, 1), K.steel[5]); });
  layer(s, (t) => { rod(t, cx + 12, cy - 22, cx + 9, cy - 10, 0.9, K.steel, [5, 3, 2]); t.fill(seg(cx + 10, cy - 23, cx + 14, cy - 22, 1), K.steel[5]); });
  return anchor(s, cx, cy + 11);
}
export function plasmaGlobe() {
  const s = new Spr(48, 56); const cx = 24, cy = 22, r = 17; const M = K.magenta;
  // pedestal
  layer(s, (t) => { bevel(t, [[cx - 9, 38], [cx + 9, 38], [cx + 13, 50], [cx - 13, 50]], K.iron, { width: 2, face: 3, litT: 5, sideT: 4, sideD: 2, darkT: 1 }); t.fill(box(cx - 11, 44, 22, 2), (x, y) => K.brass[y === 44 ? 5 : 3]); t.px(cx - 9, 44, K.brass[6]); });
  layer(s, (t) => {
    t.fill(ell(cx, cy, r, r), K.violet[1]);
    t.fill(ell(cx, cy, 8, 8), K.violet[2]); t.fill(ell(cx, cy, 5, 5), K.violet[3]);
    const g = new Glow(s.w, s.h); const rr = rng(6);
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3; const pts = [[cx, cy]]; let px = cx, py = cy;
      for (let i = 1; i <= 6; i++) { const d = (i / 6) * (r - 1.5); px = cx + Math.cos(a + (rr() - 0.5) * 0.5) * d; py = cy + Math.sin(a + (rr() - 0.5) * 0.5) * d; pts.push([px, py]); }
      g.path(pts, M, [0.5, 1.1], [5, 3]); g.orb(px, py, 1.6, M, [0.6, 1], [6, 5]);
    }
    g.orb(cx, cy, 3.4, M, [0.5, 0.8, 1], [6, 5, 4]); g.draw(t);
    // glass: lit rim, window highlight, darker far rim
    t.fill((x, y) => ell(cx, cy, r, r)(x, y) && !ell(cx, cy, r - 1.2, r - 1.2)(x, y), (x, y) => (x + y < 2 * cy - 6 ? K.violet[4] : x + y > 2 * cy + 10 ? K.violet[0] : null));
    t.grid(['..WWW', '.W...', 'W....', 'W....', 'w....'], { W: '#ffffff', w: K.violet[5] }, cx - 12, cy - 12);
    t.px(cx + 9, cy + 10, K.violet[5]); t.px(cx + 10, cy + 9, K.violet[5]);
  });
  layer(s, (t) => { t.fill(box(cx - 6, 37, 12, 3), (x, y) => K.brass[y === 37 ? 5 : x < cx ? 4 : 2]); });
  return anchor(s, cx, 50);
}
function shard(s, bx, by, ang, len, w, R, tip = 6) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const P = (a, b) => [bx + dx * a + nx * b, by + dy * a + ny * b];
  const pts = [P(0, -w), P(len - tip, -w), P(len, 0), P(len - tip, w), P(0, w)];
  const inside = poly(pts); const litLeft = nx * -0.62 + ny * -0.72 < 0; // which side faces the light
  s.fill(inside, (x, y) => {
    const px = x + 0.5 - bx, py = y + 0.5 - by; const along = px * dx + py * dy; const across = (px * nx + py * ny) / w;
    const side = across < -0.3 ? -1 : across > 0.3 ? 1 : 0; const lit = litLeft ? -side : side;
    if (along > len - tip) return R[across < 0 === litLeft ? 6 : 3];
    return R[lit > 0 ? 5 : lit < 0 ? 2 : 4];
  });
  return pts;
}
export function iceCrystal() {
  const s = new Spr(54, 50); const cx = 27, by = 42; const I = K.ice;
  layer(s, (t) => {
    shard(t, cx - 9, by, -Math.PI / 2 - 0.55, 22, 4, I, 5);
    shard(t, cx + 10, by, -Math.PI / 2 + 0.5, 24, 4.5, I, 6);
    shard(t, cx + 3, by - 1, -Math.PI / 2 + 0.12, 36, 5.5, I, 8);
    shard(t, cx - 4, by, -Math.PI / 2 - 0.18, 30, 5, I, 7);
    shard(t, cx - 15, by + 1, -Math.PI / 2 - 1.05, 14, 3, I, 4);
    // internal fractures
    t.line(cx + 1, by - 18, cx + 4, by - 24, (x, y) => (t.get(x, y) ? I[6] : null)); t.line(cx - 6, by - 10, cx - 4, by - 14, (x, y) => (t.get(x, y) ? I[6] : null));
  }, { soft: true });
  layer(s, (t) => { orb(t, and(ell(cx, by + 2, 21, 6), (x, y) => y <= by + 4), cx, by + 2, 21, 6, K.snow, { lo: 2, hi: 5, thr: [-0.2, 0.3, 0.7] }); for (const [x, y] of [[cx - 12, by - 1], [cx + 8, by], [cx - 2, by - 2]]) t.px(x, y, '#ffffff'); });
  glint(s, 'big', cx + 7, 5, I[5], '#ffffff'); glint(s, 'star', cx - 17, 14, I[5], '#ffffff'); glint(s, 'small', cx + 20, 20, I[5], '#ffffff');
  return anchor(s, cx, by + 4);
}
const RAINBOW = () => [K.paint_red, K.flame, K.gold, K.leaf, K.cyan, K.paint_blue, K.violet];
export function prismSubject() {
  const s = new Spr(96, 48); const ax = 44, top = 4, base = 42;
  const L = [ax - 16, base], Rt = [ax + 16, base], T = [ax, top];
  // white beam in, rainbow fan out
  const g = new Glow(s.w, s.h); g.path([[0, 31], [ax - 8, 25]], ramp('#3a3a5a', '#6a6a8a', '#9a9ab8', '#c8c8e0', '#e8e8f4', '#f8f8ff', '#ffffff'), [0.6, 1.3, 2], [6, 5, 4]); g.draw(s);
  const RB = RAINBOW(); const ex = ax + 7, ey = 24;
  const XE = 96;
  for (let i = 0; i < 6; i++) { const y0 = 2 + i * 7, y1 = y0 + 7; s.fill(poly([[ex, ey + (i - 3) * 0.6], [XE, y0], [XE, y1], [ex, ey + (i - 2) * 0.6]]), (x) => RB[i][x > 80 ? 3 : 4]); }
  for (let i = 0; i < 6; i++) { const y0 = 2 + i * 7; for (let x = ex + 6; x < XE; x += 1) { const yy = Math.round(ey + (i - 3) * 0.6 + ((x - ex) / (XE - ex)) * (y0 - ey - (i - 3) * 0.6)); if (s.get(x, yy)) s.px(x, yy, RB[i][5]); } }
  layer(s, (t) => {
    bevel(t, [T, Rt, L], K.ice, { width: 2.2, face: 4, litT: 6, sideT: 5, sideD: 3, darkT: 2 });
    t.fill(poly([[ax - 2, 16], [ax + 7, 34], [ax - 10, 34]]), (x, y, o) => (o ? lt(o) : o));
    t.line(ax - 8, 25, ax + 7, 24, (x, y) => (t.get(x, y) ? '#ffffff' : null));
    t.px(ax - 1, top + 3, '#ffffff'); t.px(ax - 2, top + 5, '#ffffff');
  });
  glint(s, 'star', ax - 4, 10, K.ice[5], '#ffffff');
  return anchor(s, ax, base + 1);
}
export function slinky() {
  const s = new Spr(70, 48); const RB = RAINBOW(); const x0 = 11, x1 = 59, gy = 44, apex = 7;
  const ring = (t, x, y, ax, ay, R, front) => {
    // ring seen at an angle: ellipse band, major axis along (ax, ay)
    const L = Math.hypot(ax, ay); const ux = ax / L, uy = ay / L; const a = 8, b = 2.6;
    t.fill((px, py) => { const dx = px + 0.5 - x, dy = py + 0.5 - y; const p = dx * ux + dy * uy, q = -dx * uy + dy * ux; const d = (p / a) ** 2 + (q / b) ** 2; const di = (p / (a - 1.8)) ** 2 + (q / (b - 1.3)) ** 2; return d <= 1 && di > 1; }, (px, py) => { const dx = px + 0.5 - x, dy = py + 0.5 - y; const l = -dx * 0.62 - dy * 0.72; return R[l > 3 ? 5 : l > 0 ? 4 : l > -3 ? 3 : 2]; });
    void front;
  };
  let k = 0;
  // stacked coils on the two feet
  for (const fx of [x0, x1]) for (let i = 0; i < 4; i++) layer(s, (t) => ring(t, fx, gy - i * 2.2, 1, 0, RB[(k++) % 7]), { soft: true });
  // the arch
  const N = 15;
  for (let i = 0; i <= N; i++) {
    const t0 = i / N; const a = Math.PI * t0; const x = (x0 + x1) / 2 - Math.cos(a) * ((x1 - x0) / 2), y = gy - 8 - Math.sin(a) * (gy - 8 - apex);
    const tx = Math.sin(a) * ((x1 - x0) / 2), ty = -Math.cos(a) * (gy - 8 - apex); // tangent
    layer(s, (t) => ring(t, x, y, -ty, tx, RB[(k++) % 7]), { soft: true });
  }
  return anchor(s, 35, gy + 3);
}
export function lavaStone() {
  const LAVA = ramp('#0c060c', '#1e1018', '#33202a', '#4c3034', '#6a4440', '#8c5c4c', '#b0806a');
  const s = stone({ R: LAVA, vein: false, tuft: false, crack: false });
  const g = new Glow(s.w, s.h);
  for (const pts of [[[12, 14], [18, 18], [17, 24], [24, 28]], [[30, 10], [27, 17], [33, 21], [38, 28]], [[18, 18], [26, 17]], [[33, 21], [40, 18]]]) g.path(pts.map(([x, y]) => rp(x, y)), K.flame, [0.5, 1.1], [5, 3]);
  g.draw(s, 0, 0); s.fill((x, y) => !s.get(x, y + 1) && !!s.get(x, y) && false, null);
  return s;
}

export const SUBJECTS = {
  apple: () => apple(),
  stone: () => stone(),
  water: () => droplet(),
  spark: () => bolt(),
  gravity: () => gravity(),
  mass: () => weight(),
  inertia: () => railBall(),
  heat: () => brazier(),
  lens: () => magnifier(),
  spring: () => coil(),
  golden_apple: goldenApple,
  rotten_apple: rottenApple,
  superposition,
  pumice,
  lodestone,
  antigravity: () => gravity({ anti: true }),
  dark_matter: () => weight({ dark: true }),
  plasma: plasmaGlobe,
  ice: iceCrystal,
  prism: prismSubject,
  slinky,
  lava: lavaStone,
  mini: () => miniApple(),
};
