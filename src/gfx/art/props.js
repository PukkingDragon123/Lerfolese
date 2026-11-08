// UI props painted as physical objects: brass gauge + needle, desk bell, wicker basket, leather pouch, plank signs, tokens.
import { Painter, M, N, mat, glint, text, mix, darken, lighten, clamp, lerp, fbm, hash2, vnoise, arc, tint, getHex, norm3 } from './core.js';
import { RAMP, MAT } from './ramps.js';

// ---------------------------------------------------------------- shared bits
// wood grain light offset for a board running along x (or y when vertical)
export function grain(seed = 1, { vertical = false, freq = 0.55, amp = 0.16, knots = 2, x0 = 0, y0 = 0, w = 128, h = 32 } = {}) {
  const ks = []; for (let i = 0; i < knots; i++) ks.push([x0 + hash2(i, seed) * w, y0 + hash2(seed, i + 9) * h, 2 + hash2(i + 3, seed) * 2.5]);
  return (x, y) => {
    let u = vertical ? y : x, v = vertical ? x : y; let warp = (fbm(u * 0.035, v * 0.12, seed) - 0.5) * 7;
    for (const [kx, ky, kr] of ks) { const dx = (vertical ? y - ky : x - kx) / (kr * 2.6), dy = (vertical ? x - kx : y - ky) / kr; const d = dx * dx + dy * dy; if (d < 1) return -0.18 + d * 0.1 + (Math.sin(Math.sqrt(d) * 9) > 0.4 ? -0.08 : 0); warp += 3.2 / (1 + d * 2) * Math.sign(dy || 1); }
    const s = Math.sin((v + warp) * freq * Math.PI); const line = s > 0.82 ? -amp : 0; const broken = hash2(Math.floor(u / 7), Math.floor((v + warp) * freq), seed) < 0.25 ? 0 : 1;
    return line * broken + (fbm(u * 0.02, v * 0.3, seed + 5) - 0.5) * 0.12;
  };
}
export function screwHead(pc, x, y, r, ramp = RAMP.brass, slotAngle = 0.7) { // painted directly: domed screw with slot
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = (i * i + j * j) / (r * r); if (d > 1.05) continue; const l = 0.55 - (i + j) / (2 * r) * 0.45 - d * 0.15; pc.px(x + i, y + j, ramp[clamp(Math.round(l * (ramp.length - 1)), 1, ramp.length - 1)]); }
  const c = Math.cos(slotAngle), s = Math.sin(slotAngle); for (let t = -r + 1; t <= r - 1; t++) pc.px(Math.round(x + c * t), Math.round(y + s * t), ramp[0]);
  pc.px(x - Math.round(r * 0.45), y - Math.round(r * 0.55), ramp[ramp.length - 1]);
}
export function rivet(pc, x, y, ramp = RAMP.iron) { pc.px(x, y, ramp[4]); pc.px(x + 1, y, ramp[2]); pc.px(x, y + 1, ramp[2]); pc.px(x + 1, y + 1, ramp[1]); pc.px(x, y - 1, ramp[1]); pc.px(x - 1, y, ramp[1]); pc.px(x + 2, y + 1, ramp[0]); pc.px(x + 1, y + 2, ramp[0]); pc.px(x - 1 + 1, y - 1 + 1, ramp[5] || ramp[4]); }
export function nail(pc, x, y) { const r = RAMP.iron; pc.px(x - 1, y, r[2]); pc.px(x, y, r[4]); pc.px(x + 1, y, r[2]); pc.px(x, y - 1, r[3]); pc.px(x, y + 1, r[1]); pc.px(x - 1, y - 1, r[1]); pc.px(x + 1, y + 1, r[0]); pc.px(x + 1, y - 1, r[1]); pc.px(x - 1, y + 1, r[1]); pc.px(x - 1, y - 1, r[5]); }

// ---------------------------------------------------------------- brass pressure gauge (128x140, dial centre 64,62; needle separate)
export function gauge() {
  const W = 128, H = 140, cx = 64, cy = 62; const P = new Painter(W, H);
  // pipe at the bottom: horizontal brass pipe with flanged ends, hex nut, stem
  P.add(M.rect(26, 126, 76, 11), { m: MAT.brass, n: N.cylH(131.5, 6), cast: 2 });
  for (const fx of [24, 98]) P.add(M.superellipse(fx + 3, 131.5, 3.5, 8, 6), { m: MAT.brass, n: N.blend(N.cylH(131.5, 8.5), N.cylV(fx + 3, 4), 0.3), cast: 2 });
  P.add(M.rect(57, 106, 14, 22), { m: MAT.brass, n: N.cylV(64, 7.5), cast: 2 });
  P.add(M.poly([[53, 113], [75, 113], [76, 116], [76, 122], [75, 125], [53, 125], [52, 122], [52, 116]]), { m: MAT.brass, n: (x) => (x < 58 ? norm3(-0.75, 0, 0.66) : x > 69 ? norm3(0.75, 0, 0.66) : norm3(0, 0, 1)), cast: 2, contour: 1 });
  // dial face (cream card) then the bezel ring on top of it
  P.add(M.ellipse(cx, cy, 45.5, 45.5), { m: mat(RAMP.cream, { amb: 0.62, dif: 0.32 }), n: N.flat(0, 0, 1), tex: (x, y) => { const d = Math.hypot(x - cx, y - cy) / 45; return -d * d * 0.18 + (fbm(x * 0.4, y * 0.4, 3) - 0.5) * 0.05; } });
  P.add(M.ring(cx, cy, 44, 47), { m: MAT.brass, n: N.torus(cx, cy, 45.5, 1.6), cast: 3, contour: 1 });
  P.add(M.ring(cx, cy, 47, 59), { m: MAT.brass, n: N.torus(cx, cy, 53, 6.4), cast: 2, contour: 1 });
  const pc = P.render();
  // knurled outer edge: a ring of short darker notches
  for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; if (i % 2) continue; const x = Math.round(cx + Math.cos(a) * 57.6 - 0.5), y = Math.round(cy + Math.sin(a) * 57.6 - 0.5); const c = getHex(pc, x, y); if (c) pc.px(x, y, darken(c, 0.35)); }
  // bezel screws
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + Math.PI / 6; screwHead(pc, Math.round(cx + Math.cos(a) * 53), Math.round(cy + Math.sin(a) * 53), 3, RAMP.brass, a + 0.9); }
  // pipe bolts
  for (const bx of [27, 100]) { pc.px(bx, 127, RAMP.brass[6]); pc.px(bx, 135, RAMP.brass[1]); }
  // dial graphics: 270 degree sweep from lower-left (empty) to lower-right (full)
  const ink = '#2a1a16', red = '#a3241f', redL = '#d4483a';
  const A0 = Math.PI * 0.75, SW = Math.PI * 1.5; // canvas angles: start lower-left, clockwise
  for (let i = 0; i <= 50; i++) { // danger zone (first 18%) as a solid red band
    const a = A0 + (i / 50) * SW * 0.18; for (let r = 39.6; r <= 42.2; r += 0.5) pc.px(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), r > 41.2 ? red : redL);
  }
  for (let i = 0; i <= 50; i++) { // healthy zone band (last 25%) in verdigris
    const a = A0 + SW * (0.75 + (i / 50) * 0.25); for (let r = 40.2; r <= 42.2; r += 0.5) pc.px(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), r > 41.2 ? '#2d6e6a' : '#4fa79a');
  }
  for (let i = 0; i <= 40; i++) {
    const a = A0 + (i / 40) * SW; const major = i % 10 === 0, mid = i % 5 === 0; const r0 = major ? 31 : mid ? 34.5 : 37, r1 = 39;
    const c = Math.cos(a), s = Math.sin(a);
    pc.line(Math.round(cx + c * r0 - 0.5), Math.round(cy + s * r0 - 0.5), Math.round(cx + c * r1 - 0.5), Math.round(cy + s * r1 - 0.5), i <= 7 ? red : ink);
    if (major) { // thicken majors on the side away from the light (manual weight, no doubles on the lit side)
      const ox = Math.abs(s) > Math.abs(c) ? 1 : 0, oy = ox ? 0 : 1; pc.line(Math.round(cx + c * (r0 + 1) - 0.5) + ox, Math.round(cy + s * (r0 + 1) - 0.5) + oy, Math.round(cx + c * r1 - 0.5) + ox, Math.round(cy + s * r1 - 0.5) + oy, i <= 7 ? red : ink);
      const lab = String(i / 10 * 25); const tx = cx + c * 24.5, ty = cy + s * 24.5; text(pc, lab, Math.round(tx), Math.round(ty - 2.5), ink, { align: 'center' });
    }
  }
  text(pc, 'PLUMB & CO.', cx, cy + 15, '#5a2e1c', { align: 'center' });
  text(pc, 'LONDON', cx, cy + 22, '#8a6a50', { align: 'center' });
  // centre recess for the needle pivot
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = i * i + j * j; if (d <= 16) pc.px(cx + i - 1, cy + j - 1, d > 9 ? '#7a6a5a' : '#3a2a24'); }
  // glass: curved window reflection (opaque tints of what is underneath) + rim refraction on the shadow side
  const refl = (r0, r1, a0, a1, k) => { for (let a = a0; a <= a1; a += 0.006) for (let r = r0; r <= r1; r += 0.5) { const x = Math.round(cx + Math.cos(a) * r - 0.5), y = Math.round(cy + Math.sin(a) * r - 0.5); const c = getHex(pc, x, y); if (c) pc.px(x, y, mix(c, '#ffffff', k)); } };
  refl(33, 41, Math.PI * 1.08, Math.PI * 1.38, 0.42); refl(28, 30.5, Math.PI * 1.12, Math.PI * 1.3, 0.3);
  refl(42, 43.5, Math.PI * 0.12, Math.PI * 0.38, 0.22);
  glint(pc, 36, 32, 2);
  return pc;
}
export function needle() { // 16x64, pivot at (8,54)
  const W = 16, H = 64; const P = new Painter(W, H); const px = 8, py = 54;
  const R = RAMP.red;
  const sh = M.poly([[px - 0.5, 4], [px + 0.5, 4], [px + 1.6, 16], [px + 1.1, 20], [px + 2.2, py], [px + 2.4, 61], [px - 2.4, 61], [px - 2.2, py], [px - 1.1, 20], [px - 1.6, 16]]);
  P.add(sh, { m: mat(R, { amb: 0.25, spec: 0.8, pow: 14, ol: '#1a0610', olLit: '#4c0e1a' }), n: N.cylV(px, 2.4) });
  P.add(M.ellipse(px, py, 5, 5), { m: MAT.brass, n: N.sphere(px, py, 5, 5), cast: 2, contour: 1 });
  const pc = P.render();
  pc.px(px - 2, py - 2, RAMP.brass[6]); pc.px(px - 1, py - 2, RAMP.brass[5]); pc.px(px, py, RAMP.brass[1]);
  return pc;
}

// ---------------------------------------------------------------- brass desk bell on a walnut base (128x108), frame 1 = pressed
export function bell(frame = 0) {
  const W = 128, H = 108, cx = 64; const P = new Painter(W, H); const press = frame ? 3 : 0;
  // walnut plinth: foot, body, rounded lip; top face
  const cylSide = (rx, y0, y1, ry) => M.fn((x, y) => { const dx = (x - cx) / rx; if (Math.abs(dx) > 1) return false; const e = Math.sqrt(1 - dx * dx) * ry; return y >= y0 && y <= y1 + e; }, cx - rx, y0, cx + rx, y1 + ry);
  const wal = mat(RAMP.walnut, { amb: 0.2, dif: 0.8, spec: 0.6, pow: 12 });
  P.add(cylSide(55, 96, 99, 9), { m: wal, n: N.cylV(cx, 55), tex: (x, y) => (y < 98 ? 0.12 : 0), cast: 1 });
  P.add(cylSide(51, 86, 95, 9), { m: wal, n: N.cylV(cx, 51), tex: grain(4, { w: 128, h: 20, y0: 86 }), contour: 1 });
  P.add(cylSide(51, 92, 92, 9), { m: MAT.brass, n: N.cylV(cx, 51), clip: true, contour: 0 }); // brass inlay band (below the lip)
  P.add(M.fn((x, y) => { const dx = (x - cx) / 51; return Math.abs(dx) <= 1 && Math.abs(y - (90 + Math.sqrt(1 - dx * dx) * 9)) < 1.1; }, cx - 52, 86, cx + 52, 102), { m: MAT.brass, n: N.cylV(cx, 51), clip: true, contour: 0 });
  P.add(cylSide(53, 84, 86, 9), { m: wal, n: N.blend(N.cylV(cx, 53), N.flat(0, -1, 0.4), 0.45), contour: 1 });
  P.add(M.ellipse(cx, 84, 53, 9), { m: wal, n: N.flat(0, -0.9, 0.45), tex: grain(7, { w: 128, h: 18, y0: 75, freq: 0.9 }) });
  // brass dome: bell profile (slight flare), sits on the base top
  const by = 85, rx = 41, ry = 7, top = 35 + press * 0.4;
  const halfW = (y) => { const t = clamp((by - y) / (by - top), 0, 1); return rx * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.1))) + 2.2 * Math.pow(1 - t, 6); };
  const domeMask = M.fn((x, y) => { if (y > by) { const dx = (x - cx) / (rx + 2.2); return Math.abs(dx) <= 1 && y <= by + Math.sqrt(1 - dx * dx) * ry; } return y >= top && Math.abs(x - cx) <= halfW(y); }, cx - rx - 3, top - 1, cx + rx + 3, by + ry + 1);
  const domeN = (x, y) => { const t = clamp((by - y) / (by - top), 0, 0.999); const hw = Math.max(1, halfW(Math.min(y, by))); const u = clamp((x - cx) / hw, -0.999, 0.999); const phi = Math.asin(Math.min(0.999, Math.pow(t, 1.1))); return norm3(u * Math.cos(phi), -Math.sin(phi) * 1.0, Math.sqrt(1 - u * u) * Math.cos(phi)); };
  P.add(domeMask, { m: MAT.brass, n: domeN, cast: 3, contour: 1 });
  // flared lip: brighter rolled rim
  P.add(M.fn((x, y) => { const dx = (x - cx) / (rx + 2.2); if (Math.abs(dx) > 1) return false; const e = by + Math.sqrt(1 - dx * dx) * ry; return y <= e && y >= e - 2.2; }, cx - rx - 3, by - 3, cx + rx + 3, by + ry + 1), { m: MAT.brass, n: (x, y) => { const n = domeN(x, y); return norm3(n[0], n[1] + 0.55, n[2] + 0.2); }, clip: true, contour: 0 });
  // plunger: stem + mushroom cap
  P.add(M.rect(cx - 2, top - 9 + press, 5, 11), { m: MAT.brass, n: N.cylV(cx + 0.5, 2.6), cast: 2 });
  P.add(M.ellipse(cx + 0.5, top - 10 + press, 8, 4.5), { m: MAT.brass, n: N.sphere(cx + 0.5, top - 9 + press, 8, 5), cast: 3 });
  const pc = P.render();
  // arched window reflected in the dome (four panes, follows the curvature), and a faint second window on the right
  const win = (u0, u1, t0, t1, k) => { for (let y = Math.round(by - t1 * (by - top)); y <= Math.round(by - t0 * (by - top)); y++) { const hw = halfW(y); const t = (by - y) / (by - top); const tn = (t - t0) / (t1 - t0); for (let x = Math.round(cx + u0 * hw); x <= Math.round(cx + u1 * hw); x++) { const un = ((x - cx) / hw - u0) / (u1 - u0); if (tn > 0.78 && Math.hypot(un - 0.5, (tn - 0.78) * 2.4) > 0.52) continue; const mull = Math.abs(un - 0.5) < 0.07; pc.px(x, y, mull ? RAMP.brass[5] : k ? RAMP.brass[6] : RAMP.brass[5]); } } };
  win(-0.74, -0.4, 0.38, 0.86, 1); win(0.48, 0.6, 0.5, 0.7, 0);
  // the walnut base reflected in the lower dome
  tint(pc, M.fn((x, y) => { const t = (by - y) / (by - top); return t < 0.14 && t > -0.05 && Math.abs(x - cx) < halfW(Math.min(y, by)) - 1; }, cx - rx, by - 10, cx + rx, by + 2), (c) => mix(c, '#7a3a24', 0.35));
  glint(pc, cx - 22, Math.round(by - 0.72 * (by - top)), 3);
  pc.px(cx - 3, top - 12 + press, RAMP.brass[6]); pc.px(cx - 2, top - 12 + press, RAMP.brass[6]);
  if (frame) { // ring: motion arcs either side of the dome
    const c1 = '#fff2a8', c2 = '#e8b84a';
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const r = 8 + k * 5; for (let a = -0.7; a <= 0.7; a += 0.02) { const x = Math.round(cx + s * (rx - 2 + Math.cos(a) * r)), y = Math.round(top + 10 + Math.sin(a) * r * 1.2); pc.px(x, y, k === 1 ? c1 : c2); } }
  }
  return pc;
}

// ---------------------------------------------------------------- wicker basket of crumpled theories (128x116)
function crumple(P, cx, cy, r, seed, opts = {}) { // faceted paper ball: Voronoi planes with lit/shadow facets
  const pts = []; for (let i = 0; i < 9; i++) { const a = hash2(i, seed) * Math.PI * 2, d = Math.sqrt(hash2(seed, i + 3)) * r * 0.95; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, hash2(i + 7, seed) - 0.5, hash2(seed + 2, i) - 0.5]); }
  const mask = M.fn((x, y) => { const a = Math.atan2(y - cy, x - cx); const rr = r * (0.86 + 0.14 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 9 + seed * 2)); return Math.hypot(x - cx, (y - cy) * 1.06) <= rr; }, cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1);
  const base = N.sphere(cx, cy, r, r);
  P.add(mask, { m: MAT.paper, n: (x, y) => { let best = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = (x - pts[i][0]) ** 2 + (y - pts[i][1]) ** 2; if (d < bd) { bd = d; best = i; } } const b = base(x, y); return norm3(b[0] + pts[best][2] * 0.9, b[1] + pts[best][3] * 0.9, b[2]); }, cast: 2, contour: 1, ...opts });
}
export function basket() {
  const W = 128, H = 116, cx = 64; const P = new Painter(W, H);
  const rimY = 40, rTop = 51, rBot = 41, bot = 108, ry = 10;
  // inside back wall (dark), visible above the papers
  P.add(M.fn((x, y) => { const dx = (x - cx) / (rTop - 3); return Math.abs(dx) <= 1 && y >= rimY - Math.sqrt(1 - dx * dx) * (ry - 2) && y <= rimY; }, cx - rTop, rimY - ry, cx + rTop, rimY + 2), { m: MAT.wicker, n: N.flat(0, 0.3, 1), shade: -3, tex: (x, y) => (Math.floor(x / 4 + Math.floor(y / 3) * 0.5) % 2 ? -0.08 : 0) });
  // crumpled papers inside (some peeking over the rim)
  crumple(P, 46, 33, 13, 3); crumple(P, 75, 30, 15, 7); crumple(P, 60, 38, 11, 11); crumple(P, 90, 37, 11, 5); crumple(P, 34, 40, 9, 13);
  // woven body: tapered cylinder, over/under weave around vertical stakes
  const half = (y) => lerp(rTop, rBot, clamp((y - rimY) / (bot - rimY), 0, 1));
  const body = M.fn((x, y) => { if (y < rimY) return false; const h = half(Math.min(y, bot)); const dx = (x - cx) / h; if (Math.abs(dx) > 1) return false; return y <= bot + Math.sqrt(1 - dx * dx) * (ry - 2) && y >= rimY + Math.sqrt(1 - dx * dx) * ry - 0; }, cx - rTop, rimY, cx + rTop, bot + ry);
  const weave = (x, y) => { // horizontal weavers over/under vertical stakes
    const h = half(Math.min(y, bot)); const dx = clamp((x - cx) / h, -1, 1); const u = Math.asin(dx) * h; const v = y - (rimY + Math.sqrt(Math.max(0, 1 - dx * dx)) * ry * 0.92);
    const r = Math.floor(v / 4), fv = v - r * 4; const s = Math.floor((u + 3.5) / 7), fu = u + 3.5 - s * 7 - 3.5; const over = ((r + s) & 1) === 0; return { dx, r, fv, fu, over };
  };
  P.add(body, {
    m: MAT.wicker, n: (x, y) => { const w = weave(x, y); const dx = clamp(w.dx, -0.999, 0.999); const stake = !w.over && Math.abs(w.fu) < 1.3; const ny = stake ? 0.1 : clamp((w.fv - 2.3) / 1.7, -0.95, 0.95) * 0.85; return norm3(dx + (stake ? w.fu / 1.3 * 0.7 : 0), ny + 0.12, Math.sqrt(1 - dx * dx)); },
    tex: (x, y) => { const w = weave(x, y); if (!w.over && Math.abs(w.fu) < 1.3) return w.fv < 0.7 ? -0.1 : -0.06; if (w.fv < 0.75) return -0.42; let t = w.over ? 0.08 * (1 - Math.abs(w.fu) / 3.5) : 0; if (!w.over && Math.abs(w.fu) < 2.4) t -= 0.14; return t; }, contour: 1,
  });
  // braided rim: twisted band around the top ellipse
  const rimMask = M.fn((x, y) => { const dx = (x - cx) / (rTop + 2); if (Math.abs(dx) > 1) return false; const e = Math.sqrt(1 - dx * dx) * (ry + 1); return (y >= rimY + e - 3.5 && y <= rimY + e + 2.5); }, cx - rTop - 3, rimY - 4, cx + rTop + 3, rimY + ry + 5);
  P.add(rimMask, { m: MAT.wicker, n: (x, y) => { const dx = clamp((x - cx) / (rTop + 2), -0.999, 0.999); const e = rimY + Math.sqrt(1 - dx * dx) * (ry + 1); const t = clamp((y - e + 0.5) / 3, -0.999, 0.999); return norm3(dx * 0.6, t, Math.sqrt(1 - t * t)); }, tex: (x, y) => { const ph = (x * 0.7 - y * 1.2) % 5; return ph < 1.1 && ph > -1 ? -0.28 : 0.05; }, cast: 2, contour: 1 });
  // back rim (thin, behind the papers)
  const pc = P.render();
  // scribbled equations on two papers
  const blue = '#2c3a78', blue2 = '#4a5aa0';
  text(pc, 'F=MA', 66, 24, blue); pc.line(65, 27, 82, 25, '#8a2a2e');
  text(pc, 'E=?', 38, 30, blue2);
  pc.line(84, 34, 95, 32, blue); pc.line(86, 36, 93, 35, blue2);
  return pc;
}

// ---------------------------------------------------------------- leather coin pouch (112x112)
export function coinSprite(P, x, y, r, { tilt = 0.45, cast = 2 } = {}) { // gold coin seen at an angle: face + rim band
  P.add(M.ellipse(x, y + 1.6, r, r * tilt), { m: MAT.gold, n: N.cylV(x, r), shade: -1, cast });
  P.add(M.ellipse(x, y, r, r * tilt), { m: MAT.gold, n: N.flat(0, -0.92, 0.4), tex: (px, py) => { const d = Math.hypot((px - x) / r, (py - y) / (r * tilt)); return d > 0.72 ? 0.12 : d < 0.38 ? -0.1 : 0; }, cast, contour: 1 });
}
export function pouch() {
  const W = 112, H = 112, cx = 52; const P = new Painter(W, H);
  // coins spilled behind/right
  coinSprite(P, 88, 99, 9); coinSprite(P, 100, 104, 7.5);
  // sack body: pear silhouette, slumped, lumpy bottom
  const neckY = 34;
  const half = (y) => { const t = clamp((y - neckY) / (106 - neckY), 0, 1); return 12 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 34 * (1 - Math.pow(Math.max(0, t - 0.82) / 0.18, 2) * 0.35); };
  const body = M.fn((x, y) => { if (y < neckY || y > 107) return false; const h = half(y) + Math.sin(y * 0.5) * 0.6; const lump = y > 96 ? Math.sin((x - cx) * 0.25) * 2.5 : 0; return Math.abs(x - cx + (y - 70) * 0.05) <= h && y <= 106 + lump - Math.pow((x - cx) / 46, 2) * 6; }, cx - 50, neckY, cx + 50, 108);
  const folds = (x, y) => { const a = Math.atan2(y - (neckY - 6), x - cx); const k = clamp(1 - (y - neckY) / 50, 0, 1); return Math.sin(a * 22) * 0.55 * k * k; };
  P.add(body, { m: MAT.leather, n: N.bump(N.blend(N.sphere(cx, 76, 46, 36), N.cylV(cx, 40), 0.3), folds, 1.6), cast: 2, tex: (x, y) => (fbm(x * 0.3, y * 0.3, 4) - 0.5) * 0.1 });
  // gathered neck + ruffled mouth
  P.add(M.fn((x, y) => { const w = 11 + (y - 18) * 0.25; return y >= 18 && y <= 37 && Math.abs(x - cx) <= w; }, cx - 20, 16, cx + 20, 38), { m: MAT.leather, n: N.bump(N.cylV(cx, 15), (x, y) => Math.sin((x - cx) * 1.1) * 0.6, 1.2), cast: 2, contour: 1 });
  P.add(M.fn((x, y) => { const a = (x - cx) / 17; if (Math.abs(a) > 1) return false; const top = 15 - Math.cos(a * 1.57) * 4 + Math.abs(Math.sin(x * 0.9)) * 2.4; return y >= top && y <= 21 + Math.abs(Math.sin(x * 0.7)) * 1.5; }, cx - 18, 9, cx + 18, 24), { m: MAT.leather, n: N.bump(N.flat(0, -0.5, 1), (x) => Math.sin(x * 0.9) * 0.8, 1.4), shade: 0, cast: 1, contour: 1 });
  // drawstring around the neck, tied bow with two hanging ends
  P.add(M.fn((x, y) => { const e = 33 + Math.sin((x - cx) / 14 * 1.5) * 0.6 + (Math.abs(x - cx) / 14) ** 2 * 1.8; return Math.abs(x - cx) <= 15 && Math.abs(y - e) <= 1.4; }, cx - 16, 30, cx + 16, 38), { m: MAT.rope, n: N.cylH(33, 2), tex: (x) => (x % 3 === 0 ? -0.2 : 0), cast: 2, contour: 1 });
  P.add(M.bezier([cx + 12, 34], [cx + 22, 40], [cx + 22, 52], [cx + 28, 60], 1.3, 1.1), { m: MAT.rope, n: 1.2, tex: (x, y) => ((x + y) % 3 === 0 ? -0.2 : 0), cast: 2, contour: 1 });
  P.add(M.bezier([cx + 10, 35], [cx + 14, 44], [cx + 12, 52], [cx + 16, 58], 1.3, 1.1), { m: MAT.rope, n: 1.2, tex: (x, y) => ((x + y) % 3 === 0 ? -0.2 : 0), cast: 2, contour: 1 });
  P.add(M.ellipse(cx + 28.5, 61, 2.4, 2.4), { m: MAT.rope, n: N.sphere(cx + 28.5, 61, 2.4, 2.4), cast: 1 });
  P.add(M.ellipse(cx + 16.5, 59.5, 2.4, 2.4), { m: MAT.rope, n: N.sphere(cx + 16.5, 59.5, 2.4, 2.4), cast: 1 });
  // coins in front
  coinSprite(P, 74, 104, 8.5); coinSprite(P, 26, 106, 6.5, { tilt: 0.5 });
  const pc = P.render();
  // stitched seam down the front-left and a stamped emblem
  for (let y = 44; y < 100; y += 3) { const x = Math.round(cx - half(y) * 0.62 + (y - 70) * -0.05); pc.px(x, y, '#e6b06a'); pc.px(x + 1, y + 1, '#5a2a1a'); }
  for (let a = 0; a < Math.PI * 2; a += 0.05) { const x = Math.round(cx + 6 + Math.cos(a) * 8), y = Math.round(72 + Math.sin(a) * 8); const c = getHex(pc, x, y); if (c) pc.px(x, y, darken(c, 0.35)); const x2 = Math.round(cx + 6 + Math.cos(a) * 8.9), y2 = Math.round(72 + Math.sin(a) * 8.9); if (Math.sin(a + 2.3) > 0) { const c2 = getHex(pc, x2, y2); if (c2) pc.px(x2, y2, lighten(c2, 0.2)); } }
  text(pc, 'Σ', cx + 5, 70, '#3a160f');
  glint(pc, cx - 22, 58, 1, '#f6d2a0', '#c88a5a');
  return pc;
}

// ---------------------------------------------------------------- plank sign (any size), optional painted tint
const TINTS = { red: RAMP.cloth_red, teal: RAMP.cloth_teal, purple: RAMP.cloth_purple };
export function sign(w = 160, h = 44, seed = 1, tint = null) {
  w = Math.max(12, w | 0); h = Math.max(10, h | 0); const P = new Painter(w, h);
  const planks = h >= 30 ? 2 : 1; const ph = (h - 2) / planks; const paint = tint && TINTS[tint] ? mat(TINTS[tint], { amb: 0.22, dif: 0.8 }) : null;
  const wear = (x, y) => { const e = Math.min(x - 1, w - 2 - x, (y - 1) % ph, ph - ((y - 1) % ph)); return fbm(x * 0.12, y * 0.25, seed + 3) + (e < 3 ? 0.35 - e * 0.1 : 0) > 0.72; };
  for (let k = 0; k < planks; k++) {
    const y0 = 1 + Math.round(k * ph), y1 = 1 + Math.round((k + 1) * ph) - 1; const rnd = (i) => hash2(i, k, seed);
    const notch = (x, y) => { // chipped corners and a few nicks along the edges
      if ((x < 3 || x > w - 4) && (y < y0 + 2 || y > y1 - 2) && rnd(Math.floor(x / 3) + Math.floor(y)) > 0.5) return false;
      if ((y === y0 || y === y1) && hash2(Math.floor(x / 5), y, seed) > 0.9) return false; return true;
    };
    const g = grain(seed * 7 + k, { w, h: ph, y0, freq: 0.5 });
    P.add(M.fn((x, y) => x >= 1 && x < w - 1 && y >= y0 && y <= y1 && notch(Math.floor(x), Math.floor(y)), 0, y0, w, y1 + 1), { m: paint ? (x, y) => (wear(x, y) ? MAT.oak : paint) : MAT.oak, n: 2.2, tex: (x, y) => g(x, y) * (paint && !wear(x, y) ? 0.35 : 1), contour: 1, cast: 1 });
  }
  const pc = P.render();
  // nails at the plank ends
  for (let k = 0; k < planks; k++) { const yc = Math.round(1 + (k + 0.5) * ph); nail(pc, 5, yc); nail(pc, w - 6, yc); }
  return pc;
}

// ---------------------------------------------------------------- brass token (32x32): milled rim, embossed thought-swirl
export function token() {
  const P = new Painter(32, 32), c = 15.5;
  P.add(M.ellipse(c, c, 14.5, 14.5), { m: MAT.brass, n: N.torus(c, c, 12.6, 2.6), contour: 0 });
  P.add(M.ellipse(c, c, 10.6, 10.6), { m: MAT.brassMatte, n: N.flat(0, 0, 1), cast: 0, shade: -1 });
  // embossed question mark (raised, inflated)
  const q = M.union(M.bezier([c - 4, c - 3], [c - 4, c - 8.5], [c + 4.5, c - 8.5], [c + 4, c - 3], 1.4, 1.4, 12), M.bezier([c + 4, c - 3], [c + 3.5, c - 0.5], [c, c - 0.5], [c, c + 2.5], 1.4, 1.4, 10), M.ellipse(c, c + 6, 1.6, 1.6));
  P.add(q, { m: MAT.brass, n: 1.5, cast: 1, contour: 1 });
  const pc = P.render();
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const x = Math.round(c + Math.cos(a) * 14), y = Math.round(c + Math.sin(a) * 14); if (i % 2 === 0) { const h = getHex(pc, x, y); if (h) pc.px(x, y, darken(h, 0.3)); } }
  glint(pc, 9, 8, 1);
  return pc;
}
