// Geometric, faceted construction for low-res pixel art (Sword & Sworcery / Hyper Light Drifter / Celeste style).
// Forms are angular polygons. Shading comes from flat planes: roof() gives every polygon edge its own bevel plane
// (plus an optional flat table on top), like a cut gem or a low-poly model, so light and shadow split along straight
// facet edges. No ellipses, no sphere normals, no gradients, no dithering.
import { M, mat, norm3, clamp, lerp, mix } from './core.js';

// ---------------------------------------------------------------- point lists
export const ngon = (cx, cy, r, n, rot = 0, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy]; });
export const star = (cx, cy, r0, r1, n, rot = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? r1 : r0; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
export const diamond = (cx, cy, rx, ry) => [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
// tapered blade from a to b with half-widths w0 (base) and w1 (tip; 0 = point)
export function blade(ax, ay, bx, by, w0, w1 = 0, bulge = 0) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
  const mx = ax + dx * 0.5, my = ay + dy * 0.5, wm = (w0 + w1) / 2 + bulge;
  const pts = [[ax + px * w0, ay + py * w0], [mx + px * wm, my + py * wm]];
  if (w1 > 0) pts.push([bx + px * w1, by + py * w1], [bx - px * w1, by - py * w1]); else pts.push([bx, by]);
  pts.push([mx - px * wm, my - py * wm], [ax - px * w0, ay - py * w0]); return pts;
}
// thick straight segment as a quad (crisp, no round caps)
export const bar = (ax, ay, bx, by, w) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, px = (-dy / L) * w, py = (dx / L) * w; return [[ax + px, ay + py], [bx + px, by + py], [bx - px, by - py], [ax - px, ay - py]]; };
// polyline of quads (a bent limb / horn / stem)
export const limb = (pts, w0, w1 = w0) => pts.slice(0, -1).map((p, i) => bar(p[0], p[1], pts[i + 1][0], pts[i + 1][1], lerp(w0, w1, i / Math.max(1, pts.length - 2))));
export const tr = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
export const rotPts = (pts, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
export const scalePts = (pts, cx, cy, sx, sy = sx) => pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
export const flipX = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]).reverse();
// local frame helper: points given as [u, v] along an axis at angle `a` from origin (ox, oy)
export const frame = (ox, oy, a) => { const c = Math.cos(a), s = Math.sin(a); return (pts) => pts.map(([u, v]) => [ox + u * c - v * s, oy + u * s + v * c]); };

// ---------------------------------------------------------------- masks
export const P = (pts) => M.poly(pts);
export const U = (...polys) => M.union(...polys.map((p) => (typeof p === 'function' ? p : M.poly(p))));

// ---------------------------------------------------------------- facet normals
// roof(): planar bevels. Each edge owns the region of the polygon nearest to it; that region gets a flat plane tilted
// toward the edge's outward normal (slope k). Further than `table` px from every edge the surface is a flat table
// facing `top` (default: the viewer). Works for any simple polygon; convex ones give perfectly straight facet edges.
export function roof(pts, { k = 1.25, table = 1e9, top = [0, 0, 1], bias = [0, 0] } = {}) {
  let area = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; area += x0 * y1 - x1 * y0; }
  const sgn = area > 0 ? 1 : -1; // outward normal orientation (screen y down)
  const E = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return { x0: p[0], y0: p[1], dx, dy, L, nx: (dy / L) * sgn, ny: (-dx / L) * sgn }; });
  const T = norm3(...top);
  return (x, y) => {
    let best = null, bd = 1e9;
    for (const e of E) { const t = clamp(((x - e.x0) * e.dx + (y - e.y0) * e.dy) / (e.L * e.L), 0, 1); const d = Math.hypot(x - (e.x0 + e.dx * t), y - (e.y0 + e.dy * t)); if (d < bd - 1e-6) { bd = d; best = e; } }
    if (bd > table || !best) return T;
    return norm3(best.nx * k + bias[0], best.ny * k + bias[1], 1);
  };
}
// a single plane facing a direction
export const plane = (nx, ny, nz = 1) => { const v = norm3(nx, ny, nz); return () => v; };
// split a shape into two planes along a line (a,b): left side gets nA, right side nB (crisp light/shadow terminator)
export function split(ax, ay, bx, by, nA, nB) { const A = norm3(...nA), B = norm3(...nB); return (x, y) => (((bx - ax) * (y - ay) - (by - ay) * (x - ax)) < 0 ? A : B); }

// ---------------------------------------------------------------- flat, graphic materials (3-5 tones, uniform dark outline)
export const gmat = (ramp, o = {}) => { const ol = o.ol || mix(ramp[0], '#0a0610', 0.45); return mat(ramp, { amb: 0.22, dif: 0.84, wrap: 0, bounce: 0.1, ...o, ol, olLit: o.olLit || ol }); };

// faceted ring / dome normals: n angular sectors x radial bands (a cut-gem bezel or cabochon)
// bands: array of radial boundaries [r0, r1, ...]; slopes: tilt per band (+ outward, - inward)
export function facetDisc(cx, cy, n, bands, slopes, { rot = 0, sy = 1 } = {}) {
  return (x, y) => {
    const dx = x - cx, dy = (y - cy) / sy; const r = Math.hypot(dx, dy); let a = Math.atan2(dy, dx) - rot; const seg = (Math.PI * 2) / n; const k = Math.round(a / seg); const ac = k * seg + rot;
    let j = 0; while (j < bands.length - 1 && r > bands[j + 1]) j++; const s = slopes[Math.min(j, slopes.length - 1)];
    return norm3(Math.cos(ac) * s, Math.sin(ac) * s * sy, 1);
  };
}
// faceted vertical prism (barrel, pipe, column): n flat faces around a vertical axis at cx with radius r
export function prismV(cx, r, n = 6, k = 1) { return (x) => { const u = clamp((x - cx) / r, -0.999, 0.999); const a = Math.asin(u); const seg = Math.PI / n; const ac = Math.round(a / seg) * seg; return norm3(Math.sin(ac) * k, 0, Math.cos(ac)); }; }
export function prismH(cy, r, n = 6, k = 1) { return (x, y) => { const u = clamp((y - cy) / r, -0.999, 0.999); const a = Math.asin(u); const seg = Math.PI / n; const ac = Math.round(a / seg) * seg; return norm3(0, Math.sin(ac) * k, Math.cos(ac)); }; }
// polygon with gem facets + ridge highlights
export function gem(P, pts, m, o = {}) { return P.add(M.poly(pts), { m, n: roof(pts, { k: o.k ?? 1.2, table: o.table ?? 1e9, top: o.top }), ridge: o.ridge ?? 1, contour: o.contour ?? 1, cast: o.cast ?? 1, ...o }); }
