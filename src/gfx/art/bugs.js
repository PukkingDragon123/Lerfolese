// Butterflies of Greece, dorsal view: forewing + hindwing anatomy, species patterns, veins, eyespots, clubbed antennae.
// 4 frames per species: open, rising (foreshortened), closed (underside edge), rising. Painted small inside a 64px cell.
import { Painter, M, N, mat, norm3, clamp } from './core.js';

const R = (arr) => mat(arr, { amb: 0.34, dif: 0.7, wrap: 0.3, bounce: 0.1 });
const MT = {
  cream: R(['#4a4232', '#7a6e52', '#aa9c76', '#d6c89c', '#f2e6c0', '#fff8e2']),
  black: R(['#08070a', '#121014', '#1e1a20', '#2c262c', '#3e363c']),
  blue: R(['#0a1640', '#16307a', '#2452b0', '#3f7ce0', '#74a8f4', '#b8d8ff']),
  orange: R(['#3a1206', '#6e2408', '#a8420e', '#d86a1e', '#f29a3e', '#ffc678']),
  lemon: R(['#3a3006', '#6e5c0c', '#a88e14', '#d8bc24', '#f4e04a', '#fff69c']),
  white: R(['#5a5a64', '#8a8a96', '#b8b8c2', '#dcdce2', '#f4f4f6', '#ffffff']),
  red: R(['#3a0a0c', '#6e1414', '#a82820', '#d84a30', '#f07a50']),
  body: R(['#0b090a', '#1a1414', '#2a2020', '#3c3030', '#544444']),
  under: R(['#3a3a2e', '#626048', '#8c8a66', '#b4b28a', '#d8d6b0']),
};
// wing space: origin at the thorax, +x outward, +y toward the tail
const FORE = [[0, -0.5], [2.5, -5.5], [7.5, -9.2], [10.8, -9], [11.6, -7.2], [10.4, -3], [7.5, 0.4], [3, 1.2], [0, 1]];
const FORE_POINTED = [[0, -0.5], [3, -6], [8, -9.4], [12.4, -9.6], [10.8, -5.4], [8.6, -1.4], [5, 1], [0, 1]];
const HIND = [[0, 0.6], [4, 0.6], [7.6, 2.2], [8.6, 5], [7.2, 8.2], [4.4, 9.6], [1.6, 8.2], [0.2, 4]];
const HIND_TAIL = [[0, 0.6], [4, 0.6], [7.6, 2.4], [8.4, 5.4], [7.2, 8.4], [6.4, 9.2], [6.6, 13.6], [5.4, 13.8], [5, 9.8], [3.4, 10], [1.4, 8.4], [0.2, 4]];
const HIND_LEAF = [[0, 0.6], [4.5, 0.4], [8.4, 3], [9.4, 6.2], [8.8, 7.4], [5.6, 9.4], [2, 8.4], [0.2, 4]];

export const BUTTERFLIES = {
  swallowtail: { fore: FORE_POINTED, hind: HIND_TAIL, base: 'cream', under: 'cream',
    pat(w, x, y) { // scarce swallowtail: black tiger stripes, black margins, blue lunules + orange eyespot on the hindwing
      if (w === 'f') { const d = x * 0.62 + y * 0.42; if (Math.abs(((d + 0.6) % 2.6 + 2.6) % 2.6 - 1.3) < 0.42 && x > 1) return 'black'; if (x > 9.4 || (y < -8.2 && x > 5)) return 'black'; return null; }
      if (y > 9.6) return x > 5.6 && y > 12.6 ? 'cream' : 'black'; if (x > 6.2 || y > 7.4) { if (Math.hypot(x - 4.2, y - 8.4) < 1.2) return 'orange'; if ((Math.floor(x * 0.9 + y * 0.5) % 2 === 0) && y > 6) return 'blue'; return 'black'; } if (x < 1.8 && y > 2) return 'black'; return null; },
  },
  blue: { fore: FORE, hind: HIND, base: 'blue', under: 'white',
    pat(w, x, y) { if (w === 'f') { if (x > 10.2 || (x > 6 && y < -8.6)) return 'white'; if (x > 9.4) return 'black'; return null; } const r = Math.hypot(x - 1, y - 2.5); if (r > 7.6) return 'white'; if (r > 6.9) return 'black'; return null; },
  },
  lady: { fore: FORE, hind: HIND, base: 'orange', under: 'under',
    pat(w, x, y) { if (w === 'f') { if (x > 6.2 && y < -4.2) { if (Math.hypot(x - 9.4, y - 7.2) < 0.9 || Math.hypot(x - 7.6, y - 5.6) < 0.8 || Math.hypot(x - 10.4, y - 5) < 0.7) return 'white'; return 'black'; } if (Math.abs(x * 0.5 - y * 0.6 - 4.4) < 0.55 && x > 3) return 'black'; return null; } const r = Math.hypot(x - 1, y - 2.5); if (r > 6.6 && (Math.floor(Math.atan2(y - 2.5, x - 1) * 4) % 2 === 0)) return 'black'; if (r > 7.2) return 'black'; return null; },
  },
  brimstone: { fore: FORE_POINTED, hind: HIND_LEAF, base: 'lemon', under: 'lemon',
    pat(w, x, y) { if (w === 'f' && x > 2 && x < 8 && y > -6 && y < -0.5) return 'orange'; if (Math.hypot(x - (w === 'f' ? 6.6 : 4.4), y - (w === 'f' ? -3.6 : 4.4)) < 0.7) return 'orange'; return null; },
  },
};

export function paintButterfly(kind, frame) {
  const K = BUTTERFLIES[kind]; const P = new Painter(64, 64); const cx = 32, cy = 31, tilt = -0.32;
  const flap = [0.05, 0.98, 1.3, 0.98][frame]; const fs = Math.cos(flap); // foreshortening of the wing span
  const SC = 1.18; const tr = (x, y, side) => { const X = x * SC * fs * side, Y = y * SC; return [cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt)]; };
  const inv = (px, py, side) => { const dx = px - cx, dy = py - cy; const X = dx * Math.cos(-tilt) - dy * Math.sin(-tilt), Y = dx * Math.sin(-tilt) + dy * Math.cos(-tilt); return [X / (SC * fs * side || 1e-3), Y / SC]; };
  const closed = frame === 2;
  // wings: far (left) pair first, then near (right)
  for (const side of [-1, 1]) {
    const n = norm3(side * Math.sin(flap) * 0.9, -0.2, Math.cos(flap) + 0.15);
    for (const [w, shape] of [['h', K.hind], ['f', K.fore]]) {
      const pts = shape.map(([x, y]) => tr(x, y, side));
      P.add(M.poly(pts), {
        m: (px, py) => { const [x, y] = inv(px, py, side); if (closed) return MT[K.under]; const p = K.pat(w, x, y); return MT[p || K.base]; },
        n: () => n, shade: side < 0 ? -1 : 0,
        tex: (px, py) => { const [x, y] = inv(px, py, side); let v = -Math.max(0, 1.8 - Math.hypot(x, y)) * 0.12; const ang = Math.atan2(y, x); if (!closed && Math.abs(((ang * 3.2) % 1 + 1) % 1 - 0.5) < 0.06 && Math.hypot(x, y) > 3) v -= 0.1; return v; },
        contour: 1,
      });
    }
  }
  // body: abdomen, thorax, head, antennae
  const B = (x, y) => tr(x, y, 1);
  const [ax, ay] = B(0, 1.5), [bx, by] = B(0, 8);
  P.add(M.capsule(ax, ay, bx, by, 1.15, 0.7), { m: MT.body, n: N.cyl(ax, ay, bx, by, 1.4), contour: 1 });
  const [tx, ty] = B(0, -0.3); P.add(M.ellipse(tx, ty, 1.7, 2.3, tilt), { m: MT.body, n: N.sphere(tx, ty, 1.8, 2.4), contour: 1 });
  const [hx, hy] = B(0, -3); P.add(M.ellipse(hx, hy, 1.3, 1.2), { m: MT.body, n: N.sphere(hx, hy, 1.3, 1.3), contour: 0 });
  const pc = P.render();
  for (const side of [-1, 1]) { const [x0, y0] = B(side * 0.6, -3.6), [x1, y1] = B(side * 3.2, -9.4); pc.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#1a1416'); pc.px(Math.round(x1), Math.round(y1), '#3a3036'); pc.px(Math.round(x1) + side, Math.round(y1), '#1a1416'); }
  const [ex, ey] = B(0.6, -3.4); pc.px(Math.round(ex), Math.round(ey), '#6a5a50');
  return pc;
}
