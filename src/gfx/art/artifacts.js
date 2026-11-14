// Artifact icons (32x32) for the curios that bend the arithmetic: same gem-sheet style as art/items.js (faceted planes,
// 6-tone jewel ramps, contour ink, hand-placed glints). Used by reward tokens and the battle's artifact tags.
import { Painter, M, glint, text } from './core.js';
import { plane, gem, ngon, blade } from './geo.js';
import { GR, GM } from './ramps.js';

const S = 32;
const ART = {
  statues() { // two petrified admirers, hands clasped to their stony hearts, on a plinth
    const P = new Painter(S, S);
    gem(P, [[2, 27], [30, 27], [31, 31], [1, 31]], GM.marble, { k: 1.2, cast: 2 });
    for (const [x, s] of [[9, 1], [22, -1]]) {
      gem(P, [[x - 5, 27], [x - 4, 15], [x - 2, 12], [x + 2, 12], [x + 4, 15], [x + 5, 27]], GM.stone, { k: 1.2, table: 2, cast: 2, id: 'body' });
      gem(P, ngon(x, 8, 3.6, 8), GM.stone, { k: 1.3, table: 1.4, cast: 2, id: 'head' });
      gem(P, [[x - 3 * s, 16], [x + 2 * s, 18], [x + 1 * s, 20], [x - 3 * s, 19]], GM.stone, { k: 1, cast: 1 });
    }
    const pc = P.render(); P.speckle(['body', 'head'], 0.1, 7, -1);
    for (const x of [8, 10, 21, 23]) pc.px(x, 8, GR.stone[1]); pc.line(7, 23, 10, 21, GR.stone[1]); pc.line(23, 22, 25, 25, GR.stone[1]);
    text(pc, 'x3', 12, 1, GR.ruby[4], { shadow: GR.ruby[1] }); glint(pc, 7, 6, 1); return pc;
  },
  tyche() { // the Dice of Tyche: two knucklebone dice mid-tumble, gilded pips, a wisp of fortune
    const P = new Painter(S, S);
    gem(P, [[3, 14], [14, 10], [20, 17], [9, 22]], GM.bone, { k: 1.2, table: 2, cast: 2 }); gem(P, [[3, 14], [9, 22], [9, 29], [3, 21]], GM.bone, { k: 1.1, cast: 1 }); gem(P, [[9, 22], [20, 17], [20, 24], [9, 29]], GM.bone, { k: 1.1, cast: 1 });
    gem(P, [[19, 5], [28, 7], [27, 15], [18, 13]], GM.ivory || GM.bone, { k: 1.2, table: 2, cast: 2 });
    const pc = P.render();
    for (const [x, y] of [[8, 15], [11, 16], [14, 17], [6, 23], [6, 19], [14, 23], [17, 21], [22, 9], [25, 12]]) { pc.px(x, y, GR.gold[4]); pc.px(x + 1, y, GR.gold[2]); }
    for (let i = 0; i < 6; i++) pc.px(24 + Math.round(Math.sin(i) * 3), 18 + i * 2, i % 2 ? '#e8d0ff' : '#b48cff');
    glint(pc, 7, 13, 1); glint(pc, 21, 6, 1); return pc;
  },
  horseshoe() { // Hermes' horseshoe: a winged golden shoe, open end up for luck
    const P = new Painter(S, S); const pts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.1 + i / 12 * 0.8); pts.push([16 + Math.cos(a) * 11, 19 + Math.sin(a) * 10]); }
    for (let i = 12; i >= 0; i--) { const a = Math.PI * (0.1 + i / 12 * 0.8); pts.push([16 + Math.cos(a) * 6.5, 19 + Math.sin(a) * 5.5]); }
    gem(P, pts.map(([x, y]) => [x, 36 - y]), GM.gold, { k: 1.3, table: 1.6, cast: 2 });
    for (const s of [-1, 1]) gem(P, blade(16 + s * 9, 13, 16 + s * 15, 4, 3.2, 0.5, 1), GM.white || GM.cloud, { k: 1.1, cast: 1 });
    const pc = P.render(); for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i / 6 * 0.7); pc.px(Math.round(16 + Math.cos(a) * 8.8), Math.round(36 - (19 + Math.sin(a) * 7.8)), GR.gold[1]); }
    glint(pc, 8, 21, 1); return pc;
  },
  pandora() { // Pandora's jar: a black-figure pithos, its lid ajar, something glowing inside
    const P = new Painter(S, S);
    gem(P, [[10, 8], [22, 8], [27, 15], [26, 25], [21, 31], [11, 31], [6, 25], [5, 15]], GM.clay, { k: 1.2, table: 4, cast: 2, id: 'jar' });
    gem(P, [[9, 5], [23, 5], [22, 8], [10, 8]], GM.clay, { k: 1.1, cast: 1 }); gem(P, [[13, 1], [24, 3], [22, 6], [11, 4]], GM.charred, { k: 1.2, cast: 2 });
    const pc = P.render(); for (let x = 7; x < 26; x++) { pc.px(x, 17, GR.charred[1]); if (x % 3 === 0) pc.px(x, 18, GR.charred[1]); }
    for (let x = 8; x < 25; x += 2) pc.px(x, 23, GR.charred[2]);
    for (const [x, y] of [[14, 5], [16, 4], [18, 5], [17, 3]]) pc.px(x, y, '#b48cff'); glint(pc, 10, 12, 1); return pc;
  },
  golden_ratio() { // the golden spiral drawn in gold over a vellum square
    const P = new Painter(S, S); gem(P, [[2, 6], [30, 6], [30, 26], [2, 26]], GM.paper, { k: 1.05, table: 6, cast: 2 });
    const pc = P.render(); let px = null;
    for (let t = 0; t < 4.2 * Math.PI; t += 0.04) { const r = 0.6 * Math.pow(1.618, t / (Math.PI / 2)) * 0.9; const x = Math.round(19 + Math.cos(t) * r), y = Math.round(16 - Math.sin(t) * r * 0.82); if (x < 3 || x > 29 || y < 7 || y > 25) break; pc.px(x, y, GR.gold[3]); px = [x, y]; }
    pc.line(19, 7, 19, 25, GR.ink?.[2] || '#6a4a2a'); pc.line(3, 16, 29, 16, GR.ink?.[2] || '#6a4a2a'); glint(pc, 19, 16, 1, '#fff6c0', GR.gold[4]); void px; return pc;
  },
  lead_boots() { // a pair of grey lead boots with brass buckles, pressing a dent into the ground
    const P = new Painter(S, S);
    for (const x of [4, 17]) { gem(P, [[x, 6], [x + 7, 6], [x + 8, 22], [x + 12, 24], [x + 12, 29], [x, 29]], GM.iron, { k: 1.25, table: 2, cast: 2, id: 'boot' }); gem(P, [[x + 1, 14], [x + 8, 14], [x + 8, 17], [x + 1, 17]], GM.brass, { k: 1.2, cast: 1 }); }
    gem(P, [[0, 29], [32, 29], [32, 32], [0, 32]], GM.dirt, { k: 1, cast: 0 });
    const pc = P.render(); P.speckle(['boot'], 0.08, 3, -1); glint(pc, 6, 9, 1); glint(pc, 19, 9, 1); return pc;
  },
  lyre() { // Pythagoras' lyre: tortoiseshell sound box, curved horn arms, seven strings in ratio
    const P = new Painter(S, S);
    gem(P, ngon(16, 25, 7, 10, 0, 1, 0.75), GM.amber, { k: 1.2, table: 2, cast: 2, id: 'shell' });
    for (const s of [-1, 1]) gem(P, blade(16 + s * 5, 22, 16 + s * 10, 3, 2.4, 1.2, 2 * s), GM.horn, { k: 1.2, cast: 2 });
    gem(P, [[5, 4], [27, 4], [27, 6], [5, 6]], GM.walnut, { k: 1.1, cast: 1 });
    const pc = P.render(); for (let i = 0; i < 7; i++) pc.line(11 + i * 1.7 | 0, 6, 13 + i | 0, 23, i % 2 ? '#fff0c8' : '#e8d0a0');
    P.speckle(['shell'], 0.15, 4, -1); glint(pc, 13, 22, 1); return pc;
  },
  nemesis() { // the coin of Nemesis: a bronze coin with the scales of retribution, a wheel on its rim
    const P = new Painter(S, S); gem(P, ngon(16, 16, 13, 16), GM.bronze, { k: 1.3, table: 7, cast: 2 }); gem(P, ngon(16, 16, 9.5, 16), GM.bronze, { k: 1, table: 9, cast: 0 });
    const pc = P.render(); pc.line(16, 9, 16, 22, GR.bronze[1]); pc.line(10, 12, 22, 12, GR.bronze[1]);
    for (const x of [10, 22]) { pc.line(x, 12, x - 2, 17, GR.bronze[1]); pc.line(x, 12, x + 2, 17, GR.bronze[1]); pc.line(x - 2, 17, x + 2, 17, GR.bronze[1]); }
    pc.line(13, 23, 19, 23, GR.bronze[1]); for (let i = 0; i < 16; i += 2) { const a = (i / 16) * Math.PI * 2; pc.px(Math.round(16 + Math.cos(a) * 11.5), Math.round(16 + Math.sin(a) * 11.5), GR.bronze[5]); }
    glint(pc, 10, 8, 1); return pc;
  },
  achilles() { // the heel of Achilles: a bronze greave over a bare heel, an arrow fletched in red
    const P = new Painter(S, S);
    gem(P, [[9, 2], [17, 2], [18, 17], [15, 21], [10, 21], [8, 17]], GM.bronze, { k: 1.3, table: 2, cast: 2 });
    gem(P, [[9, 21], [17, 21], [24, 26], [24, 30], [8, 30], [6, 25]], GM.face, { k: 1.1, table: 3, cast: 2 });
    P.add(M.poly([[29, 7], [30, 8], [11, 27], [10, 26]]), { m: GM.oak, n: plane(0, -0.4), ridge: 1, contour: 1, cast: 1 });
    gem(P, [[26, 5], [31, 2], [30, 9]], GM.clothRed, { k: 1.1, cast: 1 });
    const pc = P.render(); pc.px(10, 27, GR.red[3]); pc.px(9, 28, GR.red[2]); glint(pc, 11, 5, 1); return pc;
  },
  anvil() { // the anvil of Hephaestus with a glowing ingot and a spark in the air
    const P = new Painter(S, S);
    gem(P, [[3, 9], [27, 9], [29, 12], [22, 15], [22, 21], [26, 26], [6, 26], [10, 21], [10, 15], [5, 13]], GM.iron, { k: 1.25, table: 3, cast: 2, id: 'anvil' });
    gem(P, [[10, 5], [20, 5], [21, 9], [9, 9]], GM.fire, { k: 1.1, cast: 1 });
    const pc = P.render(); P.speckle(['anvil'], 0.06, 2, -1); for (const [x, y] of [[24, 3], [26, 1], [7, 2]]) glint(pc, x, y, 1, '#fff6c0', '#ffb04a'); return pc;
  },
  amphora() { // the leaky amphora: a slender jar, water spilling from a crack in its belly
    const P = new Painter(S, S);
    gem(P, [[13, 2], [19, 2], [18, 6], [23, 11], [23, 20], [18, 28], [14, 28], [9, 20], [9, 11], [14, 6]], GM.clay, { k: 1.2, table: 3, cast: 2 });
    for (const s of [-1, 1]) gem(P, blade(16 + s * 3, 6, 16 + s * 8, 11, 1.2, 1.2, 0), GM.clay, { k: 1, cast: 1 });
    const pc = P.render(); pc.line(20, 14, 22, 18, GR.charred[1]);
    for (let i = 0; i < 8; i++) { pc.px(23 + (i >> 1), 18 + i, i % 2 ? GR.water[4] : GR.water[3]); pc.px(24 + (i >> 1), 19 + i, GR.water[2]); }
    for (let x = 10; x < 23; x++) if (x % 2) pc.px(x, 15, GR.charred[2]); glint(pc, 12, 9, 1); return pc;
  },
  icarus_feather() { // a single great wax-sealed feather, its tip dripping
    const P = new Painter(S, S);
    gem(P, blade(6, 29, 26, 2, 6, 0.5, 2), GM.cream || GM.paper, { k: 1.2, cast: 2, id: 'vane' });
    const pc = P.render(); pc.line(6, 29, 25, 3, GR.oak[2]);
    for (let i = 0; i < 9; i++) { const x = 8 + i * 2, y = 26 - i * 2.6; pc.line(x, y | 0, x - 3, (y + 3) | 0, GR.paper[2]); }
    for (const [x, y] of [[24, 7], [24, 8], [25, 10], [23, 12]]) pc.px(x, y, GR.amber[4]); pc.px(25, 13, GR.amber[3]); glint(pc, 11, 21, 1); return pc;
  },
  talaria() { // Hermes' winged sandals
    const P = new Painter(S, S);
    gem(P, [[4, 22], [24, 22], [28, 26], [26, 29], [4, 29]], GM.leather, { k: 1.2, table: 2, cast: 2 });
    for (const [x0, y0] of [[8, 22], [14, 20], [20, 22]]) P.add(M.poly([[x0, y0], [x0 + 1.5, y0], [x0 - 2, y0 - 8], [x0 - 3.5, y0 - 8]]), { m: GM.leather, n: plane(0, -0.5), ridge: 1, contour: 1, cast: 1 });
    gem(P, blade(5, 18, 2, 5, 3.6, 0.6, -1), GM.white || GM.cloud, { k: 1.1, cast: 1 }); gem(P, blade(9, 17, 10, 4, 3, 0.6, 1), GM.white || GM.cloud, { k: 1.1, cast: 1 });
    const pc = P.render(); for (let x = 6; x < 26; x += 3) pc.px(x, 24, GR.leather[5]); glint(pc, 3, 9, 1); return pc;
  },
};
export const ARTIFACT_ICON_IDS = Object.keys(ART);
const cache = new Map();
/** a 32x32 PixelCanvas for the artifact, or null if it has no icon here */
export function artifactIcon(id) { if (!ART[id]) return null; if (!cache.has(id)) { try { cache.set(id, ART[id]()); } catch (e) { console.warn('artifact icon', id, e); cache.set(id, null); } } return cache.get(id); }
