// Hand-pixelled backdrops for the 106x63 art window, one per card kind. Flat colour bands and designed
// shapes only: a sunburst for matter, blueprint paper for laws, starfields for energy/power/specials,
// a verdigris workshop for instruments and a banded Greek sky for moves. Each has a small ground.
import { Spr, ell, rng, dk, ramp } from './kit.js';
import { K } from './pal.js';

export const BW = 106, BH = 63;
const B = {
  sun: ramp('#3c1426', '#5c1e30', '#83303a', '#a84a44', '#c86a4e', '#e0905e', '#f2b876', '#fbdc9c'),
  blue: ramp('#0c1c40', '#13285a', '#183268', '#1e3c78', '#2a5296', '#3e6eb4', '#6a9ad2', '#a8cdee'),
  sky: ramp('#1c3a78', '#24508e', '#2e64a4', '#3c7cba', '#5496cc', '#74b0da', '#9cc8e4', '#c6e0ea'),
  cloud: ramp('#4a5a8a', '#7084aa', '#9cacc8', '#c8d2e2', '#eef2f6', '#ffffff'),
  hill: ramp('#1e3424', '#2a4a2c', '#3c6434', '#567e3c', '#7a9a48'),
  far: ramp('#4a6a98', '#5a80a8', '#6e94b6', '#86aac4'),
  grass: ramp('#14260e', '#22401a', '#365e22', '#4e7e2a', '#6c9c34', '#94bc4a', '#c4dc74'),
  dirt: ramp('#1c0e10', '#34201a', '#4e3220', '#6c4828', '#8a6234', '#ac8248'),
  basalt: ramp('#08060e', '#120e1e', '#1e182e', '#2c2440', '#3e3458', '#5a4c78'),
  neb: ramp('#0a0718', '#140e2a', '#1e1440', '#2c1c58', '#3e2672', '#56338c'),
  nebR: ramp('#1a0a20', '#2e1032', '#481848', '#682260', '#8a3076', '#b04a8a'),
  nebC: ramp('#081424', '#0c2238', '#12344e', '#1a4c66', '#26687e', '#3a8a96'),
  verd: ramp('#06161a', '#0a2226', '#103032', '#163e3e', '#1e504c', '#2a6658', '#3e8268', '#62a682'),
  bench: ramp('#140a0a', '#2a1610', '#442416', '#5e341c', '#7a4824', '#98602e', '#b67a3c'),
  marble: ramp('#2c2838', '#4a4458', '#6e6878', '#968e98', '#bab0b0', '#dcd2c6', '#f4ecdc'),
};
export const BGR = B;

function stars(s, r, n, cols, y1 = BH) {
  for (let i = 0; i < n; i++) { const x = Math.floor(r() * BW), y = Math.floor(r() * y1); if (!s.get(x, y) || (r() < 0.5 && s.get(x, y) !== s.get(x + 1, y))) continue; s.px(x, y, cols[Math.floor(r() * cols.length)]); }
}
function sparkle(s, x, y, c1, c2, big = false) {
  s.px(x, y, c2); s.px(x - 1, y, c1); s.px(x + 1, y, c1); s.px(x, y - 1, c1); s.px(x, y + 1, c1);
  if (big) { s.px(x - 2, y, c1); s.px(x + 2, y, c1); s.px(x, y - 2, c1); s.px(x, y + 2, c1); }
}
// a stepped nebula cloud: concentric ragged ellipses in a ramp
function nebula(s, cx, cy, rx, ry, R, steps, r) {
  for (let k = 0; k < steps; k++) {
    const f = 1 - k / steps; const jit = Array.from({ length: 12 }, () => 0.82 + r() * 0.3);
    s.fill((x, y) => { const a = Math.atan2(y - cy, x - cx); const j = jit[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 12]; const dx = (x + 0.5 - cx) / (rx * f * j), dy = (y + 0.5 - cy) / (ry * f * j); return dx * dx + dy * dy <= 1; }, R[Math.min(R.length - 1, k + 1)]);
  }
}
function grassGround(s, gy, r) {
  const G = B.grass, D = B.dirt;
  s.fill((x, y) => y >= gy, (x, y) => {
    const d = y - gy; if (d === 0) return G[5]; if (d === 1) return G[4]; if (d === 2) return (x % 7 === 3 ? G[4] : G[3]); if (d === 3) return x % 5 === 1 ? G[2] : G[3];
    if (d === 4) return x % 3 === 0 ? G[2] : D[4]; return d > 7 ? D[2] : D[3];
  });
  // blades along the top edge
  for (let x = 1; x < BW - 1; x += 2 + Math.floor(r() * 3)) { const h = 1 + Math.floor(r() * 2); for (let j = 1; j <= h; j++) s.px(x, gy - j, j === h ? G[6] : G[5]); }
  // pebbles in the soil
  for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(r() * (BW - 5)), y = gy + 6 + Math.floor(r() * (BH - gy - 7)); s.px(x, y, D[5]); s.px(x + 1, y, D[4]); s.px(x, y + 1, D[1]); }
}

export function backdrop(kind, seed = 1) {
  const s = new Spr(BW, BH); const r = rng(seed); const cx = 53, cy = 28;
  let gy = 54;
  if (kind === 'matter') {
    const Rr = B.sun;
    s.fill(() => true, (x, y) => {
      const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * 1.25; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx) + Math.PI;
      const ray = Math.floor((a / (Math.PI * 2)) * 16 + 0.25) % 2;
      if (d < 13) return Rr[6]; if (d < 20) return Rr[ray ? 5 : 6];
      const zone = d < 56 ? 5 : 4;
      return Rr[zone - (ray ? 1 : 0)];
    });
    gy = 53; grassGround(s, gy, r);
  } else if (kind === 'law') {
    const Rb = B.blue;
    s.fill(() => true, (x, y) => (x % 16 === 4 || y % 16 === 6 ? Rb[4] : x % 4 === 0 || y % 4 === 2 ? Rb[3] : Rb[2]));
    // chalk-white construction drawings: a compass arc with ticks, a vector triangle, a dimension line
    for (let a = -0.2; a < 1.75; a += 0.012) { const x = Math.round(86 + Math.cos(a + Math.PI) * 34), y = Math.round(44 + Math.sin(a + Math.PI) * 34); if (Math.floor(a * 40) % 3 !== 2) s.px(x, y, Rb[5]); }
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.1 + i * 0.25; const x = 86 + Math.cos(a) * 34, y = 44 + Math.sin(a) * 34; s.line(x, y, 86 + Math.cos(a) * 31, 44 + Math.sin(a) * 31, Rb[5]); }
    s.line(6, 14, 22, 6, Rb[6]); s.line(22, 6, 22, 14, Rb[5]); s.line(6, 14, 22, 14, Rb[5]); s.px(21, 6, Rb[6]); s.px(22, 7, Rb[6]); s.px(20, 7, Rb[6]);
    for (let x = 6; x <= 22; x += 2) s.px(x, 17, Rb[5]); s.px(6, 16, Rb[5]); s.px(6, 18, Rb[5]); s.px(22, 16, Rb[5]); s.px(22, 18, Rb[5]);
    // ground: an engineering ground symbol (line + hatching)
    gy = 54; for (let x = 0; x < BW; x++) { s.px(x, gy, Rb[7]); s.px(x, gy + 1, Rb[5]); }
    for (let x = -8; x < BW; x += 4) s.line(x + 6, gy + 2, x + 1, gy + 7, Rb[4]);
  } else if (kind === 'tool') {
    const V = B.verd;
    // riveted verdigris copper plates
    s.fill(() => true, (x, y) => {
      const px = x % 26, py = y % 21;
      if (px === 0) return V[1]; if (px === 1) return V[5]; if (py === 0) return V[1]; if (py === 1) return V[5];
      const patina = ((x * 7 + y * 13) % 23 === 0) || ((x * 5 + y * 3) % 37 === 0);
      return patina ? V[4] : (x + Math.floor(y / 3)) % 9 === 0 ? V[2] : V[3];
    });
    for (let x = 0; x < BW; x += 26) for (let y = 0; y < BH; y += 21) for (const [a, b] of [[4, 4], [21, 4], [4, 17], [21, 17]]) { s.px(x + a, y + b, V[6]); s.px(x + a + 1, y + b, V[2]); s.px(x + a, y + b + 1, V[2]); s.px(x + a + 1, y + b + 1, V[1]); }
    // a large gear silhouette in the background
    s.fill((x, y) => { const dx = x + 0.5 - 90, dy = y + 0.5 - 14; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx); const tooth = Math.cos(a * 10) > 0.3 ? 2.5 : 0; return d < 13 + tooth && d > 4; }, V[2]);
    s.fill(ell(90, 14, 2.5, 2.5), V[2]);
    // workbench: lit top edge, plank front with seams and nail heads
    gy = 53; const W = B.bench;
    s.fill((x, y) => y >= gy, (x, y) => { const d = y - gy; if (d === 0) return W[6]; if (d === 1) return W[5]; if (d === 2) return W[4]; if (d === 3) return W[1]; if ((x + 9) % 30 === 0) return W[1]; return (x * 3 + y * 7) % 11 === 0 ? W[2] : W[3]; });
    for (let x = 3; x < BW; x += 30) { s.px(x + 3, gy + 6, W[6]); s.px(x + 3, gy + 7, W[1]); }
  } else if (kind === 'move') {
    const S = B.sky;
    const bands = [0, 9, 17, 24, 30, 35, 39, 42];
    s.fill(() => true, (x, y) => { let k = 0; while (k + 1 < bands.length && y >= bands[k + 1] + ((x * 7) % 13 === 0 ? 1 : 0)) k++; return S[k]; });
    // distant mountains and nearer olive hills with cypresses
    s.fill((x, y) => y > 38 - Math.round(7 * Math.max(0, 1 - Math.abs(x - 22) / 26) + 5 * Math.max(0, 1 - Math.abs(x - 78) / 22)), (x, y) => (y < 44 && (x + y) % 2 === 0 && x > 10 && x < 30 ? B.far[3] : B.far[2]));
    s.fill((x, y) => y > 46 - Math.round(3 * Math.sin(x * 0.09 + 1) + 2 * Math.sin(x * 0.23)), (x, y) => (y < 48 ? B.hill[3] : B.hill[2]));
    for (const tx of [9, 15, 96]) { for (let j = 0; j < 9; j++) { const w = j < 2 ? 0 : j < 6 ? 1 : 1; for (let i = -w; i <= w; i++) s.px(tx + i, 46 - j, i < 0 ? B.hill[2] : B.hill[1]); } s.px(tx, 37, B.hill[2]); }
    // clouds
    for (const [x, y, w] of [[14, 8, 12], [70, 4, 16], [92, 15, 9]]) cloud(s, x, y, w);
    gy = 53; grassGround(s, gy, r);
  } else { // energy / power / special: starfields
    const N = B.neb;
    s.fill(() => true, N[1]);
    if (kind === 'energy') { nebula(s, 30, 20, 34, 16, B.nebR, 4, r); nebula(s, 84, 40, 26, 14, N, 4, r); }
    else if (kind === 'special') { nebula(s, 22, 44, 34, 18, B.nebR, 5, r); nebula(s, 86, 16, 30, 14, B.nebC, 5, r); nebula(s, 56, 28, 18, 9, N, 4, r); }
    else { nebula(s, 76, 22, 36, 18, N, 5, r); }
    stars(s, r, 60, [N[4], N[5], '#8a7cb8']);
    stars(s, r, 16, ['#e8e0ff', '#fff4c8', '#c8f0ff']);
    for (let i = 0; i < 5; i++) { const x = 4 + Math.floor(r() * (BW - 8)), y = 3 + Math.floor(r() * 44); sparkle(s, x, y, '#8a80c8', '#ffffff', i < 2); }
    if (kind === 'power') { // constellation
      const pts = [[8, 12], [18, 7], [27, 13], [24, 22], [34, 26]];
      for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; const n = Math.max(Math.abs(c - a), Math.abs(d - b)); for (let k = 1; k < n; k++) if (k % 2) s.px(Math.round(a + ((c - a) * k) / n), Math.round(b + ((d - b) * k) / n), N[4]); }
      for (const [a, b] of pts) sparkle(s, a, b, '#9a8ad8', '#ffffff');
    }
    if (kind === 'energy') { // basalt ledge
      gy = 55; const Bs = B.basalt;
      s.fill((x, y) => y >= gy - Math.round(1.5 + 1.5 * Math.sin(x * 0.37) + Math.sin(x * 0.11)), (x, y) => { const top = gy - Math.round(1.5 + 1.5 * Math.sin(x * 0.37) + Math.sin(x * 0.11)); const d = y - top; return d === 0 ? Bs[5] : d === 1 ? Bs[4] : (x * 5 + y * 3) % 17 === 0 ? Bs[3] : Bs[2]; });
    } else gy = null;
  }
  s.ground = gy; return s;
}

function cloud(s, x, y, w) {
  const C = B.cloud; const h = Math.round(w * 0.42);
  const puffs = [[0.25, 0.62, 0.3], [0.5, 0.42, 0.36], [0.75, 0.6, 0.28]];
  const test = (px, py) => puffs.some(([u, v, rr]) => { const dx = (px + 0.5 - (x + u * w)) / (rr * w), dy = (py + 0.5 - (y + v * h)) / (rr * w * 0.8); return dx * dx + dy * dy <= 1; }) && py <= y + h;
  s.fill(test, (px, py) => (py >= y + h - 1 ? C[2] : py >= y + h - 2 ? C[3] : C[4]));
  s.fill((px, py) => test(px, py) && !test(px, py - 1), C[5]);
}

// contact shadow on the ground under a subject: two flat steps darker than whatever is there
export function shadow(s, cx, gy, w) {
  if (gy == null) return;
  const rx = Math.max(6, w / 2), ry = Math.max(1.5, w / 14);
  s.fill(ell(cx, gy + 0.5, rx, ry), (x, y, o) => (o ? dk(o, 1) : o));
  s.fill(ell(cx, gy + 0.5, rx * 0.68, ry * 0.7), (x, y, o) => (o ? dk(o, 1) : o));
}
