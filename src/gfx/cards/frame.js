// The card frame as hand-built pixel art at 120x168: carved brass lip with beaded moulding, recessed enamel
// channel in the kind's colour, corner bosses with set stones, a swallowtail title ribbon, a brass type plaque,
// a parchment text box with brass photo-corners and a Greek-key footer around the numeral tab.
import { Spr, ell, and, not, orb, poly, rampOf } from './kit.js';
import { K, ENAMEL, TRIM, PARCH, INKC } from './pal.js';

export const CW = 120, CH = 168;
export const AX = 7, AY = 21, AW = 106, AH = 63;
export const MED = [[12, 12], [107, 12]];
export const TEXT_BOX = { x: 6, y: 97, w: 108, h: 56 };

const CORNER = { 0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1], 5: [5, 3, 2, 1, 1], 6: [6, 4, 3, 2, 1, 1] };
export function rr(x0, y0, w, h, r) {
  const t = CORNER[r];
  return (x, y) => {
    if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return false;
    const dy = Math.min(y - y0, y0 + h - 1 - y); if (dy < t.length) { const dx = Math.min(x - x0, x0 + w - 1 - x); if (dx < t[dy]) return false; }
    return true;
  };
}
// which side of a box a pixel is nearest to: lit (top/left) or shadow (bottom/right)
const litSide = (x, y, x0, y0, w, h) => { const t = y - y0, l = x - x0, b = y0 + h - 1 - y, r = x0 + w - 1 - x; return Math.min(t, l) <= Math.min(b, r); };

// ---- small hand-pixelled pieces ----
// a brass boss with a cabochon set stone, used on the corners
function boss(s, cx, cy, B, G) {
  s.fill(ell(cx, cy, 5.2, 5.2), INKC);
  orb(s, ell(cx, cy, 4.3, 4.3), cx, cy, 4.3, 4.3, B, { lo: 2, hi: 5, thr: [-0.2, 0.3, 0.7] });
  s.fill(ell(cx, cy, 2.6, 2.6), B[1]);
  orb(s, ell(cx, cy, 2.1, 2.1), cx, cy, 2.1, 2.1, G, { lo: 2, hi: 4, thr: [0.1, 0.6], rim: false });
  s.px(cx - 1, cy - 1, G[6]);
}
// the corner bracket: an L of carved brass ending in curls, with a boss over the corner
function cornerPiece(s, x, y, fx, fy, B, G) {
  const P = (dx, dy, c) => s.px(x + dx * fx, y + dy * fy, c);
  // arms along the two edges (2px thick, bevelled), ending in a curl
  for (let i = 4; i < 15; i++) { P(i, 1, i === 14 ? B[3] : B[5]); P(i, 2, i === 14 ? B[2] : B[3]); P(i, 3, INKC); P(1, i, i === 14 ? B[3] : B[5]); P(2, i, i === 14 ? B[2] : B[3]); P(3, i, INKC); }
  for (const [a, b, c] of [[15, 1, INKC], [15, 2, INKC], [14, 3, B[4]], [13, 4, B[3]], [12, 4, INKC], [14, 4, INKC], [15, 3, INKC], [1, 15, INKC], [2, 15, INKC], [3, 14, B[4]], [4, 13, B[3]], [4, 12, INKC], [4, 14, INKC], [3, 15, INKC]]) P(a, b, c);
  boss(s, x + 4 * fx + (fx < 0 ? 1 : 0), y + 4 * fy + (fy < 0 ? 1 : 0), B, G);
}

// Greek key (meander) band, carved into enamel
const KEY = ['XXXXXXX.', 'X.....X.', 'X.XXX.X.', 'X.X.X.X.', 'X.X...X.', 'X.XXXXX.', 'X.......', 'XXXXXXXX'];
function meander(s, x0, y0, w, E) {
  for (let y = 0; y < KEY.length; y++) for (let x = 0; x < w; x++) {
    const on = KEY[y][x % 8] === 'X'; if (!on) continue;
    s.px(x0 + x, y0 + y, E[1]);
    const below = y + 1 < KEY.length ? KEY[y + 1][x % 8] === 'X' : false; if (!below) s.px(x0 + x, y0 + y + 1, E[4]);
  }
}

export function medallion(s, mx, my, R, B) {
  s.fill(ell(mx + 0.5, my + 0.5, 10.3, 10.3), INKC);
  orb(s, ell(mx + 0.5, my + 0.5, 9.4, 9.4), mx + 0.5, my + 0.5, 9.4, 9.4, B, { lo: 2, hi: 5, thr: [-0.25, 0.25, 0.7] });
  // knurled bezel: 12 notches
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const x = Math.round(mx + 0.5 + Math.cos(a) * 8.4 - 0.5), y = Math.round(my + 0.5 + Math.sin(a) * 8.4 - 0.5); const c = s.get(x, y); const t = rampOf(c)?.[1] ?? 3; s.px(x, y, B[Math.max(1, t - 2)]); }
  s.fill(ell(mx + 0.5, my + 0.5, 6.9, 6.9), B[1]);
  s.fill(ell(mx + 0.5, my + 0.5, 6.4, 6.4), R[0]);
  orb(s, ell(mx + 0.5, my + 0.5, 5.9, 5.9), mx + 0.5, my + 0.5, 5.9, 5.9, R, { lo: 2, hi: 5, thr: [-0.3, 0.2, 0.75] });
  // lit lower rim of the recess + glint on the bezel
  s.px(mx + 4, my + 5, R[4]); s.px(mx + 5, my + 4, R[4]);
  s.px(mx - 5, my - 6, B[6]); s.px(mx - 6, my - 5, B[6]); s.px(mx - 4, my - 7, B[5]);
}

export function drawFrame(s, kind, up, { ribbon = true, plaque = true, textBox = true, footer = true } = {}) {
  const B = up ? TRIM.gold : TRIM.brass; const E = ENAMEL[kind] || ENAMEL.matter;
  const G = up ? K.cyan : kind === 'matter' ? K.paint_blue : K.red;
  // body
  s.fill(rr(0, 0, CW, CH, 6), INKC);
  // brass lip: beaded moulding, lit on top/left
  s.fill(and(rr(1, 1, CW - 2, CH - 2, 5), not(rr(3, 3, CW - 6, CH - 6, 3))), (x, y) => {
    const lit = litSide(x, y, 1, 1, CW - 2, CH - 2); const outer = !rr(2, 2, CW - 4, CH - 4, 4)(x, y);
    const along = (x === 1 || x === 2 || x === CW - 2 || x === CW - 3) ? y : x; const bead = (along + 1) % 5;
    if (bead === 0) return lit ? B[2] : B[1];
    if (outer) return lit ? (bead === 1 ? B[6] : B[5]) : (bead === 1 ? B[4] : B[3]);
    return lit ? (bead === 4 ? B[3] : B[4]) : (bead === 4 ? B[2] : B[3]);
  });
  s.fill(and(rr(3, 3, CW - 6, CH - 6, 3), not(rr(4, 4, CW - 8, CH - 8, 2))), B[1]);
  // enamel field: recessed, so shadowed under the lit lip and bright along the far edges
  s.fill(rr(4, 4, CW - 8, CH - 8, 2), (x, y) => {
    if (x === 4 || y === 4) return E[2]; if (x === CW - 5 || y === CH - 5) return E[4];
    return (x + y * 3) % 7 === 0 && (y % 2 === 0) ? E[2] : E[3];
  });
  // header: a darker band behind the ribbon
  s.fill((x, y) => x >= 5 && x <= CW - 6 && y >= 5 && y <= 18, (x, y, o) => (o === E[3] ? E[2] : o));
  // art window
  s.fill((x, y) => (x === AX - 1 || x === AX + AW || y === AY - 1 || y === AY + AH) && x >= AX - 1 && x <= AX + AW && y >= AY - 1 && y <= AY + AH, INKC);
  for (let i = AX - 2; i <= AX + AW + 1; i++) { s.px(i, AY - 2, E[2]); s.px(i, AY + AH + 1, E[5]); }
  for (let j = AY - 2; j <= AY + AH + 1; j++) { s.px(AX - 2, j, E[2]); s.px(AX + AW + 1, j, E[5]); }
  if (textBox) {
    const { x, y, w, h } = TEXT_BOX;
    s.fill(rr(x, y, w, h, 2), INKC);
    s.fill(rr(x + 1, y + 1, w - 2, h - 2, 1), (px, py) => {
      if (py === y + 1) return PARCH[3]; if (py === y + 2 || px === x + 1) return PARCH[4]; if (py === y + h - 2 || px === x + w - 2) return PARCH[6];
      return PARCH[5];
    });
    // a few fibres and a faint stain, placed by hand away from the text lines
    for (const [fx, fy, n] of [[12, 101, 3], [96, 102, 4], [20, 149, 4], [84, 148, 3], [104, 125, 2], [10, 128, 2]]) for (let i = 0; i < n; i++) s.px(fx + i, fy, PARCH[4]);
    for (const [fx, fy] of [[101, 140], [102, 141], [103, 141], [102, 142], [101, 141]]) s.px(fx, fy, PARCH[4]);
    // brass photo-corners
    for (const [cx, cy, fx, fy] of [[x + 1, y + 1, 1, 1], [x + w - 2, y + 1, -1, 1], [x + 1, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]]) {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4 - i; j++) s.px(cx + i * fx, cy + j * fy, i + j === 3 ? INKC : i === 0 || j === 0 ? B[5] : B[3]);
    }
  }
  if (footer) {
    meander(s, 8, 155, 36, E); meander(s, 76, 155, 36, E);
    // numeral tab
    const tx = 46, ty = 153, tw = 28, th = 12;
    s.fill(rr(tx, ty, tw, th, 2), INKC);
    s.fill(rr(tx + 1, ty + 1, tw - 2, th - 2, 1), (x, y) => (y === ty + 1 ? B[6] : y === ty + th - 2 ? B[2] : x === tx + 1 ? B[5] : x === tx + tw - 2 ? B[3] : B[4]));
    s.px(tx + 3, ty + 3, B[3]); s.px(tx + tw - 4, ty + 3, B[3]); s.px(tx + 3, ty + th - 4, B[3]); s.px(tx + tw - 4, ty + th - 4, B[3]);
  }
  if (plaque) {
    const px0 = 30, py0 = 85, pw = 60, ph = 11;
    s.fill(rr(px0, py0, pw, ph, 2), INKC);
    s.fill(rr(px0 + 1, py0 + 1, pw - 2, ph - 2, 1), (x, y) => (y === py0 + 1 ? B[6] : y === py0 + ph - 2 ? B[3] : x === px0 + 1 ? B[5] : x === px0 + pw - 2 ? B[3] : B[5]));
    for (const rx of [px0 + 3, px0 + pw - 5]) { s.px(rx, py0 + 4, B[6]); s.px(rx + 1, py0 + 4, B[3]); s.px(rx, py0 + 5, B[3]); s.px(rx + 1, py0 + 5, B[2]); }
  }
  // corner bosses (top ones are hidden by medallions on most cards)
  cornerPiece(s, 0, 0, 1, 1, B, G); cornerPiece(s, CW - 1, 0, -1, 1, B, G); cornerPiece(s, 0, CH - 1, 1, -1, B, G); cornerPiece(s, CW - 1, CH - 1, -1, -1, B, G);
  if (ribbon) drawRibbon(s, E);
}

// swallowtail ribbon across the header
function drawRibbon(s, E) {
  const y0 = 5, y1 = 17, x0 = 18, x1 = CW - 19;
  const t = new Spr(CW, CH);
  for (const side of [-1, 1]) {
    const X = (v) => (side < 0 ? v : CW - 1 - v);
    // tail: swallowtail notch at the outer end, back face of the cloth (darker)
    t.fill(poly([[X(5), 9], [X(x0 + 1), 9], [X(x0 + 1), 21], [X(5), 21], [X(9.5), 15]].map(([a, b]) => [side < 0 ? a : a + 1, b])), (x, y) => (y === 9 ? E[3] : y >= 20 ? E[1] : E[2]));
  }
  t.outline({ col: INKC }); t.draw(s, 0, 0);
  // fold shadows where the tails tuck under the body
  for (let k = 0; k < 3; k++) for (let j = 0; j <= 2 - k; j++) { s.px(x0 + j, y1 + 1 + k, INKC); s.px(x1 - j, y1 + 1 + k, INKC); }
  s.fill((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, (x, y) => {
    if (y === y0) return E[6]; if (y === y0 + 1) return E[5]; if (y === y1) return E[1]; if (y === y1 - 1) return E[2];
    const end = Math.min(x - x0, x1 - x);
    if (end < 1) return E[2]; if (end < 3) return E[3];
    return E[4];
  });
  // stitching just inside both edges
  for (let x = x0 + 3; x <= x1 - 3; x++) if (x % 3 !== 0) { s.px(x, y0 + 2, E[5]); s.px(x, y1 - 2, E[3]); }
  for (let x = x0 - 1; x <= x1 + 1; x++) { s.px(x, y0 - 1, INKC); s.px(x, y1 + 1, INKC); }
  for (let y = y0; y <= y1; y++) { s.px(x0 - 1, y, INKC); s.px(x1 + 1, y, INKC); }
}

// brass L-brackets over the four corners of the art window
export function windowCorners(s, B) {
  for (const [x, y, fx, fy] of [[AX - 1, AY - 1, 1, 1], [AX + AW, AY - 1, -1, 1], [AX - 1, AY + AH, 1, -1], [AX + AW, AY + AH, -1, -1]]) {
    const inL = (i, j) => (i >= 0 && j >= 0 && ((i < 7 && j < 2) || (i < 2 && j < 7)));
    for (let i = -1; i < 8; i++) for (let j = -1; j < 8; j++) {
      const X = x + i * fx, Y = y + j * fy;
      if (inL(i, j)) {
        const topEdge = j === 0 ? fy > 0 : j === 1 && i >= 2 ? fy < 0 : false; const leftEdge = i === 0 ? fx > 0 : i === 1 && j >= 2 ? fx < 0 : false;
        s.px(X, Y, i === 0 && j === 0 ? B[6] : topEdge || leftEdge ? B[5] : (i === 1 && j >= 1) || (j === 1 && i >= 1) ? B[2] : B[4]);
      } else if (inL(i - 1, j) || inL(i + 1, j) || inL(i, j - 1) || inL(i, j + 1)) s.px(X, Y, INKC);
    }
  }
}

// the lower panel on the card back: deep enamel with a stitched border and a scatter of stars
export function backPanel(s) {
  const E = ENAMEL.power; const x = 6, y = 88, w = 108, h = 64;
  s.fill(rr(x, y, w, h, 2), INKC);
  s.fill(rr(x + 1, y + 1, w - 2, h - 2, 1), (px, py) => (py === y + 1 || px === x + 1 ? E[0] : E[1]));
  for (let i = x + 3; i < x + w - 3; i++) if (i % 3) { s.px(i, y + 3, E[3]); s.px(i, y + h - 4, E[3]); }
  for (let j = y + 3; j < y + h - 3; j++) if (j % 3) { s.px(x + 3, j, E[3]); s.px(x + w - 4, j, E[3]); }
  for (const [a, b] of [[14, 96], [101, 99], [22, 143], [96, 140], [60, 95], [40, 146], [80, 147], [12, 120], [107, 124]]) s.px(a, b, E[5]);
  for (const [a, b] of [[60, 95], [12, 120], [107, 124]]) { s.px(a - 1, b, E[3]); s.px(a + 1, b, E[3]); s.px(a, b - 1, E[3]); s.px(a, b + 1, E[3]); s.px(a, b, '#ffffff'); }
}
