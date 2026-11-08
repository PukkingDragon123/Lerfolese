// Realistic anatomy for the HQ characters: a sculpted human head (skull loft + facial relief: orbits, brow ridge, nose
// bridge / tip / alae, cheekbones, lips, chin), eye assemblies (eyeball caps behind lid shells that can blink), ears,
// hair cards, five-finger hands and the skin painter that colours a face from the 3D position of every texel.
import * as THREE from 'three';
import { stack, sweep, ribbon, surface, shell, v3, sat, sstep, lerp, bump, g2, TAU, surfAt, smoothNormals } from './hq.js';
import { noise, C, put, mix, mul, line, segD, fr } from './painters.js';
export { hairClump } from './painters.js';

// realistic adult head, normalised (H = 1: chin y=0 .. crown y=1, face toward +z). rows: [y, w, zs, zf, zb, nf, nb]
export const HEAD = [
  [0.0, 0.0, 0.24, 0.24, 0.24, 2, 2], [0.03, 0.085, 0.27, 0.35, 0.16, 1.7, 2], [0.07, 0.15, 0.2, 0.365, 0.03, 1.8, 2], [0.12, 0.205, 0.13, 0.375, -0.07, 1.9, 2],
  [0.17, 0.245, 0.07, 0.385, -0.14, 2.0, 2], [0.22, 0.275, 0.03, 0.392, -0.2, 2.1, 2], [0.27, 0.295, 0.0, 0.395, -0.26, 2.2, 2], [0.32, 0.305, -0.02, 0.39, -0.32, 2.4, 2.1],
  [0.37, 0.312, -0.03, 0.385, -0.37, 2.5, 2.1], [0.42, 0.318, -0.04, 0.385, -0.41, 2.6, 2.2], [0.47, 0.322, -0.05, 0.39, -0.44, 2.6, 2.2], [0.52, 0.325, -0.05, 0.395, -0.46, 2.5, 2.2],
  [0.57, 0.326, -0.055, 0.405, -0.47, 2.4, 2.2], [0.63, 0.326, -0.06, 0.4, -0.47, 2.3, 2.2], [0.7, 0.318, -0.06, 0.375, -0.455, 2.2, 2.1], [0.78, 0.295, -0.06, 0.33, -0.42, 2.1, 2.1],
  [0.86, 0.25, -0.06, 0.255, -0.36, 2, 2], [0.93, 0.17, -0.06, 0.155, -0.26, 2, 2], [0.975, 0.09, -0.06, 0.07, -0.15, 2, 2], [1.0, 0.0, -0.05, -0.05, -0.05, 2, 2],
];
// sample-row warp that spends most rows on the face band
export const headVW = (t) => (t < 0.1 ? t * 1.2 : t < 0.85 ? 0.12 + (t - 0.1) * 0.8 : 0.72 + (t - 0.85) * 1.8667);
// feature strengths (normalised units)
export const FACE = { eye: [0.16, 0.497], socket: 0.07, brow: 0.024, nose: 0.12, hook: 0, tip: 0.016, alae: 0.042, noseW: 1, cheek: 0.018, muzzle: 0.02, lipU: 0.014, lipL: 0.017, chin: 0.024, age: 0, jawW: 1, mouthY: 0.199 };
export function headFn({ H = 0.3, keys = HEAD, w = 1, d = 1, jaw = 1, face = {} } = {}) {
  const F = { ...FACE, ...face };
  const rows = keys.map(([y, ww, zs, zf, zb, nf, nb]) => { const lo = sstep(0.42, 0.12, y), k = w * lerp(1, jaw, lo); return [y * H, ww * H * k, zs * H * d, zf * H * d, zb * H * d, nf, nb]; });
  const [ex, ey] = F.eye, my = F.mouthY;
  const fn = stack(rows, { warp: 0.6, disp: (o, th) => {
    const f = Math.cos(th); if (f < 0.05) return; const x = o.x / H, y = o.y / H, ax = Math.abs(x), fw = sstep(0.05, 0.55, f);
    let dz = 0;
    if (!fn.noSocket) dz -= F.socket * g2(ax, y, ex, ey + 0.012, 0.088, 0.064);
    dz += F.brow * (g2(ax, y, 0.13, 0.572, 0.15, 0.03) + 0.45 * g2(x, y, 0, 0.552, 0.05, 0.035));
    const t = sat((0.565 - y) / 0.22), nw = (0.034 + 0.028 * t) * F.noseW, under = sstep(0.282, 0.335, y);
    dz += F.nose * Math.pow(t, 1.15) * (1 + F.hook * bump(t, 0.55, 0.22)) * Math.exp(-Math.pow(ax / nw, 2.4)) * under;
    dz += F.tip * g2(x, y, 0, 0.343, 0.045 * F.noseW, 0.032) * under + F.alae * g2(ax, y, 0.066 * F.noseW, 0.316, 0.03, 0.027);
    dz += F.cheek * g2(ax, y, 0.23, 0.43, 0.085, 0.06) + F.muzzle * g2(x, y, 0, my + 0.01, 0.14, 0.08);
    dz += F.lipU * g2(x, y, 0, my + 0.023, 0.075, 0.022) - 0.006 * g2(x, y, 0, my + 0.05, 0.012, 0.018);
    dz -= 0.011 * g2(x, y, 0, my, 0.08, 0.009) + 0.008 * g2(ax, y, 0.087, my + 0.001, 0.016, 0.018);
    dz += F.lipL * g2(x, y, 0, my - 0.021, 0.066, 0.02) - 0.012 * g2(x, y, 0, my - 0.064, 0.07, 0.022) + F.chin * g2(x, y, 0, 0.066, 0.075, 0.045);
    if (F.age) { const dn = segD(ax, y, 0.072, 0.31, 0.104, 0.18); dz += F.age * (0.008 * Math.exp(-((dn - 0.02) ** 2) / 0.00025) - 0.006 * Math.exp(-(dn * dn) / 0.00008)) * sstep(0.06, 0.08, ax); dz -= F.age * 0.01 * g2(ax, y, 0.3, 0.6, 0.04, 0.07); }
    o.z += dz * H * fw;
  } });
  fn.H = H; fn.F = F; return fn;
}
// eyeball cap + lid shell for one eye. side +1 = +x eye. returns fns, centre and a lid-pose rebuild
export function eyeParts(hf, side, { re = 0.05, aw = 0.062, bu = 0.024, bl = 0.019, tilt = 0.004, lidT = 0.006, A = 0.108, Bu = 0.075, Bl = 0.062, hood = 0 } = {}) {
  const H = hf.H, [ex0, ey0] = hf.F.eye, ex = side * ex0 * H, ey = ey0 * H; re *= H;
  hf.noSocket = true; const base = surfAt(hf, ex, ey); hf.noSocket = false;
  const zc = base.z - 0.006 * H - re, c = v3(ex, ey, zc);
  // head surface z under the lid shell's outer boundary (sampled once)
  const N = 48, hz = []; for (let i = 0; i <= N; i++) { const a = (i / N) * TAU, p = outer(a); hz.push(surfAt(hf, ex + side * p[0] * H, ey + p[1] * H).z); }
  function outer(a) { const s = Math.sin(a); return [A * Math.cos(a) + 0.008, (s > 0 ? Bu : Bl) * s + 0.01]; }
  const sph = (x, y, R) => zc + Math.sqrt(Math.max(0, R * R - x * x - y * y));
  const lidFn = (pose = { up: 1, lo: 1 }) => (u, v, o) => {
    const a = u * TAU, cs = Math.cos(a), s = Math.sin(a), up = s > 0;
    const mx = aw * cs, my = (up ? bu * pose.up * (1 + 0.15 * cs) - (1 - pose.up) * bl * 0.6 * (1 - cs * cs) : bl * pose.lo * (1 - 0.08 * cs)) * s + tilt * cs;
    const ob = outer(a), t = v <= 0.12 ? 0 : Math.pow((v - 0.12) / 0.88, 1.25);
    const X = (mx + (ob[0] - mx) * t) * H, Y = (my + (ob[1] - my) * t) * H, z0 = hz[Math.round((a / TAU) * N) % (N + 1)];
    let z = v <= 0.12 ? lerp(sph(X, Y, re + 0.0008 * H), sph(X, Y, re + lidT * H), v / 0.12) : lerp(sph(X, Y, re + lidT * H), z0 + 0.0015 * H, sstep(0.15, 1, t));
    if (up) z -= (0.004 + hood * 0.004) * H * bump(t, 0.32, 0.09) * sstep(0.1, 0.5, s); if (up && hood) z += hood * 0.006 * H * bump(t, 0.5, 0.15);
    return o.set(ex + side * X, ey + Y, z);
  };
  // eyeball: spherical cap with a corneal bulge, iris toward +z
  const ballFn = (u, v, o) => { const al = u * TAU, ph = v * 1.25, cb = 0.1 * re * sat(1 - (ph / 0.42) ** 2); const r = re + cb; return o.set(ex + r * Math.sin(ph) * Math.cos(al) * side, ey + r * Math.sin(ph) * Math.sin(al), zc + r * Math.cos(ph)); };
  return { lidFn, ballFn, c, re, side };
}
// realistic ear (cupped helix, antihelix, concha, lobe) in ear space: x out of the head, y up, z forward
export function earFn(h = 0.135, { side = 1, out = 0.3 } = {}) {
  const R = [[0, 0.3], [0.25, 0.85], [0.42, 1.0], [0.55, 0.95], [0.68, 0.82], [0.78, 0.86], [0.86, 1.15], [0.94, 0.6], [1, 0.3]];
  const rad = (u) => { let i = 0; while (i < R.length - 2 && u > R[i + 1][0]) i++; const t = (u - R[i][0]) / (R[i + 1][0] - R[i][0]); return lerp(R[i][1], R[i + 1][1], t * t * (3 - 2 * t)); };
  return (u, v, o) => {
    const a = u * TAU, r = rad(u) * h * v, back = Math.max(0, -Math.cos(a)), lobe = bump(u, 0.82, 0.08);
    let x = out * r * (0.4 + back) - 0.28 * h * (1 - sstep(0.15, 0.55, v)) * (1 - lobe);
    x += (0.09 * bump(v, 0.62, 0.1) * sstep(0.12, 0.35, u) * (1 - sstep(0.62, 0.72, u)) - 0.05 * bump(v, 0.8, 0.07) + 0.08 * bump(v, 0.96, 0.05)) * h * (1 - lobe);
    const curl = 0.06 * h * bump(v, 1, 0.08) * (1 - lobe);
    return o.set(side * x, Math.sin(a) * r * 1.0 - Math.sin(a) * curl, Math.cos(a) * r - Math.cos(a) * curl + 0.02 * h);
  };
}
// solid hair clump: lens-section tube along a path, wide at the root, tapering to a fine tip (up = outward hint)
export const clumpFn = (pts, w, th, { up = v3(0, 1, 0), taper = 1 } = {}) => sweep(pts, (v) => { const k = Math.pow(1 - v, 0.8 * taper) * (1 + 0.25 * bump(v, 0.22, 0.2)); return [w * k + 0.0008, th * Math.pow(1 - v, 0.55) + 0.0006]; }, { up, sec: (a) => [Math.sin(a), Math.cos(a) * (0.6 + 0.4 * Math.abs(Math.cos(a)))], M: 24 });
// hair card along a path (flat ribbon, both faces drawn by the material): width tapers to the tip
export const cardFn = (pts, w, { up = v3(0, 1, 0), taper = 0.65, cup = 0 } = {}) => ribbon(pts, (v) => w * (1 - taper * v), { up, curl: cup });
// path for a clump rooted on a head (centre c, scalp radius R): spherical root, flows from (az0, el0) toward (az1, el1)
export function flowPath(c, R, az0, el0, az1, el1, { lift = 0.12, flare = 0.3, n = 7, wave = 0, seed = 0 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, az = lerp(az0, az1, t) + wave * Math.sin(t * 5 + seed) * 0.1, el = lerp(el0, el1, t); const r = R * (0.97 + lift * Math.sqrt(t) + flare * t * t * t); pts.push(c.clone().add(v3(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r))); }
  const up = pts[1].clone().sub(c).normalize(); return { pts, up };
}
// realistic five-finger hand: wrist at origin, fingers along -y, back of the hand toward +x*side, thumb toward +z
export function handParts(L = 0.2, side = 1, { curl = 0.35, spread = 0.05, thick = 1 } = {}) {
  const s = side, pl = L * 0.47, pw = L * 0.22, pt = L * 0.075 * thick;
  const palm = stack([[0, 0.62 * pt, 0, 0.6 * pw, -0.58 * pw, 2.4, 2.4], [-0.25 * pl, 0.92 * pt, 0.06 * pw, 0.9 * pw, -0.82 * pw, 2.6, 2.6], [-0.62 * pl, pt, 0.02 * pw, pw, -0.95 * pw, 2.8, 2.8], [-0.9 * pl, 0.95 * pt, 0, 0.98 * pw, -0.94 * pw, 3, 3], [-1.02 * pl, 0.78 * pt, 0, 0.9 * pw, -0.86 * pw, 2.8, 2.8], [-1.08 * pl, 0.3 * pt, 0, 0.55 * pw, -0.55 * pw, 2.2, 2.2], [-1.1 * pl, 0, 0, 0.2 * pw, -0.2 * pw, 2, 2]].map((r) => [...r, s * 0.12 * pt]));
  const fingers = [[0.68, 0.42, 0.045], [0.22, 0.47, 0.047], [-0.23, 0.44, 0.044], [-0.66, 0.34, 0.038]].map(([zf, lk, rk], i) => {
    const len = L * lk, rr = L * rk, z0 = zf * pw, c = curl * (0.85 + i * 0.12);
    const b = v3(s * 0.1 * pt, -0.95 * pl, z0), p1 = b.clone().add(v3(-s * c * 0.1 * len, -0.45 * len, z0 * spread * 2)), p2 = p1.clone().add(v3(-s * c * 0.34 * len, -0.31 * len, z0 * spread)), p3 = p2.clone().add(v3(-s * c * 0.48 * len, -0.22 * len, 0));
    return sweep([b, p1, p2, p3], (v, a) => { const k = (v > 0.85 ? Math.sqrt(sat(1 - ((v - 0.85) / 0.15) ** 2)) : 1) * (1.05 - 0.2 * v + 0.07 * bump(v, 0.42, 0.05) + 0.06 * bump(v, 0.7, 0.04)) * (Math.cos(a) * s > 0 ? 1 : 0.92); return [rr * k * 1.06, rr * k]; }, { up: v3(s, 0, 0), M: 24 });
  });
  const t0 = v3(-s * pt * 0.1, -0.16 * pl, 0.7 * pw), t1 = t0.clone().add(v3(-s * 0.01 * L, -0.08 * L, 0.07 * L)), t2 = t1.clone().add(v3(-s * 0.02 * L, -0.12 * L, 0.04 * L)), t3 = t2.clone().add(v3(-s * 0.05 * L * (0.5 + curl), -0.1 * L, -0.005 * L));
  const thumb = sweep([t0, t1, t2, t3], (v) => L * 0.058 * (v > 0.82 ? Math.sqrt(sat(1 - ((v - 0.82) / 0.18) ** 2)) : 1) * (1.2 - 0.3 * v + 0.15 * bump(v, 0.15, 0.15)), { up: v3(s, 0, 0.4), M: 24 });
  return { palm, fingers, thumb };
}
// skin painter for a head-space cell: base tone, regional warmth, cavity, lips, nostrils, brows, wrinkles, pores.
// S: { H, base, warm, lip, brow, hair(p)->0..1 (scalp), hairCol, wood, age, spots, rough, extra(o,x,y,z) }
export function skinPaint(S) {
  const n = noise(S.seed || 21), H = S.H, F = S.face || FACE, my = F.mouthY, b = C(S.base), wm = C(S.warm || '#c8604c'), lp = C(S.lip || '#a84a48'), cr = C(S.crease || '#5a2a22');
  const hc = S.hairCol ? C(S.hairCol) : null, br = S.brow ? C(S.brow) : null, wd = S.wood ? C(S.wood) : null;
  return (ctx) => ctx.each((u, v, o) => {
    const x = o.px / H, y = o.py / H, z = o.pz / H, ax = Math.abs(x), front = o.pz > 0.1 * H, px = 1.5 / ctx.w;
    put(o, b); o.ro = S.rough ?? 0.55; o.me = 0; o.h = 0.5;
    if (wd) { const g = fr(x * 9 + n.fbm(x * 4, y * 2, 3) * 1.8 + y * 0.6); mix(o, wd, (g < 0.08 ? 0.16 : 0.05) * (S.grain ?? 1)); }
    // regional colour: warm cheeks, nose, ears and chin; cooler eye hollows; yellower forehead
    mix(o, wm, (S.blush ?? 0.35) * (g2(ax, y, 0.21, 0.37, 0.075, 0.065) + 0.8 * g2(x, y, 0, 0.35, 0.05, 0.05) + 0.4 * g2(x, y, 0, 0.07, 0.06, 0.05) + (ax > 0.29 && !front ? 0.35 : 0)));
    mix(o, [0.62, 0.5, 0.55], 0.25 * g2(ax, y, 0.15, 0.44, 0.06, 0.03) * (S.tired ?? 1));
    mul(o, 1 + (n.fbm(x * 30, y * 30, 3) - 0.5) * 0.07 + (n(x * 300, y * 300) - 0.5) * 0.02);
    // cavity: creases go darker and redder (subsurface), ridges catch a little light
    mix(o, cr, sat(o.cav * 1.8) * 0.55); mul(o, 1 + sat(-o.cav) * 0.12);
    o.h = 0.5 + (n(x * 400, y * 400) - 0.5) * (S.pores ?? 0.08);
    // lips (front projection)
    if (front && Math.abs(y - my) < 0.05 && ax < 0.09) {
      const yU = my + 0.028 * Math.pow(sat(1 - (ax / 0.082) ** 2), 0.75) - 0.006 * bump(x, 0, 0.014) + 0.003 * bump(ax, 0.022, 0.012), yL = my - 0.03 * Math.pow(sat(1 - (ax / 0.074) ** 2), 0.6);
      const inL = sstep(-px, px, yU - y) * sstep(-px, px, y - yL); if (inL > 0) { mix(o, lp, inL * 0.75); o.ro = lerp(o.ro, 0.35, inL); o.h += Math.sin(x * 900) * 0.08 * inL; }
      const ml = line(y - my - 0.0015 * Math.cos(x * 30), 0.0022, px); mix(o, [0.22, 0.08, 0.07], ml * sstep(0.085, 0.07, ax)); o.h -= ml * 0.4;
    }
    // nostrils + alar crease
    if (front) { for (const s of [-1, 1]) { const d = g2(x, y, s * 0.028, 0.298, 0.016, 0.009); mix(o, [0.18, 0.06, 0.05], sstep(0.35, 0.8, d)); } const ac = Math.abs(Math.hypot((ax - 0.067) / 0.035, (y - 0.322) / 0.03) - 1); mix(o, cr, line(ac, 0.08, 0.05) * 0.3 * (y < 0.34 ? 1 : 0)); }
    // painted eyebrows (hair strokes)
    if (br && front) { for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, bx = (x * s - 0.1) / 0.11, by = y - (0.585 + 0.02 * Math.sin((bx + 0.3) * 1.6) - 0.012 * bx); if (bx > -0.2 && bx < 1.05 && Math.abs(by) < 0.013 - 0.004 * bx) { const st = fr((x * s * 140 + by * 60)); mix(o, br, st < 0.6 ? 0.85 : 0.4); o.h += 0.3; o.ro = 0.7; } } }
    // age: forehead lines, crow's feet, under-eye bags
    if (S.age && front) {
      const a = S.age; for (const ly of [0.66, 0.695, 0.73]) { const d = Math.abs(y - ly - 0.01 * Math.sin(x * 14)); if (ax < 0.2) { const c = line(d, 0.0018, px) * sstep(0.2, 0.08, ax) * a; mix(o, cr, c * 0.45); o.h -= c * 0.6; } }
      for (let k = 0; k < 3; k++) { const d = segD(ax, y, 0.235, 0.5, 0.29, 0.53 - k * 0.03); const c = line(d, 0.0015, px) * a; mix(o, cr, c * 0.4); o.h -= c * 0.5; }
      const bag = Math.abs(y - 0.452 + 1.3 * (ax - 0.16) ** 2); if (ax > 0.1 && ax < 0.22) { const c = line(bag, 0.002, px) * a; mix(o, cr, c * 0.35); o.h -= c * 0.4; }
    }
    if (S.spots && front) { const sp = n(x * 60 + 3, y * 60); if (sp > 0.8 && y > 0.5) mix(o, [0.55, 0.38, 0.28], (sp - 0.8) * 2.5 * S.spots); }
    // scalp / hairline
    if (S.hair) { const hm = S.hair(o.px / H, o.py / H, o.pz / H); if (hm > 0) { const st = n(x * 200 + Math.atan2(x, z) * 3, y * 30) - 0.5; mix(o, hc, hm * (0.85 + st * 0.3)); o.h = 0.5 + st * hm; o.ro = lerp(o.ro, 0.5, hm); } }
    if (S.extra) S.extra(o, x, y, z, px, u, v, ctx);
  }, { geo: true });
}
// eyeball painter: sclera with veins, limbal ring, fibrous iris, pupil, wet cornea (v: 0 apex -> 1 rim of the cap)
export function eyePaint({ iris = '#5a7a8a', iris2 = '#2c4250', pupil = 0.32, irisR = 0.38, slit = 0, glow = null, seed = 31 } = {}) {
  const n = noise(seed), ic = C(iris), i2 = C(iris2);
  return (ctx) => ctx.each((u, v, o) => {
    const r = v / irisR, a = u * TAU, px = 1.5 / ctx.h / irisR;
    put(o, [0.93, 0.9, 0.86]); mix(o, [0.85, 0.55, 0.5], sstep(0.55, 1, v) * 0.35); o.ro = 0.08; o.h = 0.5;
    if (v > 0.5 && n(u * 60, v * 8) > 0.82) mix(o, [0.7, 0.2, 0.2], 0.35);
    if (r < 1.1) {
      const fib = n(u * 90, r * 6) - 0.5, ring = sat(1 - Math.abs(r - 0.55) / 0.12);
      const c = [lerp(ic[0], i2[0], sstep(0.3, 1, r) + fib * 0.6), lerp(ic[1], i2[1], sstep(0.3, 1, r) + fib * 0.6), lerp(ic[2], i2[2], sstep(0.3, 1, r) + fib * 0.6)];
      const cov = sstep(1 + px, 1 - px, r); mix(o, c, cov); mix(o, [c[0] * 1.35, c[1] * 1.3, c[2] * 1.2], ring * 0.4 * cov); mix(o, [0.08, 0.08, 0.1], sstep(0.85, 1, r) * cov * 0.8);
      const pr = slit ? Math.hypot((Math.cos(a) * r) / slit, Math.sin(a) * r) : r; mix(o, [0.02, 0.02, 0.03], sstep(pupil + 0.03, pupil - 0.03, pr));
      if (glow) { const g = C(glow); ctx.glow?.(o, g); }
      o.h = 0.5 - cov * 0.2;
    }
  });
}
export { smoothNormals, surface, shell, sweep, stack, v3, sat, sstep, lerp, bump, g2, TAU };
