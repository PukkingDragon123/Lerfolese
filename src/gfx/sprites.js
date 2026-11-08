// Pixel sprites: intent icons (16x16 faceted gem-style pixel art, dark tinted outline, one hard glint)
// and particle sprites (painted in grey values so the particle tint colours them; they fit 16px atlas cells).
import { PixelCanvas, gridSprite } from './pixel.js';
import { Painter, M, N, mat, norm3, glint } from './art/core.js';

import { gem, ngon, blade, bar, plane, star } from './art/geo.js';
import { GR, GM } from './art/ramps.js';

// 16x16 intent icons: faceted gem planes, 6-tone jewel ramps, ridge highlights, one hard glint each
const icon16 = (fn) => () => { const P = new Painter(16, 16); const post = fn(P); const pc = P.render(); if (post) post(pc, P); return pc; };
const ICONS = {
  sword: icon16((P) => { gem(P, [[13, 1], [15, 1], [15, 3], [7, 11], [5, 9]], GM.iron, { k: 1.3, cast: 0 }); P.add(M.poly(bar(3, 8, 8, 13, 1)), { m: GM.gold, n: plane(-0.4, -0.4), ridge: 1, cast: 1, contour: 1 }); P.add(M.poly(bar(5, 11, 2, 14, 0.9)), { m: GM.leather, n: plane(-0.3, 0), cast: 1, contour: 1 }); gem(P, ngon(1.6, 14.4, 1.4, 6), GM.gold, { cast: 1 }); return (pc) => { pc.px(13, 2, '#ffffff'); pc.px(12, 3, GR.iron[5]); }; }),
  shield: icon16((P) => { P.add(M.sub(M.poly(ngon(8, 8, 7.6, 12, Math.PI / 12)), M.poly(ngon(8, 8, 5.4, 12, Math.PI / 12))), { m: GM.bronze, n: facet12(8, 8), ridge: 1 }); gem(P, ngon(8, 8, 5.4, 12, Math.PI / 12), GM.blue, { k: 1, table: 2.5, cast: 0 }); return (pc) => { for (const [x, y] of [[8, 4], [7, 5], [9, 5], [7, 6], [9, 6], [6, 7], [10, 7], [6, 8], [10, 8], [5, 9], [11, 9], [5, 10], [11, 10]]) pc.px(x, y, GR.cream[4]); pc.px(4, 3, '#ffffff'); }; }),
  eye: icon16((P) => { gem(P, [[1, 8], [5, 4], [11, 4], [15, 8], [11, 12], [5, 12]], GM.cream, { k: 0.8, table: 2, cast: 0 }); gem(P, ngon(8.5, 8, 3.4, 8, Math.PI / 8), GM.green, { k: 1.1, table: 1.2, cast: 0 }); P.add(M.poly([[1, 8], [5, 3.5], [11, 3.5], [15, 8], [11, 5], [5, 5]]), { m: GM.slime, n: plane(0, -0.6), ridge: 1, cast: 1 }); return (pc) => { pc.px(8, 7, '#08060a'); pc.px(8, 8, '#08060a'); pc.px(8, 9, '#08060a'); pc.px(7, 6, '#ffffff'); }; }),
  up: icon16((P) => { gem(P, [[8, 1], [15, 8], [11, 8], [11, 15], [5, 15], [5, 8], [1, 8]], GM.green, { k: 1.2, table: 1.4, cast: 0 }); return (pc) => pc.px(7, 3, '#ffffff'); }),
  down: icon16((P) => { gem(P, [[8, 15], [15, 8], [11, 8], [11, 1], [5, 1], [5, 8], [1, 8]], GM.purple, { k: 1.2, table: 1.4, cast: 0 }); return (pc) => pc.px(6, 3, '#ffffff'); }),
  skull: icon16((P) => { gem(P, [[3, 4], [6, 1], [10, 1], [13, 4], [13, 9], [11, 11], [11, 14], [5, 14], [5, 11], [3, 9]], GM.bone, { k: 1.1, table: 2.2, cast: 0 }); return (pc) => { for (const [x, y] of [[5, 6], [6, 6], [5, 7], [6, 7], [10, 6], [11, 6], [10, 7], [11, 7], [8, 9], [6, 12], [8, 12], [10, 12]]) pc.px(x, y, '#140a10'); pc.px(6, 6, '#e2423a'); pc.px(10, 6, '#e2423a'); pc.px(5, 2, '#ffffff'); }; }),
  question: icon16((P) => { const q = [[4, 5], [5, 2], [8, 1], [11, 2], [12, 5], [10, 8], [9, 9], [9, 11], [7, 11], [7, 8], [9, 6], [10, 5], [9, 3], [7, 3], [6, 5]]; gem(P, q, GM.gold, { k: 1.2, cast: 0 }); gem(P, [[7, 12], [9, 12], [9, 14], [7, 14]], GM.gold, { k: 1.2, cast: 0 }); return (pc) => pc.px(6, 2, '#ffffff'); }),
  heart: icon16((P) => { gem(P, [[8, 4], [10, 2], [13, 2], [15, 5], [14, 9], [8, 15], [2, 9], [1, 5], [3, 2], [6, 2]], GM.red, { k: 1.2, table: 2.4, cast: 0 }); return (pc) => { pc.px(4, 4, '#ffffff'); pc.px(5, 4, GR.red[5]); }; }),
  coin: icon16((P) => { gem(P, ngon(8, 8, 7.4, 8, Math.PI / 8), GM.gold, { k: 1.3, table: 4.4, cast: 0 }); gem(P, [[8, 4], [10, 6], [10, 10], [8, 12], [6, 10], [6, 6]], GM.gold, { k: 1, cast: 1 }); return (pc) => { pc.px(7, 6, GR.gold[0]); pc.px(9, 6, GR.gold[0]); pc.px(3, 3, '#ffffff'); }; }),
  steal: icon16((P) => { gem(P, [[6, 1], [14, 2], [12, 10], [5, 9]], GM.cream, { k: 0.8, table: 2, cast: 1 }); gem(P, [[8, 3], [12, 4], [11, 8], [7, 7]], GM.purple, { k: 0.8, cast: 0 }); gem(P, [[1, 15], [1, 11], [4, 8], [6, 5], [7, 7], [9, 6], [10, 8], [7, 11], [5, 15]], GM.green, { k: 1.1, table: 1, cast: 1 }); }),
  note: icon16((P) => { gem(P, [[2, 12], [4, 10], [7, 10], [8, 12], [6, 15], [3, 15]], GM.gold, { k: 1.2, cast: 0 }); P.add(M.rect(7, 2, 1.6, 10), { m: GM.gold, n: plane(-0.3, 0), cast: 0 }); gem(P, [[7, 1], [13, 4], [13, 8], [11, 6], [8.6, 5]], GM.gold, { k: 1.2, cast: 0 }); return (pc) => pc.px(3, 11, '#ffffff'); }),
  zzz: icon16((P) => { gem(P, [[1, 6], [8, 6], [8, 8], [4, 13], [8, 13], [8, 15], [1, 15], [1, 13], [5, 8], [1, 8]], GM.blue, { k: 1, cast: 0 }); gem(P, [[9, 1], [15, 1], [15, 3], [12, 6], [15, 6], [15, 8], [9, 8], [9, 6], [12, 3], [9, 3]], GM.blue, { k: 1, cast: 0 }); }),
  wine: icon16((P) => { gem(P, [[1, 4], [15, 4], [13, 8], [9, 9], [7, 9], [3, 8]], GM.clay, { k: 1.1, table: 1.2, cast: 1 }); P.add(M.poly([[2, 4], [14, 4], [13, 5.6], [3, 5.6]]), { m: GM.wine, n: plane(0, -0.8), ridge: 1, contour: 1 }); gem(P, [[7, 9], [9, 9], [9, 12], [7, 12]], GM.ink, { k: 1, cast: 1 }); gem(P, [[4, 13], [12, 13], [11, 15], [5, 15]], GM.ink, { k: 1, cast: 1 }); return (pc) => { pc.px(4, 4, GR.wine[5]); for (let x = 4; x < 12; x += 2) pc.px(x, 7, GR.ink[1]); }; }),
  hand: icon16((P) => { gem(P, [[3, 15], [2, 9], [3, 4], [5, 4], [5, 2], [7, 2], [8, 3], [9, 2], [11, 3], [12, 5], [14, 7], [13, 10], [11, 15]], GM.leather, { k: 1.1, table: 2, cast: 0 }); return (pc, P2) => { P2.shiftLine([[5, 4], [5, 8]], -1); P2.shiftLine([[8, 3], [8, 8]], -1); P2.shiftLine([[11, 4], [11, 8]], -1); }; }),
};
function facet12(cx, cy) { return (x, y) => { const a = Math.round(Math.atan2(y - cy, x - cx) / (Math.PI / 6)) * (Math.PI / 6); const r = Math.hypot(x - cx, y - cy); const s = r < 6.5 ? -0.9 : 1.2; return norm3(Math.cos(a) * s, Math.sin(a) * s, 1); }; }

// ---------------------------------------------------------------- particles (grey values; tinted per particle)
// palette: k outline, d dark, m mid, l light, w white, plus a few fixed colours for untinted sprites
const PP = { k: '#3c3a40', d: '#6c6a70', m: '#a2a0a6', l: '#d4d2d6', w: '#ffffff', r: '#c8443a', R: '#7a1a22', p: '#f6b3a0', y: '#f2c14e', c: '#f4ead0', b: '#6a1a2e', B: '#a02c48', o: '#2a0a14' };
const PSPR = {
  spark: ['...w...', '...l...', '..lwl..', 'wlwwwlw', '..lwl..', '...l...', '...w...'],
  spark2: ['.l.', 'lwl', '.l.'],
  dot: ['.l.', 'lwl', '.l.'],
  ember: ['..l..', '.lwl.', 'lwwwl', 'lwwwl', '.lwl.'],
  star4: ['....w....', '....l....', '....w....', '...lwl...', 'wlwwwwwlw', '...lwl...', '....w....', '....l....', '....w....'],
  leaf: ['......kkk', '....kkmlk', '..kkmlmlk', '.kmlmlmk.', 'kdmmldk..', 'kddmdk...', '.kkkk....'],
  petal: ['.kkk.', 'kwllk', 'klwlk', 'kmlmk', '.kmk.'],
  drop: ['..k..', '.kmk.', '.kmk.', 'kmwmk', 'kmlmk', 'kdmdk', '.kkk.'],
  smoke: ['....kkkk....', '..kkmlllk...', '.kmllwwlkkk.', 'kmlwwllmllk.', 'kmllllmmlllk', 'kdmmlmmdmmlk', '.kddmmddddk.', '..kkkddkkk..'],
  chip: ['kkkk..', 'klmmkk', 'kdmmmk', '.kkddk', '...kk.'],
  stonechip: ['.kkk..', 'kllmk.', 'klmmdk', 'kmmddk', '.kkkk.'],
  applebit: ['.kkk.', 'krrck', 'kRrck', '.kkk.'],
  firefly: ['..l..', '.lwl.', 'lwwwl', '.lwl.', '..l..'],
  note_p: ['...kkk.', '...klwk', '...kk.k', '...k...', '.kkk...', 'kwlk...', 'kllk...', '.kk....'],
  bubble: ['.kkkk.', 'kw..lk', 'kl...k', 'k....k', 'k...dk', '.kkkk.'],
  wine_p: ['..o..', '.oBo.', 'oBpBo', 'obBbo', '.ooo.'],
  heart_p: ['.kk.kk.', 'krrkrrk', 'krprrrk', 'krrrrRk', '.krrRk.', '..kRk..', '...k...'],
  coin_p: ['.kkkk.', 'kyyyyk', 'ky..yk', 'ky..yk', 'kyyyyk', '.kkkk.'],
  skull_p: ['.kkkk.', 'kcccck', 'kokcok', 'kcccck', '.kckc.', '.kkkk.'],
};

export const SPR = { ...ICONS, ...PSPR };
const cache = new Map();
export function sprite(name) {
  if (!cache.has(name)) {
    const s = SPR[name] ?? SPR.question; let pc;
    if (typeof s === 'function') pc = s(); else pc = gridSprite(s, PP);
    cache.set(name, pc);
  }
  return cache.get(name);
}

// Particle atlas: 8x8 grid of 16px cells (grey-value sprites, tinted per particle). Icons in the atlas use small variants.
export const ATLAS_NAMES = ['spark', 'spark2', 'dot', 'ember', 'star4', 'leaf', 'petal', 'drop', 'smoke', 'chip', 'stonechip', 'applebit', 'firefly', 'note', 'bubble', 'wine', 'heart', 'coin', 'skull'];
const SMALL = { heart: 'heart_p', coin: 'coin_p', skull: 'skull_p', note: 'note_p', wine: 'wine_p' };
export function buildAtlas() {
  const cell = 16, n = 8; const pc = new PixelCanvas(cell * n, cell * n);
  ATLAS_NAMES.forEach((name, i) => {
    const s = sprite(SMALL[name] || name); const cx = (i % n) * cell + Math.floor((cell - s.w) / 2), cy = Math.floor(i / n) * cell + Math.floor((cell - s.h) / 2);
    pc.blit(s, cx, cy);
  });
  return { pc, cell, n, index: (name) => Math.max(0, ATLAS_NAMES.indexOf(name)) };
}
