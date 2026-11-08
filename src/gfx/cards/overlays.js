// Move cards: the core subject layered with hand-drawn modifier overlays (motion lines, weight tags, swirls,
// dust, flames, arcs, droplets, a lens glint, a spring) on a banded sky, or a cosmic sky for named specials.
import { Spr, ell, rng, ramp, glint, layer } from './kit.js';
import { K } from './pal.js';
import { SUBJECTS, droplet, coil, flames, goldenApple } from './subjects.js';
import { MAGIC } from './magic.js';
import { Glow, arc, mote, runeCircle, AUR, ARC } from './magic.js';
import { backdrop, shadow } from './backdrops.js';
import { BASICS } from '../../game/data/cards.js';

const AW = 106, AH = 63;
const WIND = ramp('#3a4a6e', '#6a7aa0', '#9aaac4', '#c4d0e0', '#e4ecf4', '#f8fbff', '#ffffff');
const DUST = ramp('#3a2a22', '#5e4634', '#86684c', '#a88a68', '#c8ac88', '#e2ccaa', '#f6eedc');

const MINI_WEIGHT = [
  '...oooo...',
  '..ohhllo..',
  '..oh..lo..',
  '.oooooooo.',
  '.ohhhmmmo.',
  'ohmmmmmmdo',
  'ohmmmmmmdo',
  'ohmmmmmmdo',
  'ommmmmmddo',
  'oddddddddo',
  'oooooooooo',
];
const MINI_LENS = [
  '..oooo.......',
  '.obhhbo......',
  'obwccdbo.....',
  'ohwcccdo.....',
  'ohccccbo.....',
  'obcccdbo.....',
  '.obbbbbo.....',
  '..ooooobo....',
  '......owko...',
  '.......okko..',
  '........okko.',
  '.........oko.',
  '..........o..',
];

export function coreSubject(id, art) {
  const base = BASICS[id]?.mutantOf || id;
  if (art.hot && base === 'stone') return SUBJECTS.lava();
  const f = SUBJECTS[id] || MAGIC[id] || SUBJECTS[base] || MAGIC[base] || SUBJECTS.apple;
  return f();
}

export function moveArt(move, compose) {
  const art = move.art; const special = !!move.special;
  const bg = backdrop(special ? 'special' : 'move', move.key.length * 31 + 7);
  const sub = coreSubject(art.core, art);
  const bb = sub.bounds(); const gy = bg.ground; const r = rng(move.key.length * 13 + 5);
  const lift = (art.falling ? 6 : 0) + (art.bouncy ? 9 : 0);
  // place the core
  let ox = Math.round(AW / 2 - (sub.ax ?? (bb.x0 + bb.x1) / 2)) + (art.fast || art.rolling ? 6 : 0);
  let oy;
  if (gy != null) oy = gy + 1 - (sub.ay ?? bb.y1) - lift - (sub.float ? 4 : 0);
  else oy = Math.round(AH / 2 - (bb.y0 + bb.y1 + 1) / 2);
  if (oy + bb.y0 < 1) oy = 1 - bb.y0;
  const X0 = ox + bb.x0, X1 = ox + bb.x1, Y0 = oy + bb.y0, Y1 = oy + bb.y1, CX = Math.round((X0 + X1) / 2), CY = Math.round((Y0 + Y1) / 2);
  if (gy != null) shadow(bg, CX, gy, Math.min(60, bb.w * (lift ? 0.6 : 0.8)));
  // ---- behind the core ----
  if (art.fast) for (const [dy, len] of [[-8, 16], [-3, 22], [2, 18], [7, 24], [12, 14]]) { const y = CY + dy; const x1 = X0 - 2, x0 = x1 - len; for (let x = x0; x <= x1; x++) bg.px(x, y, x < x0 + 3 ? WIND[3] : x > x1 - 4 ? WIND[6] : WIND[5]); }
  if (art.falling) for (const [dx, len] of [[-9, 10], [-3, 16], [3, 12], [9, 8]]) { const x = CX + dx; for (let y = Y0 - len - 1; y < Y0 - 1; y++) bg.px(x, y, y < Y0 - len + 3 ? WIND[3] : WIND[5]); }
  if (art.rolling && gy != null) { for (const [x, y, rr] of [[X0 - 6, gy - 2, 4], [X0 - 13, gy - 1, 3], [X0 - 19, gy, 2]]) { const t = new Spr(AW, AH); t.fill(ell(x, y, rr + 1, rr), DUST[3]); t.fill(ell(x - 0.7, y - 0.7, rr, rr - 0.5), DUST[4]); t.fill(ell(x - 1.2, y - 1.2, rr * 0.5, rr * 0.45), DUST[5]); t.outline({ col: DUST[1] }); t.draw(bg); } }
  const swirl = art.spin ? (front) => { const g = new Glow(AW, AH); const rx = Math.max(16, bb.w * 0.62), ry = 5; const a0 = front ? 0.15 : Math.PI + 0.2, a1 = front ? Math.PI - 0.25 : Math.PI * 2 - 0.2; g.path(arc(CX, CY + 2, rx, ry, a0, a1), WIND, [0.5, 1.1], [6, 4]); g.path(arc(CX, CY - 6, rx * 0.8, ry * 0.8, a0 + 0.3, a1 - 0.3), WIND, [0.5], [5]); g.draw(bg); if (front) { const a = a0; const x = CX + Math.cos(a) * rx, y = CY + 2 + Math.sin(a) * ry; bg.grid(['ww.', 'wWw', 'ww.'], { w: WIND[5], W: WIND[6] }, Math.round(x) - 1, Math.round(y) - 1); } } : null;
  if (swirl) swirl(false);
  if (art.electric) { const g = new Glow(AW, AH); for (let k = 0; k < 3; k++) { const a0 = 0.6 + k * 2.1; const pts = []; for (let i = 0; i <= 7; i++) { const a = a0 + i * 0.22; const d = Math.max(bb.w, bb.h) * 0.62 + (i % 2 ? 3 : -2); pts.push([CX + Math.cos(a) * d, CY + Math.sin(a) * d * 0.8]); } g.path(pts, K.elec, [0.5, 1.1, 1.7], [6, 5, 3]); } g.draw(bg); }
  if (art.bouncy && gy != null) { const sp = coil({ turns: 3, rx: 7, pitch: 4, top: 3, w: 20, thick: 1.2, ry: 1.8 }); sp.draw(bg, CX - 10, gy + 3 - sp.h + 1); }
  // ---- the core ----
  sub.draw(bg, ox, oy);
  // ---- in front ----
  if (swirl) swirl(true);
  if (art.hot && !(BASICS[art.core]?.mutantOf === 'stone' || art.core === 'stone' || art.core === 'heat' || art.core === 'plasma')) {
    const t = new Spr(AW, AH); flames(t, [[X0 + 3, Y1 + 1, 7, 13, -2], [X0 + 8, Y1 + 1, 5, 9, -1], [X1 - 3, Y1 + 1, 7, 14, 2], [X1 - 8, Y1 + 1, 5, 8, 1]]); t.draw(bg);
    for (const [x, y] of [[X0 + 2, Y0 + 4], [X1 - 1, Y0 + 2], [CX + 4, Y0 - 3]]) { bg.px(x, y, K.flame[5]); bg.px(x, y + 1, K.flame[3]); }
  }
  if (art.wet) { const d = droplet({ small: true }); for (const [x, y] of [[X0 - 8, Y0 + 2], [X1 + 1, Y0 + 8], [X0 - 3, Y1 - 14]]) d.draw(bg, Math.max(0, Math.min(AW - d.w, x)), Math.max(0, y)); }
  if (art.heavy) { const I = K.iron; const n = Math.min(3, art.heavy); for (let i = 0; i < n; i++) { const x = Math.max(1, X0 - 13) + (i % 2) * 2, y = (gy ?? AH - 4) - 10 - i * 10; bg.grid(MINI_WEIGHT, { o: I[0], d: I[2], m: I[3], l: I[4], h: I[5] }, x, y); } if (gy != null && art.heavy >= 2) for (const [x0, len] of [[CX - 14, 5], [CX + 9, 6]]) for (let i = 0; i < len; i++) bg.px(x0 + i, gy + 1 + (i % 2), K.stone[1]); }
  if (art.focus) { bg.grid(MINI_LENS, { o: '#1a0c14', b: K.brass[4], h: K.brass[5], c: K.ice[4], d: K.ice[3], w: '#ffffff', k: K.oak[3] }, Math.min(AW - 14, X1 + 1), Math.max(1, Y0 - 2)); glint(bg, 'big', Math.min(AW - 5, X1 + 4), Math.max(4, Y0 + 2), '#fff4c0', '#ffffff'); }
  if (special) { for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = Math.max(bb.w, bb.h) * 0.55 + r() * 8; mote(bg, CX + Math.cos(a) * d, CY + Math.sin(a) * d * 0.7, i % 2 ? AUR : ARC, i === 0); } }
  return bg;
}

export function backArt() {
  const bg = backdrop('special', 77);
  runeCircle(bg, 53, 31, 28, 28, AUR, { glyphs: 10, seed: 5, inner: 0.84, bright: 5 });
  const a = goldenApple(); const bb = a.bounds();
  a.draw(bg, Math.round(53 - (bb.x0 + bb.x1) / 2), Math.round(32 - (bb.y0 + bb.y1) / 2));
  return bg;
}
void layer;
