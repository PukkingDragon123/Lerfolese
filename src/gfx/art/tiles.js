// Seamless pixel-art surface tiles for the 3D world (HD-2D): ground (grass-earth, soil, gravel, trodden earth,
// cobbles), walls (whitewash, ashlar, rubble, marble), wood planks, thatch, canvas, terracotta barrel tiles, bark and
// water ripples. Same rules as the sprites: 5-7 tone hue-shifted ramps, clustered tones (never gradients), faceted
// stones lit from the top-left with tinted dark outlines on the shadow side, 1px grain and cracks. Everything wraps.
import { Buf } from './plants.js';
import { hash2, clamp } from './core.js';
import { ngon } from './geo.js';
import { GR } from './ramps.js';
import { mulberry32 } from '../../core/util.js';

// periodic value noise (lattice wraps every P cells) -> seamless clusters
function pnoise(x, y, P, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, s); const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function pfbm(x, y, W, cell, s, oct = 3) { let t = 0, n = 0, a = 0.5, P = Math.max(1, Math.round(W / cell)); for (let i = 0; i < oct; i++) { t += pnoise((x / W) * P, (y / W) * P, P, s + i * 13) * a; n += a; a *= 0.5; P *= 2; } return t / n; }
// clustered base: tones picked by thresholds of seamless noise (flat colour planes, no gradients)
function base(S, R, tones, { cell = 16, seed = 1, cuts = null } = {}) {
  const c = cuts || tones.slice(1).map((_, i) => (i + 1) / tones.length);
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const v = pfbm(x, y, S.w, cell, seed); let k = 0; while (k < c.length && v > 0.5 + (c[k] - 0.5) * 0.6) k++; S.px(x, y, R, tones[k]); }
}
const stone = (S, r, cx, cy, rad, R, { n = 6, sx = 1, sy = 0.8, sh = 0, k = 1.4, ol = true } = {}) => S.el(() => S.facet(ngon(cx, cy, rad, n, r() * 6, sx, sy).map(([x, y]) => [x + (r() - 0.5) * rad * 0.35, y + (r() - 0.5) * rad * 0.3]), R, { k, table: rad * 0.45, sh }), { ol });
const speck = (S, r, n, R, t) => { for (let i = 0; i < n; i++) S.px(r() * S.w, r() * S.h, R, t); };
const crack = (S, r, x, y, len, R, t = 0) => { for (let i = 0; i < len; i++) { S.px(x, y, R, t); x += r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1; y += 1; } };

// ---------------------------------------------------------------- ramps for surfaces
export const TR = {
  grass: GR.grass, lush: ['#0c1c18', '#143c22', '#22622c', '#3a8c30', '#68b23c', '#b6dc64'], marsh: ['#101c1a', '#1e3826', '#34582e', '#567a38', '#88a24a', '#c6cc80'],
  dry: ['#2a1c18', '#563a22', '#866a30', '#b49a46', '#dcc66a', '#fbeeaa'], dusk: ['#1a1824', '#2e3828', '#4a5a30', '#76803c', '#aca452', '#e4d488'],
  night: ['#0a0e1c', '#132232', '#1c3a3a', '#2a5440', '#46764e', '#7aa470'],
  soil: GR.dirt, sand: ['#3a2820', '#6a4c34', '#9a7650', '#c4a272', '#e2c896', '#f8ecc4'], stone: GR.stone, warm: ['#24161c', '#4a3230', '#76584a', '#a08068', '#c8ac8c', '#eedcbc'],
  plaster: ['#6a6070', '#a49aa0', '#cec6c0', '#e8e2d8', '#f6f2ea', '#fffdf8'], marble: GR.marble, terracotta: ['#2a0c14', '#601a18', '#9a3420', '#cc5a2c', '#ec8a48', '#fcc080'],
  oak: GR.oak, walnut: GR.walnut, blue: ['#0c1430', '#18306a', '#2650a4', '#3c76cc', '#6aa2e8', '#b0d4fa'], green: ['#081c1a', '#123e32', '#1e644a', '#2e8a62', '#58b484', '#a6e0b4'],
  straw: ['#2e1c14', '#5a3c1e', '#8c6a2c', '#bc9840', '#e2c464', '#fcecaa'], cloth: ['#4a4040', '#7c7068', '#b0a490', '#d8ceb6', '#f0e8d4', '#fffaf0'],
  moss: GR.moss, water: GR.water,
};

// ---------------------------------------------------------------- ground
export function grassTile(kind = 'meadow', seed = 3) {
  const S = new Buf(64, 64, 0, { wrap: true }); const R = TR[kind] || TR.grass; const r = mulberry32(seed * 31 + kind.length);
  base(S, R, [1, 2, 3], { cell: 14, seed });
  for (let i = 0; i < 300; i++) { // blade ticks: a shadow pixel at the root, a lit tip
    const x = Math.floor(r() * 64), y = Math.floor(r() * 64), h = 2 + Math.floor(r() * 3), ln = r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0; const v = S.at(x, y);
    S.px(x, y + 1, R, Math.max(0, v - 1)); for (let k = 0; k < h; k++) S.px(x + (k === h - 1 ? ln : 0), y - k, R, Math.min(5, v + (k >= h - 2 ? 2 : 1)));
  }
  const dots = kind === 'dry' ? [[TR.straw, 5]] : kind === 'night' ? [[TR.plaster, 3]] : [[TR.plaster, 5], [GR.gold, 4], [GR.purple, 4]];
  for (let i = 0; i < 10; i++) { const x = r() * 64, y = r() * 64; const [Rd, t] = dots[i % dots.length]; S.px(x, y, Rd, t); S.px(x + 1, y + 1, R, 0); }
  for (let i = 0; i < 4; i++) stone(S, r, r() * 64, r() * 64, 1.6, TR.stone, { n: 5 });
  S.outline(); return S.canvas();
}
export function soilTile(seed = 5, R = TR.soil) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed * 17 + 3); base(S, R, [1, 2, 3], { cell: 12, seed });
  for (let i = 0; i < 26; i++) stone(S, r, r() * 64, r() * 64, 1.6 + r() * 2.2, R, { n: 5, sh: 0 });
  for (let i = 0; i < 6; i++) crack(S, r, r() * 64, r() * 64, 3 + r() * 5, R, 0);
  speck(S, r, 60, R, 4); speck(S, r, 50, R, 1); S.outline(); return S.canvas();
}
export function gravelTile(seed = 7) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed * 13 + 1); base(S, TR.sand, [1, 2, 2], { cell: 10, seed });
  for (let i = 0; i < 70; i++) stone(S, r, r() * 64, r() * 64, 1.4 + r() * 2.4, r() < 0.6 ? TR.stone : TR.warm, { n: 5 + Math.floor(r() * 3) });
  speck(S, r, 40, TR.sand, 4); S.outline(); return S.canvas();
}
export function earthTile(seed = 9, grassy = 0.4) { // the trodden arena: dusty earth, scuffs, pebbles, a few surviving tufts
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed * 7 + 2); base(S, TR.sand, [2, 3, 3, 4], { cell: 16, seed });
  for (let i = 0; i < 18; i++) stone(S, r, r() * 64, r() * 64, 1.2 + r() * 1.6, r() < 0.5 ? TR.stone : TR.warm, { n: 5 });
  for (let i = 0; i < 8; i++) { const x = r() * 64, y = r() * 64; for (let k = 0; k < 5; k++) S.shift(x + k, y + (k > 2 ? 1 : 0), -1); }
  for (let i = 0; i < 70 * grassy; i++) { const x = r() * 64, y = r() * 64; S.px(x, y + 1, TR.dry, 1); S.px(x, y, TR.dry, 3); S.px(x, y - 1, TR.dry, 4); }
  speck(S, r, 50, TR.sand, 5); S.outline(); return S.canvas();
}
export function cobbleTile(seed = 11) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.sand, [1, 2], { cell: 8, seed });
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const cx = i * 10.67 + (j % 2) * 5.3 + 5, cy = j * 10.67 + 5; stone(S, r, cx + (r() - 0.5) * 1.5, cy + (r() - 0.5) * 1.5, 4.6 + r() * 0.6, r() < 0.7 ? TR.stone : TR.warm, { n: 7, sx: 1.05, sy: 0.92, k: 1.6 }); }
  for (let i = 0; i < 26; i++) S.px(r() * 64, r() * 64, TR.moss, 3); S.outline(); return S.canvas();
}

// ---------------------------------------------------------------- walls, wood, roofs (64x64, ~2 world units per tile)
function masonry(S, r, R, { rows = 6, mortar = TR.sand, mt = 2, w = [8, 16] } = {}) {
  base(S, mortar, [mt - 1, mt], { cell: 8, seed: 3 }); const rh = S.h / rows;
  for (let j = 0; j < rows; j++) { let x = -r() * 8; while (x < S.w - 2) { const sw = w[0] + r() * (w[1] - w[0]); const cx = x + sw / 2, cy = j * rh + rh / 2; S.el(() => S.facet([[x + 1, cy - rh * 0.42], [x + sw - 1, cy - rh * 0.4 + (r() - 0.5)], [x + sw - 0.5, cy + rh * 0.38], [x + 1.5, cy + rh * 0.42]], R, { k: 1.5, table: 2.2, sh: r() < 0.3 ? -1 : 0 })); x += sw + 1; } }
}
export const WALL = {
  plaster(seed = 1) { const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.plaster, [3, 4, 4, 5], { cell: 20, seed }); for (let i = 0; i < 4; i++) crack(S, r, r() * 64, r() * 64, 4 + r() * 6, TR.plaster, 1); for (let i = 0; i < 3; i++) { const x = r() * 64, y = r() * 64; stone(S, r, x, y, 2.4, TR.stone, { n: 5 }); } speck(S, r, 30, TR.plaster, 2); S.outline(); return S.canvas(); },
  stone(seed = 2) { const S = new Buf(64, 64, 0, { wrap: true }); masonry(S, mulberry32(seed), TR.warm, { rows: 6 }); S.outline(); return S.canvas(); },
  rubble(seed = 3) { const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.sand, [1, 2], { cell: 8, seed }); for (let i = 0; i < 30; i++) stone(S, r, r() * 64, r() * 64, 3.5 + r() * 3.5, r() < 0.5 ? TR.warm : TR.stone, { n: 6, sy: 0.7 }); for (let i = 0; i < 14; i++) S.px(r() * 64, r() * 64, TR.moss, 3); S.outline(); return S.canvas(); },
  marble(seed = 4) { const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.marble, [3, 4, 4, 5], { cell: 22, seed }); for (let i = 0; i < 5; i++) { let x = r() * 64, y = 0; while (y < 64) { S.px(x, y, TR.marble, 2); x += r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1; y++; } } for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x++) S.px(x, y, TR.marble, 1); S.outline(); return S.canvas(); },
};
function planks(R, { paint = null, seed = 1, n = 4 } = {}) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); const pw = 64 / n; const P = paint || R;
  for (let i = 0; i < n; i++) { const x0 = Math.round(i * pw), x1 = Math.round((i + 1) * pw); const t0 = paint ? 3 : 2 + (i % 2);
    for (let y = 0; y < 64; y++) for (let x = x0; x < x1; x++) { const gr = pfbm(x * 3, y * 0.4, 64, 8, seed + i, 2); S.px(x, y, P, x === x0 ? t0 + 1 : x === x1 - 1 ? t0 - 1 : t0 + (gr > 0.62 ? 1 : gr < 0.36 ? -1 : 0)); }
    for (let y = 0; y < 64; y++) S.px(x1 - 1, y, R, 0);
    if (r() < 0.6) { const ky = r() * 64, kx = x0 + 3 + r() * (pw - 6); for (const [dx, dy, t] of [[0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, 1], [-1, 0, 3], [0, -1, 3]]) S.px(kx + dx, ky + dy, R, t); }
    for (const ny of [6, 38]) { S.px(x0 + 2, ny, GR.iron, 4); S.px(x0 + 3, ny + 1, GR.iron, 1); }
    if (paint) for (let k = 0; k < 4; k++) { const cx = x0 + r() * pw, cy = r() * 64; for (let q = 0; q < 3 + r() * 4; q++) S.px(cx + q, cy + (q % 2), R, 3); }
  }
  return S.canvas();
}
export const WOOD = {
  woodRaw: () => planks(TR.oak, { seed: 1 }), woodDark: () => planks(TR.walnut, { seed: 2 }),
  woodBlue: () => planks(TR.oak, { paint: TR.blue, seed: 3 }), woodGreen: () => planks(TR.oak, { paint: TR.green, seed: 4 }),
};
export function thatchTile(seed = 5) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.straw, [1, 2], { cell: 8, seed });
  for (let row = 0; row < 8; row++) for (let i = 0; i < 70; i++) { const x = r() * 64, y = row * 8 + r() * 3; const ln = 4 + Math.floor(r() * 5); const t = r() < 0.4 ? 4 : r() < 0.6 ? 3 : 2; for (let k = 0; k < ln; k++) S.px(x + (k > ln / 2 ? 1 : 0), y + k, TR.straw, k === 0 ? Math.min(5, t + 1) : t); S.px(x + 1, y + ln, TR.straw, 0); }
  return S.canvas();
}
export function canvasTile(seed = 6) {
  const S = new Buf(32, 32, 0, { wrap: true }); const r = mulberry32(seed); base(S, TR.cloth, [3, 4], { cell: 16, seed });
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 2 === 0) S.shift(x, y, (y % 4 < 2) ? 1 : -1);
  for (let i = 0; i < 3; i++) { const cx = r() * 32, cy = r() * 32; for (let k = 0; k < 6; k++) S.shift(cx + (r() - 0.5) * 4, cy + (r() - 0.5) * 4, -1); }
  return S.canvas();
}
export function roofTile(seed = 7) { // terracotta barrel tiles: prism-banded columns, overlapping courses, lichen
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); const cw = 8, rh = 16; const band = [1, 2, 3, 4, 5, 4, 3, 2];
  for (let row = 0; row < 4; row++) for (let c = 0; c < 8; c++) { const ox = c * cw + (row % 2) * 4, oy = row * rh; const v = r() < 0.25 ? -1 : r() < 0.2 ? 1 : 0;
    for (let y = 0; y < rh; y++) for (let x = 0; x < cw; x++) { let t = band[x] + v; if (y >= rh - 3) t -= 1; if (y === rh - 1) t = 0; S.px(ox + x, oy + y, TR.terracotta, t); }
    S.px(ox, oy, TR.terracotta, 0); for (let y = 0; y < rh; y++) S.px(ox + cw - 1, oy + y, TR.terracotta, 1); }
  for (let i = 0; i < 18; i++) { const x = r() * 64, y = r() * 64; S.px(x, y, TR.moss, 4); S.px(x + 1, y, TR.moss, 3); S.px(x, y + 1, TR.moss, 2); }
  return S.canvas();
}

// ---------------------------------------------------------------- bark (32x64: wraps round the trunk and along it)
const BARK = { olive: GR.stone, oak: ['#140e14', '#2a1e1e', '#46342c', '#66503e', '#8a7056', '#b0967a'], pine: ['#1c0a10', '#481a16', '#7a3222', '#a8502e', '#d07a46', '#f0aa70'], fir: ['#120c12', '#2c1c1a', '#4a3226', '#6a4a34', '#8c6a4a', '#b08e68'], cypress: ['#160c10', '#34201a', '#563824', '#7c5432', '#a07446', '#c49a66'], wood: GR.walnut };
export function barkTile(kind = 'oak', seed = 1) {
  const R = BARK[kind] || BARK.oak; const S = new Buf(32, 64, 0, { wrap: true }); const r = mulberry32(seed * 7 + kind.length);
  if (kind === 'pine') { // puzzle plates split by dark fissures
    base(S, R, [0, 1], { cell: 8, seed }); let y = 0; while (y < 64) { const h = 7 + Math.floor(r() * 6); let x = Math.floor(r() * 6); while (x < 32) { const w = 5 + Math.floor(r() * 5); S.el(() => S.facet([[x + 1, y + 1], [x + w - 1, y + 1 + (r() - 0.5)], [x + w - 1, y + h - 1], [x + 1, y + h - 1]], R, { k: 1.3, table: 1.6, sh: r() < 0.3 ? -1 : 0 })); x += w + 1; } y += h + 1; }
  } else { // vertical ridges: lit left edge, shaded body, dark fissures, horizontal checks, lichen
    let x = 0; while (x < 32) { const w = 3 + Math.floor(r() * 4); const ph = r() * 6; for (let yy = 0; yy < 64; yy++) { const sw = Math.round(Math.sin(yy * 0.2 + ph) * 0.8); for (let k = 0; k < w; k++) S.px(x + k + sw, yy, R, k === 0 ? 4 : k === w - 1 ? 2 : 3); S.px(x + w + sw, yy, R, 0); } x += w + 1; }
    for (let i = 0; i < 10; i++) { const cx = r() * 32, cy = r() * 64; S.px(cx, cy, R, 1); S.px(cx + 1, cy, R, 1); S.px(cx, cy - 1, R, 4); }
    if (kind === 'olive' || kind === 'oak') for (let i = 0; i < 12; i++) { const cx = r() * 32, cy = r() * 64; S.px(cx, cy, GR.moss, 4); S.px(cx + 1, cy, GR.moss, 3); S.px(cx, cy + 1, GR.moss, 2); }
  }
  return S.canvas();
}

// ---------------------------------------------------------------- water ripples (64x64): flat bands, crisp crests, glints
export function waterTile(seed = 2, R = TR.water) {
  const S = new Buf(64, 64, 0, { wrap: true }); const r = mulberry32(seed); base(S, R, [2, 3], { cell: 22, seed });
  for (let i = 0; i < 26; i++) { const x = r() * 64, y = r() * 64, w = 3 + Math.floor(r() * 7); for (let k = 0; k < w; k++) S.px(x + k, y + (k === 0 || k === w - 1 ? 1 : 0), R, k < w / 2 ? 5 : 4); for (let k = 1; k < w - 1; k++) S.px(x + k, y + 1, R, 1); }
  for (let i = 0; i < 6; i++) { const x = r() * 64, y = r() * 64; S.px(x, y, R, 5); }
  return S.canvas();
}
export const clampTone = (t) => clamp(t, 0, 5);

// ---------------------------------------------------------------- chimney smoke puff (32x32 sprite, not tiled): faceted cloud lobes
export function smokePuff(seed = 3) {
  const S = new Buf(32, 32); const r = mulberry32(seed); const R = GR.smoke;
  for (const [x, y, rad] of [[16, 19, 8], [10, 21, 5.5], [22, 21, 5.5], [13, 13, 6], [20, 14, 5]]) S.el(() => S.facet(ngon(x, y, rad, 7, r() * 6, 1, 0.9), R, { k: 1.5, table: rad * 0.45, sh: 0 }));
  S.outline(); return S.canvas();
}
// laundry: a flat sheet colour with a pixel weave and an optional stripe / check
export function clothTile(hex, kind = 0, seed = 1) {
  const S = new Buf(32, 32, 0, { wrap: true }); const R = [hex, hex, hex, hex, hex, hex].map((h, i) => shade(h, [-0.42, -0.26, -0.12, 0, 0.1, 0.2][i])); base(S, R, [3, 3, 4], { cell: 16, seed });
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { if ((x + y) % 2 === 0 && y % 4 < 2) S.shift(x, y, -1); if (kind === 1 && (y % 16) >= 4 && (y % 16) < 7) S.px(x, y, TR.plaster, 4); if (kind === 2 && ((x >> 3) + (y >> 3)) % 2 === 0) S.shift(x, y, -1); }
  return S.canvas();
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }

// ---------------------------------------------------------------- small pixel sprites for the 3D scenes
const PLAIN = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
export function runeRing(size = 96) { // the gravity shimmer under Newton: two rings, ticks, a hexagram, 1px pixel lines (white, tinted in 3D)
  const S = new Buf(size, size); const c = size / 2; const ring = (rad) => { const n = Math.ceil(rad * 7); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; S.px(c + Math.cos(a) * rad, c + Math.sin(a) * rad, PLAIN, 5); } };
  ring(c - 3); ring(c - 9); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; for (let q = c - 8; q < c - 3; q++) if (i % 3 === 0 || q > c - 6) S.px(c + Math.cos(a) * q, c + Math.sin(a) * q, PLAIN, 5); }
  for (let k = 0; k < 6; k++) { const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 2) / 6) * Math.PI * 2; const R0 = c * 0.66; const n = Math.ceil(R0 * 2.2); for (let i = 0; i <= n; i++) { const u = i / n; S.px(c + (Math.cos(a0) * (1 - u) + Math.cos(a1) * u) * R0, c + (Math.sin(a0) * (1 - u) + Math.sin(a1) * u) * R0, PLAIN, 5); } }
  return S.canvas();
}
export function dragonfly() { // 16x16: teal body, four glassy wings
  const S = new Buf(16, 16); const W = ['#3a5a7a', '#6a90b0', '#9ac0d8', '#c8e6f4', '#e8f8ff', '#ffffff'];
  for (const [ax, ay, bx, by] of [[8, 5, 1, 3], [8, 5, 15, 3], [8, 7, 2, 9], [8, 7, 14, 9]]) S.el(() => S.leaf(ax, ay, bx, by, 1.4, W, -1), { shadow: 0 });
  S.el(() => { for (let y = 3; y < 15; y++) S.px(8, y, GR.clothTeal, y < 5 ? 4 : 2); S.px(7, 3, GR.clothTeal, 5); S.px(9, 3, GR.clothTeal, 3); });
  S.outline(); return S.canvas();
}
