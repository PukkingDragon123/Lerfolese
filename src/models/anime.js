// Shared anime anatomy for the HQ characters: sculpted head (ring stack + nose / brow / cheek / jaw shaping), ears,
// hair locks, five-finger hands, limb tubes and the per-texel head painter (skin, scalp, painted face + expressions).
import * as THREE from 'three';
import { stack, sweep, shell, surface, v3, sat, sstep, bump, TAU, lerp } from './hq.js';
import { pick, faceCol, EXPR, noise } from './painters.js';

// normalized anime head (H = 1, chin y=0 .. crown y=1, face toward +z). rows: [y, w, zs, zf, zb, nf, nb]
export const HEAD = [
  [0.0, 0.0, 0.17, 0.17, 0.17, 2, 2], [0.022, 0.07, 0.24, 0.335, 0.13, 1.45, 2], [0.075, 0.185, 0.17, 0.372, -0.03, 1.6, 2], [0.15, 0.275, 0.09, 0.398, -0.15, 1.9, 2],
  [0.245, 0.33, 0.03, 0.418, -0.26, 2.3, 2], [0.34, 0.356, 0.0, 0.428, -0.34, 2.65, 2.1], [0.43, 0.37, -0.03, 0.43, -0.4, 2.9, 2.2], [0.52, 0.382, -0.045, 0.425, -0.44, 2.7, 2.2],
  [0.62, 0.388, -0.055, 0.4, -0.46, 2.4, 2.2], [0.72, 0.375, -0.06, 0.35, -0.45, 2.2, 2.1], [0.82, 0.33, -0.065, 0.275, -0.4, 2.1, 2.1], [0.91, 0.24, -0.065, 0.18, -0.3, 2, 2],
  [0.97, 0.135, -0.06, 0.09, -0.18, 2, 2], [1.0, 0.0, -0.05, -0.05, -0.05, 2, 2],
];
// build an anime head fn. o: { H, keys, jaw (width mult for lower face), crown (cranium mult), nose: [len, tipY, protrude, width], chin }
export function headFn({ H = 0.3, keys = HEAD, jaw = 1, crown = 1, depth = 1, nose = [0.13, 0.285, 0.03, 0.075], brow = 0.012, cheek = 0.0 } = {}) {
  const rows = keys.map(([y, w, zs, zf, zb, nf, nb]) => { const lo = sstep(0.5, 0.15, y), k = lerp(crown, jaw, lo); return [y * H, w * H * k, zs * H * depth, zf * H, zb * H * depth * lerp(crown, 1, lo), nf, nb]; });
  const [nl, ny, np, nw] = nose;
  return stack(rows, { warp: 0.55, disp: (o, th, v) => {
    const y = o.y / H, f = Math.cos(th);
    if (f > 0.2) {
      // nose ridge: grows from the bridge to the tip, tucks under the tip
      const t = sat((ny + nl - y) / nl), under = sstep(ny - 0.03, ny + 0.004, y), width = nw * (0.55 + 0.45 * t);
      o.z += np * H * Math.pow(t, 1.6) * under * Math.exp(-(th * th) / (width * width));
      // brow ridge and soft cheek fullness
      o.z += brow * H * bump(y, 0.53, 0.05) * sstep(0.2, 0.9, f); o.x *= 1 + cheek * bump(y, 0.3, 0.08) * sstep(0.3, 0.8, Math.abs(Math.sin(th)));
    }
  } });
}
// face spec (head-space units) for faceCol, scaled from normalized proportions
export function faceSpec(H, o = {}) {
  const s = (a) => a.map((x) => x * H);
  return { zMin: 0.1 * H, eye: s(o.eye || [0.168, 0.395, 0.1, 0.112]), brow: s(o.brow || [0.17, 0.545, 0.1, 0.05]), browTh: o.browTh || 0.5, mouth: s(o.mouth || [0, 0.15, 0.068, 0.04]),
    nose: o.nose === false ? null : s(o.nose || [0.0, 0.285, 0.035, 0.03]), cheek: s(o.cheek || [0.2, 0.27, 0.07, 0.035]), ...o.extra };
}
// ear: cupped flap attached along its front edge; side = +1 left (+x), -1 right
export function earFn(h = 0.085, w = 0.05, { side = 1, point = 0, cup = 0.35, lobe = 0.15 } = {}) {
  return (u, v, o) => {
    const a = Math.PI * u, rim = (1 - lobe * sstep(0.6, 1, u)) * (1 + point * sstep(0.3, 0, u) * 2.2), y = Math.cos(a) * h * (0.55 + 0.45 * v) + point * sstep(0.35, 0, u) * v * h * 1.4;
    const z = -Math.sin(a) * w * v * rim - point * sstep(0.3, 0, u) * v * w * 0.8;
    const x = side * (cup * w * v * v + 0.15 * w * Math.sin(v * Math.PI) * Math.sin(a));
    return o.set(x, y, z);
  };
}
// hair lock: lens-section tube along pts, wide at the root, sharp tip. up = outward hint for the flat side
export function lockFn(pts, w = 0.04, th = 0.015, { up = v3(0, 1, 0), taper = 1, belly = 0.25 } = {}) {
  return sweep(pts, (v, a) => { const k = Math.pow(1 - v, 0.85 * taper) * (1 + belly * bump(v, 0.25, 0.22)); return [w * k + 0.0015, th * Math.pow(1 - v, 0.6) + 0.0012]; },
    { up, sec: (a) => [Math.sin(a), Math.cos(a) * (0.55 + 0.45 * Math.abs(Math.cos(a)))], M: 24 });
}
// path for a lock rooted on a head (center c): spherical root, rises off the scalp, flows along dir with curl
export function lockPath(c, R, az, el, dir, len, { lift = 0.25, curl = 0.3, droop = 0, n = 6 } = {}) {
  const root = v3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const p0 = c.clone().addScaledVector(root, R * 0.86);
  const pts = [p0]; const d = dir.clone().normalize(); const out = root.clone();
  for (let i = 1; i <= n; i++) { const t = i / n; const p = p0.clone().addScaledVector(out, R * lift * Math.sin(Math.min(1, t * 2) * Math.PI * 0.5)).addScaledVector(d, len * t).add(v3(0, -droop * len * t * t, 0)).addScaledVector(out, curl * len * t * t); pts.push(p); }
  return { pts, up: out };
}
// limb tube through joint points with radius profile r(v, a) -> [rx, ry]; front = section front hint
export const limbFn = (pts, r, front = v3(0, 0, 1)) => sweep(pts, r, { up: front, M: 48 });
// rounded-end radius helper: radius profile that closes smoothly at v=0 and/or v=1
export const capR = (v, r, e0 = 0.06, e1 = 0.06) => r * (v < e0 ? Math.sqrt(sat(1 - ((e0 - v) / e0) ** 2)) : v > 1 - e1 ? Math.sqrt(sat(1 - ((v - 1 + e1) / e1) ** 2)) : 1);
// five-finger hand (wrist at origin, fingers along -y, back of hand toward +x*side, thumb toward +z)
export function handParts(L = 0.19, side = 1, { curl = 0.35, spread = 0.06, thick = 1, mitt = false } = {}) {
  const pl = L * 0.52, pw = L * 0.23, pt = L * 0.085 * thick, s = side;
  const palm = stack([[0, 0.55 * pt, 0, 0.62 * pw, -0.6 * pw, 2.6, 2.6], [-0.28 * pl, 0.95 * pt, 0, 0.88 * pw, -0.84 * pw, 2.8, 2.8], [-0.7 * pl, pt, 0, pw, -0.95 * pw, 3, 3], [-0.97 * pl, 0.9 * pt, 0, 0.97 * pw, -0.93 * pw, 3, 3], [-1.06 * pl, 0.55 * pt, 0, 0.8 * pw, -0.78 * pw, 2.6, 2.6], [-1.09 * pl, 0.02 * pt, 0, 0.3 * pw, -0.3 * pw, 2, 2]].map(([y, w, zs, zf, zb, nf, nb]) => [y, w, zs, zf, zb, nf, nb, -s * 0.15 * pt]));
  const fingers = [];
  const F = mitt ? [[0.45, 0.62, 1.32]] : [[0.66, 0.36, 0.86], [0.22, 0.4, 0.96], [-0.22, 0.38, 0.92], [-0.64, 0.3, 0.74]];
  F.forEach(([zf, r, lk], i) => {
    const len = L * 0.44 * lk, rr = L * 0.06 * (mitt ? 3.2 : 1) * (1 - i * 0.06), z0 = zf * pw * (mitt ? 0.6 : 1), c = curl * (0.8 + i * 0.12);
    const b = v3(0, -0.92 * pl, z0), p1 = b.clone().add(v3(-s * c * 0.12 * len, -0.42 * len, z0 * spread * 2)), p2 = p1.clone().add(v3(-s * c * 0.32 * len, -0.3 * len, z0 * spread)), p3 = p2.clone().add(v3(-s * c * 0.45 * len, -0.2 * len, 0));
    fingers.push(sweep([b, p1, p2, p3], (v, a) => { const k = capR(v, 1, 0.04, 0.16) * (1 - 0.18 * v + 0.08 * bump(v, 0.45, 0.06) + 0.06 * bump(v, 0.72, 0.05)); return [rr * k * (mitt ? 1 : 1), rr * k * (mitt ? 0.45 : 0.9)]; }, { up: v3(s, 0, 0), M: 20 }));
  });
  const t0 = v3(-s * pt * 0.2, -0.18 * pl, 0.72 * pw), t1 = t0.clone().add(v3(-s * 0.012, -0.05 * L, 0.06 * L)), t2 = t1.clone().add(v3(-s * 0.02 * L, -0.12 * L, 0.035 * L)), t3 = t2.clone().add(v3(-s * 0.04 * L * (0.5 + curl), -0.09 * L, 0.0));
  const thumb = sweep([t0, t1, t2, t3], (v, a) => capR(v, L * 0.066 * (1 - 0.25 * v + 0.15 * bump(v, 0.25, 0.15)), 0.04, 0.18), { up: v3(s, 0, 0.4), M: 20 });
  return { palm, fingers, thumb };
}
// per-texel head painter: skin with soft cel shading + scalp hair + painted face. cfg: { F, skin, hairR, hairline(p)->bool, extra(p,x,y)->col, mouthHole(p)->bool }
export function headPainter(cfg) {
  const cache = new Map();
  const P = (ctx) => { const k = cache.get(ctx.c); if (k && k.w === ctx.w && k.h === ctx.h) return k.a; const a = new Float32Array(ctx.w * ctx.h * 3); let i = 0; for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++, i += 3) { const p = ctx.P((x + 0.5) / ctx.w, (y + 0.5) / ctx.h); a[i] = p.x; a[i + 1] = p.y; a[i + 2] = p.z; } cache.set(ctx.c, { w: ctx.w, h: ctx.h, a }); return a; };
  const p = v3(); const n = noise(cfg.seed || 21);
  const base = (ctx) => { const a = P(ctx); let i = 0; for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++, i += 3) { p.set(a[i], a[i + 1], a[i + 2]); ctx.pc.px(ctx.x + x, ctx.y + y, skinCol(p, ctx.x + x, ctx.y + y, (x + 0.5) / ctx.w, (y + 0.5) / ctx.h, ctx)); } };
  const H = cfg.H;
  const skinCol = (q, X, Y, u, v, ctx) => {
    const mh = cfg.mouthHole && cfg.mouthHole(q, u, v, ctx); if (mh) return mh === 2 ? '#f6efe6' : pick(['#2a0a10', '#45121a', '#5e1c24'], 0.4 + (q.y / H - 0.1) * 3, X, Y);
    if (cfg.hairline && cfg.hairline(q)) { const t = 0.5 + (n.fbm(q.x * 60, q.y * 25 + q.z * 40, 2) - 0.5) * 0.6 + (Math.sin(q.x * 220 + q.z * 160 + n(q.y * 40, q.x * 40) * 3) > 0.7 ? 0.15 : 0); return pick(cfg.hairR, t - (cfg.hairline(q) === 2 ? 0.25 : 0), X, Y); }
    const e = cfg.extra && cfg.extra(q, X, Y); if (e) return e;
    // anime skin: flat light tone, cel shadow under the jaw / hairline, soft side falloff
    const L = cfg.skin.length - 1; let t = (cfg.lvl ?? 4) / L + (cfg.tone || 0);
    if (q.y < 0.1 * H && q.z < 0.3 * H) t -= 1 / L; if (cfg.hairShadow && cfg.hairShadow(q)) t -= 1 / L;
    t -= sstep(0.15, -0.25, q.z / H) / L;
    if (cfg.grain) t += (Math.sin(q.y * 300 + n(q.x * 50, q.z * 50) * 4) > 0.82 ? -0.07 : 0) + (n(q.x * 90, q.y * 90) - 0.5) * 0.06;
    return pick(cfg.skin, t, X, Y, 0.5);
  };
  const over = (ctx, prm) => { const E = EXPR[prm.expr] || EXPR.idle; const a = P(ctx); let i = 0; for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++, i += 3) { if (a[i + 2] < cfg.F.zMin) continue; p.set(a[i], a[i + 1], a[i + 2]); if (cfg.mouthHole && cfg.mouthHole(p, (x + 0.5) / ctx.w, (y + 0.5) / ctx.h, ctx)) continue; if (cfg.hairline && cfg.hairline(p)) continue; const c = faceCol(p, cfg.F, E, ctx.x + x, ctx.y + y) || (cfg.overExtra && cfg.overExtra(p, E, ctx.x + x, ctx.y + y)); if (c) ctx.pc.px(ctx.x + x, ctx.y + y, c); } };
  return { paint: base, over, skinCol };
}
export { TAU, v3, sat, sstep, bump, lerp, shell, surface, sweep, stack };
