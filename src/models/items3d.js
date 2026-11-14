// Curios / artifacts as DETAILED smooth 3D models (lathed, swept and bevel-extruded forms, never bare primitives), cel
// shaded (MeshToon, 3-4 hard bands) with ink outlines, plus:
//   itemModel(id)        normalised clone (fits a unit box, centred) for displays, the journal and the wearables
//   animateModel(o, t)   idle life of the moving parts (gears turn, pendulums swing, dice tumble, sparks flicker)
//   CurioDisplay         pedestal + floating model + rarity aura (RuneMono glyph band) + glints, spin/bob/hover
//   rarityOf(id), RARITY, itemIcon(id) (forge-rendered canvas for 2D pages)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gradientMap, toonMaterial } from './toon.js';
import * as P3 from './props3d.js';
import { ITEMS, ITEM_POOLS } from '../game/data/items.js';
import { getForge } from '../gfx/forge.js';
import { PixelCanvas } from '../gfx/pixel.js';
import { inkHull, drawPixelText } from '../ui3d/craft.js';

const TAU = Math.PI * 2;
// ---------------------------------------------------------------- cel materials
const MC = new Map();
const BANDS = { matte: [0.42, 0.7, 1.0], metal: [0.3, 0.55, 0.82, 1.0], soft: [0.55, 0.8, 1.0] };
function tm(color, { metal = false, soft = false, opacity = 1, emissive = 0, ei = 1, side = THREE.FrontSide } = {}) {
  const key = [color, metal, soft, opacity, emissive, ei, side].join('|'); let m = MC.get(key); if (m) return m;
  m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradientMap(metal ? BANDS.metal : soft ? BANDS.soft : BANDS.matte), transparent: opacity < 1, opacity, depthWrite: opacity >= 1, emissive: new THREE.Color(emissive), emissiveIntensity: ei, side });
  MC.set(key, m); return m;
}
const glow = (color, k = 2.2) => { const key = 'glow|' + color + '|' + k; let m = MC.get(key); if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false }); MC.set(key, m); } return m; };
const C = { gold: 0xf4c24c, brass: 0xe0a640, bronze: 0xc8823c, verd: 0x5aa88a, iron: 0x5a5e6a, lead: 0x8c94a4, steel: 0xc8d0dc, silver: 0xe4ecf4, marble: 0xece6da, stone: 0xbdb6a8,
  oak: 0xa0683a, walnut: 0x6a3c1e, leather: 0x8a4e2a, red: 0xd0443a, wine: 0x6a1e4a, wax: 0xf6e4b0, feather: 0xfff8ec, ivory: 0xf2e8cc, clay: 0xd2703a, black: 0x2a2026, cloth: 0xb08850, glass: 0xc8f0ff };

// ---------------------------------------------------------------- smooth geometry helpers
const V2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
const V3 = (a) => a.map((p) => new THREE.Vector3(...p));
function lathe(pts, seg = 40, phiStart = 0, phiLen = TAU) { const g = new THREE.LatheGeometry(V2(pts), seg, phiStart, phiLen); g.computeVertexNormals(); return g; }
// smooth profile from control points (Catmull-Rom in 2D) so lathed bodies have no faceted silhouette
function curvy(pts, n = 48) { const c = new THREE.SplineCurve(V2(pts)); return c.getPoints(n).map((v) => [Math.max(0.0005, v.x), v.y]); }
function tube(pts, r, { seg = 32, rad = 10, closed = false, taper = null } = {}) {
  const c = new THREE.CatmullRomCurve3(V3(pts), closed, 'centripetal'); const g = new THREE.TubeGeometry(c, seg, r, rad, closed);
  if (taper) { const p = g.attributes.position; const q = new THREE.Vector3(); for (let i = 0; i <= seg; i++) { const ctr = c.getPointAt(i / seg); const k = taper(i / seg); for (let j = 0; j <= rad; j++) { const vi = i * (rad + 1) + j; q.fromBufferAttribute(p, vi).sub(ctr).multiplyScalar(k).add(ctr); p.setXYZ(vi, q.x, q.y, q.z); } } g.computeVertexNormals(); }
  return g;
}
function shape(pts, holes = []) { const s = new THREE.Shape(V2(pts)); for (const h of holes) s.holes.push(new THREE.Path(V2(h))); return s; }
function smoothShape(pts, n = 64, holes = []) { const c = new THREE.SplineCurve(V2([...pts, pts[0]])); return shape(c.getPoints(n).map((v) => [v.x, v.y]), holes); }
function extrude(s, depth, bevel = 0.03, { segs = 3, curve = 24 } = {}) { const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: segs, curveSegments: curve }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; }
const circle = (r, n = 32, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * r]);
const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 4, r);
const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; };
// a feather: tapered vane with a notch, a rachis down the middle (wings, horseshoe wings, Icarus, talaria)
function feather(p, len, wid, mat, { x = 0, y = 0, z = 0, rz = 0, ry = 0, quill = C.ivory } = {}) {
  const g = grp(p, x, y, z); g.rotation.set(0, ry, rz);
  const s = smoothShape([[0, 0], [wid * 0.55, len * 0.18], [wid * 0.5, len * 0.62], [wid * 0.12, len], [-wid * 0.18, len * 0.82], [-wid * 0.45, len * 0.4], [-wid * 0.3, len * 0.1]], 40);
  add(g, extrude(s, 0.012, 0.008, { segs: 2 }), mat);
  add(g, tube([[0, -len * 0.08, 0.012], [0.004, len * 0.45, 0.016], [-wid * 0.05, len * 0.92, 0.012]], wid * 0.05, { seg: 12, rad: 5, taper: (u) => 1 - u * 0.8 }), tm(quill));
  return g;
}
// a gear blank with teeth, a bore and spoke windows, bevel-extruded
function gear(r, teeth, depth, mat, { spokes = 4, bore = 0.18 } = {}) {
  const pts = []; const n = teeth * 4; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const k = i % 4; const rr = k === 1 || k === 2 ? r : r * 0.86; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const holes = [circle(r * bore, 16).reverse()]; for (let s = 0; s < spokes; s++) { const a0 = (s / spokes) * TAU + 0.35, a1 = a0 + TAU / spokes - 0.7; const w = []; for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * (i / 8); w.push([Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7]); } for (let i = 8; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / 8); w.push([Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32]); } holes.push(w.reverse()); }
  return new THREE.Mesh(extrude(shape(pts, holes), depth, depth * 0.25, { segs: 2 }), mat);
}
// a little standing figure in robes (statues): lathed robe + head + bun, arms swept across the chest
function figure(p, mat, { x = 0, z = 0, h = 0.9, ry = 0, pose = 0 } = {}) {
  const g = grp(p, x, 0, z); g.rotation.y = ry; const k = h;
  add(g, lathe(curvy([[0.0005, 0], [0.2, 0.0], [0.17, 0.12], [0.13, 0.36], [0.1, 0.52], [0.13, 0.62], [0.11, 0.7], [0.05, 0.74], [0.0005, 0.745]].map(([a, b]) => [a * k, b * k]), 40), 28), mat);
  add(g, lathe(curvy([[0.0005, 0], [0.05, 0.01], [0.075, 0.07], [0.07, 0.13], [0.04, 0.17], [0.0005, 0.18]].map(([a, b]) => [a * k, b * k]), 24), 20), mat, 0, 0.74 * k, 0);
  add(g, lathe(curvy([[0.0005, 0], [0.04, 0.02], [0.035, 0.06], [0.0005, 0.07]].map(([a, b]) => [a * k, b * k]), 12), 14), mat, 0, 0.88 * k, -0.04 * k);
  for (const s of [-1, 1]) add(g, tube([[s * 0.12 * k, 0.62 * k, 0], [s * 0.14 * k, 0.5 * k, 0.07 * k], [s * 0.03 * k, (0.5 + pose * 0.12) * k, 0.12 * k]], 0.028 * k, { seg: 12, rad: 7 }), mat);
  return g;
}
const die = (p, s, mat, pip, x, y, z, rx, ry, rz) => { // a rounded die with sunk pips on all six faces
  const g = grp(p, x, y, z); g.rotation.set(rx, ry, rz); add(g, rbox(s, s, s, s * 0.16), mat); const h = s / 2 + 0.002, q = s * 0.26, pg = lathe([[0.0005, 0], [s * 0.085, 0], [s * 0.075, -s * 0.02], [0.0005, -s * 0.025]], 14);
  const F = { 1: [[0, 0]], 2: [[-q, -q], [q, q]], 3: [[-q, -q], [0, 0], [q, q]], 4: [[-q, -q], [q, q], [-q, q], [q, -q]], 5: [[-q, -q], [q, q], [-q, q], [q, -q], [0, 0]], 6: [[-q, -q], [-q, 0], [-q, q], [q, -q], [q, 0], [q, q]] };
  const faces = [[1, [0, 0, 1], [Math.PI / 2, 0, 0]], [6, [0, 0, -1], [-Math.PI / 2, 0, 0]], [2, [1, 0, 0], [0, 0, -Math.PI / 2]], [5, [-1, 0, 0], [0, 0, Math.PI / 2]], [3, [0, 1, 0], [0, 0, 0]], [4, [0, -1, 0], [Math.PI, 0, 0]]];
  for (const [n, nrm, rot] of faces) { const f = grp(g); f.rotation.set(...rot); for (const [a, b] of F[n]) add(f, pg, pip, a, h, b); f.position.set(0, 0, 0); }
  return g;
};

// ---------------------------------------------------------------- the curios (each built at ~1 unit, any orientation; normalised later)
export const ITEM_MODELS = {
  spirit_cross() { const g = grp(); const w = tm(C.walnut);
    add(g, rbox(1.4, 0.13, 0.15, 0.05), w); add(g, rbox(0.14, 0.13, 0.95, 0.05), w, 0, 0.0, 0);
    const cap = lathe(curvy([[0.0005, 0], [0.09, 0.0], [0.1, 0.04], [0.07, 0.08], [0.0005, 0.1]], 16), 20); for (const x of [-0.72, 0.72]) add(g, cap, tm(C.brass, { metal: true }), x, 0, 0, 0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2);
    add(g, lathe(curvy([[0.0005, -0.1], [0.12, -0.09], [0.13, 0], [0.12, 0.09], [0.0005, 0.1]], 16), 24), tm(C.brass, { metal: true }), 0, 0, 0, Math.PI / 2);
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((x, i) => add(g, tube([[x, -0.06, 0], [x + 0.02, -0.5, 0.03 * i], [x - 0.02, -1.0, 0]], 0.007, { seg: 10, rad: 4 }), glow(0x8fe3ff, 2.4)));
    return g; },
  golden_apple() { const a = P3.apple({ kind: 'gold' }); a.traverse((o) => { if (o.isMesh) o.material = toonMaterial(o.material, { sat: 1.2 }); }); return a; },
  lever() { const g = grp();
    add(g, extrude(smoothShape([[-0.95, -0.04], [0.9, -0.06], [0.98, 0.0], [0.9, 0.06], [-0.95, 0.04], [-1.0, 0.0]], 40), 0.12, 0.025), tm(C.oak), 0, 0.15, 0, 0, 0, 0.22);
    for (const x of [-0.5, 0.35]) add(g, tube([[0, 0, -0.085], [0, 0, 0.085]], 0.075, { seg: 4, rad: 12 }), tm(C.iron, { metal: true }), x, 0.15 + x * 0.22, 0);
    add(g, extrude(smoothShape([[-0.32, -0.42], [0.32, -0.42], [0.12, 0.02], [0.0, 0.08], [-0.12, 0.02]], 40), 0.36, 0.04), tm(C.stone), 0.1, -0.05, 0);
    const b = P3.stone({ seed: 7 }); b.traverse((o) => { if (o.isMesh) o.material = tm(0x9a8e7e); }); b.scale.setScalar(0.42); b.position.set(-0.85, 0.08, 0); g.add(b); return g; },
  pendulum() { const g = grp(); const br = tm(C.brass, { metal: true });
    add(g, rbox(1.0, 0.07, 0.4, 0.03), tm(C.walnut), 0, -0.7, 0);
    add(g, tube([[-0.38, -0.66, 0], [-0.38, 0.5, 0], [-0.25, 0.68, 0], [0.25, 0.68, 0], [0.38, 0.5, 0], [0.38, -0.66, 0]], 0.03, { seg: 48, rad: 8 }), br);
    const piv = grp(g, 0, 0.66, 0); piv.userData.swing = [1.6, 0.35];
    add(piv, tube([[0, 0, 0], [0, -0.95, 0]], 0.006, { seg: 2, rad: 4 }), tm(C.ivory));
    add(piv, lathe(curvy([[0.0005, -0.32], [0.05, -0.27], [0.14, -0.12], [0.16, -0.04], [0.13, 0.04], [0.06, 0.08], [0.03, 0.12], [0.0005, 0.13]], 40), 32), br, 0, -1.0, 0);
    return g; },
  leyden() { const g = grp();
    add(g, lathe(curvy([[0.0005, -0.5], [0.33, -0.5], [0.36, -0.42], [0.37, 0.18], [0.3, 0.32], [0.2, 0.38], [0.2, 0.44], [0.0005, 0.44]], 40), 40), tm(C.glass, { opacity: 0.45, soft: true }));
    add(g, lathe([[0.0005, -0.47], [0.345, -0.47], [0.35, 0.02], [0.0005, 0.02]], 40), tm(C.silver, { metal: true }));
    add(g, lathe(curvy([[0.0005, 0.38], [0.21, 0.38], [0.23, 0.46], [0.19, 0.52], [0.0005, 0.52]], 16), 32), tm(C.walnut));
    add(g, tube([[0, 0.5, 0], [0, 0.9, 0]], 0.02, { seg: 2, rad: 8 }), tm(C.brass, { metal: true }));
    add(g, lathe(curvy([[0.0005, -0.08], [0.06, -0.07], [0.08, 0], [0.06, 0.07], [0.0005, 0.08]], 16), 24), tm(C.brass, { metal: true }), 0, 0.96, 0);
    add(g, tube([[0, 0.5, 0], [0.04, 0.2, 0.05], [-0.03, -0.1, 0.02], [0, -0.3, 0]], 0.008, { seg: 16, rad: 4 }), tm(C.brass, { metal: true }));
    const arcs = grp(g, 0, 0.96, 0); arcs.userData.flicker = 9;
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; const pts = [[0, 0, 0]]; for (let j = 1; j <= 5; j++) pts.push([Math.cos(a) * j * 0.07 + Math.sin(j * 3 + i) * 0.03, Math.sin(j * 2.1 + i) * 0.05 + j * 0.02, Math.sin(a) * j * 0.07]); add(arcs, tube(pts, 0.008, { seg: 14, rad: 3 }), glow(0xfff0a0, 2.6)); }
    return g; },
  wings() { const g = grp(); const wax = tm(C.wax);
    for (const s of [-1, 1]) { const w = grp(g, s * 0.08, 0, 0); w.scale.x = s; w.userData.flap = [2.2, 0.18, s];
      add(w, tube([[0.02, 0.05, 0], [0.35, 0.3, 0.02], [0.75, 0.32, 0], [1.0, 0.15, -0.02]], 0.035, { seg: 24, rad: 8, taper: (u) => 1 - u * 0.6 }), wax);
      for (let i = 0; i < 9; i++) { const u = i / 8; feather(w, 0.95 - u * 0.3 + (i % 2) * 0.06, 0.18, tm(i % 2 ? C.feather : 0xf2e2c4, { soft: true }), { x: 0.08 + u * 0.88, y: 0.22 - u * 0.12 + Math.sin(u * 3) * 0.08, z: -0.01 * i, rz: Math.PI + 0.15 - u * 0.5 }); }
      for (let i = 0; i < 5; i++) feather(w, 0.35, 0.12, tm(0xe8d2a8, { soft: true }), { x: 0.12 + i * 0.16, y: 0.2, z: 0.03, rz: Math.PI + 0.3 - i * 0.12 }); }
    for (const [x, y] of [[0.3, 0.12], [0.55, 0.2]]) add(g, lathe(curvy([[0.0005, 0.06], [0.025, 0.03], [0.03, -0.02], [0.0005, -0.045]], 12), 14), tm(C.wax), x, y - 0.05, 0.03);
    return g; },
  antikythera() { const g = grp(); const bz = tm(C.bronze, { metal: true }), vg = tm(C.verd, { metal: true });
    add(g, rbox(1.25, 1.0, 0.12, 0.05), tm(C.walnut), 0.1, -0.05, -0.12);
    const g1 = grp(g, -0.12, 0.0, 0); g1.add(gear(0.42, 18, 0.07, bz, { spokes: 4 })); g1.userData.spin = 0.5;
    const g2 = grp(g, 0.43, 0.27, 0.02); g2.add(gear(0.2, 10, 0.07, vg, { spokes: 3 })); g2.userData.spin = -1.05;
    const g3 = grp(g, 0.42, -0.3, 0.03); g3.add(gear(0.16, 8, 0.07, bz, { spokes: 3 })); g3.userData.spin = -1.3;
    add(g, lathe(curvy([[0.0005, 0], [0.06, 0], [0.07, 0.05], [0.04, 0.08], [0.0005, 0.09]], 12), 20), tm(C.gold, { metal: true }), -0.12, 0, 0.04, Math.PI / 2);
    const hand = grp(g, -0.12, 0, 0.09); hand.userData.spin = 0.2; add(hand, extrude(shape([[-0.015, 0], [0.015, 0], [0.006, 0.36], [-0.006, 0.36]]), 0.01, 0.005), tm(C.gold, { metal: true }));
    return g; },
  schrodinger() { const g = grp(); const w = tm(C.oak), br = tm(C.brass, { metal: true });
    add(g, rbox(1.1, 0.62, 0.72, 0.06), w, 0, -0.1, 0);
    for (const x of [-0.5, 0.5]) for (const z of [-0.31, 0.31]) add(g, rbox(0.12, 0.66, 0.12, 0.03), br, x, -0.1, z);
    const lid = grp(g, 0, 0.21, -0.36); lid.rotation.x = -0.55; lid.userData.lid = 1; add(lid, rbox(1.14, 0.1, 0.76, 0.04), tm(C.walnut), 0, 0.03, 0.37);
    add(lid, tube([[-0.22, 0.08, 0.37], [-0.18, 0.2, 0.37], [0.18, 0.2, 0.37], [0.22, 0.08, 0.37]], 0.025, { seg: 16, rad: 8 }), br);
    add(g, rbox(0.98, 0.04, 0.6, 0.02), tm(0x1a1018), 0, 0.2, 0);
    for (const s of [-1, 1]) { add(g, extrude(smoothShape([[-0.08, 0], [0.08, 0], [0.01, 0.16]], 12), 0.03, 0.012), tm(0x3a3440), s * 0.16, 0.22, 0.05, 0, 0, s * 0.12); add(g, lathe(curvy([[0.0005, -0.03], [0.02, -0.02], [0.022, 0.02], [0.0005, 0.03]], 10), 12), glow(0x9cff60, 2.4), s * 0.11, 0.25, 0.2, Math.PI / 2, 0, 0); }
    return g; },
  owl() { const g = grp(); const br = tm(0x8a5a3a), cr = tm(0xf0dcb4);
    add(g, tube([[-0.6, -0.55, 0], [0, -0.58, 0.05], [0.6, -0.52, 0]], 0.06, { seg: 16, rad: 10 }), tm(C.walnut));
    add(g, lathe(curvy([[0.0005, -0.5], [0.22, -0.48], [0.32, -0.3], [0.33, -0.05], [0.26, 0.15], [0.0005, 0.2]], 40), 36), br);
    add(g, lathe(curvy([[0.0005, -0.18], [0.24, -0.15], [0.28, 0.02], [0.22, 0.16], [0.0005, 0.2]], 30), 36), br, 0, 0.32, 0);
    add(g, lathe(curvy([[0.0005, -0.45], [0.18, -0.4], [0.24, -0.2], [0.2, 0.0], [0.0005, 0.05]], 24), 30), cr, 0, 0, 0.1).scale.set(1, 1, 0.6);
    for (const s of [-1, 1]) {
      add(g, lathe([[0.0005, 0.03], [0.1, 0.02], [0.11, 0], [0.0005, -0.005]], 24), cr, s * 0.11, 0.34, 0.2, Math.PI / 2);
      add(g, lathe(curvy([[0.0005, 0.03], [0.065, 0.02], [0.07, 0], [0.0005, -0.01]], 10), 20), tm(0xffcc33, { emissive: 0x6a4a00, ei: 0.5 }), s * 0.11, 0.34, 0.225, Math.PI / 2);
      add(g, lathe([[0.0005, 0.02], [0.032, 0.012], [0.0005, 0]], 12), tm(0x120a10), s * 0.11, 0.34, 0.24, Math.PI / 2);
      add(g, extrude(smoothShape([[0, 0], [0.06, 0.02], [0.03, 0.16]], 12), 0.04, 0.012), br, s * 0.17, 0.48, 0, 0, 0, -s * 0.35);
      add(g, extrude(smoothShape([[0, 0.25], [0.1, 0.12], [0.08, -0.25], [0, -0.35], [-0.04, 0]], 30), 0.06, 0.02), tm(0x6a4028), s * 0.3, -0.12, -0.02, 0, s * 0.5, s * 0.1);
      for (let t = -1; t <= 1; t++) add(g, tube([[s * 0.1 + t * 0.03, -0.5, 0.05], [s * 0.1 + t * 0.04, -0.55, 0.11]], 0.012, { seg: 3, rad: 5 }), tm(0xe8a030));
    }
    add(g, extrude(smoothShape([[-0.035, 0.02], [0.035, 0.02], [0, -0.07]], 10), 0.04, 0.012), tm(0xe8a030), 0, 0.27, 0.24, -0.4);
    return g; },
  pan_flute() { const g = grp(); const reed = tm(0xd8b060);
    for (let i = 0; i < 7; i++) { const h = 1.05 - i * 0.1; add(g, lathe([[0.055, 0], [0.062, 0.002], [0.064, h], [0.05, h], [0.048, h - 0.06]], 24), reed, -0.42 + i * 0.14, -0.5 + (1.05 - h), 0); add(g, lathe([[0.066, 0], [0.068, 0.02], [0.066, 0.04]], 24), tm(0xa07838), -0.42 + i * 0.14, -0.5 + (1.05 - h) + h * 0.55, 0); }
    for (const y of [0.15, 0.32]) add(g, tube([[-0.5, y, 0.07], [0, y + 0.01, 0.08], [0.5, y - 0.02, 0.07]], 0.025, { seg: 16, rad: 6 }), tm(C.red));
    add(g, tube([[0.5, 0.15, 0.07], [0.6, 0.0, 0.1], [0.62, -0.25, 0.05]], 0.015, { seg: 10, rad: 5 }), tm(C.red));
    return g; },
  horn() { const g = grp(); const pts = [[0, -0.6, 0], [0.32, -0.25, 0.08], [0.38, 0.15, 0.15], [0.18, 0.48, 0.2], [-0.12, 0.6, 0.18]];
    add(g, tube(pts, 0.2, { seg: 48, rad: 16, taper: (u) => Math.pow(1 - u, 0.8) * (1 + 0.06 * Math.sin(u * 60)) + 0.02 }), tm(0xeedcb8));
    add(g, tube([[0, -0.6, 0], [0.05, -0.55, 0.01]], 0.215, { seg: 2, rad: 16 }), tm(C.brass, { metal: true }));
    add(g, tube([[0.27, -0.33, 0.06], [0.31, -0.27, 0.07]], 0.19, { seg: 2, rad: 16 }), tm(C.brass, { metal: true }));
    add(g, tube([[-0.12, 0.6, 0.18], [-0.2, 0.61, 0.17]], 0.016, { seg: 2, rad: 8, taper: (u) => 1 - u }), tm(C.gold, { metal: true }));
    return g; },
  fang() { const g = grp();
    add(g, tube([[0, 0.55, 0], [0.1, 0.2, 0.03], [0.08, -0.15, 0.05], [-0.06, -0.55, 0.06]], 0.17, { seg: 40, rad: 14, taper: (u) => Math.max(0.02, Math.pow(1 - u, 1.1)) }), tm(0xf4ecd6));
    add(g, lathe(curvy([[0.0005, 0.48], [0.18, 0.52], [0.2, 0.62], [0.12, 0.7], [0.0005, 0.72]], 20), 24), tm(0xc89a8a));
    add(g, lathe(curvy([[0.0005, 0.06], [0.03, 0.02], [0.035, -0.02], [0.0005, -0.05]], 12), 16), glow(0x9cff60, 2.4), -0.07, -0.64, 0.06);
    return g; },
  mirror() { const g = grp(); const bz = tm(C.bronze, { metal: true });
    const outer = []; for (let i = 0; i < 96; i++) { const a = (i / 96) * TAU; const r = 0.5 + 0.035 * Math.cos(a * 12); outer.push([Math.cos(a) * r, Math.sin(a) * r + 0.2]); }
    add(g, extrude(shape(outer, [circle(0.4, 64, 0, 0.2).reverse()]), 0.07, 0.025), bz);
    add(g, lathe([[0.0005, 0.02], [0.4, 0.0], [0.41, -0.02], [0.0005, -0.02]], 48), tm(0xdaf0ff, { metal: true, emissive: 0x5a7a9a, ei: 0.4 }), 0, 0.2, 0, Math.PI / 2);
    add(g, lathe(curvy([[0.0005, -0.75], [0.07, -0.72], [0.05, -0.6], [0.07, -0.48], [0.05, -0.38], [0.08, -0.3], [0.0005, -0.28]], 40), 24), bz);
    const sp = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const a = u * TAU * 2.5; sp.push([Math.cos(a) * 0.085, -0.72 + u * 0.42, Math.sin(a) * 0.085]); } add(g, tube(sp, 0.018, { seg: 80, rad: 6, taper: (u) => 0.4 + u * 0.8 }), tm(0x4a9a4a));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; add(g, tube([[Math.cos(a) * 0.5, Math.sin(a) * 0.5 + 0.2, 0.03], [Math.cos(a) * 0.64, Math.sin(a) * 0.64 + 0.2, 0.06 + Math.sin(i) * 0.04], [Math.cos(a + 0.2) * 0.7, Math.sin(a + 0.2) * 0.7 + 0.2, 0.02]], 0.03, { seg: 12, rad: 6, taper: (u) => 1 - u * 0.7 }), tm(0x4a9a4a)); }
    return g; },
  prism() { const g = grp();
    add(g, extrude(shape([[-0.45, -0.38], [0.45, -0.38], [0, 0.42]]), 0.5, 0.035), tm(0xe6f8ff, { opacity: 0.55, soft: true }));
    add(g, extrude(shape([[-0.45, -0.38], [0.45, -0.38], [0, 0.42]]), 0.42, 0.0), tm(0xffffff, { opacity: 0.18, soft: true }));
    add(g, tube([[-1.2, -0.05, 0], [-0.25, 0.02, 0]], 0.022, { seg: 2, rad: 6 }), glow(0xffffff, 2.4));
    const fan = grp(g, 0.18, 0.0, 0); fan.userData.fan = 1;
    [0xff3a3a, 0xff9a20, 0xffe040, 0x60e040, 0x40a0ff, 0x9a50ff].forEach((c, i) => add(fan, extrude(shape([[0, -0.01], [1.0, -0.04 - i * 0.07], [1.0, -0.1 - i * 0.07], [0, -0.016]]), 0.02, 0), glow(c, 1.9), 0, 0, 0.01 * i));
    return g; },
  sack() { const g = grp(); const cl = tm(C.cloth);
    const sk = add(g, lathe(curvy([[0.0005, -0.5], [0.3, -0.48], [0.46, -0.3], [0.48, -0.05], [0.36, 0.2], [0.14, 0.34], [0.1, 0.4], [0.18, 0.55], [0.14, 0.58]], 60), 36), cl); const p = sk.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const a = Math.atan2(z, x); const k = 1 + 0.05 * Math.sin(a * 7 + y * 4); p.setXYZ(i, x * k, y, z * k * 0.9); } sk.geometry.computeVertexNormals();
    add(g, tube(circle(0.115, 16).map(([x, z]) => [x, 0.4, z]), 0.03, { seg: 32, rad: 6, closed: true }), tm(0xc8a060));
    add(g, tube([[0.1, 0.4, 0.06], [0.2, 0.3, 0.2], [0.18, 0.12, 0.26]], 0.022, { seg: 12, rad: 6 }), tm(0xc8a060));
    const coin = lathe([[0.0005, 0.02], [0.12, 0.02], [0.13, 0], [0.12, -0.02], [0.0005, -0.02]], 28);
    [[0.42, -0.45, 0.25, 0.4], [0.2, -0.48, 0.42, -0.2], [0.55, -0.46, 0.0, 0.1], [-0.05, 0.62, 0.0, 1.1]].forEach(([x, y, z, r]) => add(g, coin, tm(C.gold, { metal: true }), x, y, z, r, 0, r * 0.5));
    return g; },
  thread() { const g = grp(); const wd = tm(C.oak);
    add(g, lathe(curvy([[0.0005, -0.5], [0.34, -0.5], [0.36, -0.44], [0.16, -0.4], [0.15, 0.4], [0.36, 0.44], [0.34, 0.5], [0.0005, 0.5]], 50), 36), wd);
    const wound = lathe(Array.from({ length: 40 }, (_, i) => { const y = -0.38 + (i / 39) * 0.76; return [0.27 + 0.012 * Math.sin(i * 2.3), y]; }), 40); add(g, wound, tm(C.red, { soft: true }));
    add(g, tube([[0.27, 0.1, 0.05], [0.5, -0.1, 0.25], [0.7, -0.35, 0.0], [0.6, -0.6, -0.2], [0.9, -0.7, 0.0]], 0.014, { seg: 40, rad: 5 }), tm(C.red));
    add(g, tube([[0.82, -0.66, 0], [1.05, -0.78, 0.02]], 0.012, { seg: 2, rad: 6, taper: (u) => 1 - u * 0.9 }), tm(C.steel, { metal: true }));
    return g; },
  wineskin() { const g = grp(); const lt = tm(C.leather);
    const sk = add(g, lathe(curvy([[0.0005, -0.55], [0.3, -0.5], [0.42, -0.25], [0.4, 0.05], [0.26, 0.3], [0.1, 0.42], [0.08, 0.55]], 50), 36), lt); sk.scale.z = 0.62;
    add(g, lathe(curvy([[0.05, 0.5], [0.1, 0.55], [0.1, 0.62], [0.06, 0.64]], 10), 24), tm(C.walnut));
    add(g, lathe(curvy([[0.0005, 0.6], [0.07, 0.6], [0.075, 0.68], [0.05, 0.74], [0.0005, 0.75]], 12), 20), tm(0xc89a5a));
    add(g, tube([[0.08, 0.5, 0], [0.4, 0.75, 0.05], [0.55, 0.3, 0.02], [0.4, -0.2, 0]], 0.025, { seg: 30, rad: 6 }), tm(C.walnut));
    for (let i = 0; i < 6; i++) add(g, rbox(0.03, 0.06, 0.02, 0.008), tm(0xf0dcb4), -0.38 + i * 0.01, -0.28 + i * 0.1, 0.12, 0, 0, 0.25);
    return g; },
  wine_flask() { const g = grp();
    add(g, lathe(curvy([[0.0005, -0.55], [0.3, -0.52], [0.42, -0.28], [0.4, 0.0], [0.24, 0.18], [0.1, 0.28], [0.09, 0.55], [0.11, 0.58]], 50), 36), tm(0x4a8a6a, { opacity: 0.85, soft: true }));
    add(g, lathe(curvy([[0.0005, -0.5], [0.28, -0.48], [0.38, -0.28], [0.36, -0.05], [0.0005, -0.05]], 30), 30), tm(C.wine));
    const hx = []; for (let i = 0; i <= 120; i++) { const u = i / 120; const a = u * TAU * 7; const y = -0.5 + u * 0.48; const r = 0.3 + 0.12 * Math.sin(Math.PI * (u * 0.95 + 0.05)); hx.push([Math.cos(a) * (r + 0.02), y, Math.sin(a) * (r + 0.02)]); } add(g, tube(hx, 0.02, { seg: 240, rad: 5 }), tm(0xc89a50));
    add(g, lathe(curvy([[0.0005, 0.55], [0.08, 0.55], [0.09, 0.66], [0.0005, 0.7]], 10), 18), tm(0xc8986a));
    add(g, tube([[0.1, 0.4, 0], [0.3, 0.45, 0.05], [0.38, 0.25, 0.1]], 0.015, { seg: 12, rad: 5 }), tm(0x5a8a34));
    add(g, extrude(smoothShape([[0, 0], [0.08, 0.06], [0.14, 0], [0.08, -0.06]], 16), 0.01, 0.006), tm(0x5a9a34), 0.38, 0.25, 0.1, 0, 0.5, -0.6);
    return g; },
  horn_shard() { const g = grp();
    add(g, tube([[0, -0.6, 0], [0.18, -0.2, 0.05], [0.14, 0.25, 0.1], [-0.02, 0.6, 0.12]], 0.24, { seg: 40, rad: 16, taper: (u) => (0.9 - u * 0.7) * (1 + 0.05 * Math.sin(u * 50)) }), tm(0xe6d4ae));
    const jag = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; jag.push([Math.cos(a) * 0.21, Math.sin(a) * 0.21]); } add(g, extrude(shape(jag.map(([x, y], i) => [x * (i % 2 ? 0.7 : 1), y * (i % 2 ? 0.7 : 1)])), 0.06, 0.02), tm(0xbca07a), 0, -0.6, 0, Math.PI / 2);
    return g; },
  gorgon_scale() { const g = grp();
    add(g, extrude(smoothShape([[0, 0.6], [0.36, 0.42], [0.46, 0.0], [0.3, -0.42], [0, -0.62], [-0.3, -0.42], [-0.46, 0.0], [-0.36, 0.42]], 64), 0.08, 0.05), tm(0x3e9a6a, { metal: true }));
    add(g, tube([[0, 0.55, 0.07], [0, 0, 0.1], [0, -0.55, 0.07]], 0.035, { seg: 16, rad: 8, taper: (u) => 1 - Math.abs(u - 0.5) }), tm(0x8ad8a0, { metal: true }));
    for (let i = 1; i < 4; i++) add(g, tube([[-0.38 + i * 0.03, 0.4 - i * 0.22, 0.06], [0, 0.28 - i * 0.22, 0.09], [0.38 - i * 0.03, 0.4 - i * 0.22, 0.06]], 0.015, { seg: 16, rad: 5 }), tm(0x2a6a4a));
    add(g, lathe(curvy([[0.0005, 0.03], [0.06, 0.02], [0.065, 0], [0.0005, -0.01]], 12), 20), tm(0xffd040, { emissive: 0x8a5a00, ei: 0.6 }), 0, 0.3, 0.1, Math.PI / 2);
    return g; },
  plumb_bob() { const g = grp(); const br = tm(C.brass, { metal: true });
    add(g, lathe(curvy([[0.0005, -0.62], [0.06, -0.48], [0.22, -0.12], [0.26, 0.02], [0.24, 0.1], [0.12, 0.16], [0.1, 0.22], [0.0005, 0.24]], 50), 36), br);
    add(g, lathe([[0.25, 0.02], [0.27, 0.035], [0.25, 0.05]], 36), tm(C.gold, { metal: true }));
    add(g, tube([[0, 0.24, 0], [0, 0.9, 0]], 0.008, { seg: 2, rad: 4 }), tm(C.ivory));
    add(g, lathe(curvy([[0.0005, -0.1], [0.12, -0.1], [0.13, -0.06], [0.07, -0.04], [0.07, 0.04], [0.13, 0.06], [0.12, 0.1], [0.0005, 0.1]], 20), 24), tm(C.walnut), 0, 0.96, 0, 0, 0, Math.PI / 2);
    return g; },
  statues() { const g = grp(); const st = tm(C.stone);
    add(g, rbox(1.3, 0.16, 0.6, 0.04), tm(C.marble), 0, -0.08, 0); add(g, rbox(1.2, 0.08, 0.5, 0.03), tm(C.marble), 0, 0.03, 0);
    figure(g, st, { x: -0.35, h: 0.95, ry: 0.3, pose: 1 }); figure(g, st, { x: 0.36, h: 0.85, ry: -0.35, pose: 0 }); figure(g, tm(0xaaa294), { x: 0.0, z: -0.12, h: 1.02, ry: 0, pose: 0.5 });
    return g; },
  tyche() { const g = grp(); const iv = tm(C.ivory), pip = tm(C.gold, { metal: true });
    const d1 = die(g, 0.5, iv, tm(0x2a1418), -0.26, -0.1, 0, 0.4, 0.6, 0.15); d1.userData.tumble = 1;
    const d2 = die(g, 0.44, tm(0xf6d68a), tm(C.red), 0.28, 0.22, 0.05, -0.5, 0.3, 0.7); void pip; d2.userData.tumble = -1.3;
    return g; },
  horseshoe() { const g = grp(); const outer = [], inner = [];
    for (let i = 0; i <= 40; i++) { const a = Math.PI * (-0.12 + 1.24 * (i / 40)); outer.push([Math.cos(a) * 0.5, -Math.sin(a) * 0.55]); inner.push([Math.cos(a) * 0.3, -Math.sin(a) * 0.36]); }
    const holes = []; for (const a of [0.15, 0.32, 0.68, 0.85]) { const an = Math.PI * (-0.12 + 1.24 * a); holes.push(circle(0.03, 10, Math.cos(an) * 0.4, -Math.sin(an) * 0.455).reverse()); }
    add(g, extrude(shape([...outer, ...inner.reverse()], holes), 0.09, 0.03), tm(C.gold, { metal: true }), 0, 0.1, 0);
    for (const s of [-1, 1]) { const w = grp(g, s * 0.48, 0.25, 0); w.scale.x = s; w.userData.flap = [3.0, 0.25, s]; for (let i = 0; i < 4; i++) feather(w, 0.38 - i * 0.05, 0.1, tm(C.feather, { soft: true }), { x: 0.04 + i * 0.05, y: 0, rz: -0.9 + i * 0.32 }); }
    return g; },
  pandora() { const g = grp();
    add(g, lathe(curvy([[0.0005, -0.6], [0.2, -0.6], [0.3, -0.45], [0.42, -0.1], [0.4, 0.15], [0.26, 0.32], [0.18, 0.38], [0.22, 0.44], [0.2, 0.47]], 60), 40), tm(0x2a1a1c));
    for (const [y, r] of [[-0.42, 0.315], [0.0, 0.43], [0.22, 0.36]]) add(g, lathe([[r - 0.01, y - 0.04], [r + 0.012, y - 0.03], [r + 0.012, y + 0.03], [r - 0.01, y + 0.04]], 40), tm(C.clay));
    const lid = grp(g, 0.12, 0.52, 0.02); lid.rotation.z = -0.45; lid.userData.lid = 2; add(lid, lathe(curvy([[0.0005, -0.02], [0.24, -0.02], [0.22, 0.04], [0.08, 0.08], [0.05, 0.14], [0.0005, 0.15]], 20), 32), tm(C.clay));
    add(g, lathe([[0.0005, 0.44], [0.19, 0.44], [0.0005, 0.441]], 24), glow(0xffd88a, 2.6));
    const wisp = grp(g, 0, 0.46, 0); wisp.userData.flicker = 4; for (let i = 0; i < 3; i++) { const a = i * 2.1; add(wisp, tube([[0, 0, 0], [Math.cos(a) * 0.08, 0.15, Math.sin(a) * 0.08], [Math.cos(a + 1) * 0.04, 0.32, Math.sin(a + 1) * 0.04], [Math.cos(a + 2) * 0.1, 0.45, 0]], 0.02, { seg: 16, rad: 5, taper: (u) => 1 - u * 0.9 }), glow(0xffe8a0, 2.2)); }
    for (const s of [-1, 1]) add(g, tube([[s * 0.26, 0.3, 0], [s * 0.45, 0.25, 0], [s * 0.4, 0.05, 0]], 0.03, { seg: 14, rad: 8 }), tm(0x2a1a1c));
    return g; },
  golden_ratio() { const g = grp(); const au = tm(C.gold, { metal: true });
    add(g, rbox(1.3, 0.82, 0.06, 0.03), tm(0xf2e2b8), 0, 0, -0.06);
    const phi = 1.618; let x = -0.62, y = -0.38, w = 1.24, h = 0.766; const bars = []; // golden rectangles, each squared off in turn
    for (let i = 0; i < 6; i++) { const dir = i % 4; if (dir === 0) { bars.push([[x + h, y], [x + h, y + h]]); x += h; w -= h; } else if (dir === 1) { bars.push([[x, y + h - w], [x + w, y + h - w]]); h -= w; } else if (dir === 2) { bars.push([[x + w - h, y], [x + w - h, y + h]]); w -= h; } else { bars.push([[x, y + w], [x + w, y + w]]); y += w; h -= w; } }
    for (const [a, b] of bars) add(g, tube([[...a, 0.0], [...b, 0.0]], 0.008, { seg: 2, rad: 5 }), tm(0xb08a50));
    add(g, tube([[-0.62, -0.38, 0], [0.62, -0.38, 0], [0.62, 0.386, 0], [-0.62, 0.386, 0]], 0.018, { seg: 40, rad: 6, closed: true }), au);
    const sp = []; const c0 = [0.18, 0.02]; for (let i = 0; i <= 140; i++) { const t = (i / 140) * 3.6 * Math.PI; const r = 0.012 * Math.pow(phi, (t * 2) / Math.PI); sp.push([c0[0] + Math.cos(t + 2.3) * r, c0[1] + Math.sin(t + 2.3) * r, 0.03]); }
    const spiral = grp(g); spiral.userData.glow = 1; add(spiral, tube(sp, 0.022, { seg: 200, rad: 8, taper: (u) => 0.35 + u * 0.75 }), au);
    return g; },
  lead_boots() { const g = grp(); const ld = tm(C.lead, { metal: true }), br = tm(C.brass, { metal: true });
    const prof = smoothShape([[-0.2, 0.62], [0.06, 0.62], [0.08, 0.2], [0.42, 0.1], [0.5, 0.0], [0.48, -0.1], [-0.24, -0.1], [-0.26, 0.05], [-0.22, 0.25]], 80);
    for (const [z, x] of [[-0.2, -0.14], [0.2, 0.1]]) { const b = grp(g, x, 0, z); add(b, extrude(prof, 0.24, 0.07), ld); add(b, rbox(0.78, 0.07, 0.36, 0.03), tm(0x3a3c44), 0.12, -0.13, 0);
      for (const y of [0.3, 0.48]) { add(b, rbox(0.06, 0.06, 0.4, 0.02), tm(0x5a3a22), -0.07, y, 0); add(b, rbox(0.08, 0.09, 0.03, 0.015), br, -0.07, y, 0.2); }
      add(b, lathe(curvy([[0.0005, 0.6], [0.16, 0.6], [0.17, 0.66], [0.0005, 0.66]], 8), 28), tm(0x6a7080, { metal: true }), -0.07, 0, 0).scale.set(1.0, 1, 1.15); }
    return g; },
  lyre() { const g = grp(); const hn = tm(0xeedcb8);
    add(g, lathe(curvy([[0.0005, -0.62], [0.26, -0.58], [0.36, -0.42], [0.34, -0.22], [0.0005, -0.2]], 30), 36), tm(0x7a4a24)).scale.z = 0.55;
    for (let i = 0; i < 5; i++) add(g, tube([[-0.3, -0.5 + i * 0.07, 0.11], [0.3, -0.5 + i * 0.07, 0.11]], 0.008, { seg: 2, rad: 4 }), tm(0xd8a050));
    for (const s of [-1, 1]) add(g, tube([[s * 0.2, -0.3, 0], [s * 0.42, 0.0, 0.02], [s * 0.36, 0.35, 0.02], [s * 0.46, 0.62, 0]], 0.05, { seg: 32, rad: 10, taper: (u) => 1 - u * 0.5 }), hn);
    add(g, tube([[-0.42, 0.52, 0], [0.42, 0.52, 0]], 0.035, { seg: 2, rad: 10 }), tm(C.walnut));
    for (let i = 0; i < 7; i++) { const x = -0.18 + i * 0.06; add(g, tube([[x, -0.32, 0.06], [x * 1.2, 0.52, 0.03]], 0.006, { seg: 2, rad: 4 }), tm(C.gold, { metal: true })); }
    return g; },
  nemesis() { const g = grp(); const bz = tm(C.bronze, { metal: true });
    const coin = grp(g); coin.userData.flip = 1;
    add(coin, lathe([[0.0005, 0.05], [0.42, 0.05], [0.5, 0.07], [0.52, 0.0], [0.5, -0.07], [0.42, -0.05], [0.0005, -0.05]], 64), bz, 0, 0, 0, Math.PI / 2);
    const em = grp(coin, 0, 0, 0.055); const gl = tm(C.gold, { metal: true });
    add(em, rbox(0.04, 0.5, 0.03, 0.01), gl, 0, -0.02, 0); add(em, rbox(0.5, 0.035, 0.03, 0.01), gl, 0, 0.18, 0, 0, 0, 0.12);
    for (const s of [-1, 1]) { add(em, tube([[s * 0.24, 0.18 + s * 0.03, 0], [s * 0.24, 0.0 + s * 0.03, 0]], 0.006, { seg: 2, rad: 3 }), gl); add(em, lathe([[0.0005, -0.04], [0.09, 0.0], [0.1, 0.01]], 20), gl, s * 0.24, -0.02 + s * 0.03, 0); }
    add(em, rbox(0.22, 0.04, 0.03, 0.01), gl, 0, -0.27, 0);
    const rim = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; rim.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45]); } for (const [x, y] of rim) add(coin, lathe([[0.0005, 0.012], [0.018, 0], [0.0005, -0.002]], 8), gl, x, y, 0.06, Math.PI / 2);
    return g; },
  achilles() { const g = grp(); const bz = tm(C.bronze, { metal: true, side: THREE.DoubleSide });
    add(g, lathe(curvy([[0.2, -0.55], [0.17, -0.3], [0.24, 0.0], [0.22, 0.3], [0.17, 0.55]], 40), 32, -Math.PI * 0.62, Math.PI * 1.24), bz).geometry.computeVertexNormals();
    for (const y of [-0.3, 0.3]) add(g, tube([[-0.22, y, -0.05], [0, y, -0.25], [0.22, y, -0.05]], 0.02, { seg: 12, rad: 5 }), tm(0x6a3a1e));
    const ar = grp(g, 0.05, -0.05, 0.28); ar.rotation.set(0, 0.4, 0.75);
    add(ar, tube([[0, -0.7, 0], [0, 0.55, 0]], 0.018, { seg: 2, rad: 6 }), tm(C.oak));
    add(ar, extrude(smoothShape([[0, 0.18], [0.06, 0.0], [0, 0.03], [-0.06, 0.0]], 16), 0.02, 0.01), tm(C.steel, { metal: true }), 0, 0.55, 0);
    for (const r of [0, Math.PI / 2]) { const f = grp(ar, 0, -0.62, 0); f.rotation.y = r; add(f, extrude(shape([[0, 0], [0.08, -0.04], [0.08, -0.2], [0, -0.14]]), 0.006, 0.004), tm(C.red, { soft: true })); add(f, extrude(shape([[0, 0], [-0.08, -0.04], [-0.08, -0.2], [0, -0.14]]), 0.006, 0.004), tm(C.red, { soft: true })); }
    return g; },
  anvil() { const g = grp(); const ir = tm(0x4a4e5a, { metal: true });
    const prof = smoothShape([[-0.75, 0.28], [-0.3, 0.32], [0.55, 0.32], [0.56, 0.12], [0.3, 0.06], [0.18, -0.12], [0.3, -0.3], [0.38, -0.36], [-0.38, -0.36], [-0.3, -0.3], [-0.18, -0.12], [-0.3, 0.06], [-0.45, 0.14]], 96);
    add(g, extrude(prof, 0.34, 0.05), ir);
    add(g, rbox(0.5, 0.03, 0.3, 0.01), tm(0x8a90a0, { metal: true }), 0.15, 0.36, 0);
    add(g, rbox(0.34, 0.08, 0.14, 0.03), glow(0xff8a2a, 2.2), 0.2, 0.42, 0);
    const sparks = grp(g, 0.2, 0.5, 0); sparks.userData.flicker = 12; for (let i = 0; i < 6; i++) { const a = i * 1.1; add(sparks, tube([[0, 0, 0], [Math.cos(a) * 0.14, 0.12 + (i % 3) * 0.05, Math.sin(a) * 0.1]], 0.008, { seg: 2, rad: 3, taper: (u) => 1 - u * 0.8 }), glow(0xffd070, 2.6)); }
    return g; },
  amphora() { const g = grp(); const cl = tm(C.clay);
    add(g, lathe(curvy([[0.0005, -0.7], [0.08, -0.68], [0.1, -0.55], [0.3, -0.25], [0.34, 0.05], [0.25, 0.3], [0.12, 0.42], [0.1, 0.58], [0.15, 0.62], [0.14, 0.66]], 60), 40), cl);
    for (const [y, r] of [[-0.2, 0.315], [0.12, 0.33]]) add(g, lathe([[r - 0.005, y - 0.05], [r + 0.012, y - 0.04], [r + 0.012, y + 0.04], [r - 0.005, y + 0.05]], 40), tm(C.black));
    for (const s of [-1, 1]) add(g, tube([[s * 0.11, 0.55, 0], [s * 0.3, 0.55, 0], [s * 0.32, 0.38, 0], [s * 0.24, 0.26, 0]], 0.03, { seg: 20, rad: 8 }), cl);
    add(g, tube([[0.3, -0.05, 0.12], [0.33, -0.12, 0.05], [0.31, -0.2, 0.1]], 0.01, { seg: 8, rad: 4 }), tm(0x3a1a10));
    const drip = grp(g, 0.34, -0.22, 0.12); drip.userData.drip = 1; add(drip, lathe(curvy([[0.0005, 0.07], [0.025, 0.02], [0.03, -0.02], [0.0005, -0.045]], 12), 16), tm(0x5ab8ff, { emissive: 0x1a4a8a, ei: 0.5 }));
    return g; },
  icarus_feather() { const g = grp();
    const f = feather(g, 1.3, 0.42, tm(C.feather, { soft: true }), { x: 0, y: -0.6, rz: -0.25 });
    for (let i = 0; i < 7; i++) add(f, tube([[-0.2 + i * 0.03, 0.2 + i * 0.12, 0.014], [0.18, 0.35 + i * 0.12, 0.014]], 0.005, { seg: 2, rad: 3 }), tm(0xd8c8a8));
    for (const [x, y, s] of [[0.05, 1.22, 1], [0.1, 1.05, 0.7]]) add(f, lathe(curvy([[0.0005, 0.06], [0.03, 0.02], [0.035, -0.03], [0.0005, -0.07]], 12), 16), tm(C.wax), x, y, 0.03).scale.setScalar(s);
    const drip = grp(f, 0.06, 1.12, 0.03); drip.userData.drip = 1; add(drip, lathe(curvy([[0.0005, 0.03], [0.018, 0.0], [0.02, -0.02], [0.0005, -0.04]], 10), 14), tm(C.wax));
    return g; },
  talaria() { const g = grp(); const lt = tm(0x9a5a2a);
    add(g, extrude(smoothShape([[-0.5, -0.11], [0.0, -0.13], [0.42, -0.12], [0.56, 0.0], [0.42, 0.13], [0.0, 0.12], [-0.5, 0.11], [-0.57, 0.0]], 60), 0.06, 0.03), lt, 0, -0.33, 0, -Math.PI / 2, 0, 0);
    for (const x of [-0.3, -0.05, 0.2]) add(g, tube([[x, -0.3, 0.16], [x + 0.02, -0.12, 0.1], [x + 0.02, -0.08, 0], [x + 0.02, -0.12, -0.1], [x, -0.3, -0.16]], 0.022, { seg: 20, rad: 6 }), tm(C.gold, { metal: true }));
    add(g, tube([[-0.35, -0.25, 0], [-0.32, 0.25, 0]], 0.025, { seg: 2, rad: 6 }), tm(C.gold, { metal: true }));
    for (const s of [-1, 1]) { const w = grp(g, -0.38, 0.1, s * 0.05); w.rotation.y = s * 0.5; w.userData.flap = [4.0, 0.3, s]; for (let i = 0; i < 4; i++) feather(w, 0.42 - i * 0.06, 0.12, tm(C.feather, { soft: true }), { x: -0.02 - i * 0.05, y: 0, rz: Math.PI * 0.5 + 0.2 - i * 0.28, ry: 0 }); }
    return g; },
};
ITEM_MODELS.wine_flask = ITEM_MODELS.wine_flask || ITEM_MODELS.wineskin;
// pieces worn on Sir Isaac (wearables.js): one lead boot per foot, a single statue, the phi sigil, an ankle wing
export const PART_MODELS = {
  lead_boot() { const g = grp(); const ld = tm(C.lead, { metal: true }), br = tm(C.brass, { metal: true });
    add(g, extrude(smoothShape([[-0.2, 0.62], [0.06, 0.62], [0.08, 0.2], [0.42, 0.1], [0.5, 0.0], [0.48, -0.1], [-0.24, -0.1], [-0.26, 0.05], [-0.22, 0.25]], 80), 0.26, 0.07), ld);
    add(g, rbox(0.8, 0.08, 0.38, 0.03), tm(0x3a3c44), 0.12, -0.14, 0); for (const y of [0.3, 0.48]) { add(g, rbox(0.06, 0.06, 0.42, 0.02), tm(0x5a3a22), -0.07, y, 0); add(g, rbox(0.08, 0.09, 0.03, 0.015), br, -0.07, y, 0.21); }
    return g; },
  statue_one() { const g = grp(); figure(g, tm(C.stone), { h: 1, pose: 1 }); add(g, rbox(0.5, 0.08, 0.5, 0.02), tm(C.marble), 0, -0.04, 0); return g; },
  phi_sigil() { const g = grp(); const sp = []; for (let i = 0; i <= 120; i++) { const t = (i / 120) * 3.4 * Math.PI; const r = 0.03 * Math.pow(1.618, (t * 2) / Math.PI); sp.push([Math.cos(t) * r, Math.sin(t) * r, 0]); }
    const s = grp(g); s.userData.glow = 1; add(s, tube(sp, 0.035, { seg: 160, rad: 6, taper: (u) => 0.4 + u * 0.7 }), glow(0xffd060, 1.8));
    add(g, tube(circle(0.98, 48).map(([x, y]) => [x, y, 0]), 0.025, { seg: 96, rad: 5, closed: true }), glow(0xffc040, 1.4)); return g; },
  talaria_wing() { const g = grp(); const w = grp(g); w.userData.flap = [5.0, 0.35, 1]; for (let i = 0; i < 4; i++) feather(w, 0.9 - i * 0.14, 0.26, tm(C.feather, { soft: true }), { x: -i * 0.1, rz: Math.PI * 0.5 + 0.25 - i * 0.28 }); return g; },
};


// ---------------------------------------------------------------- normalised clones + idle animation
const protos = new Map();
export function hasModel(id) { return !!(ITEM_MODELS[id] || PART_MODELS[id]); }
export function itemModel(id) {
  let p = protos.get(id);
  if (!p) {
    const make = ITEM_MODELS[id] || PART_MODELS[id] || ITEM_MODELS.golden_apple; const raw = make(); raw.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(raw); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()); const k = 1 / Math.max(sz.x, sz.y, sz.z, 1e-3);
    p = new THREE.Group(); p.name = 'curio:' + id; const inner = new THREE.Group(); inner.add(raw); raw.position.sub(c); inner.scale.setScalar(k); p.add(inner); p.userData.size = [sz.x * k, sz.y * k, sz.z * k]; protos.set(id, p);
  }
  const o = p.clone(); o.userData = { ...p.userData, id }; return o;
}
// moving parts are tagged in userData (JSON-safe, survives clone()); `boost` (0..1) is the trigger excitement
export function animateModel(root, t, boost = 0) {
  root.traverse((o) => {
    const u = o.userData; if (!u) return;
    if (u.spin) o.rotation.z = t * u.spin * (1 + boost * 6);
    if (u.swing) o.rotation.z = Math.sin(t * u.swing[0] * (1 + boost)) * u.swing[1] * (1 + boost * 0.8);
    if (u.flap) o.rotation.y = Math.sin(t * u.flap[0] * (1 + boost * 2)) * u.flap[1] * (1 + boost) * u.flap[2] * -1;
    if (u.tumble) { o.rotation.x += 0.004 * u.tumble + boost * 0.3 * u.tumble; o.rotation.y += 0.003 * u.tumble + boost * 0.22; }
    if (u.flicker) o.visible = Math.sin(t * u.flicker + Math.sin(t * u.flicker * 1.7) * 2) > -0.3 - boost;
    if (u.flip) o.rotation.y = boost > 0.01 ? t * 14 : Math.sin(t * 0.8) * 0.4;
    if (u.lid) o.rotation[u.lid === 1 ? 'x' : 'z'] = (u.lid === 1 ? -0.55 : -0.45) - boost * 0.8 + Math.sin(t * 2) * 0.03;
    if (u.drip) { const k = (t * 0.7) % 1; o.position.y = (u.y0 ??= o.position.y) - k * k * 0.25; o.scale.setScalar(k > 0.9 ? (1 - k) * 10 : 1); }
    if (u.glow) o.scale.setScalar(1 + boost * 0.12);
    if (u.fan) o.scale.set(1 + boost * 0.6, 1 + boost * 0.9, 1);
  });
}

// ---------------------------------------------------------------- rarity
export const RARITY = {
  common: { name: 'Common', color: 0xc8b8a0, css: '#c8b8a0' }, uncommon: { name: 'Uncommon', color: 0x6ad8a8, css: '#6ad8a8' },
  rare: { name: 'Rare', color: 0x9a7bff, css: '#9a7bff' }, legendary: { name: 'Legendary', color: 0xffc94a, css: '#ffc94a' },
};
export function rarityOf(id) {
  const d = ITEMS[id] || {}; if (d.starter) return 'common'; if (d.unlock || ITEM_POOLS.guardian?.includes(id)) return 'legendary';
  if (ITEM_POOLS.elite?.includes(id)) return 'rare'; return 'uncommon';
}

// ---------------------------------------------------------------- display: pedestal, aura, glints
let auraTex = null, runeTex = null, glintTex = null;
function radialTex() { if (auraTex) return auraTex; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); auraTex = new THREE.CanvasTexture(c); auraTex.colorSpace = THREE.SRGBColorSpace; return auraTex; }
// a band of astral runes (RuneMono, native 24px, crisp blocks) that circles the pedestal top
function runeBand() {
  if (runeTex) return runeTex; const c = document.createElement('canvas'); c.width = 1024; c.height = 40; const g = c.getContext('2d');
  const txt = 'PHILOSOPHIAE NATURALIS PRINCIPIA MATHEMATICA * F = MA * '; let x = 4; while (x < 1020) x += drawPixelText(g, txt, x, 30, 'runeL', { color: '#ffffff' }) + 12;
  runeTex = new THREE.CanvasTexture(c); runeTex.colorSpace = THREE.SRGBColorSpace; runeTex.wrapS = THREE.RepeatWrapping; runeTex.magFilter = THREE.NearestFilter; runeTex.minFilter = THREE.LinearMipmapLinearFilter; runeTex.anisotropy = 8; return runeTex;
}
function sparkleTex() { // a 9x9 pixel-art 4-point glint
  if (glintTex) return glintTex; const c = document.createElement('canvas'); c.width = c.height = 9; const g = c.getContext('2d'); const P = (x, y, a) => { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, 1, 1); };
  for (let i = 0; i < 9; i++) { const a = i === 4 ? 1 : Math.abs(i - 4) === 1 ? 0.9 : Math.abs(i - 4) <= 3 ? 0.45 : 0.15; P(4, i, a); P(i, 4, a); } P(3, 3, 0.35); P(5, 3, 0.35); P(3, 5, 0.35); P(5, 5, 0.35);
  glintTex = new THREE.CanvasTexture(c); glintTex.magFilter = THREE.NearestFilter; glintTex.minFilter = THREE.NearestFilter; glintTex.colorSpace = THREE.SRGBColorSpace; return glintTex;
}
function pedestalGeo() {
  return lathe(curvy([[0.0005, -0.5], [0.62, -0.5], [0.64, -0.44], [0.56, -0.4], [0.5, -0.32], [0.38, -0.28], [0.32, -0.2], [0.3, 0.12], [0.36, 0.18], [0.5, 0.22], [0.56, 0.28], [0.54, 0.32], [0.0005, 0.32]], 80), 48);
}
const meshesOf = (o) => { const out = []; o.traverse((m) => { if (m.isMesh && !m.material.transparent && !m.material.isMeshBasicMaterial) out.push(m); }); return out; };
// backside ink hulls of ~`w` world units, thinner on slender parts (strings, quills) so they read as lines, not blobs
const _ws = new THREE.Vector3();
export function inkModel(root, meshes, w = 0.04) {
  root.updateMatrixWorld(true); const rs = root.getWorldScale(new THREE.Vector3()).x || 1;
  for (const m of meshes) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; const sz = bb.getSize(_ws); const minD = [sz.x, sz.y, sz.z].sort((p, q) => p - q)[1] || 0.01; const ws = m.getWorldScale(new THREE.Vector3()).x / rs || 1;
    const t = Math.round(Math.min(w / ws, minD * 0.22) * 1000) / 1000; if (t >= 0.001) inkHull(m, t); }
}
/** A curio on its pedestal: `group` (origin = pedestal base centre), `hit` (invisible pick box), update(dt, t, hover), pop() */
export class CurioDisplay {
  constructor(id, { size = 2.4, ink = true, pedestal = true } = {}) {
    this.id = id; this.rar = rarityOf(id); const R = RARITY[this.rar]; const g = (this.group = new THREE.Group()); this.boost = 0; this.hoverK = 0; this.t0 = Math.random() * 10;
    const s = size; this.s = s;
    if (pedestal) {
      const ped = add(g, pedestalGeo(), tm(C.marble), 0, s * 0.18, 0); ped.scale.set(s * 0.42, s * 0.36, s * 0.42);
      const band = add(g, lathe([[0.555, 0.25], [0.575, 0.27], [0.575, 0.3], [0.555, 0.31]], 48), tm(C.gold, { metal: true }), 0, s * 0.18, 0); band.scale.copy(ped.scale);
      const plinth = add(g, rbox(1.45, 0.16, 1.45, 0.05), tm(C.walnut), 0, -0.0336 * s, 0); plinth.scale.setScalar(s * 0.42);
      this.inkList = [ped, band, plinth];
      // the rune band (rarer = brighter and faster)
      const rb = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 64, 1, true), new THREE.MeshBasicMaterial({ map: runeBand(), color: new THREE.Color(R.color).multiplyScalar(this.rar === 'legendary' ? 1.6 : 1.1), transparent: true, opacity: this.rar === 'common' ? 0.25 : 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
      rb.scale.set(s * 0.3, s * 0.36, s * 0.3); rb.position.y = s * 0.355; rb.userData.noInk = true; rb.renderOrder = 3; g.add(rb); this.runes = rb;
    }
    const topY = pedestal ? s * 0.18 + 0.32 * s * 0.36 : 0; this.topY = topY;
    const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex(), color: new THREE.Color(R.color).multiplyScalar(this.rar === 'legendary' ? 1.5 : 1.0), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    aura.rotation.x = -Math.PI / 2; aura.scale.setScalar(s * 0.8); aura.position.y = topY + 0.01; aura.userData.noInk = true; g.add(aura); this.aura = aura;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), aura.material.clone()); halo.material.opacity = 0.32; halo.scale.setScalar(s * 0.95); halo.position.set(0, topY + s * 0.42, -s * 0.2); halo.userData.noInk = true; g.add(halo); this.halo = halo;
    // the curio itself, floating above the pedestal
    this.holder = grp(g, 0, topY + s * 0.42, 0); this.model = itemModel(id); this.model.scale.setScalar(s * 0.78); this.holder.add(this.model);
    this.model.rotation.set(0.12, -0.5, 0); if (ink) inkModel(g, [...(this.inkList || []), ...meshesOf(this.model)], 0.045);
    // glints: tiny pixel sparkles that twinkle around the curio (more for rarer ones)
    const n = { common: 2, uncommon: 3, rare: 4, legendary: 6 }[this.rar]; this.glints = [];
    for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex(), color: new THREE.Color(i % 2 ? 0xffffff : R.color).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.userData = { a: (i / n) * TAU, r: s * (0.3 + (i % 3) * 0.06), y: (i % 3) * 0.12 * s - 0.1 * s, ph: i * 1.7 }; this.holder.add(sp); this.glints.push(sp); }
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, s * 1.25, s * 0.9), new THREE.MeshBasicMaterial({ visible: false })); this.hit.position.y = topY + s * 0.2; g.add(this.hit);
  }
  pop() { this.boost = 1; }
  update(dt, t, hover = false) {
    t += this.t0; this.hoverK += ((hover ? 1 : 0) - this.hoverK) * Math.min(1, dt * 8); this.boost = Math.max(0, this.boost - dt * 0.8); const s = this.s, b = this.boost, h = this.hoverK;
    this.holder.position.y = this.topY + s * (0.42 + 0.04 * Math.sin(t * 1.6) + 0.06 * h + 0.1 * b);
    this.model.rotation.y = -0.5 + t * (0.5 + h * 0.6) + b * 9; this.model.rotation.x = 0.12 + Math.sin(t * 0.9) * 0.08;
    animateModel(this.model, t, Math.max(b, h * 0.3));
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.2); this.aura.material.opacity = (0.6 + 0.3 * h + 0.4 * b) * pulse; this.aura.scale.setScalar(s * (0.8 + 0.1 * h + 0.3 * b));
    this.halo.material.opacity = 0.22 + 0.2 * h + 0.3 * b; if (this.runes) { this.runes.material.map.offset.x = -t * 0.02 * (1 + h * 2); this.runes.rotation.y = t * 0.1; }
    for (const sp of this.glints) { const u = sp.userData; const tw = Math.max(0, Math.sin(t * 2.4 + u.ph)); sp.material.opacity = tw * (0.7 + h * 0.3); const a = u.a + t * 0.4; sp.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.ph) * 0.05 * s, Math.sin(a) * u.r); sp.scale.setScalar(s * 0.09 * (0.4 + tw)); }
  }
  dispose() { this.group.traverse((o) => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.(); }); }
}

// ---------------------------------------------------------------- icon canvases for 2D pages (journal): forge-rendered, smooth (not faceted)
const iconCache = new Map();
export function itemIcon(id, size = 96) {
  const k = id + ':' + size; if (iconCache.has(k)) return iconCache.get(k);
  let pc;
  try { const m = itemModel(id); m.rotation.set(0.15, -0.5, 0); pc = getForge(window.__game?.engine.renderer).paint(m, { w: size, h: size, fit: 0.8, yaw: 0.5, pitch: 0.25, geometric: false }); }
  catch (e) { pc = new PixelCanvas(size, size); }
  const c = pc.scaled(2); iconCache.set(k, c); return c;
}
