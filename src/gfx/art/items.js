// Curio icons (32x32), Schrodinger's crate (48x48, 2 frames) and Newton's apple (48x48): low-res, gem-like pixel art.
// Faceted planes with ridge highlights, 6-tone jewel ramps, hand-placed glints, veins and engravings; bright cores so
// they read on a dark brass token.
import { Painter, M, norm3, hash2, glint, text } from './core.js';
import { roof, plane, gem, facetDisc, prismV, prismH, ngon, blade, bar, star } from './geo.js';
import { GR, GM } from './ramps.js';
import { nail, grainLines } from './props.js';

const S = 32;
// faceted apple: 10-gon with a dimple notch at the top, gem facets, stem and leaf blade
function apple(P, cx, cy, r, m) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2; let rr = r * (i === 0 ? 0.78 : i === 5 ? 0.9 : 1); pts.push([cx + Math.cos(a) * rr * (i === 4 || i === 6 ? 0.92 : 1), cy + Math.sin(a) * rr * 0.96]); }
  gem(P, pts, m, { k: 1.25, table: r * 0.38, cast: 2, id: 'apple' });
  P.add(M.poly(bar(cx, cy - r * 0.72, cx + r * 0.18, cy - r * 1.22, Math.max(0.6, r * 0.07))), { m: GM.walnut, n: plane(-0.4, 0), contour: 1, cast: 1 });
  gem(P, blade(cx + r * 0.12, cy - r * 0.95, cx + r * 0.85, cy - r * 1.25, r * 0.22, 0, r * 0.08), GM.leaf, { k: 1, cast: 1 });
}
const string = (pc, x0, y0, x1, y1, c) => pc.line(x0, y0, x1, y1, c);

const ITEM = {
  spirit_cross() { // marionette control bar with six glowing gravity strings
    const P = new Painter(S, S);
    gem(P, [[3, 8], [28, 5], [29, 8], [4, 11]], GM.walnut, { k: 1.2, cast: 2 });
    gem(P, [[15, 1], [18, 1], [19, 16], [16, 16]], GM.walnut, { k: 1.2, cast: 2 });
    const pc = P.render(); grainLines(P, 5, 7, 22, 3, 3);
    for (const [x0, y0, x1, y1] of [[5, 11, 3, 29], [10, 10, 9, 30], [14, 10, 14, 27], [19, 9, 20, 30], [24, 8, 25, 28], [28, 8, 30, 29]]) { string(pc, x0, y0, x1, y1, '#8ee8ff'); pc.px(x1, y1, '#f0feff'); pc.px(x1 - 1, y1, '#8e6cf4'); pc.px(x1 + 1, y1, '#8e6cf4'); }
    for (const [x, y] of [[16, 2], [17, 15], [5, 9], [27, 6]]) { pc.px(x, y, GR.brass[5]); pc.px(x + 1, y, GR.brass[3]); }
    glint(pc, 8, 20, 1, '#f0feff', '#8e6cf4'); glint(pc, 23, 22, 1, '#f0feff', '#8e6cf4');
    return pc;
  },
  golden_apple() { const P = new Painter(S, S); apple(P, 15, 18, 11, GM.gold); const pc = P.render(); P.speckle(['apple'], 0.05, 3, 1); glint(pc, 10, 13, 2); pc.px(21, 24, GR.gold[5]); return pc; },
  lever() { // a plank on a marble fulcrum lifting a little Earth
    const P = new Painter(S, S);
    gem(P, [[13, 30], [18, 20], [23, 30]], GM.marble, { k: 1.2, cast: 2 });
    P.add(M.poly([[1, 14], [31, 22], [30, 25], [0, 17]]), { m: GM.oak, n: plane(0, -0.5), ridge: 1, cast: 2 });
    gem(P, ngon(6, 9, 5, 8, Math.PI / 8), GM.blue, { k: 1.2, table: 2, cast: 2, id: 'earth' });
    gem(P, ngon(28, 27, 2.6, 6), GM.bronze, { k: 1.2, cast: 1 });
    const pc = P.render(); grainLines(P, 2, 16, 27, 6, 7);
    for (const [x, y] of [[4, 7], [5, 7], [5, 8], [7, 10], [8, 10], [8, 11], [4, 11]]) pc.px(x, y, GR.green[4]);
    pc.px(4, 6, '#ffffff'); for (const [x, y] of [[25, 14], [26, 12], [27, 10]]) pc.px(x, y, '#ffe058');
    return pc;
  },
  pendulum() { // Foucault pendulum: heavy faceted brass bob on a long wire, swing arc
    const P = new Painter(S, S);
    gem(P, [[9, 1], [23, 1], [23, 3], [9, 3]], GM.walnut, { k: 1.2, cast: 1 });
    gem(P, [[17, 18], [24, 21], [25, 25], [20, 31], [15, 25], [16, 21]], GM.brass, { k: 1.3, table: 1.6, cast: 2 });
    const pc = P.render(); pc.line(16, 3, 20, 18, '#e4dcc4');
    for (let a = -0.5; a <= 0.5; a += 0.03) { const x = Math.round(16 + Math.sin(a) * 27), y = Math.round(3 + Math.cos(a) * 27); if (Math.abs(a) > 0.12 && Math.floor(a * 30) % 2 && !pc.alpha(x, y)) pc.px(x, y, a < 0 ? '#8e6cf4' : '#8ee8ff'); }
    glint(pc, 18, 21, 1); return pc;
  },
  leyden() { // Leyden jar: glass with tin foil, brass rod and knob, sparks
    const P = new Painter(S, S);
    gem(P, [[9, 12], [23, 12], [24, 15], [24, 29], [22, 31], [10, 31], [8, 29], [8, 15]], GM.jar, { k: 1.1, table: 3, cast: 2, id: 'glass' });
    P.add(M.poly([[8, 21], [24, 21], [24, 29], [22, 31], [10, 31], [8, 29]]), { m: GM.iron, n: roof([[8, 21], [24, 21], [24, 29], [22, 31], [10, 31], [8, 29]], { k: 1, table: 3 }), ridge: 1, clip: true, contour: 1 });
    gem(P, [[10, 9], [22, 9], [22, 12], [10, 12]], GM.walnut, { k: 1.2, cast: 1 });
    P.add(M.rect(15, 3, 2, 7), { m: GM.brass, n: prismV(16, 1.2, 2), ridge: 1, cast: 1 });
    gem(P, ngon(16, 3, 2.6, 8), GM.brass, { k: 1.3, cast: 1 });
    const pc = P.render(); for (let y = 13; y < 26; y += 2) pc.px(16, y, GR.brass[3]);
    pc.line(10, 14, 10, 19, GR.jar[5]); pc.px(11, 14, '#ffffff');
    for (const b of [[[19, 2], [22, 1], [21, 3], [24, 2]], [[13, 2], [10, 0], [11, 3], [8, 2]]]) for (let i = 0; i + 1 < b.length; i++) pc.line(...b[i], ...b[i + 1], '#c4f0ff');
    return pc;
  },
  wings() { // Icarus' wax wings: an upswept pair of feather blades on a wooden frame, dripping wax
    const P = new Painter(S, S); const fth = GM.cream, wax = GM.amber;
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + sd * (0.3 + i * 0.24); const len = 14 - i * 1.6; const bx = 16 + sd * (2 + i * 0.8), by = 20; gem(P, blade(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, 1.4, 0, 0.4), fth, { k: 1, cast: 1, shade: sd < 0 ? -1 : 0 }); }
      gem(P, [[16 + sd * 2, 17], [16 + sd * 8, 14], [16 + sd * 10, 18], [16 + sd * 5, 21]], wax, { k: 1.2, cast: 1, shade: sd < 0 ? -1 : 0 });
    }
    gem(P, [[11, 19], [21, 19], [21, 22], [11, 22]], GM.walnut, { k: 1.2, cast: 2 });
    for (const [x0, x1] of [[13, 10], [19, 22]]) P.add(M.poly(bar(x0, 22, x1, 30, 0.7)), { m: GM.leather, n: plane(-0.3, 0), cast: 1, contour: 1 });
    const pc = P.render();
    for (const [x, y, n] of [[9, 18, 3], [23, 17, 4], [14, 22, 2]]) for (let k = 0; k < n; k++) pc.px(x, y + k, k === n - 1 ? GR.amber[5] : GR.amber[3]);
    nail(pc, 12, 20); nail(pc, 19, 20); return pc;
  },
  antikythera() { // corroded bronze gear train with a dial pointer
    const P = new Painter(S, S);
    const gear = (cx, cy, r, teeth, m, rot) => { const pts = []; for (let i = 0; i < teeth * 2; i++) { const a = rot + (i / (teeth * 2)) * Math.PI * 2; const rr = i % 2 ? r : r + 1.6; pts.push([cx + Math.cos(a - 0.12) * rr, cy + Math.sin(a - 0.12) * rr], [cx + Math.cos(a + 0.12) * rr, cy + Math.sin(a + 0.12) * rr]); } P.add(M.sub(M.poly(pts), M.poly(ngon(cx, cy, r * 0.28, 6))), { m, n: facetDisc(cx, cy, teeth, [0, r * 0.6, r], [-0.6, 0.4, 1.2]), ridge: 1, cast: 2, id: 'gear' }); };
    gear(21, 21, 7, 10, GM.verdigris, 0.1); gear(11, 12, 8.4, 12, GM.bronze, 0); gear(25, 7, 3.6, 7, GM.bronze, 0.3);
    const pc = P.render(); P.speckle(['gear'], 0.08, 5, 1);
    pc.line(11, 12, 15, 8, GR.bronze[0]); glint(pc, 6, 7, 1, '#ffffff', GR.bronze[5]); return pc;
  },
  schrodinger() { // tin lunchbox, lid ajar with a glow, psi stencil, a cat tail curling out
    const P = new Painter(S, S); const tin = GM.iron;
    P.add(M.poly([[23, 15], [28, 14], [30, 8], [27, 5], [26, 7], [28, 9], [26, 12], [22, 13]]), { m: GM.goat, n: plane(-0.3, -0.3), ridge: 1, cast: 2 });
    gem(P, [[4, 15], [28, 15], [28, 29], [4, 29]], tin, { k: 1.1, table: 2.5, cast: 2 });
    gem(P, [[3, 12], [27, 9], [29, 12], [5, 15]], tin, { k: 1.2, cast: 2 });
    P.add(M.poly([[12, 10], [20, 9], [20, 11], [12, 12]]), { m: GM.leather, n: plane(0, -0.6), ridge: 1, cast: 1, contour: 1 });
    const pc = P.render();
    for (const [x, y] of [[12, 13], [13, 13], [14, 13], [18, 12], [19, 12]]) pc.px(x, y, '#8ee8ff');
    const psi = [[13, 18], [13, 19], [14, 20], [15, 21], [16, 21], [17, 20], [18, 19], [18, 18], [15, 17], [15, 18], [15, 19], [15, 20], [15, 22], [15, 23], [15, 24], [14, 24], [16, 24]];
    for (const [x, y] of psi) pc.px(x + 1, y + 1, GR.iron[0]); for (const [x, y] of psi) pc.px(x, y, '#ffe058');
    for (const [x, y] of [[6, 17], [26, 17], [6, 27], [26, 27]]) pc.px(x, y, GR.iron[5]); return pc;
  },
  owl() { // Athena's little owl, frontal: big yellow eyes, spotted plumage, olive sprig
    const P = new Painter(S, S);
    gem(P, [[9, 10], [12, 5], [20, 5], [23, 10], [24, 20], [21, 27], [11, 27], [8, 20]], GM.goat, { k: 1.1, table: 3, cast: 2, id: 'owl' });
    for (const s of [-1, 1]) gem(P, ngon(16 + s * 3.6, 11, 3.4, 8, Math.PI / 8), GM.cream, { k: 1, table: 1.5, cast: 0 });
    for (const s of [-1, 1]) gem(P, ngon(16 + s * 3.6, 11, 2, 6), GM.amber, { k: 1, cast: 0 });
    gem(P, [[15, 13], [17, 13], [16, 16]], GM.horn, { k: 1, cast: 1 });
    P.add(M.poly(bar(4, 29, 28, 28, 0.8)), { m: GM.walnut, n: plane(-0.3, -0.5), cast: 1, contour: 1 });
    for (const [x, y, a] of [[8, 27, -0.6], [22, 27, 0.4]]) gem(P, blade(x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4 - 1, 1.2, 0), GM.moss, { k: 1, cast: 1 });
    const pc = P.render();
    for (const s of [-1, 1]) { const x = Math.round(16 + s * 3.6); pc.px(x, 11, '#0a0606'); pc.px(x - 1, 10, '#ffffff'); }
    for (let i = 0; i < 9; i++) { const x = 11 + (i % 3) * 4 + (Math.floor(i / 3) % 2) * 2, y = 18 + Math.floor(i / 3) * 3; pc.px(x, y, GR.goat[5]); }
    for (const x of [13, 18]) { pc.px(x, 28, GR.horn[1]); pc.px(x + 1, 28, GR.horn[1]); } return pc;
  },
  pan_flute() { // syrinx: seven reeds bound with cord, a floating note
    const P = new Painter(S, S);
    for (let i = 0; i < 7; i++) { const x = 5 + i * 3, top = 7 + i * 2.4; P.add(M.rect(x, top, 2.6, 28 - top), { m: GM.wicker, n: prismV(x + 1.3, 1.4, 2), ridge: 1, cast: 1, contour: 1 }); }
    P.add(M.poly([[4, 19], [27, 23], [27, 25.4], [4, 21.4]]), { m: GM.rope, n: plane(0, -0.4), ridge: 1, cast: 1, contour: 1 });
    const pc = P.render();
    for (let i = 0; i < 7; i++) { const x = 5 + i * 3, top = Math.round(7 + i * 2.4); pc.px(x, top, GR.wicker[0]); pc.px(x + 1, top, GR.wicker[1]); P.shift(x + 1, top + 6, -2); }
    for (const [x, y] of [[26, 2], [26, 3], [26, 4], [26, 5], [27, 2], [28, 3], [25, 5], [25, 6], [24, 6]]) pc.px(x, y, '#ffe058'); return pc;
  },
  horn() { // the Minotaur's horn: big curved, ridged, with a brass band
    const P = new Painter(S, S);
    gem(P, [[4, 28], [3, 20], [6, 12], [12, 6], [20, 3], [29, 4], [21, 6], [14, 10], [10, 17], [11, 25]], GM.horn, { k: 1.2, table: 1.6, cast: 2, id: 'horn' });
    P.add(M.poly([[3, 22], [11, 21], [11, 24], [3, 25]]), { m: GM.brass, n: plane(-0.2, -0.4), ridge: 1, clip: true, contour: 1 });
    const pc = P.render(); for (const t of [0.25, 0.4, 0.55, 0.7]) { const x = Math.round(5 + t * 20), y = Math.round(18 - t * 15); P.shiftLine([[x - 1, y + 2], [x + 1, y - 1]], -1); }
    glint(pc, 18, 5, 1); pc.px(5, 27, GR.horn[0]); pc.px(8, 28, GR.horn[0]); return pc;
  },
  fang() { // hydra fang: long curved tooth set in green gum, venom drop
    const P = new Painter(S, S);
    gem(P, [[9, 4], [16, 5], [20, 12], [21, 20], [17, 29], [16, 20], [12, 11]], GM.bone, { k: 1.2, table: 1.4, cast: 2 });
    gem(P, [[4, 2], [15, 1], [18, 6], [10, 8], [4, 6]], GM.slime, { k: 1.1, cast: 2 });
    const pc = P.render(); pc.line(14, 8, 18, 18, GR.bone[5]);
    for (const [x, y, c] of [[17, 29, GR.slime[4]], [17, 30, GR.slime[5]], [16, 31, GR.slime[3]]]) pc.px(x, y, c); glint(pc, 14, 9, 1); return pc;
  },
  mirror() { // Medusa's mirror: polished bronze hand mirror reflecting snake-hair
    const P = new Painter(S, S);
    P.add(M.rect(14.5, 20, 3, 10), { m: GM.bronze, n: prismV(16, 1.6, 2), ridge: 1, cast: 2 });
    gem(P, [[12, 29], [20, 29], [19, 31], [13, 31]], GM.bronze, { k: 1.2, cast: 1 });
    P.add(M.sub(M.poly(ngon(16, 11, 10, 12, Math.PI / 12)), M.poly(ngon(16, 11, 7.6, 12, Math.PI / 12))), { m: GM.bronze, n: facetDisc(16, 11, 12, [0, 8.8], [-1, 1.2], { rot: Math.PI / 12 }), ridge: 1, cast: 2 });
    P.add(M.poly(ngon(16, 11, 7.6, 12, Math.PI / 12)), { m: GM.gold, n: (x, y) => norm3((x - 16) * 0.06, (y - 11) * 0.06 - 0.3, 1), contour: 1, id: 'glass' });
    const pc = P.render();
    for (let i = 0; i < 5; i++) { const a = -2.5 + i * 0.5; for (let r = 2; r < 7; r++) { const x = Math.round(16 + Math.cos(a + r * 0.12) * r), y = Math.round(12 + Math.sin(a + r * 0.12) * r); pc.px(x, y, r % 2 ? GR.green[3] : GR.green[2]); } }
    for (let k = 0; k < 4; k++) { P.shift(11 + k, 9 - k, 2); } glint(pc, 11, 6, 1); return pc;
  },
  prism() { // Newton's prism splitting a white beam into the spectrum
    const P = new Painter(S, S);
    gem(P, [[16, 4], [26, 23], [6, 23]], GM.lens, { k: 1.2, table: 3, cast: 2 });
    P.add(M.poly([[6, 23], [26, 23], [28, 25], [8, 25]]), { m: GM.lens, n: plane(0, 0.7), shade: -1, contour: 1 });
    const pc = P.render();
    for (let x = 0; x < 11; x++) { const y = 15; if (!pc.alpha(x, y)) { pc.px(x, y, '#ffffff'); pc.px(x, y + 1, GR.white[2]); } }
    ['#e8423a', '#ff9a2a', '#ffe04a', '#58c04a', '#3a8ae8', '#7a4ac8'].forEach((c, i) => { for (let x = 21; x < 32; x++) { const y = Math.round(14 + i + (x - 21) * (0.15 + i * 0.1)); if (!pc.alpha(x, y)) pc.px(x, y, c); } });
    glint(pc, 14, 9, 1); return pc;
  },
  sack() { // the kobalos's swag sack: patched burlap, rope tie, coins spilling
    const P = new Painter(S, S);
    gem(P, [[11, 10], [21, 10], [26, 16], [29, 24], [27, 30], [5, 30], [3, 24], [6, 16]], GM.canvas, { k: 1.1, table: 4, cast: 2, id: 'sack' });
    gem(P, [[11, 4], [13, 2], [16, 4], [19, 2], [21, 4], [21, 10], [11, 10]], GM.canvas, { k: 1, cast: 1 });
    P.add(M.rect(10, 9, 12, 2), { m: GM.rope, n: plane(0, -0.3), ridge: 1, cast: 1, contour: 1 });
    gem(P, [[18, 17], [24, 17], [24, 23], [18, 23]], GM.clothPurple, { k: 1, table: 1.5, cast: 1 });
    for (const [x, y, r] of [[27, 29, 2.6], [6, 30, 2.2], [22, 31, 2]]) gem(P, ngon(x, y, r, 8, 0, 1, 0.55), GM.gold, { k: 1.2, cast: 1 });
    const pc = P.render(); P.speckle(['sack'], 0.08, 2, -1);
    for (const [x, y] of [[18, 17], [20, 17], [22, 17], [24, 19], [24, 21], [18, 19], [18, 21]]) pc.px(x, y, GR.canvas[5]);
    text(pc, '$', 11, 18, GR.canvas[1]); return pc;
  },
  thread() { // Ariadne's ball of golden-red thread unspooling into a labyrinth path
    const P = new Painter(S, S);
    gem(P, ngon(12, 12, 9.5, 10), GM.amber, { k: 1.2, table: 3, cast: 2, id: 'ball' });
    const pc = P.render();
    for (const pts of [[[5, 9], [10, 5], [17, 6]], [[4, 14], [11, 8], [19, 10]], [[6, 18], [13, 12], [20, 14]], [[9, 20], [15, 16], [19, 17]]]) P.shiftLine(pts, -1);
    const path = [[18, 18], [23, 21], [23, 25], [17, 25], [17, 29], [29, 29], [29, 22], [26, 22]];
    for (let i = 0; i + 1 < path.length; i++) { pc.line(path[i][0] + 1, path[i][1] + 1, path[i + 1][0] + 1, path[i + 1][1] + 1, GR.amber[1]); pc.line(...path[i], ...path[i + 1], GR.amber[4]); }
    glint(pc, 8, 7, 1); return pc;
  },
  wineskin() { // goatskin askos with a stopper and a dribble of wine
    const P = new Painter(S, S);
    gem(P, [[4, 18], [9, 12], [18, 10], [25, 13], [28, 19], [26, 25], [28, 29], [21, 28], [12, 29], [5, 29], [3, 24]], GM.leather, { k: 1.1, table: 3.5, cast: 2, id: 'skin' });
    gem(P, [[22, 11], [26, 6], [28, 8], [25, 13]], GM.leather, { k: 1.2, cast: 1 });
    gem(P, ngon(27.5, 6.5, 1.8, 6), GM.oak, { k: 1.2, cast: 1 });
    const pc = P.render();
    for (let i = 0; i < 7; i++) pc.px(9 + i * 2, 21 + (i % 2), GR.leather[5]);
    for (const [x, y, c] of [[29, 8, GR.wine[4]], [30, 10, GR.wine[3]], [30, 12, GR.wine[5]]]) pc.px(x, y, c);
    glint(pc, 10, 14, 1); return pc;
  },
  plumb_bob() { // brass plumb bob on a string
    const P = new Painter(S, S);
    gem(P, [[11, 11], [21, 11], [22, 15], [16, 30], [10, 15]], GM.brass, { k: 1.3, table: 1.5, cast: 2 });
    gem(P, [[13, 8], [19, 8], [19, 11], [13, 11]], GM.brass, { k: 1.2, cast: 1 });
    const pc = P.render(); pc.line(16, 0, 16, 8, '#e4dcc4'); pc.px(17, 1, '#7a6c70');
    for (let y = 16; y < 27; y += 3) pc.px(16, y, GR.brass[5]); glint(pc, 13, 13, 1); return pc;
  },
};
export const ITEM_IDS = Object.keys(ITEM);
export function itemIcon(id) { return (ITEM[id] || ITEM.spirit_cross)(); }

// ---------------------------------------------------------------- Schrodinger's crate (48x48): 0 closed with eyes in the gap, 1 lid popped with a cat
export function crate(frame = 0) {
  const P = new Painter(48, 48); const open = frame === 1;
  gem(P, [[5, 20], [35, 20], [35, 47], [5, 47]], GM.oak, { k: 1, table: 3, cast: 2, id: 'box' });
  P.add(M.poly([[35, 20], [44, 15], [44, 41], [35, 47]]), { m: GM.oak, n: plane(0.8, 0), cast: 2, id: 'box' });
  for (const x of [5, 32]) P.add(M.rect(x, 20, 3, 27), { m: GM.oak, n: plane(-0.2, 0), shade: 1, cast: 1, contour: 1 });
  P.add(M.poly(bar(9, 44, 31, 23, 1.4)), { m: GM.oak, n: plane(-0.2, -0.2), shade: 1, cast: 1, contour: 1 });
  if (!open) {
    P.add(M.poly([[5, 17], [35, 17], [44, 12], [14, 12]]), { m: GM.ink, n: plane(0, 0), contour: 0 });
    gem(P, [[3, 15], [36, 17], [45, 11], [12, 9], [3, 13]], GM.oak, { k: 1, table: 2, cast: 3 });
  } else {
    P.add(M.poly([[5, 20], [35, 20], [44, 15], [14, 15]]), { m: GM.ink, n: plane(0, 0), contour: 0 });
    gem(P, [[16, 19], [17, 10], [20, 7], [22, 10], [26, 10], [28, 7], [31, 10], [32, 19]], GM.goat, { k: 1.1, table: 2.5, cast: 2 });
    for (const x of [18, 30]) gem(P, ngon(x, 20, 2.4, 6, 0, 1, 0.6), GM.goat, { k: 1, cast: 2 });
    gem(P, [[1, 7], [22, 1], [24, 4], [3, 10]], GM.oak, { k: 1, cast: 3 });
  }
  const pc = P.render(); grainLines(P, 9, 21, 22, 25, 17); grainLines(P, 36, 18, 7, 25, 19, { vertical: true });
  if (!open) for (const x of [20, 26]) { pc.px(x, 15, '#d4f474'); pc.px(x + 1, 15, '#86d63a'); }
  else { for (const x of [21, 27]) { pc.px(x, 13, '#d4f474'); pc.px(x + 1, 13, '#0a0806'); } pc.px(24, 15, '#f2765a'); for (const s of [-1, 1]) pc.line(24 + s * 2, 16, 24 + s * 6, 15, '#f8f0d8'); }
  for (const [x, y] of [[6, 22], [6, 44], [33, 22], [33, 44]]) nail(pc, x, y);
  for (const [x, y] of [[39, 25], [40, 24], [41, 25], [41, 26], [40, 27], [40, 30]]) pc.px(x, y, GR.oak[0]);
  return pc;
}

// ---------------------------------------------------------------- Newton's apple (48x48 hero)
export function newtonApple() {
  const P = new Painter(48, 48); apple(P, 23, 27, 16, GM.apple);
  const pc = P.render(); P.speckle(['apple'], 0.06, 7, 1);
  for (const [x, y] of [[14, 17], [15, 17], [14, 18], [15, 19], [16, 20]]) pc.px(x, y, GR.apple[5]);
  glint(pc, 13, 16, 2); pc.px(31, 36, GR.apple[4]); pc.px(32, 35, GR.apple[4]);
  return pc;
}
