// Pixel-art leaf-spray cards for the 3D trees and bushes (64x64, alpha cut-out): twigs radiating from the centre
// carrying faceted leaves (lit half / shaded half, bright tips), back leaves a tone darker, front leaves casting a 1px
// shadow, a tinted dark outline on the shadow side; fruit, blossoms and berries are hand-placed stamps.
import { Buf, PR } from './plants.js';
import { GR } from './ramps.js';
import { mulberry32 } from '../../core/util.js';

const LR = {
  olive: ['#141c20', '#26382e', '#3e5a40', '#64805a', '#94aa7c', '#ccd8aa'], oak: ['#0a1a14', '#163a1e', '#26602a', '#40862e', '#70b03c', '#b8dc64'],
  laurel: ['#08161a', '#123020', '#1e5028', '#30722e', '#58983a', '#9cc65a'], apple: ['#0a1a16', '#16381e', '#245c26', '#3c8630', '#68ae40', '#b0d866'],
  pine: ['#0a1820', '#14302a', '#204c32', '#346e3a', '#5a944a', '#9cc06a'], fir: ['#081420', '#10282a', '#1a4232', '#2a6040', '#48844e', '#80aa66'],
  cypress: ['#0a141a', '#142820', '#203e28', '#305a30', '#4e7c3c', '#86a85a'], myrtle: ['#0a1814', '#14341e', '#22522a', '#367632', '#5e9e40', '#a0c868'],
  broom: ['#101c10', '#22381a', '#3a5a22', '#5a822a', '#86ac38', '#c4d870'],
};
const TWIG = GR.walnut;
export const LEAF_KINDS = {
  olive: { R: LR.olive, len: [7, 10], w: 1.1, n: 230 }, oak: { R: LR.oak, len: [7, 10], w: 2.6, n: 130, lobed: true }, laurel: { R: LR.laurel, len: [8, 11], w: 1.6, n: 170 },
  apple: { R: LR.apple, len: [6, 9], w: 2.2, n: 150, fruit: GR.apple, fruitN: 5 }, golden: { R: LR.apple, len: [6, 9], w: 2.2, n: 140, fruit: GR.gold, fruitN: 4 },
  pine: { R: LR.pine, needle: true, n: 40 }, fir: { R: LR.fir, fish: true, n: 8 }, cypress: { R: LR.cypress, scale: true, n: 10 },
  bush: { R: LR.apple, len: [5, 7], w: 2, n: 200 }, oleander: { R: LR.laurel, len: [7, 10], w: 1.3, n: 160, bloom: PR.pink, bloomN: 10 },
  broom: { R: LR.broom, needle: true, n: 30, small: true, pea: GR.gold, bloomN: 40 }, myrtle: { R: LR.myrtle, len: [4, 6], w: 1.6, n: 240, bloom: PR.white, bloomN: 12 },
  vine: { R: GR.leaf, len: [7, 9], w: 2.8, n: 100, lobed: true, grapes: true },
};
const APPLE = { rows: ['..s..', '.433.', '45432', '34321', '.221.'], ax: 2, ay: 2 };
const BLOOM = { rows: ['.4.', '5y3', '.3.'], ax: 1, ay: 1 };
const PEA = { rows: ['54', '42'], ax: 0, ay: 0 };

export function leafCard(kind = 'oak') {
  const L = LEAF_KINDS[kind] || LEAF_KINDS.oak; const R = L.R; const S = new Buf(64, 64); const r = mulberry32(kind.length * 977 + kind.charCodeAt(0)); const c = 32;
  const lit = (x, y) => ((x - c) * -0.6 + (y - c) * -0.75 > 2 ? 0 : (x - c) * -0.6 + (y - c) * -0.75 < -9 ? -1 : r() < 0.5 ? 0 : -1); // the spray's own light side
  const twig = (a, len) => { const ex = c + Math.cos(a) * len, ey = c + Math.sin(a) * len; S.el(() => S.stroke(S.curve([c, c], [c + Math.cos(a + 0.25) * len * 0.5, c + Math.sin(a + 0.25) * len * 0.5], [ex, ey]), TWIG, 2, 1, (u) => (u < 0.4 ? 2 : 3), 0.35)); return [ex, ey]; };
  if (L.needle) { // fascicles: fans of 1px needles on short twigs
    const fans = []; for (let i = 0; i < L.n; i++) { const a = r() * Math.PI * 2, d = 2 + Math.pow(r(), 0.85) * 22; fans.push([c + Math.cos(a) * d, c + Math.sin(a) * d, a]); }
    fans.sort((p, q) => p[1] - q[1]); for (let i = 0; i < 6; i++) twig((i / 6) * Math.PI * 2 + 0.3, 20);
    for (const [x, y, a] of fans) S.el(() => { const sh = lit(x, y); const nn = L.small ? 8 : 13; for (let k = 0; k < nn; k++) { const b = a + (k / (nn - 1) - 0.5) * 2.6; const ln = (L.small ? 6 : 8) + r() * 4; for (let q = 1; q <= ln; q++) S.px(x + Math.cos(b) * q, y + Math.sin(b) * q, R, (q === Math.floor(ln) ? 5 : k % 3 ? 3 : 4) + sh); } });
    if (L.pea) for (let i = 0; i < L.bloomN; i++) { const [x, y, a] = fans[i % fans.length]; S.el(() => S.stamp(PEA, x + Math.cos(a) * (3 + r() * 4), y + Math.sin(a) * (3 + r() * 4), L.pea)); }
  } else if (L.fish) { // fir: flat sprays, a 1px rachis with needles both sides
    const sprig = (x, y, a, len, depth) => { const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; S.el(() => { const sh = lit(ex, ey); const n = Math.ceil(len); for (let i = 0; i <= n; i++) { const px = x + (ex - x) * (i / n), py = y + (ey - y) * (i / n); S.px(px, py, R, 1 + sh); if (i % 2 === 0 && i > 1) for (const sd of [-1, 1]) { const b = a + sd * 1.1; const nl = 3 * (1 - (i / n) * 0.5); for (let q = 1; q <= nl; q++) S.px(px + Math.cos(b) * q, py + Math.sin(b) * q, R, (sd < 0 ? 4 : 2) + sh + (q >= nl - 0.5 ? 1 : 0)); } } });
      if (depth > 0) for (let k = 0; k < 2; k++) { const t = 0.35 + k * 0.3; sprig(x + (ex - x) * t, y + (ey - y) * t, a + (k % 2 ? 0.75 : -0.75), len * 0.45, depth - 1); } };
    for (let i = 0; i < L.n; i++) sprig(c, c, (i / L.n) * Math.PI * 2 + r() * 0.4, 24 + r() * 4, 1);
  } else if (L.scale) { // cypress: dense scale-leaf fronds branching fractally, drawn as 2px clustered strokes
    const frond = (x, y, a, len, w, depth) => { const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; S.el(() => S.stroke(S.curve([x, y], [(x + ex) / 2 + Math.cos(a + 1.5) * 1.2, (y + ey) / 2 + Math.sin(a + 1.5) * 1.2], [ex, ey]), R, w, 1, (u, sd) => (u > 0.8 ? 4 : 3) + (sd > 0 ? -1 : 0) + lit(ex, ey), 0.9));
      if (depth <= 0) return; for (let k = 1; k <= 3; k++) { const t = k / 4; frond(x + (ex - x) * t, y + (ey - y) * t, a + (k % 2 ? 0.8 : -0.8), len * 0.45, Math.max(1, w - 1), depth - 1); } };
    for (let i = 0; i < L.n; i++) frond(c, c, (i / L.n) * Math.PI * 2 + r() * 0.5, 20 + r() * 6, 3, 2);
  } else { // broadleaves along twigs, alternating sides, back to front
    const twigs = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r() * 0.6; twigs.push([a, 22 + r() * 6]); }
    for (const [a, len] of twigs) twig(a, len);
    const lv = []; for (let i = 0; i < L.n; i++) { const [a, len] = twigs[i % twigs.length]; const t = 0.15 + Math.sqrt(r()) * 0.85; const aa = a + (r() - 0.5) * 0.9; const x = c + Math.cos(aa) * len * t + (r() - 0.5) * 3, y = c + Math.sin(aa) * len * t + (r() - 0.5) * 3; const la = a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7); lv.push([x, y, la, L.len[0] + r() * (L.len[1] - L.len[0])]); }
    lv.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1])).reverse(); // bottom-right leaves first: the lit top-left ones land on top
    for (const [x, y, a, ln] of lv) S.el(() => { const sh = lit(x, y); const bx = x + Math.cos(a) * ln, by = y + Math.sin(a) * ln; S.leaf(x, y, bx, by, L.w, R, sh); if (L.lobed) for (const u of [0.35, 0.65]) for (const sd of [-1, 1]) { const px = x + (bx - x) * u, py = y + (by - y) * u; const nx = -Math.sin(a) * sd, ny = Math.cos(a) * sd; S.px(px + nx * (L.w + 0.8), py + ny * (L.w + 0.8), R, (sd < 0 ? 4 : 2) + sh); } });
  }
  if (L.fruit) for (let i = 0; i < L.fruitN; i++) { const a = r() * 6.28, d = 6 + r() * 16; S.el(() => S.stamp(APPLE, c + Math.cos(a) * d, c + Math.sin(a) * d, L.fruit, { s: [TWIG, 1] })); }
  if (L.grapes) for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = 8 + r() * 12; const x0 = c + Math.cos(a) * d, y0 = c + Math.sin(a) * d; S.el(() => { for (const [dx, dy] of [[0, 0], [2, 0], [1, 2], [-1, 2], [3, 2], [0, 4], [2, 4], [1, 6]]) { S.px(x0 + dx, y0 + dy, GR.purple, 4); S.px(x0 + dx + 1, y0 + dy, GR.purple, 2); S.px(x0 + dx, y0 + dy + 1, GR.purple, 2); S.px(x0 + dx + 1, y0 + dy + 1, GR.purple, 1); } }); }
  if (L.bloom) for (let i = 0; i < L.bloomN; i++) { const a = r() * 6.28, d = 5 + r() * 20; S.el(() => S.stamp(BLOOM, c + Math.cos(a) * d, c + Math.sin(a) * d, L.bloom, { y: [GR.amber, 4] })); }
  S.outline(); return S.canvas();
}
