// Pixel sprites: intent icons (20x20, readable at a glance: dark outline, one light direction, a single glint)
// and particle sprites (painted in grey values so the particle tint colours them; they fit 16px atlas cells).
import { PixelCanvas, gridSprite } from './pixel.js';
import { Painter, M, N, mat, norm3, glint } from './art/core.js';
import { RAMP } from './art/ramps.js';

const OL = '#1c1426';
const IM = (ramp, o = {}) => mat(ramp, { amb: 0.3, dif: 0.8, ol: OL, olLit: OL, ...o });
const MI = {
  steel: IM(['#2e3446', '#4c566c', '#76829a', '#a8b4c6', '#d8e2ea', '#ffffff'], { spec: 1.2, pow: 16, metal: 0.4 }),
  brass: IM(RAMP.brass, { metal: 0.5, spec: 1.1, pow: 18 }), gold: IM(RAMP.gold, { metal: 0.45, spec: 1.2, pow: 18 }),
  bronze: IM(['#3a1c10', '#6a3618', '#9c5a26', '#c8843c', '#e8b064', '#fbdc9c'], { metal: 0.5, spec: 1, pow: 16 }),
  leather: IM(RAMP.leather), blue: IM(['#0e1a3a', '#1c3266', '#2c5096', '#4676c0', '#76a4e0', '#b0d0f6']),
  red: IM(['#3a0a14', '#6a1220', '#a0202a', '#d23a34', '#f06a4e', '#ffb090'], { spec: 1, pow: 20 }),
  bone: IM(['#4a3e34', '#76664e', '#a4946e', '#cec092', '#ece2bc', '#fffbe8']), green: IM(['#0c2412', '#16401c', '#24642a', '#3c8c34', '#66b440', '#a4dc6a']),
  purple: IM(['#1a0e2c', '#2e1a4e', '#4a2c78', '#6a44a4', '#9670d0', '#c6a8f0']), cream: IM(['#5a4a3e', '#8a7860', '#b8a684', '#dccca8', '#f4e8c8', '#fffbee']),
  wine: IM(['#1a0410', '#3a0820', '#5e1232', '#8a1e46', '#b4365e', '#dc6c86'], { spec: 1.2, pow: 24 }),
  clay: IM(['#2a0e08', '#5a1e0e', '#8e3414', '#c0541e', '#e07c34', '#f4a660']), black: IM(['#0a080c', '#16121a', '#241e28', '#342c38', '#4a404e']),
  iris: IM(['#0c2a1a', '#145032', '#1e7a48', '#38a85e', '#74d080', '#c0f0a8']), skin: IM(['#3a1e16', '#6a3826', '#9c5a3c', '#c88058', '#e8aa7c', '#f8d2aa']),
};
function icon(n, fn) { const P = new Painter(n, n); fn(P); return P; }
const fin = (P, extra) => { const pc = P.render(); if (extra) extra(pc); return pc; };

const ICONS = {
  sword() { // steel blade on the diagonal, brass guard, wrapped grip, pommel
    const P = new Painter(20, 20);
    P.add(M.poly([[17, 1], [19, 1], [19, 3], [9, 13], [7, 11]]), { m: MI.steel, n: (x, y) => { const s = (x - y - 6) / 1.6; return norm3(s * 0.7, -s * 0.7, 0.8); } });
    P.add(M.capsule(4.6, 9.4, 10.4, 15.2, 1.25, 1.25), { m: MI.brass, n: 1.1, cast: 1 });
    P.add(M.capsule(6.2, 13.8, 3.2, 16.8, 1.3, 1.3), { m: MI.leather, n: 1.1, tex: (x, y) => ((Math.floor(x + y) % 2) ? -0.18 : 0.05) });
    P.add(M.ellipse(2.4, 17.6, 1.7, 1.7), { m: MI.brass, n: N.sphere(2.2, 17.4, 1.9, 1.9) });
    return fin(P, (pc) => { pc.px(16, 3, '#ffffff'); pc.px(15, 4, '#e8f0f6'); pc.px(5, 10, '#fff0b0'); });
  },
  shield() { // bronze hoplite aspis: raised rim with rivets, blue field, white lambda
    const P = new Painter(20, 20);
    P.add(M.ellipse(10, 10, 9.4, 9.4), { m: MI.bronze, n: N.torus(10, 10, 8.2, 1.6) });
    P.add(M.ellipse(10, 10, 6.8, 6.8), { m: MI.blue, n: N.sphere(10, 10, 9, 9), cast: 0, contour: 1 });
    const lam = M.union(M.capsule(10, 5.2, 6.6, 14, 1.15, 1.15), M.capsule(10, 5.2, 13.4, 14, 1.15, 1.15));
    P.add(lam, { m: MI.cream, n: 1, contour: 1, cast: 1 });
    return fin(P, (pc) => { for (const [x, y] of [[10, 1], [3, 10], [16, 10], [10, 18], [5, 4], [15, 4], [5, 15], [15, 15]]) { pc.px(x, y, '#fbdc9c'); } glint(pc, 5, 6, 1); });
  },
  eye() { // Medusa's gaze: almond eye, green iris with a slit pupil, heavy lids
    const P = new Painter(20, 20);
    const almond = M.fn((x, y) => { const u = (x - 10) / 9; if (Math.abs(u) > 1) return false; const h = 5.4 * (1 - u * u); return y > 10 - h && y < 10 + h * 0.85; }, 0, 3, 20, 17);
    P.add(almond, { m: MI.cream, n: N.sphere(10, 10, 10, 7) });
    P.add(M.ellipse(10.4, 10, 4.2, 4.6), { m: MI.iris, n: N.sphere(9.6, 9.2, 4.6, 4.6), clip: true, contour: 1 });
    P.add(M.ellipse(10.4, 10, 0.9, 3.4), { m: MI.black, n: N.flat(), clip: true, contour: 0 });
    P.add(M.fn((x, y) => { const u = (x - 10) / 9.6; if (Math.abs(u) > 1) return false; const h = 5.6 * (1 - u * u); return y > 10 - h - 1.6 && y <= 10 - h + 0.6; }, 0, 2, 20, 12), { m: MI.green, n: N.flat(0, -0.6, 1), cast: 1 });
    return fin(P, (pc) => { pc.px(8, 7, '#ffffff'); pc.px(9, 7, '#d8f8d0'); for (const x of [3, 6, 10, 14, 17]) pc.px(x, x < 5 || x > 15 ? 6 : 3, OL); });
  },
  up() { return arrow(true); },
  down() { return arrow(false); },
  skull() {
    const P = new Painter(20, 20);
    P.add(M.union(M.ellipse(10, 8.4, 7.4, 7), M.superellipse(10, 14, 4.6, 3.4, 3)), { m: MI.bone, n: N.sphere(9.4, 8.4, 8, 8.6) });
    for (const sx of [6.8, 13.2]) P.add(M.ellipse(sx, 9.6, 2.2, 2.4), { m: MI.black, n: N.flat(0.4, 0.4, 1), contour: 0 });
    P.add(M.poly([[10, 11.6], [11.2, 13.6], [8.8, 13.6]]), { m: MI.black, n: N.flat(), contour: 0 });
    return fin(P, (pc) => { for (const x of [8, 10, 12]) { pc.px(x, 16, '#4a3e34'); pc.px(x, 17, '#4a3e34'); } pc.px(6, 9, '#c84040'); pc.px(13, 9, '#c84040'); pc.line(12, 2, 13, 4, '#76664e'); pc.px(14, 5, '#76664e'); pc.px(6, 4, '#fffbe8'); pc.px(5, 5, '#fffbe8'); });
  },
  question() {
    const P = new Painter(20, 20);
    const q = M.union(M.bezier([5.2, 7], [5, 1.2], [15, 1.2], [14.6, 6.8], 1.9, 1.9, 16), M.bezier([14.6, 6.8], [14, 9.6], [10, 9.2], [10, 12.6], 1.9, 1.9, 12), M.ellipse(10, 16.4, 2, 2));
    P.add(q, { m: MI.gold, n: 1.6 });
    return fin(P, (pc) => { glint(pc, 7, 3, 1); });
  },
  heart() {
    const P = new Painter(20, 20);
    P.add(M.fn((x, y) => { const u = (x - 10) / 7.4, v = -(y - 11) / 7.2; const a = u * u + v * v - 1; return a * a * a - u * u * v * v * v <= 0; }, 0, 0, 20, 20), { m: MI.red, n: N.blend(N.sphere(8.6, 8, 10, 10), N.flat(0, 0, 1), 0.2) });
    return fin(P, (pc) => { glint(pc, 6, 6, 1, '#ffffff', '#ffd0c0'); });
  },
  coin() { // Athenian owl drachma
    const P = new Painter(20, 20);
    P.add(M.ellipse(10, 10, 8.6, 8.6), { m: MI.gold, n: N.torus(10, 10, 7.2, 1.6) });
    P.add(M.ellipse(10, 10, 6, 6), { m: MI.gold, n: N.flat(), shade: -1, contour: 1 });
    P.add(M.union(M.ellipse(10, 11, 3, 3.6), M.ellipse(10, 7.4, 2.6, 2.2)), { m: MI.gold, n: 1.2, contour: 1, cast: 1 });
    return fin(P, (pc) => { pc.px(9, 7, '#3a1a0c'); pc.px(11, 7, '#3a1a0c'); pc.px(10, 8, '#6c300e'); glint(pc, 5, 5, 1); });
  },
  steal() { // a grasping kobalos claw snatching a card
    const P = new Painter(20, 20);
    P.add(M.poly([[9, 1.5], [17.5, 3.5], [15, 13], [6.5, 11]]), { m: MI.cream, n: N.flat(0.1, -0.2, 1), cast: 1 });
    P.add(M.poly([[10.2, 3.2], [15.8, 4.6], [14, 11], [8.4, 9.8]]), { m: MI.purple, n: N.flat(0.1, -0.2, 1), contour: 0, shade: 1 });
    const hand = M.union(M.ellipse(6.4, 13.6, 4.2, 3.6), M.capsule(4, 12, 7.6, 6.6, 1.1, 0.9), M.capsule(6.4, 11.4, 10.6, 7.4, 1.1, 0.9), M.capsule(8, 12.6, 12.4, 9.6, 1.1, 0.9), M.capsule(3.4, 14, 1.4, 18.6, 2, 2));
    P.add(hand, { m: MI.green, n: 1.4, cast: 1 });
    return fin(P, (pc) => { pc.px(7, 6, '#f4e8c8'); pc.px(10, 7, '#f4e8c8'); pc.px(12, 9, '#f4e8c8'); });
  },
  note() {
    const P = new Painter(20, 20);
    P.add(M.union(M.ellipse(6.4, 15, 3.4, 2.6, -0.4), M.rect(8.6, 3, 2, 12.4), M.bezier([9.6, 3], [13, 4.4], [15.6, 6], [14.6, 10.4], 1.3, 1.1, 10)), { m: MI.gold, n: 1.2 });
    return fin(P, (pc) => { pc.px(5, 14, '#fffde2'); pc.px(9, 5, '#fff08a'); });
  },
  zzz() { // two sleepy Zs, big then small
    const P = new Painter(20, 20);
    const z = (x, y, w, h, r) => M.union(M.capsule(x, y, x + w, y, r, r), M.capsule(x + w, y, x, y + h, r, r), M.capsule(x, y + h, x + w, y + h, r, r));
    P.add(M.union(z(2.4, 8.4, 8.6, 8.6, 1.2), z(12.6, 2.6, 5, 5, 1)), { m: MI.blue, n: 1 });
    return fin(P, (pc) => { pc.px(4, 8, '#b0d0f6'); pc.px(13, 2, '#b0d0f6'); });
  },
  wine() { // red-figure kylix brimming with wine
    const P = new Painter(20, 20);
    P.add(M.capsule(2.4, 8.4, 0.9, 5.2, 0.9, 0.9), { m: MI.clay, n: 0.8 }); P.add(M.capsule(17.6, 8.4, 19.1, 5.2, 0.9, 0.9), { m: MI.clay, n: 0.8 });
    P.add(M.poly([[8.6, 13], [11.4, 13], [12, 16.4], [8, 16.4]]), { m: MI.black, n: N.cylV(10, 2), cast: 1 });
    P.add(M.ellipse(10, 17.4, 4.6, 1.5), { m: MI.black, n: N.cylV(10, 4.6) });
    P.add(M.fn((x, y) => { const u = (x - 10) / 8.6; return Math.abs(u) <= 1 && y >= 7 && y <= 7 + 6.6 * Math.sqrt(1 - u * u); }, 1, 6, 19, 14), { m: (x, y) => (y > 9.2 && y < 11 ? MI.clay : MI.black), n: N.sphere(10, 6.6, 9, 7.4), cast: 1 });
    P.add(M.ellipse(10, 7.2, 8.4, 1.8), { m: MI.wine, n: N.flat(0, -0.8, 0.6), contour: 1 });
    return fin(P, (pc) => { pc.px(6, 7, '#f4a0b0'); pc.px(7, 7, '#dc6c86'); });
  },
  hand() {
    const P = new Painter(20, 20);
    P.add(M.union(M.superellipse(10, 13, 5.4, 5, 2.6), M.capsule(6, 10, 5.6, 3.8, 1.3, 1.2), M.capsule(8.6, 9, 8.6, 2.2, 1.3, 1.2), M.capsule(11.2, 9, 11.4, 2.8, 1.3, 1.2), M.capsule(13.6, 10, 14.4, 5, 1.2, 1.1), M.capsule(14.6, 13.6, 18.2, 10.2, 1.4, 1.2)), { m: MI.skin, n: 1.6 });
    return fin(P);
  },
};
function arrow(up) {
  const P = new Painter(20, 20); const m = up ? MI.green : MI.purple;
  const pts = up ? [[10, 1.5], [18.4, 10.4], [13.2, 10.4], [13.2, 18.4], [6.8, 18.4], [6.8, 10.4], [1.6, 10.4]] : [[10, 18.5], [18.4, 9.6], [13.2, 9.6], [13.2, 1.6], [6.8, 1.6], [6.8, 9.6], [1.6, 9.6]];
  P.add(M.poly(pts), { m, n: 1.8 });
  return P.render();
}

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
