// Map standees for the diorama: small, richly detailed geometric pixel pieces standing on the board (bottom row = ground).
import { Painter, M, norm3, hash2, glint, text } from './core.js';
import { roof, plane, gem, facetDisc, prismV, prismH, ngon, bar, blade } from './geo.js';
import { GR, GM } from './ramps.js';
import { nail, grainLines } from './props.js';
import { campfire } from './field.js';

function mound(P, cx, w, H) { // faceted turf mound with grass blades
  gem(P, [[cx - w, H - 1], [cx - w * 0.6, H - 4], [cx + w * 0.6, H - 4], [cx + w, H - 1]], GM.dirt, { k: 1, table: 1.2, cast: 0 });
  for (let i = 0; i < 6; i++) { const x = cx - w * 0.75 + (i / 5) * w * 1.5; gem(P, [[x - 1, H - 3], [x + 0.4, H - 6 - (i % 2) * 2], [x + 1, H - 3]], GM.grass, { k: 1, cast: 0, contour: 0 }); }
}
function pennant(P, x0, y0, w, h, m, torn = false) { // stepped, waving cloth as angular panels
  const pts = [[x0, y0], [x0 + w * 0.5, y0 + 1], [x0 + w, y0 - 0.5], [x0 + w * (torn ? 0.8 : 0.75), y0 + h * 0.5], [x0 + w, y0 + h], [x0 + w * 0.5, y0 + h - (torn ? 2 : 0)], [x0, y0 + h]];
  P.add(M.poly(pts), { m, n: (x) => norm3(((x - x0) / w) < 0.5 ? -0.5 : 0.4, -0.2, 1), ridge: 1, cast: 1, contour: 1 });
}

export function mk_battle() { // bronze aspis on a post, crossed spears behind, red pennant
  const P = new Painter(32, 48);
  for (const [x0, y0, x1, y1] of [[4, 9, 26, 44], [28, 9, 6, 44]]) { P.add(M.poly(bar(x0, y0, x1, y1, 0.8)), { m: GM.oak, n: plane(-0.3, 0), shade: -1, cast: 1 }); const dx = (x0 - x1) / 36, dy = (y0 - y1) / 36; gem(P, blade(x0, y0, x0 + dx * 5, y0 + dy * 5, 1.6, 0), GM.iron, { k: 1.2, cast: 1 }); }
  P.add(M.rect(15, 14, 3, 32), { m: GM.oak, n: prismV(16.5, 1.6, 2), ridge: 1, cast: 2 });
  pennant(P, 18, 14, 11, 7, GM.clothRed);
  P.add(M.sub(M.poly(ngon(16.5, 24, 8, 12, Math.PI / 12)), M.poly(ngon(16.5, 24, 6, 12, Math.PI / 12))), { m: GM.bronze, n: facetDisc(16.5, 24, 12, [0, 7], [-0.9, 1.2], { rot: Math.PI / 12 }), ridge: 1, cast: 2 });
  gem(P, ngon(16.5, 24, 6, 12, Math.PI / 12), GM.clothRed, { k: 0.9, table: 3, cast: 0 });
  mound(P, 16, 11, 48);
  P.render(); const pc = P.pc;
  for (const [x, y] of [[16, 20], [15, 21], [17, 21], [16, 22], [16, 23], [16, 24], [15, 25], [17, 25], [16, 26]]) pc.px(x, y, '#2a0a10');
  glint(pc, 12, 19, 1, '#ffffff', GR.bronze[5]);
  return pc;
}
export function mk_elite() { // bucranium (horned bull skull) on a post with a torn banner
  const P = new Painter(36, 56);
  P.add(M.rect(16, 20, 4, 34), { m: GM.walnut, n: prismV(18, 2, 2), ridge: 1, cast: 2 });
  P.add(M.rect(8, 23, 20, 2.4), { m: GM.walnut, n: prismH(24.2, 1.2, 2), ridge: 1, cast: 2, contour: 1 });
  pennant(P, 20, 26, 11, 13, GM.clothRed, true);
  for (const s of [-1, 1]) gem(P, [[18 + s * 4, 12], [18 + s * 10, 11], [18 + s * 15, 6], [18 + s * 13, 1], [18 + s * 12, 6], [18 + s * 8, 9], [18 + s * 3, 10]].map(([x, y]) => [x, y]), GM.horn, { k: 1.2, cast: 1 });
  gem(P, [[12, 9], [24, 9], [26, 14], [22, 22], [21, 27], [15, 27], [14, 22], [10, 14]], GM.bone, { k: 1.2, table: 2.4, cast: 2 });
  mound(P, 18, 10, 56);
  P.render(); const pc = P.pc;
  for (const s of [-1, 1]) { const x = 18 + s * 3 - (s > 0 ? 1 : 0); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pc.px(x + dx, 14 + dy, '#140a10'); pc.px(x + (s > 0 ? 0 : 1), 14, '#ff5a2a'); }
  pc.px(16, 25, '#140a10'); pc.px(19, 25, '#140a10'); P.crack([[18, 9], [19, 12], [17, 14]]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P.shift(18 + s * (6 + i * 2), 9 - i, 1);
  return pc;
}
export function mk_event() { // signpost with a carved question board and a glowing lantern
  const P = new Painter(32, 50);
  P.add(M.rect(14, 9, 4, 40), { m: GM.oak, n: prismV(16, 2, 2), ridge: 1, cast: 2 });
  gem(P, [[3, 5], [26, 5], [30, 11], [26, 18], [3, 18]], GM.oak, { k: 1.2, table: 1.6, cast: 2 });
  P.add(M.rect(18, 24, 7, 1.4), { m: GM.iron, n: plane(0, -0.5), contour: 1, cast: 1 });
  gem(P, [[20, 26], [26, 26], [27, 28], [27, 34], [19, 34], [19, 28]], GM.iron, { k: 1.2, cast: 1 });
  P.add(M.rect(20.5, 28, 5, 5), { m: GM.fire, n: plane(0, 0), contour: 0 });
  mound(P, 16, 10, 50);
  P.render(); const pc = P.pc;
  grainLines(P, 5, 7, 20, 10, 9);
  const q = [[13, 7], [14, 7], [15, 7], [16, 8], [16, 9], [15, 10], [14, 11], [14, 12], [14, 14]];
  for (const [x, y] of q) pc.px(x + 1, y + 1, '#3a1a0e'); for (const [x, y] of q) pc.px(x, y, '#ffd040'); pc.px(13, 7, '#fffad0');
  nail(pc, 5, 11); nail(pc, 24, 11);
  pc.px(22, 29, '#fffad0'); pc.px(23, 30, '#ffd040'); pc.line(22, 28, 22, 32, '#5a2010');
  return pc;
}
export function mk_shop() { // Diogenes' pithos lying on its side, his lamp, a striped awning
  const P = new Painter(48, 48);
  for (const x of [5, 42]) P.add(M.rect(x, 10, 1.8, 36), { m: GM.oak, n: plane(-0.4, 0), cast: 1 });
  P.add(M.poly([[3, 7], [45, 7], [44, 13], [4, 13]]), { m: (x) => (Math.floor((x - 3) / 4) % 2 ? GM.cream : GM.clothRed), n: (x, y) => norm3(((x - 3) % 4) < 2 ? -0.5 : 0.3, y > 11 ? 0.6 : -0.2, 1), ridge: 1, cast: 2 });
  const jar = [[5, 34], [9, 26], [17, 23], [30, 23], [38, 27], [41, 31], [41, 38], [38, 42], [30, 45], [17, 45], [9, 42]];
  gem(P, jar, GM.clay, { k: 1.2, table: 4, cast: 2 });
  P.add(M.sub(M.poly(ngon(40, 34, 5, 8, 0, 0.6, 1)), M.poly(ngon(40.5, 34, 3, 8, 0, 0.6, 1))), { m: GM.clay, n: facetDisc(40, 34, 8, [0, 4], [-1, 1]), ridge: 1, cast: 1 });
  P.add(M.poly(ngon(40.5, 34, 3, 8, 0, 0.6, 1)), { m: GM.ink, n: plane(0, 0), contour: 0 });
  gem(P, [[6, 44], [12, 43], [14, 45], [12, 47], [7, 47]], GM.bronze, { k: 1.2, cast: 1 });
  mound(P, 24, 22, 48);
  P.render(); const pc = P.pc;
  for (let x = 9; x < 38; x++) pc.px(x, 31 + ((Math.floor((x - 9) / 2) % 2) ? 0 : 1), GR.ink[1]);
  for (const x of [16, 24, 32]) P.shiftLine([[x, 25], [x - 1, 44]], -1);
  pc.px(14, 43, '#ffd040'); pc.px(14, 42, '#fffad0'); pc.px(15, 42, '#ff8e22');
  text(pc, 'ΔΙΟΓ', 24, 2, '#3a0e10', { align: 'center' });
  glint(pc, 14, 27, 1, '#ffffff', GR.clay[5]);
  return pc;
}
export function mk_lab() { // canvas field tent, glowing flask on a crate, rising vapour
  const P = new Painter(48, 48);
  P.add(M.rect(23, 3, 1.6, 8), { m: GM.oak, n: plane(-0.3, 0), cast: 1 });
  const tent = [[24, 6], [43, 44], [5, 44]];
  P.add(M.poly(tent), { m: GM.canvas, n: (x, y) => (x < 24 ? norm3(-0.6, -0.3, 0.8) : norm3(0.6, -0.3, 0.8)), ridge: 1, cast: 2 });
  P.add(M.poly([[24, 23], [30, 44], [18, 44]]), { m: GM.ink, n: plane(0, 0), contour: 1 });
  P.add(M.poly([[24, 23], [18, 44], [14, 44], [22, 25]]), { m: GM.canvas, n: plane(0.6, -0.2), shade: 1, cast: 2, contour: 1 });
  gem(P, [[31, 38], [41, 38], [41, 45], [31, 45]], GM.oak, { k: 1, table: 1.5, cast: 2 });
  gem(P, [[34, 29], [35.5, 28], [37, 29], [37, 31], [39, 33], [38.5, 37], [32.5, 37], [32, 33], [34, 31]], GM.glow, { k: 1.2, table: 1.5, cast: 2 });
  mound(P, 24, 22, 48);
  P.render(); const pc = P.pc;
  for (const [x, y] of [[36, 26], [35, 24], [36, 22], [37, 20], [36, 18]]) pc.px(x, y, '#c4d6e2');
  for (let y = 10; y < 44; y += 4) { P.shift(Math.round(24 - (y - 6) * 0.5), y, -1); P.shift(Math.round(24 + (y - 6) * 0.5) - 1, y, -1); }
  glint(pc, 34, 32, 1, '#ffffff', GR.glow[5]); pc.px(34, 40, GR.iron[4]); pc.px(38, 40, GR.iron[4]);
  return pc;
}
export function mk_guardian() { // the Lion Gate: cyclopean jambs, lintel, relieving triangle with lions, braziers, banners
  const P = new Painter(64, 64);
  for (const x0 of [9, 43]) gem(P, [[x0, 63], [x0 + 1, 22], [x0 + 11, 22], [x0 + 12, 63]], GM.stone, { k: 1.1, table: 3, cast: 2, id: 'stone' });
  P.add(M.rect(21, 24, 22, 40), { m: GM.ink, n: plane(0, 0), contour: 1 });
  gem(P, [[6, 22], [58, 22], [57, 27], [7, 27]], GM.stone, { k: 1.2, table: 1.5, cast: 2, id: 'stone' });
  gem(P, [[32, 3], [47, 22], [17, 22]], GM.marble, { k: 1, table: 3, cast: 2 });
  gem(P, [[31, 10], [33, 10], [33.5, 21], [30.5, 21]], GM.marble, { k: 1.2, cast: 1 });
  for (const s of [-1, 1]) gem(P, [[32 + s * 3, 20], [32 + s * 4, 12], [32 + s * 6, 10], [32 + s * 8, 13], [32 + s * 8, 20]], GM.marble, { k: 1.2, cast: 1 });
  for (const x of [15, 49]) gem(P, [[x - 4, 18], [x + 4, 18], [x + 2, 21], [x - 2, 21]], GM.bronze, { k: 1.2, cast: 2 });
  pennant(P, 11, 29, 7, 16, GM.clothPurple); pennant(P, 46, 29, 7, 16, GM.clothPurple);
  P.render(); const pc = P.pc;
  for (let y = 28; y < 63; y += 5) { P.shiftLine([[10, y], [20, y]], -1); P.shiftLine([[44, y + 2], [54, y + 2]], -1); }
  for (let y = 31; y < 63; y += 10) { P.shiftLine([[15, y], [15, y + 4]], -1); P.shiftLine([[49, y + 5], [49, y + 9]], -1); }
  P.speckle(['stone'], 0.05, 3, -1);
  const fl = campfire(1);
  for (const x0 of [15, 49]) for (let y = 0; y < 14; y++) for (let x = -5; x <= 5; x++) { const v = fl.data[(18 + y * 2) * fl.w + (24 + x * 2)]; if (v >>> 24) pc.data[(y + 4) * 64 + x0 + x] = v; }
  return pc;
}
