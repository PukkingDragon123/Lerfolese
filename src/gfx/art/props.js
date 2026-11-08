// UI props as low-res, richly detailed pixel art (faceted planes, 6-tone jewel ramps, ridge highlights, glints):
// brass gauge + needle, desk bell, wicker basket, leather pouch, plank signs, brass token.
import { Painter, M, norm3, clamp, hash2, glint, text } from './core.js';
import { roof, plane, gem, facetDisc, prismV, prismH, ngon } from './geo.js';
import { GR, GM } from './ramps.js';

// ---------------------------------------------------------------- small hand-placed details
export function nail(pc, x, y) { const r = GR.iron; pc.px(x, y, r[4]); pc.px(x + 1, y, r[2]); pc.px(x, y + 1, r[2]); pc.px(x + 1, y + 1, r[1]); }
export function rivet(pc, x, y, ramp = GR.brass) { pc.px(x, y, ramp[5]); pc.px(x + 1, y, ramp[3]); pc.px(x, y + 1, ramp[3]); pc.px(x + 1, y + 1, ramp[1]); }
export const screwHead = (pc, x, y, r, ramp = GR.brass) => rivet(pc, x, y, ramp);
// wood grain as in-ramp tone lines: long broken streaks along the board (call after render)
export function grainLines(P, x0, y0, w, h, seed = 1, { vertical = false, gap = 3 } = {}) {
  for (let j = 1; j < (vertical ? w : h) - 1; j += gap) {
    let i = Math.floor(hash2(j, seed) * 4);
    while (i < (vertical ? h : w) - 2) {
      const len = 3 + Math.floor(hash2(i, j + seed) * 6); const off = Math.floor(hash2(j, i, seed) * 2);
      const a = vertical ? [x0 + j + off, y0 + i] : [x0 + i, y0 + j + off], b = vertical ? [x0 + j + off, y0 + i + len] : [x0 + i + len, y0 + j + off];
      P.shiftLine([a, b], -1); i += len + 2 + Math.floor(hash2(i, seed) * 4);
    }
  }
}
export const grain = () => () => 0; // legacy no-op texture (grain is hand-placed with grainLines)

// ---------------------------------------------------------------- brass pressure gauge (64x70, dial centre 32,31; needle separate)
export function gauge() {
  const W = 64, H = 70, cx = 32, cy = 31; const P = new Painter(W, H);
  // horizontal pipe with flanges, hex nut and stem (faceted prisms)
  P.add(M.rect(12, 62, 40, 7), { m: GM.brass, n: prismH(65.5, 3.6, 4), ridge: 1, cast: 1 });
  for (const fx of [9, 51]) P.add(M.rect(fx, 59, 4, 11), { m: GM.brass, n: prismH(64.5, 5.6, 4), ridge: 1, cast: 1, contour: 1 });
  P.add(M.rect(28, 50, 8, 13), { m: GM.brass, n: prismV(32, 4.2, 4), ridge: 1, cast: 1 });
  gem(P, [[25, 54], [39, 54], [40, 57], [40, 60], [39, 62], [25, 62], [24, 60], [24, 57]], GM.brass, { k: 1.4, table: 2.4, cast: 2 });
  // dial card, then the faceted bezel (20 facets x inner/outer slope)
  P.add(M.poly(ngon(cx, cy, 22.6, 20, Math.PI / 20)), { m: GM.cream, n: plane(0, 0), contour: 0 });
  P.add(M.sub(M.poly(ngon(cx, cy, 29.6, 20, Math.PI / 20)), M.poly(ngon(cx, cy, 22.6, 20, Math.PI / 20))), { m: GM.brass, n: facetDisc(cx, cy, 20, [0, 24.2, 27], [-1.1, 0.5, 1.3], { rot: Math.PI / 20 }), ridge: 1, cast: 2, contour: 1 });
  P.render(); const pc = P.pc;
  // dial: darker rim band, ticks over a 270 degree sweep, red danger arc, verdigris full arc
  for (let a = 0; a < Math.PI * 2; a += 0.02) P.shift(Math.round(cx + Math.cos(a) * 21.6 - 0.5), Math.round(cy + Math.sin(a) * 21.6 - 0.5), -1);
  const A0 = Math.PI * 0.75, SW = Math.PI * 1.5; const ink = '#2a1620', red = '#b81e2a', redL = '#f2463a', teal = '#1e7a6a', tealL = '#46c2a0';
  for (let i = 0; i <= 24; i++) { const a = A0 + (i / 24) * SW * 0.2; for (const [r, c] of [[18.6, redL], [19.6, red]]) pc.px(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), c); }
  for (let i = 0; i <= 24; i++) { const a = A0 + SW * (0.78 + (i / 24) * 0.22); for (const [r, c] of [[18.6, tealL], [19.6, teal]]) pc.px(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), c); }
  for (let i = 0; i <= 20; i++) { const a = A0 + (i / 20) * SW; const major = i % 5 === 0; const r0 = major ? 14.5 : 17, r1 = 19.5; const c = Math.cos(a), s = Math.sin(a); pc.line(Math.round(cx + c * r0 - 0.5), Math.round(cy + s * r0 - 0.5), Math.round(cx + c * r1 - 0.5), Math.round(cy + s * r1 - 0.5), i <= 4 ? red : ink); }
  text(pc, 'PLUMB', cx, cy + 6, '#5a2a1e', { align: 'center' });
  for (const [dx, dy, c] of [[-1, -1, '#3a2a24'], [0, -1, '#3a2a24'], [-1, 0, '#3a2a24'], [0, 0, '#1a1018']]) pc.px(cx + dx, cy + dy, c);
  // glass: two hard diagonal glare slashes
  for (let k = 0; k < 9; k++) { for (const o of [0, 1]) P.shift(cx - 15 + k + o, cy - 4 - k, 2); if (k < 6) P.shift(cx - 10 + k, cy - 1 - k, 1); }
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + Math.PI / 6; rivet(pc, Math.round(cx + Math.cos(a) * 26 - 1), Math.round(cy + Math.sin(a) * 26 - 1)); }
  glint(pc, 14, 14, 2, '#ffffff', '#fff5c4'); glint(pc, 47, 64, 1, '#ffffff', '#fff5c4');
  return pc;
}
export function needle() { // 8x32, pivot at (4,27)
  const P = new Painter(8, 32); const px = 4, py = 27;
  gem(P, [[px, 1], [px + 1.4, 12], [px + 1, py], [px + 1.6, 31], [px - 1.6, 31], [px - 1, py], [px - 1.4, 12]], GM.red, { k: 1.4, cast: 0 });
  gem(P, ngon(px, py, 3.2, 8, Math.PI / 8), GM.brass, { k: 1.3, table: 0.8, cast: 1 });
  const pc = P.render(); pc.px(px - 1, py - 2, GR.brass[5]); pc.px(px, py, GR.brass[1]);
  return pc;
}

// ---------------------------------------------------------------- brass desk bell on a walnut base (64x54), frame 1 = pressed
export function bell(frame = 0) {
  const W = 64, H = 54, cx = 32; const P = new Painter(W, H); const press = frame ? 2 : 0;
  const base = [[5, 43], [9, 39], [55, 39], [59, 43], [59, 49], [55, 52], [9, 52], [5, 49]];
  P.add(M.poly(base), { m: GM.walnut, n: (x, y) => (y < 42 ? norm3(0, -1, 0.7) : x < 9 ? norm3(-0.9, 0, 0.6) : x > 55 ? norm3(0.9, 0, 0.6) : norm3(0, 0.15, 1)), ridge: 1, cast: 1 });
  P.add(M.rect(6, 46, 52, 1.2), { m: GM.brass, n: plane(0, -0.3), contour: 0, clip: true });
  // dome: bell profile, faceted into vertical gores and three height bands
  const prof = [[0, 0], [0.32, 0.02], [0.6, 0.1], [0.8, 0.28], [0.92, 0.52], [0.98, 0.78], [1.02, 1]];
  const domeH = 23, domeR = 21, by = 41; const dome = [...prof.map(([r, t]) => [cx - r * domeR, by - (1 - t) * domeH + press * 0.3]).reverse(), ...prof.map(([r, t]) => [cx + r * domeR, by - (1 - t) * domeH + press * 0.3])];
  const dn = (x, y) => { const t = clamp((y - (by - domeH)) / domeH, 0, 1); const gore = Math.round(((x - cx) / domeR) * 4) / 4; const band = t < 0.35 ? -0.9 : t < 0.7 ? -0.45 : -0.1; return norm3(gore * 1.1, band, 1); };
  P.add(M.poly(dome), { m: GM.brass, n: dn, ridge: 1, cast: 2 });
  P.add(M.rect(cx - 22, by - 1, 44, 2), { m: GM.brass, n: plane(0, 0.4), contour: 1, ridge: 1 });
  P.add(M.rect(cx - 1, by - domeH - 5 + press, 3, 6), { m: GM.brass, n: prismV(cx + 0.5, 1.6, 2), ridge: 1, cast: 1 });
  gem(P, [[cx - 4, by - domeH - 6 + press], [cx - 2, by - domeH - 8 + press], [cx + 3, by - domeH - 8 + press], [cx + 5, by - domeH - 6 + press], [cx + 3, by - domeH - 4.5 + press], [cx - 2, by - domeH - 4.5 + press]], GM.brass, { k: 1.4, table: 0.6, cast: 2 });
  P.render(); const pc = P.pc;
  grainLines(P, 9, 43, 46, 8, 3);
  // window reflection on the dome (two hard panes) and a thin second window on the right
  for (let y = by - 18; y <= by - 9; y++) for (let x = cx - 14 + Math.floor((by - y) / 6); x <= cx - 10 + Math.floor((by - y) / 6); x++) { if (x === cx - 12 + Math.floor((by - y) / 6) || y === by - 13) continue; pc.px(x, y + press, y < by - 13 ? GR.brass[5] : GR.brass[4]); }
  for (let y = by - 15; y <= by - 9; y++) pc.px(cx + 12 - Math.floor((by - y) / 7), y + press, GR.brass[4]);
  glint(pc, cx - 13, by - 19 + press, 2, '#ffffff', '#fff5c4'); pc.px(cx - 1, by - domeH - 7 + press, '#ffffff');
  rivet(pc, 12, 44, GR.brass); rivet(pc, 51, 44, GR.brass);
  if (frame) for (const s of [-1, 1]) { const x0 = cx + s * 24; for (const [dx, dy] of [[0, -14], [s, -12], [s * 2, -10]]) pc.px(x0 + dx, by + dy, '#fff0a0'); for (const [dx, dy] of [[s * 3, -17], [s * 4, -15], [s * 5, -13]]) pc.px(x0 + dx, by + dy, '#ffd040'); }
  return pc;
}

// ---------------------------------------------------------------- wicker basket of crumpled theories (60x56)
function paperBall(P, cx, cy, r, seed) {
  const pts = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 + seed; const rr = r * (0.78 + hash2(i, seed * 10) * 0.32); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]; });
  return gem(P, pts, GM.paper, { k: 1.1, table: r * 0.35, cast: 1, id: 'paper' });
}
export function basket() {
  const W = 60, H = 56, cx = 30; const P = new Painter(W, H);
  P.add(M.poly([[6, 16], [54, 16], [50, 13], [10, 13]]), { m: GM.wicker, n: plane(0, 0.4), shade: -3, contour: 0 });
  paperBall(P, 20, 12, 7, 1); paperBall(P, 36, 10, 8, 2.3); paperBall(P, 28, 15, 6, 4.1); paperBall(P, 45, 14, 5.5, 5.7);
  const body = [[5, 17], [55, 17], [50, 54], [10, 54]];
  const weave = (x, y) => { const row = Math.floor((y - 17) / 3), fy = (y - 17) - row * 3; const fx = (x + (row % 2) * 3) % 6; return { fy, fx }; };
  P.add(M.poly(body), { m: GM.wicker, n: (x, y) => { const w = weave(x, y); const side = (x - cx) / 24; const ny = w.fy < 1 ? -0.7 : w.fy > 2 ? 0.7 : 0; const nx = w.fx < 1 ? -0.5 : w.fx > 4 ? 0.5 : 0; return norm3(side * 0.9 + nx, ny, 1); }, contour: 1, noClean: true });
  P.add(M.poly([[3, 15], [57, 15], [56, 19], [4, 19]]), { m: GM.wicker, n: (x, y) => norm3(((x + y) % 4 < 2 ? -0.6 : 0.6), -0.3, 1), ridge: 1, cast: 2, contour: 1, noClean: true });
  P.add(M.poly([[9, 51], [51, 51], [50, 55], [10, 55]]), { m: GM.wicker, n: plane(0, 0.5), shade: -1, contour: 1 });
  P.render(); const pc = P.pc;
  for (let y = 20; y < 51; y += 3) for (let x = 6; x < 54; x++) if (P.tone(x, y) >= 0 && ((x + (Math.floor((y - 17) / 3) % 2) * 3) % 6 === 0)) P.shift(x, y, -2);
  for (const [x, y] of [[33, 8], [34, 8], [35, 9], [37, 8], [38, 8], [17, 11], [18, 11], [20, 10], [21, 10]]) pc.px(x, y, '#2c3a8a');
  pc.px(34, 6, '#c8443a'); pc.px(35, 6, '#c8443a'); pc.px(36, 7, '#c8443a');
  glint(pc, 10, 15, 1, '#ffffff', '#fff0a8');
  return pc;
}

// ---------------------------------------------------------------- leather coin pouch (56x56)
export function coin(P, x, y, r, tilt = 0.5) { // gold coin seen at an angle: octagon face over a rim band
  P.add(M.poly(ngon(x, y + 1, r, 8, Math.PI / 8, 1, tilt)), { m: GM.gold, n: plane(0.3, 0.6), shade: -1, cast: 1, contour: 1 });
  return gem(P, ngon(x, y, r, 8, Math.PI / 8, 1, tilt), GM.gold, { k: 1.2, table: r * 0.45, top: [0, -0.9, 0.5], cast: 1 });
}
export function pouch() {
  const W = 56, H = 56, cx = 26; const P = new Painter(W, H);
  coin(P, 44, 50, 4.6); coin(P, 50, 53, 3.8);
  const sack = [[cx - 7, 17], [cx + 7, 17], [cx + 13, 23], [cx + 20, 33], [cx + 22, 42], [cx + 19, 50], [cx + 10, 54], [cx - 4, 55], [cx - 15, 52], [cx - 21, 44], [cx - 19, 33], [cx - 13, 23]];
  const sackR = roof(sack, { k: 1.1, table: 4 });
  P.add(M.poly(sack), { m: GM.leather, n: (x, y) => { const r = sackR(x, y); const a = Math.atan2(y - 12, x - cx); const fold = Math.sin(a * 14) > 0 ? 0.35 : -0.35; const k = clamp(1 - (y - 17) / 22, 0, 1); return norm3(r[0] + fold * k, r[1], r[2]); }, ridge: 1, cast: 1 });
  const ruff = [[cx - 8, 18], [cx - 9, 11], [cx - 6, 13], [cx - 4, 8], [cx - 1, 12], [cx + 2, 7], [cx + 4, 12], [cx + 7, 9], [cx + 8, 13], [cx + 10, 11], [cx + 9, 18]];
  P.add(M.poly(ruff), { m: GM.leather, n: (x) => norm3(Math.round((x - cx) / 3) % 2 ? -0.7 : 0.4, -0.4, 1), ridge: 1, cast: 1, contour: 1 });
  P.add(M.poly([[cx - 9, 16], [cx + 10, 16], [cx + 10, 18.4], [cx - 9, 18.4]]), { m: GM.rope, n: plane(0, -0.3), cast: 1, contour: 1 });
  for (const [x0, x1] of [[cx + 7, cx + 12], [cx + 9, cx + 16]]) P.add(M.poly([[x0, 18], [x0 + 1.4, 18], [x1 + 1, 29], [x1 - 0.4, 29]]), { m: GM.rope, n: plane(0.3, 0), cast: 1, contour: 1 });
  gem(P, ngon(cx + 9, 17, 2.2, 6), GM.rope, { k: 1.2, cast: 1 });
  coin(P, 36, 53, 4.2); coin(P, 12, 54, 3.4, 0.55);
  P.render(); const pc = P.pc;
  for (let y = 24; y < 50; y += 3) { const x = Math.round(cx - 12 + (y - 24) * -0.18); pc.px(x, y, '#f6b278'); pc.px(x + 1, y + 1, '#4a1a1c'); }
  text(pc, 'Σ', cx + 2, 33, '#4a1a1c');
  glint(pc, cx - 10, 27, 1, '#ffffff', '#f6b278'); glint(pc, 43, 48, 1);
  return pc;
}

// ---------------------------------------------------------------- plank sign (drawn at half the requested size), optional painted tint
const TINT = { red: 'clothRed', teal: 'clothTeal', purple: 'clothPurple' };
export function sign(w = 160, h = 44, seed = 1, tint = null) {
  w = Math.max(10, Math.round(w / 2)); h = Math.max(8, Math.round(h / 2)); const P = new Painter(w, h);
  const planks = h >= 16 ? 2 : 1; const ph = (h - 2) / planks; const paint = tint && TINT[tint] ? GM[TINT[tint]] : null;
  for (let k = 0; k < planks; k++) {
    const y0 = 1 + Math.round(k * ph), y1 = 1 + Math.round((k + 1) * ph) - 1;
    const pts = [[1, y0 + 1], [2, y0], [w - 3, y0], [w - 2, y0 + 1], [w - 2, y1], [1, y1]];
    P.add(M.poly(pts), { m: paint ? (x, y) => ((x < 4 || x > w - 5 || hash2(Math.floor(x / 3), Math.floor(y / 2), seed) > 0.86) ? GM.oak : paint) : GM.oak, n: roof(pts, { k: 1.2, table: 1.2 }), ridge: 1, cast: 1, contour: 1 });
  }
  P.render(); const pc = P.pc;
  grainLines(P, 2, 1, w - 4, h - 2, seed, { gap: 3 });
  for (let k = 0; k < planks; k++) { const yc = Math.round(1 + (k + 0.5) * ph) - 1; nail(pc, 3, yc); nail(pc, w - 5, yc); }
  return pc;
}

// ---------------------------------------------------------------- brass token (16x16): faceted octagon, embossed '?'
export function token() {
  const P = new Painter(16, 16);
  gem(P, ngon(7.5, 7.5, 7.4, 8, Math.PI / 8), GM.brass, { k: 1.3, table: 4.4, cast: 0 });
  P.render(); const pc = P.pc;
  const q = [[6, 4], [7, 3], [8, 3], [9, 4], [9, 5], [8, 6], [7, 7], [7, 8], [7, 10]];
  for (const [x, y] of q) pc.px(x + 1, y + 1, GR.brass[1]); for (const [x, y] of q) pc.px(x, y, GR.brass[5]);
  pc.px(3, 4, '#ffffff');
  return pc;
}
