// Low-res geometric ground life (32px cells, feet on row 30): a dark-faced sheep whose wool is an angular faceted
// cloud, a chamoisee goat with blade horns, and a Balkan green lizard. Side view facing right.
// Walks use diagonal leg pairs (4 frames); the body rises a pixel on the passing poses and the head nods against it.
import { Painter, M, norm3 } from './core.js';
import { roof, plane, gmat, bar } from './geo.js';
import { GR } from './ramps.js';

const MT = {
  wool: gmat(['#4a3e50', '#8a7e82', '#c8bea8', '#f2ecd8'], { amb: 0.26 }), face: gmat(GR.face), hoof: gmat(['#08060a', '#1c1418', '#32282a']),
  goat: gmat(['#1a0e0c', '#5a2e1a', '#9a5a30', '#d08e50']), goatBlack: gmat(['#08070a', '#1a161c', '#2e282e', '#463c40']), horn: gmat(GR.horn),
  lizard: gmat(['#0c1e10', '#1e5a1e', '#46a02a', '#9ad444']), lizBelly: gmat(['#3a3a1a', '#7a7838', '#c0ba6a']), lizThroat: gmat(['#0c1838', '#24489a', '#4c80d4']),
  pink: gmat(['#4a1c24', '#8a3c44', '#c8706e']),
};

export const BEASTS = {
  sheep: { frames: ['walk0', 'walk1', 'walk2', 'walk3', 'graze0', 'graze1', 'idle', 'blink'], size: 1.25, foot: 30, speed: 1, shadow: 0.62, walk: [0, 1, 2, 3], graze: [4, 5], idle: [6, 7, 6] },
  goat: { frames: ['walk0', 'walk1', 'walk2', 'walk3', 'graze0', 'graze1', 'idle', 'blink'], size: 1.3, foot: 30, speed: 1.15, shadow: 0.55, walk: [0, 1, 2, 3], graze: [4, 5], idle: [6, 7, 6] },
  lizard: { frames: ['bask', 'push', 'look', 'dash0', 'dash1'], size: 0.55, foot: 30, bask: 0, pushup: [1, 0], look: 2, dash: [3, 4] },
};
const FOOT = 30;
// diagonal pairs: [foot dx from hip, lift]; f0 contact A, f1 passing (A lifted), f2 contact B, f3 passing (B lifted)
function walkLegs(f) { const A = [[2.4, 0], [0.4, 1.4], [-2, 0], [0, 0]][f], B = [[-2, 0], [0, 0], [2.4, 0], [0.4, 1.4]][f]; return { nf: A, fh: A, ff: B, nh: B }; }
const STAND = { nf: [0.5, 0], fh: [-0.4, 0], ff: [-0.6, 0], nh: [0.8, 0] };
// a leg as two straight segments (thigh hidden in the body) ending in a darker hoof pixel
function leg(pc, hx, hy, [dx, lift], col, hoof, front) {
  const fx = Math.round(hx + dx), fy = FOOT - Math.round(lift); const kx = Math.round(hx + dx * 0.5 + (lift ? (front ? 1 : -1) : 0)), ky = Math.round((hy + fy) / 2 - lift * 0.3);
  pc.line(Math.round(hx), Math.round(hy), kx, ky, col); pc.line(kx, ky, fx, fy - 1, col); pc.px(fx, fy, hoof);
}

function paintSheep(frame) {
  const P = new Painter(32, 32);
  const walk = frame.startsWith('walk') ? +frame[4] : -1, graze = frame.startsWith('graze') ? +frame[5] : -1, blink = frame === 'blink';
  const bob = walk === 1 || walk === 3 ? -1 : 0; const cx = 14, cy = 19 + bob;
  // wool: an angular cloud (bumpy 12-gon) shaded as planes
  const woolPts = [[cx - 10, cy + 1], [cx - 9, cy - 3], [cx - 6, cy - 6], [cx - 2, cy - 7], [cx + 2, cy - 6.5], [cx + 6, cy - 7], [cx + 9, cy - 4], [cx + 10.5, cy], [cx + 9, cy + 4], [cx + 4, cy + 5.5], [cx - 2, cy + 5], [cx - 7, cy + 5]];
  // tail nub
  P.add(M.poly([[cx - 10, cy - 2], [cx - 12, cy], [cx - 10.5, cy + 2]]), { m: MT.wool, n: plane(-0.6, 0), contour: 1 });
  P.add(M.poly(woolPts), { m: MT.wool, n: roof(woolPts, { k: 1.1, table: 2.2 }), cast: 1, contour: 1 });
  // head: dark wedge (muzzle down-forward), ear, wool topknot
  let hx, hy, down;
  if (graze >= 0) { hx = cx + 12; hy = 26 + graze * 0.5; down = 1; } else { hx = cx + 12 + (walk === 0 || walk === 2 ? 0.4 : 0); hy = cy - 5 + (walk === 0 || walk === 2 ? 1 : 0); down = 0; }
  const head = down ? [[hx - 3, hy - 4], [hx + 0.5, hy - 4], [hx + 2.5, hy + 1], [hx + 1.5, hy + 3.5], [hx - 1.5, hy + 3], [hx - 3.5, hy - 1]] : [[hx - 3, hy - 3], [hx + 1, hy - 3.5], [hx + 4.5, hy - 0.5], [hx + 4.5, hy + 1.5], [hx + 1, hy + 2.5], [hx - 2.5, hy + 2]];
  if (!down) P.add(M.poly([[cx + 7, cy - 4], [hx - 1, hy - 3], [hx - 1, hy + 2], [cx + 9, cy + 1]]), { m: MT.wool, n: plane(0.2, -0.6), contour: 0 });
  else P.add(M.poly([[cx + 7, cy - 4], [hx - 2, hy - 4], [hx, hy], [cx + 9, cy + 2]]), { m: MT.wool, n: plane(0.4, -0.3), contour: 0 });
  P.add(M.poly(head), { m: MT.face, n: roof(head, { k: 1, table: 1 }), contour: 1, cast: 1 });
  const ear = down ? [[hx - 2, hy - 3], [hx - 5, hy - 2], [hx - 2.5, hy - 1]] : [[hx - 1.5, hy - 2.5], [hx - 4.5, hy - 1.2], [hx - 1.5, hy - 0.5]];
  P.add(M.poly(ear), { m: MT.face, n: plane(-0.4, -0.5), contour: 1 });
  const knot = down ? [[hx - 3, hy - 5], [hx - 0.5, hy - 6], [hx + 0.5, hy - 4], [hx - 2, hy - 3]] : [[hx - 2.5, hy - 4.5], [hx + 0.5, hy - 5.5], [hx + 1.5, hy - 3], [hx - 1, hy - 2.5]];
  P.add(M.poly(knot), { m: MT.wool, n: plane(-0.3, -0.6), contour: 1 });
  const pc = P.render();
  // legs (drawn after so they stay crisp single-pixel lines under the wool)
  const L = walk >= 0 ? walkLegs(walk) : STAND; const hy0 = cy + 5;
  const legC = GR.face; leg(pc, cx + 6.5, hy0, L.ff, legC[1], legC[0], true); leg(pc, cx - 6, hy0, L.fh, legC[1], legC[0], false); leg(pc, cx + 5, hy0, L.nf, legC[2], legC[0], true); leg(pc, cx - 7.5, hy0, L.nh, legC[2], legC[0], false);
  // eye + nostril (+ a grass tuft while chewing)
  const ex = Math.round(down ? hx - 0.5 : hx + 0.5), ey = Math.round(down ? hy - 1 : hy - 1.5);
  pc.px(ex, ey, blink ? GR.face[2] : '#e8dcb0');
  pc.px(Math.round(down ? hx + 1 : hx + 4), Math.round(down ? hy + 3 : hy), '#08060a');
  if (graze === 1) { pc.px(Math.round(hx + 2), Math.round(hy + 4), '#6e8a30'); pc.px(Math.round(hx + 3), Math.round(hy + 3), '#94b044'); }
  return pc;
}

function paintGoat(frame) {
  const P = new Painter(32, 32);
  const walk = frame.startsWith('walk') ? +frame[4] : -1, graze = frame.startsWith('graze') ? +frame[5] : -1, blink = frame === 'blink';
  const bob = walk === 1 || walk === 3 ? -1 : 0; const cx = 13, cy = 18 + bob;
  // upright tail
  P.add(M.poly([[cx - 8, cy - 3], [cx - 10, cy - 7], [cx - 7, cy - 4]]), { m: MT.goatBlack, n: plane(-0.4, -0.6), contour: 1 });
  // body: lean angular barrel with a black dorsal stripe; belly fringe as a sawtooth edge
  const body = [[cx - 9, cy - 3], [cx - 6, cy - 5], [cx + 6, cy - 5], [cx + 9, cy - 2], [cx + 8.5, cy + 3], [cx + 5, cy + 4], [cx + 3, cy + 5], [cx + 1, cy + 4], [cx - 1, cy + 5], [cx - 3, cy + 4], [cx - 6, cy + 4.5], [cx - 9, cy + 1]];
  P.add(M.poly(body), { m: (x, y) => (y < cy - 3.6 && x < cx + 7 ? MT.goatBlack : MT.goat), n: roof(body, { k: 1.1, table: 2 }), cast: 1, contour: 1 });
  // neck + head
  let hx, hy, down; if (graze >= 0) { hx = cx + 12; hy = 25.5 + graze * 0.5; down = 1; } else { hx = cx + 11.5 + (walk === 0 || walk === 2 ? 0.4 : 0); hy = cy - 8 + (walk === 0 || walk === 2 ? 1 : 0); down = 0; }
  P.add(M.poly(down ? [[cx + 6, cy - 4.5], [cx + 9, cy - 2], [hx, hy], [hx - 2.5, hy - 3]] : [[cx + 6, cy - 4.5], [cx + 9.5, cy - 1.5], [hx + 0.5, hy + 2], [hx - 2, hy - 1]]), { m: MT.goat, n: plane(0.3, -0.4), contour: 0 });
  // horns: two swept blades (far one darker)
  for (const far of [true, false]) { const o = far ? 1 : 0; const pts = down ? [[hx - 2 + o, hy - 3], [hx - 4 + o, hy - 6.5], [hx - 7 + o, hy - 7], [hx - 4.5 + o, hy - 5], [hx - 0.5 + o, hy - 2]] : [[hx - 1 + o, hy - 2.5], [hx - 2 + o, hy - 6.5], [hx - 5.5 + o, hy - 8], [hx - 3 + o, hy - 5.5], [hx + 0.5 + o, hy - 2]]; P.add(M.poly(pts), { m: MT.horn, n: plane(-0.5, -0.5), shade: far ? -1 : 0, contour: 1 }); }
  const head = down ? [[hx - 2.5, hy - 3], [hx + 0.5, hy - 2.5], [hx + 2, hy + 2.5], [hx + 0.5, hy + 4], [hx - 1, hy + 3], [hx - 3, hy]] : [[hx - 2, hy - 2.5], [hx + 1, hy - 2.5], [hx + 4.5, hy + 0.5], [hx + 4, hy + 2], [hx + 0.5, hy + 2], [hx - 2, hy + 1.5]];
  P.add(M.poly(head), { m: MT.goat, n: roof(head, { k: 1, table: 1 }), contour: 1, cast: 1 });
  P.add(M.poly(down ? [[hx + 1, hy + 3.5], [hx + 2.5, hy + 6], [hx + 2.2, hy + 3]] : [[hx + 2, hy + 1.5], [hx + 2.5, hy + 5], [hx + 3.6, hy + 1.6]]), { m: MT.goatBlack, n: plane(0, 0), contour: 1 });
  P.add(M.poly(down ? [[hx - 2, hy - 1], [hx - 5, hy + 1], [hx - 2, hy + 0.5]] : [[hx - 1.5, hy - 0.5], [hx - 4.5, hy + 1.5], [hx - 1.5, hy + 1]]), { m: MT.goat, n: plane(-0.3, 0.3), contour: 1 });
  const pc = P.render();
  const L = walk >= 0 ? walkLegs(walk) : STAND; const hy0 = cy + 4;
  const B = GR.goat; const K = ['#08070a', '#1a161c', '#2e282e'];
  leg(pc, cx + 6, hy0, L.ff, K[1], K[0], true); leg(pc, cx - 6, hy0, L.fh, K[1], K[0], false); leg(pc, cx + 4.5, hy0, L.nf, K[2], K[0], true); leg(pc, cx - 7.5, hy0, L.nh, K[2], K[0], false);
  // amber eye with the goat's horizontal pupil
  const ex = Math.round(down ? hx - 0.5 : hx + 0.5), ey = Math.round(down ? hy - 0.5 : hy - 1);
  if (blink) pc.px(ex, ey, B[1]); else { pc.px(ex, ey, '#120c0a'); pc.px(ex + 1, ey, '#f0c040'); }
  if (graze === 1) { pc.px(Math.round(hx + 2), Math.round(hy + 4), '#6e8a30'); pc.px(Math.round(hx + 1), Math.round(hy + 5), '#94b044'); }
  return pc;
}

function paintLizard(frame) {
  const P = new Painter(32, 32); const push = frame === 'push', look = frame === 'look', dash = frame.startsWith('dash') ? +frame[4] : -1;
  const by = FOOT - 2 - (push ? 1 : 0), bx = 15;
  const sw = dash === 0 ? 1 : dash === 1 ? -1 : 0;
  // tail: long thin wedge in two segments
  P.add(M.poly([[bx - 4, by - 1.2], [bx - 10, by - 0.6 + sw], [bx - 16, by - 1 + sw * 2], [bx - 10, by + 0.6 + sw], [bx - 4, by + 1.4]]), { m: MT.lizard, n: plane(0, -0.5), contour: 1 });
  const body = [[bx - 5, by], [bx - 2, by - 1.8], [bx + 3, by - 2], [bx + 5, by - 1], [bx + 4, by + 1.6], [bx - 2, by + 1.8]];
  P.add(M.poly(body), { m: (x, y) => (y > by + 0.8 ? MT.lizBelly : MT.lizard), n: roof(body, { k: 1.1, table: 0.8 }), contour: 1, cast: 1 });
  const ha = push ? -0.35 : look ? -0.6 : 0; const c = Math.cos(ha), s = Math.sin(ha); const hx = bx + 5, hy = by - 0.6 - (push ? 0.5 : 0);
  const H = (u, v) => [hx + u * c - v * s, hy + u * s + v * c];
  const head = [H(-1, -1.6), H(2, -1.5), H(4.5, -0.3), H(4.4, 0.6), H(2, 1.3), H(-1, 1.6)];
  P.add(M.poly(head), { m: (x, y) => ((-(x - hx) * s + (y - hy) * c) > 0.6 ? MT.lizThroat : MT.lizard), n: roof(head, { k: 1, table: 0.6 }), contour: 1, cast: 1 });
  const pc = P.render();
  const K = ['#0c1e10', '#1e5a1e', '#46a02a'];
  const legs = dash >= 0 ? (dash ? [1, -1] : [-1, 1]) : [0, 0];
  for (const [x0, dx, col] of [[bx + 3, 1.5 + legs[0] + (push ? 1 : 0), K[2]], [bx - 3, -1.5 + legs[1], K[2]], [bx + 2, 2 + legs[1], K[1]], [bx - 4, -2 + legs[0], K[1]]]) { const kx = Math.round(x0 + dx * 0.5), ky = Math.round(by - (push && dx > 0 ? 1 : 0.5)); pc.line(Math.round(x0), Math.round(by + 1), kx, ky + 1, col); pc.line(kx, ky + 1, Math.round(x0 + dx), FOOT, col); }
  const [ex, ey] = H(1.5, -0.6).map(Math.round); pc.px(ex, ey, '#f2e8a0');
  for (let x = bx - 3; x <= bx + 3; x += 3) pc.px(x, Math.round(by - 1.5), '#cde88a');
  return pc;
}

export function paintBeast(kind, frame) {
  if (kind === 'sheep') return paintSheep(frame);
  if (kind === 'goat') return paintGoat(frame);
  return paintLizard(frame);
}
