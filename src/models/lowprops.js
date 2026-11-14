// SHARP LOW-POLY PROP KIT: crisp faceted props (few sides, hard edges, flat-shaded facets) wearing detailed pixel-art
// textures (facets are baked flat into the geometry: facet()) (wood grain, brushed / hammered metal with scratches and engraving, stone, marble, lapis, leather with
// stitching, canvas weave, terracotta, ivory, wax, feathers, glass, gems, wicker), toon-banded, ink-outlined by the
// engine's InkPass (or inkHull in UI scenes). One call:
//
//   prop(name, opts) -> THREE.Group (base on y = 0, centred on x/z, real-world metres)
//
// names: crate, appleCrate, barrel, chest, book, bookStack, candle, candlestick, candelabra, lantern, oilLamp, chair,
//   stool, bench, table, roundTable, shelf, bookshelf, vase, amphora, pot, bottle, goblet, scroll, globe, telescope,
//   hammer, shovel, pickaxe, saw, tools, basket, bucket, cart, ladder, post, signpost, tent, pavilion, sack, rug, cauldron
// common opts: seed, s (uniform scale); per-prop sizes (w, h, d, r) and kinds (wood: 'oak' | 'walnut', metal: 'brass'
// | 'iron' | ...; color for books / bottles / rugs). Extra parts are named (chest lid 'treasure_chest_lid', lantern
// 'glass', flame 'flame') so scenes can animate them.
//
// The kit (also used by items3d.js): lmat(kind), TEX kinds, facet(geo, density), lathe / tube / prism / extrude /
// cbox / gem / jitter, mesh(parent, geo, mat, ...). The CC0 prop models (barrel, chest, crate, lantern, vases, books,
// bottles, candleholders, lamps, basket, pot, table, goblets) are swapped for these at load (lowSwap, via gfx/assets.js
// loadModel), sized to the originals, so every stage's dressing turns low-poly without touching its layout.
import * as THREE from 'three';
import { Buf } from '../gfx/art/plants.js';
import { GR } from '../gfx/art/ramps.js';
import { hash2 } from '../gfx/art/core.js';
import { pixelTex } from '../gfx/pixeltex.js';
import { gradientMap } from './toon.js';
import { mulberry32 } from '../core/util.js';

const TAU = Math.PI * 2;
// ---------------------------------------------------------------- pixel textures (32x32, seamless)
const R = {
  oak: GR.oak, walnut: GR.walnut, brass: GR.brass, gold: GR.gold, bronze: GR.bronze, copper: GR.copper, iron: GR.iron, stone: GR.stone, marble: GR.marble, leather: GR.leather,
  bone: GR.bone, red: GR.red, apple: GR.apple, wine: GR.wine, cream: GR.cream, wicker: GR.wicker, rope: GR.rope, verd: GR.verdigris, ruby: GR.ruby, green: GR.green, canvas: GR.canvas,
  teal: GR.clothTeal, purple: GR.clothPurple, clothRed: GR.clothRed, black: ['#060508', '#120e16', '#221c28', '#342c3a', '#4a404e', '#6a5e70'],
  lead: ['#14141c', '#2a2c3a', '#4a4e60', '#6e7488', '#9aa2b4', '#d0d8e4'], silver: ['#1e2232', '#3e4660', '#6a7690', '#a4b0c4', '#d8e2ec', '#ffffff'],
  lapis: ['#060a24', '#0e1a4e', '#1c2e86', '#2c48b4', '#4e6ed8', '#9ab4f4'], clay: ['#2a0c14', '#601a18', '#9a3420', '#cc5a2c', '#ec8a48', '#fcc080'],
  wax: ['#5a3a2a', '#9a7450', '#d0b080', '#ecd6a4', '#fbecc8', '#fffaf0'], feather: ['#5a5060', '#8e8690', '#c0b8b8', '#e4dcd4', '#f8f2ea', '#ffffff'],
  glass: ['#1a3a5a', '#2e6488', '#5aa0c0', '#90d0e4', '#c8f0f8', '#ffffff'], blue: ['#0c1430', '#18306a', '#2650a4', '#3c76cc', '#6aa2e8', '#b0d4fa'],
  straw: ['#2e1c14', '#5a3c1e', '#8c6a2c', '#bc9840', '#e2c464', '#fcecaa'], parch: ['#3a2216', '#6a4428', '#9e6e42', '#c89a64', '#e2c08a', '#f2dcaa'],
};
const N = 32;
const cell = (x, y, s, c = 4) => hash2((((Math.floor(x / c)) % (N / c)) + N / c) % (N / c), (((Math.floor(y / c)) % (N / c)) + N / c) % (N / c), s);
function paint(kind) {
  const S = new Buf(N, N, 0, { wrap: true }); const r = mulberry32(kind.length * 977 + kind.charCodeAt(0)); const P = (x, y, ramp, t) => S.px(x, y, ramp, t);
  const fill = (ramp, f) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) P(x, y, ramp, f(x, y)); };
  const metal = (ramp, { hammer = false, engrave = false } = {}) => {
    fill(ramp, (x, y) => 3 + (cell(x, y * 4, 3, 8) > 0.72 ? 1 : 0) - (cell(x + 5, y * 3, 9, 8) < 0.18 ? 1 : 0));
    for (let i = 0; i < 9; i++) { const y = Math.floor(r() * N), x0 = Math.floor(r() * N), L = 3 + Math.floor(r() * 8); for (let k = 0; k < L; k++) P(x0 + k, y, ramp, 4); } // brushed streaks
    for (let i = 0; i < 4; i++) { let x = r() * N, y = r() * N; const L = 3 + r() * 5; for (let k = 0; k < L; k++) { P(x, y, ramp, 5); x += 1; y += r() < 0.5 ? 1 : 0; } } // bright scratches
    if (hammer) for (let i = 0; i < 7; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); P(x, y, ramp, 2); P(x + 1, y, ramp, 2); P(x, y + 1, ramp, 2); P(x - 1, y - 1, ramp, 4); }
    if (engrave) { for (let x = 0; x < N; x++) { P(x, 2, ramp, 1); P(x, 3, ramp, 5); P(x, 28, ramp, 1); P(x, 29, ramp, 5); } for (let x = 0; x < N; x += 8) for (let k = 0; k < 4; k++) { P(x + k, 13 + k, ramp, 1); P(x + 7 - k, 13 + k, ramp, 1); P(x + k, 18 - k + 2, ramp, 1); } }
    for (let i = 0; i < 3; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); P(x, y, ramp, 5); P(x + 1, y, ramp, 4); P(x, y + 1, ramp, 4); } // glints
  };
  const grain = (ramp, { planks = false } = {}) => {
    fill(ramp, (x, y) => { const w = Math.sin((y * 0.35) + Math.sin(x * 0.7 + y * 0.05) * 1.6 + cell(x, y, 7, 8) * 3); return 3 + (w > 0.82 ? -1 : w < -0.9 ? 1 : 0) + (cell(x * 3, y, 11, 4) > 0.86 ? -1 : 0); });
    for (let i = 0; i < 6; i++) { const x0 = Math.floor(r() * N), y = Math.floor(r() * N), L = 4 + Math.floor(r() * 10); for (let k = 0; k < L; k++) P(x0 + k, y, ramp, 2); }
    const kx = Math.floor(r() * N), ky = Math.floor(r() * N); for (const [dx, dy, t] of [[0, 0, 1], [1, 0, 1], [-1, 0, 2], [2, 0, 2], [0, -1, 2], [1, 1, 2], [0, 1, 4], [1, -1, 4]]) P(kx + dx, ky + dy, ramp, t);
    if (planks) for (let x = 0; x < N; x++) { P(x, 0, ramp, 1); P(x, 15, ramp, 1); P(x, 16, ramp, 4); P(x, 31, ramp, 4); } // seams
  };
  const speck = (ramp, base, n, tones) => { fill(ramp, (x, y) => base + (cell(x, y, 5, 4) > 0.75 ? 1 : cell(x, y, 8, 4) < 0.2 ? -1 : 0)); for (let i = 0; i < n; i++) P(Math.floor(r() * N), Math.floor(r() * N), ramp, tones[i % tones.length]); };
  switch (kind) {
    case 'oak': case 'walnut': grain(R[kind]); break;
    case 'planks': grain(R.oak, { planks: true }); break; case 'darkPlanks': grain(R.walnut, { planks: true }); break;
    case 'brass': case 'gold': case 'bronze': case 'copper': metal(R[kind]); break;
    case 'goldEng': metal(R.gold, { engrave: true }); break; case 'brassEng': metal(R.brass, { engrave: true }); break; case 'bronzeEng': metal(R.bronze, { engrave: true }); break;
    case 'iron': case 'lead': case 'steel': metal(kind === 'steel' ? R.silver : R[kind], { hammer: kind !== 'steel' }); break;
    case 'silver': metal(R.silver); break; case 'verd': metal(R.verd, { hammer: true }); break;
    case 'stone': speck(R.stone, 3, 26, [1, 4, 2]); for (let i = 0; i < 3; i++) { let x = r() * N, y = r() * N; for (let k = 0; k < 6; k++) { P(x, y, R.stone, 1); x += r() < 0.5 ? 1 : 0; y += 1; } } break;
    case 'marble': fill(R.marble, (x, y) => 4 + (cell(x, y, 3, 8) > 0.8 ? 1 : 0)); for (let i = 0; i < 3; i++) { let x = r() * N; for (let y = 0; y < N; y++) { P(x, y, R.marble, 2 + (y % 5 === 0 ? 1 : 0)); x += r() < 0.4 ? 1 : r() < 0.5 ? -1 : 0; } } break;
    case 'lapis': speck(R.lapis, 2, 30, [3, 1, 5]); for (let i = 0; i < 9; i++) P(Math.floor(r() * N), Math.floor(r() * N), R.gold, 4 + (i % 2)); break;
    case 'leather': speck(R.leather, 3, 40, [2, 2, 4]); for (let x = 0; x < N; x += 3) { P(x, 2, R.leather, 5); P(x + 1, 2, R.leather, 5); P(x, 3, R.leather, 1); } break;
    case 'canvas': case 'cloth': fill(R.canvas, (x, y) => ((x + y) % 2 ? 4 : 3) - (cell(x, y * 2, 4, 4) > 0.85 ? 1 : 0)); break;
    case 'teal': case 'purple': case 'clothRed': fill(R[kind], (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 3 : 2); for (let x = 0; x < N; x++) { P(x, 4, R.gold, 4); P(x, 5, R.gold, 3); } break;
    case 'clay': speck(R.clay, 3, 30, [2, 4, 5]); for (let y = 0; y < N; y += 7) for (let x = 0; x < N; x++) if (cell(x, y, 2, 2) > 0.3) P(x, y, R.clay, 2); break;
    case 'blackfig': fill(R.black, () => 2); for (let x = 0; x < N; x++) { P(x, 6, R.clay, 4); P(x, 7, R.clay, 3); P(x, 24, R.clay, 4); P(x, 25, R.clay, 3); } for (let x = 0; x < N; x += 8) for (let k = 0; k < 5; k++) { P(x + k, 14 + (k % 2), R.clay, 4); } break;
    case 'bone': case 'ivory': speck(R.bone, 4, 16, [3, 5]); for (let y = 0; y < N; y += 6) for (let x = 0; x < N; x++) if (cell(x, y, 6, 4) > 0.45) P(x, y, R.bone, 3); break;
    case 'wax': speck(R.wax, 4, 20, [3, 5, 5]); break;
    case 'feather': fill(R.feather, (x, y) => ((x + y) % 4 === 0 ? 3 : (x - y + 64) % 7 === 0 ? 5 : 4)); break;
    case 'glass': fill(R.glass, (x, y) => (Math.abs(((x - y + 64) % 16) - 3) < 1 ? 5 : 3)); break;
    case 'ruby': case 'green': case 'blue': fill(R[kind], (x, y) => 3 + (cell(x, y, 13, 8) > 0.6 ? 1 : 0) - (cell(x + 3, y + 1, 14, 8) < 0.2 ? 1 : 0)); for (let i = 0; i < 4; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); P(x, y, R[kind], 5); P(x - 1, y, R[kind], 4); P(x + 1, y, R[kind], 4); P(x, y - 1, R[kind], 4); P(x, y + 1, R[kind], 4); } break;
    case 'redPaint': speck(R.red, 3, 18, [2, 4]); break; case 'black': speck(R.black, 2, 18, [1, 3, 4]); break;
    case 'apple': speck(R.apple, 3, 24, [4, 2, 5]); for (let i = 0; i < 12; i++) P(Math.floor(r() * N), Math.floor(r() * N), R.wax, 4); break;
    case 'wicker': fill(R.wicker, (x, y) => { const row = Math.floor(y / 3), c = Math.floor((x + (row % 2) * 3) / 6); const over = (row + c) % 2 === 0; return over ? (y % 3 === 0 ? 4 : 3) : 2; }); break;
    case 'straw': case 'rope': fill(R[kind === 'straw' ? 'straw' : 'rope'], (x, y) => ((x + y * 2) % 6 < 2 ? 4 : (x + y * 2) % 6 < 4 ? 3 : 2)); break;
    case 'parch': speck(R.parch, 4, 30, [3, 5, 3]); break; case 'cream': speck(R.cream, 4, 20, [3, 5]); break; case 'wine': speck(R.wine, 2, 20, [3, 1, 4]); break;
    case 'tint': speck(['#5c5c64', '#8a8a92', '#b6b6bc', '#dedee2', '#f2f2f4', '#ffffff'], 4, 26, [3, 5, 3]); break; // neutral, tinted by the material colour
    default: speck(R[kind] || R.stone, 3, 20, [2, 4]);
  }
  return S.canvas();
}
export const tex = (kind) => pixelTex('lowprop:' + kind, () => paint(kind));

// ---------------------------------------------------------------- materials: flat-shaded cel toon with the pixel texture
const METAL = new Set(['brass', 'gold', 'bronze', 'copper', 'iron', 'lead', 'steel', 'silver', 'verd', 'goldEng', 'brassEng', 'bronzeEng', 'ruby', 'green', 'blue', 'glass']);
const MATS = new Map();
/** lmat(kind, { color tint, opacity, emissive, ei, side }) -> MeshToonMaterial (flat facets, 3 hard bands; metals and gems 4) */
export function lmat(kind, { color = 0xffffff, opacity = 1, emissive = 0, ei = 1, side = THREE.FrontSide } = {}) {
  const key = [kind, color, opacity, emissive, ei, side].join('|'); let m = MATS.get(key); if (m) return m;
  m = new THREE.MeshToonMaterial({ map: tex(kind), color: new THREE.Color(color), gradientMap: gradientMap(METAL.has(kind) ? [0.32, 0.6, 0.86, 1.0] : [0.46, 0.74, 1.0]), transparent: opacity < 1, opacity, depthWrite: opacity >= 1, emissive: new THREE.Color(emissive), emissiveIntensity: ei, side });
  m.userData.toon = true; m.userData.lowpoly = true; MATS.set(key, m); return m;
}
export const glowMat = (color, k = 2.2) => { const key = 'glow|' + color + '|' + k; let m = MATS.get(key); if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false }); m.userData.flame = true; MATS.set(key, m); } return m; };

// ---------------------------------------------------------------- sharp geometry
const V2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
/** every face its own flat facet, with box-projected UVs (`density` texture repeats per unit) so pixels stay even */
export function facet(geo, density = 2) {
  const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i + 2 < p.count; i += 3) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    for (let k = i; k < i + 3; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y]; uv[k * 2] = u * density; uv[k * 2 + 1] = v * density; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.userData.faceted = true; return g;
}
/** displace vertices by a position hash (watertight: shared positions move together), for rough stone / sacks */
export function jitter(geo, amt = 0.04, seed = 1) {
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = Math.round(x * 997) * 3 + Math.round(y * 991) * 7 + Math.round(z * 983) * 13 + seed * 101;
    p.setXYZ(i, x + (hash2(k, 1, seed) - 0.5) * amt, y + (hash2(k, 2, seed) - 0.5) * amt, z + (hash2(k, 3, seed) - 0.5) * amt); } return geo;
}
export function lathe(pts, sides = 6, phiStart = Math.PI / sides, phiLen = TAU) { if (pts[0][1] > pts[pts.length - 1][1]) pts = [...pts].reverse(); return new THREE.LatheGeometry(V2(pts.map(([a, b]) => [Math.max(0.0005, a), b])), sides, phiStart, phiLen); }
export const prism = (r, h, sides = 6, r2 = r) => lathe([[0.0005, -h / 2], [r, -h / 2], [r2, h / 2], [0.0005, h / 2]], sides);
export function tube(pts, r, { seg = 6, rad = 4, closed = false, taper = null } = {}) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'centripetal'); const g = new THREE.TubeGeometry(c, seg, r, rad, closed);
  if (taper) { const p = g.attributes.position; const q = new THREE.Vector3(); for (let i = 0; i <= seg; i++) { const ctr = c.getPointAt(i / seg); const k = taper(i / seg); for (let j = 0; j <= rad; j++) { const vi = i * (rad + 1) + j; q.fromBufferAttribute(p, vi).sub(ctr).multiplyScalar(k).add(ctr); p.setXYZ(vi, q.x, q.y, q.z); } } }
  return g;
}
export function shape(pts, holes = []) { const s = new THREE.Shape(V2(pts)); for (const h of holes) s.holes.push(new THREE.Path(V2(h))); return s; }
export function extrude(s, depth, bevel = 0.02) { const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 1, curveSegments: 3 }); g.translate(0, 0, -depth / 2); return g; }
export const ngon = (r, n, cx = 0, cy = 0, a0 = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + (i / n) * TAU) * r, cy + Math.sin(a0 + (i / n) * TAU) * r]);
/** chamfered box (every edge cut at 45 degrees by c) */
export function cbox(w, h, d, c = 0.02) { c = Math.min(c, w / 3, h / 3, d / 3); const W = w / 2, H = h / 2; return extrude(shape([[-W + c, -H], [W - c, -H], [W, -H + c], [W, H - c], [W - c, H], [-W + c, H], [-W, H - c], [-W, -H + c]]), Math.max(0.001, d - 2 * c), c); }
export const gem = (r = 0.1, detail = 0, seed = 1, amt = 0.25) => jitter(new THREE.IcosahedronGeometry(r, detail), r * amt, seed);
/** add a faceted mesh: mesh(parent, geo, mat|kind, x, y, z, rx, ry, rz, density) */
export function mesh(p, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, density = 2) {
  const o = new THREE.Mesh(geo.userData?.faceted ? geo : facet(geo, density), typeof m === 'string' ? lmat(m) : m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o;
}
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; };
const flame = (p, x, y, z, s = 1) => { const f = mesh(p, lathe([[0.0005, 0], [0.012 * s, 0.012 * s], [0.008 * s, 0.035 * s], [0.0005, 0.055 * s]], 4), glowMat(0xffc860, 2.4), x, y, z); f.name = 'flame'; f.userData.noInk = true; return f; };

// ---------------------------------------------------------------- the props (metres, base at y = 0)
const BOOKC = ['clothRed', 'teal', 'purple', 'leather', 'blue', 'green'];
const P = {
  crate({ w = 0.8, h = 0.5, d = 0.5, wood = 'planks', open = false } = {}) { const g = grp(); const c = 0.04;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, cbox(0.07, h, 0.07, 0.012), 'walnut', sx * (w / 2 - 0.035), h / 2, sz * (d / 2 - 0.035));
    const nb = Math.max(2, Math.round(h / 0.16)); const bh = h / nb;
    for (let i = 0; i < nb; i++) { const y = bh * (i + 0.5); for (const sz of [-1, 1]) mesh(g, cbox(w - 0.02, bh - 0.025, 0.035, 0.01), wood, 0, y, sz * (d / 2 - 0.0175), 0, 0, (i % 2 ? 1 : -1) * 0.012); for (const sx of [-1, 1]) mesh(g, cbox(0.035, bh - 0.025, d - 0.1, 0.01), wood, sx * (w / 2 - 0.0175), y, 0); }
    mesh(g, cbox(w - 0.06, 0.03, d - 0.06, 0.008), 'darkPlanks', 0, 0.02, 0); if (!open) mesh(g, cbox(w, 0.04, d, c / 2), wood, 0, h + 0.02, 0);
    for (const sz of [-1, 1]) mesh(g, cbox(Math.hypot(w, h) * 0.92, 0.05, 0.02, 0.008), 'walnut', 0, h / 2, sz * (d / 2 + 0.005), 0, 0, Math.atan2(h, w)); return g; },
  appleCrate(o = {}) { return P.crate({ w: 1.15, d: 0.78, h: 0.62, ...o, open: true }); },
  barrel({ h = 0.87, r = 0.37, sides = 10 } = {}) { const g = grp(); const b = r * 0.82;
    mesh(g, lathe([[0.0005, 0], [b, 0], [r * 0.95, h * 0.25], [r, h * 0.5], [r * 0.95, h * 0.75], [b, h], [0.0005, h]], sides), 'planks');
    for (const y of [0.1, 0.3, 0.7, 0.9]) { const rr = y < 0.5 ? b + (r - b) * (y / 0.5) * 1.02 : b + (r - b) * ((1 - y) / 0.5) * 1.02; mesh(g, lathe([[rr + 0.012, y * h - 0.025], [rr + 0.015, y * h], [rr + 0.012, y * h + 0.025]], sides).translate(0, 0, 0), 'iron'); }
    mesh(g, lathe([[0.0005, h - 0.02], [b - 0.02, h - 0.02], [b - 0.02, h + 0.004], [0.0005, h + 0.004]], sides), 'darkPlanks');
    mesh(g, prism(0.03, 0.05, 6).rotateZ(Math.PI / 2), 'oak', r * 0.98, h * 0.3, 0); return g; },
  chest({ w = 0.96, d = 0.52, h = 0.42, lidH = 0.2 } = {}) { const g = grp();
    mesh(g, cbox(w, h, d, 0.025), 'darkPlanks', 0, h / 2, 0); for (const x of [-w / 2 + 0.05, -w * 0.18, w * 0.18, w / 2 - 0.05]) mesh(g, cbox(0.05, h + 0.01, d + 0.02, 0.01), 'iron', x, h / 2, 0);
    const lid = grp(g, 0, h, -d / 2); lid.name = 'treasure_chest_lid'; // hinged at the back edge; rotation.x < 0 opens it
    const arch = (k) => shape([[-d / 2, 0], [d / 2, 0], [d / 2, lidH * 0.55], [d * 0.3, lidH * 0.92], [0, lidH], [-d * 0.3, lidH * 0.92], [-d / 2, lidH * 0.55]].map(([u, v]) => [u * k, v * k]));
    mesh(lid, extrude(arch(1), w - 0.02, 0.012).rotateY(Math.PI / 2), 'darkPlanks', 0, 0, d / 2);
    for (const x of [-w / 2 + 0.05, -w * 0.18, w * 0.18, w / 2 - 0.05]) mesh(lid, extrude(arch(1.05), 0.05, 0.006).rotateY(Math.PI / 2), 'iron', x, -0.004, d / 2);
    mesh(g, cbox(0.12, 0.14, 0.03, 0.01), 'goldEng', 0, h - 0.04, d / 2 + 0.012); mesh(g, gem(0.025, 0, 3), 'ruby', 0, h - 0.04, d / 2 + 0.03);
    return g; },
  book({ seed = 1, color = null, w = 0.17, h = 0.24, t = 0.04 } = {}) { const g = grp(); const cov = color || BOOKC[seed % BOOKC.length];
    mesh(g, cbox(t, h, w, 0.004), cov, 0, h / 2, 0); mesh(g, cbox(t * 0.82, h - 0.012, w - 0.01, 0.002), 'parch', 0, h / 2, 0.006);
    for (const y of [0.25, 0.75]) mesh(g, cbox(t + 0.004, 0.012, 0.012, 0.002), 'goldEng', 0, h * y, -w / 2 + 0.002); return g; },
  bookStack({ n = 4, seed = 1 } = {}) { const g = grp(); const r = mulberry32(seed); let y = 0; for (let i = 0; i < n; i++) { const b = P.book({ seed: seed + i, t: 0.035 + r() * 0.02, h: 0.22 + r() * 0.05, w: 0.16 + r() * 0.03 }); b.rotation.set(0, (r() - 0.5) * 0.6, Math.PI / 2); b.position.y = y + 0.02; b.position.x = 0.12; g.add(b); y += 0.045; } return g; },
  candle({ h = 0.14, r = 0.022 } = {}) { const g = grp(); mesh(g, prism(r, h, 6).translate(0, h / 2, 0), 'wax'); mesh(g, lathe([[r, h - 0.02], [r * 1.25, h - 0.05], [r * 1.05, h - 0.08]], 6), 'wax'); flame(g, 0, h + 0.005, 0); return g; },
  candlestick({ h = 0.22 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.05, 0], [0.045, 0.015], [0.016, 0.03], [0.014, h * 0.55], [0.03, h * 0.62], [0.028, h * 0.66], [0.0005, h * 0.66]], 8), 'brass'); const c = P.candle({ h: h * 0.4, r: 0.016 }); c.position.y = h * 0.66; g.add(c); return g; },
  candelabra({ h = 0.81 } = {}) { const g = grp(); const br = 'brass';
    mesh(g, lathe([[0.0005, 0], [0.13, 0], [0.12, 0.03], [0.04, 0.06], [0.03, h * 0.7], [0.045, h * 0.72], [0.0005, h * 0.73]], 8), br);
    for (const s of [-1, 1]) { mesh(g, tube([[0, h * 0.55, 0], [s * 0.12, h * 0.55, 0], [s * 0.17, h * 0.62, 0], [s * 0.17, h * 0.72, 0]], 0.012, { seg: 5, rad: 4 }), br); const c = P.candle({ h: 0.12, r: 0.017 }); c.position.set(s * 0.17, h * 0.72, 0); g.add(c); }
    const c = P.candle({ h: 0.14, r: 0.018 }); c.position.y = h * 0.73; g.add(c); return g; },
  lantern({ h = 0.29 } = {}) { const g = grp(); const k = h / 0.29; const br = 'brass';
    mesh(g, prism(0.06 * k, 0.03 * k, 6).translate(0, 0.015 * k, 0), br);
    const gl = mesh(g, prism(0.048 * k, 0.15 * k, 6).translate(0, 0.105 * k, 0), new THREE.MeshToonMaterial({ color: '#ffd890', emissive: '#ffa040', emissiveIntensity: 1.4 })); gl.name = 'glass';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; mesh(g, cbox(0.008 * k, 0.15 * k, 0.008 * k, 0.002), br, Math.cos(a) * 0.052 * k, 0.105 * k, Math.sin(a) * 0.052 * k); }
    mesh(g, lathe([[0.0005, 0.18 * k], [0.065 * k, 0.18 * k], [0.03 * k, 0.24 * k], [0.0005, 0.25 * k]], 6), br); mesh(g, tube([[-0.02 * k, 0.245 * k, 0], [0, 0.29 * k, 0], [0.02 * k, 0.245 * k, 0]], 0.006 * k, { seg: 4, rad: 3 }), 'iron'); return g; },
  oilLamp({ h = 0.8 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.11, 0], [0.1, 0.03], [0.03, 0.06], [0.025, h * 0.5], [0.09, h * 0.55], [0.1, h * 0.62], [0.06, h * 0.66], [0.0005, h * 0.67]], 8), 'brass');
    mesh(g, lathe([[0.04, h * 0.66], [0.07, h * 0.75], [0.06, h * 0.92], [0.035, h], [0.0005, h]], 8), lmat('glass', { opacity: 0.55 })); flame(g, 0, h * 0.72, 0, 1.4); return g; },
  chair({ h = 0.95, w = 0.48, seat = 0.46, wood = 'oak' } = {}) { const g = grp(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, cbox(0.045, sz < 0 ? h : seat, 0.045, 0.01), wood, sx * (w / 2 - 0.03), (sz < 0 ? h : seat) / 2, sz * (w / 2 - 0.03));
    mesh(g, cbox(w, 0.045, w, 0.012), wood, 0, seat, 0); for (const y of [0.62, 0.8]) mesh(g, cbox(w - 0.04, 0.06, 0.025, 0.008), wood, 0, h * y + 0.08, -w / 2 + 0.03); mesh(g, cbox(w - 0.06, 0.02, w - 0.06, 0.006), 'clothRed', 0, seat + 0.03, 0.01); return g; },
  stool({ h = 0.45, r = 0.18 } = {}) { const g = grp(); mesh(g, prism(r, 0.05, 6).translate(0, h, 0), 'oak'); for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; mesh(g, tube([[Math.cos(a) * r * 0.6, h, Math.sin(a) * r * 0.6], [Math.cos(a) * r * 1.05, 0, Math.sin(a) * r * 1.05]], 0.02, { seg: 1, rad: 4 }), 'walnut'); } return g; },
  bench({ w = 1.2, h = 0.45, d = 0.32 } = {}) { const g = grp(); mesh(g, cbox(w, 0.06, d, 0.012), 'planks', 0, h, 0); for (const s of [-1, 1]) mesh(g, extrude(shape([[-d / 2, 0], [d / 2, 0], [d * 0.3, h - 0.03], [-d * 0.3, h - 0.03]]), 0.05, 0.008).rotateY(Math.PI / 2), 'walnut', s * (w / 2 - 0.12), 0, 0); return g; },
  table({ w = 1.2, h = 0.75, d = 0.7, wood = 'darkPlanks' } = {}) { const g = grp(); mesh(g, cbox(w, 0.06, d, 0.015), wood, 0, h - 0.03, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, prism(0.035, h - 0.06, 4, 0.025).translate(0, (h - 0.06) / 2, 0), 'walnut', sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07));
    for (const sz of [-1, 1]) mesh(g, cbox(w - 0.16, 0.06, 0.025, 0.006), 'walnut', 0, h - 0.11, sz * (d / 2 - 0.07)); return g; },
  roundTable({ h = 1.0, r = 0.7 } = {}) { const g = grp(); mesh(g, prism(r, 0.06, 8).translate(0, h - 0.03, 0), 'darkPlanks'); mesh(g, lathe([[0.0005, 0], [0.32, 0], [0.3, 0.05], [0.08, 0.12], [0.06, h * 0.5], [0.09, h * 0.8], [0.12, h - 0.06], [0.0005, h - 0.06]], 6), 'walnut'); return g; },
  shelf({ w = 1.0, h = 1.8, d = 0.35, books = true, seed = 2 } = {}) { const g = grp(); for (const s of [-1, 1]) mesh(g, cbox(0.04, h, d, 0.008), 'darkPlanks', s * (w / 2 - 0.02), h / 2, 0); mesh(g, cbox(w, 0.04, d, 0.008), 'darkPlanks', 0, h, 0); mesh(g, cbox(w - 0.06, h - 0.04, 0.02, 0.004), 'walnut', 0, h / 2, -d / 2 + 0.01);
    const n = Math.max(2, Math.round(h / 0.42)); const r = mulberry32(seed); for (let i = 0; i < n; i++) { const y = 0.03 + i * (h / n); mesh(g, cbox(w - 0.06, 0.03, d - 0.02, 0.006), 'darkPlanks', 0, y, 0.0);
      if (books && i < n) { let x = -w / 2 + 0.06; while (x < w / 2 - 0.1) { const t = 0.03 + r() * 0.03, bh = Math.min(h / n - 0.06, 0.18 + r() * 0.12); if (r() < 0.12) { x += 0.06; continue; } const b = P.book({ seed: Math.floor(r() * 9), t, h: bh, w: d * 0.7 }); b.position.set(x + t / 2, y + 0.015, 0.02); b.rotation.z = r() < 0.1 ? 0.2 : 0; g.add(b); x += t + 0.004; } } }
    return g; },
  bookshelf(o = {}) { return P.shelf({ books: true, ...o }); },
  vase({ h = 0.69, kind = 'brass' } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.09, 0], [0.12, h * 0.12], [0.16, h * 0.4], [0.11, h * 0.68], [0.06, h * 0.8], [0.075, h * 0.95], [0.09, h], [0.0005, h]].map(([r, y]) => [r * h / 0.69, y]), 8), kind === 'brass' ? 'brassEng' : kind); return g; },
  amphora({ h = 0.44 } = {}) { const g = grp(); const k = h / 0.44; mesh(g, lathe([[0.0005, 0], [0.05, 0], [0.06, 0.04], [0.12, 0.16], [0.13, 0.25], [0.09, 0.33], [0.05, 0.36], [0.045, 0.42], [0.06, 0.44], [0.0005, 0.44]].map(([r, y]) => [r * k, y * k]), 8), 'blackfig');
    for (const s of [-1, 1]) mesh(g, tube([[s * 0.045 * k, 0.4 * k, 0], [s * 0.12 * k, 0.4 * k, 0], [s * 0.12 * k, 0.3 * k, 0]], 0.012 * k, { seg: 3, rad: 4 }), 'clay'); return g; },
  pot({ h = 0.22, r = 0.135 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [r * 0.7, 0], [r, h * 0.85], [r * 1.08, h * 0.88], [r * 1.08, h], [r * 0.9, h], [0.0005, h * 0.9]], 8), 'clay'); return g; },
  bottle({ h = 0.3, color = 'green' } = {}) { const g = grp(); const k = h / 0.3; mesh(g, lathe([[0.0005, 0], [0.036, 0], [0.037, 0.19], [0.016, 0.24], [0.013, 0.29], [0.0005, 0.29]].map(([r, y]) => [r * k, y * k]), 6), lmat(color, { opacity: 0.9 })); mesh(g, prism(0.012 * k, 0.03 * k, 5).translate(0, 0.295 * k, 0), 'oak'); mesh(g, cbox(0.05 * k, 0.06 * k, 0.005, 0.002), 'parch', 0, 0.1 * k, 0.037 * k); return g; },
  goblet({ h = 0.27 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.06, 0], [0.05, 0.015], [0.012, 0.03], [0.012, h * 0.5], [0.05, h * 0.6], [0.07, h], [0.06, h], [0.0005, h * 0.62]], 8), 'goldEng'); return g; },
  scroll({ L = 0.32, r = 0.035, open = 0 } = {}) { const g = grp(); mesh(g, prism(r, L, 6).rotateZ(Math.PI / 2).translate(0, r, 0), 'parch'); for (const s of [-1, 1]) mesh(g, prism(r * 0.45, 0.04, 6).rotateZ(Math.PI / 2), 'walnut', s * (L / 2 + 0.02), r, 0); mesh(g, prism(r * 1.05, 0.03, 6).rotateZ(Math.PI / 2), 'clothRed', 0, r, 0);
    if (open) mesh(g, cbox(L * 0.9, 0.004, open, 0.001), 'parch', 0, 0.002, r + open / 2); return g; },
  globe({ h = 0.45 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.09, 0], [0.07, 0.03], [0.02, 0.06], [0.02, h * 0.45], [0.0005, h * 0.45]], 6), 'walnut'); const ball = mesh(g, new THREE.IcosahedronGeometry(h * 0.27, 1), 'blue', 0, h * 0.68, 0); ball.rotation.z = 0.4;
    mesh(g, tube(Array.from({ length: 9 }, (_, i) => { const a = -Math.PI * 0.5 + (i / 8) * Math.PI * 1.2; return [Math.cos(a) * h * 0.31, h * 0.68 + Math.sin(a) * h * 0.31, 0]; }), 0.01, { seg: 8, rad: 4 }), 'brass'); return g; },
  telescope({ L = 1.2 } = {}) { const g = grp(); for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; mesh(g, tube([[0, L * 0.62, 0], [Math.cos(a) * L * 0.3, 0, Math.sin(a) * L * 0.3]], 0.018, { seg: 1, rad: 4 }), 'walnut'); }
    const tb = grp(g, 0, L * 0.64, 0); tb.rotation.z = 0.45; mesh(tb, prism(0.05, L * 0.55, 8, 0.04).rotateZ(Math.PI / 2), 'brassEng', 0.05, 0, 0); mesh(tb, prism(0.06, 0.06, 8).rotateZ(Math.PI / 2), 'brass', -L * 0.22, 0, 0); mesh(tb, prism(0.032, 0.2, 8).rotateZ(Math.PI / 2), 'brass', -L * 0.3, 0, 0); return g; },
  hammer({ L = 0.35 } = {}) { const g = grp(); mesh(g, prism(0.014, L, 5).translate(0, L / 2, 0), 'oak'); mesh(g, cbox(0.12, 0.045, 0.045, 0.01), 'iron', 0, L, 0); return g; },
  shovel({ L = 1.1 } = {}) { const g = grp(); mesh(g, prism(0.016, L * 0.75, 5).translate(0, L * 0.25 + L * 0.375, 0), 'oak'); mesh(g, extrude(shape([[-0.1, 0], [0.1, 0], [0.1, L * 0.2], [0, L * 0.26], [-0.1, L * 0.2]]), 0.012, 0.004), 'iron', 0, 0, 0); mesh(g, cbox(0.12, 0.03, 0.03, 0.008), 'walnut', 0, L, 0); return g; },
  pickaxe({ L = 0.8 } = {}) { const g = grp(); mesh(g, prism(0.016, L, 5).translate(0, L / 2, 0), 'oak'); mesh(g, extrude(shape([[-0.28, -0.01], [0, 0.03], [0.28, -0.01], [0.26, 0.02], [0, 0.06], [-0.26, 0.02]]), 0.03, 0.006), 'iron', 0, L - 0.04, 0); return g; },
  saw({ L = 0.6 } = {}) { const g = grp(); const pts = [[0, 0]]; for (let i = 0; i <= 12; i++) pts.push([i * L / 12, i % 2 ? -0.015 : 0]); pts.push([L, 0.09], [0, 0.12]); mesh(g, extrude(shape(pts), 0.004, 0.001), 'steel'); mesh(g, cbox(0.1, 0.12, 0.03, 0.012), 'walnut', -0.04, 0.08, 0); return g; },
  tools() { const g = grp(); const r = [P.hammer(), P.shovel(), P.pickaxe(), P.saw()]; r[0].position.set(0.5, 0, 0.1); r[0].rotation.z = Math.PI / 2; r[1].position.set(-0.2, 0, 0); r[1].rotation.z = 0.25; r[2].position.set(0.15, 0, -0.05); r[2].rotation.z = -0.2; r[3].position.set(0.3, 0.02, 0.15); r[3].rotation.x = -Math.PI / 2; for (const o of r) g.add(o); return g; },
  basket({ w = 0.38, d = 0.3, h = 0.12, handle = true } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [0.4, 0], [0.5, 1], [0.46, 1], [0.0005, 0.12]], 8).scale(w, h, d), 'wicker'); if (handle) mesh(g, tube([[-w * 0.45, h, 0], [-w * 0.3, h * 2.4, 0], [w * 0.3, h * 2.4, 0], [w * 0.45, h, 0]], 0.012, { seg: 6, rad: 4 }), 'wicker'); return g; },
  bucket({ h = 0.3, r = 0.15 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0], [r * 0.8, 0], [r, h], [r * 0.9, h], [0.0005, h * 0.1]], 8), 'planks'); for (const y of [0.15, 0.8]) mesh(g, lathe([[r * (0.82 + 0.18 * y) + 0.008, h * y - 0.015], [r * (0.82 + 0.18 * y) + 0.01, h * y + 0.015]], 8), 'iron'); mesh(g, tube([[-r, h * 0.9, 0], [-r * 0.6, h * 1.5, 0], [r * 0.6, h * 1.5, 0], [r, h * 0.9, 0]], 0.007, { seg: 6, rad: 3 }), 'iron'); return g; },
  cart({ L = 1.6, w = 1.0 } = {}) { const g = grp(); const bed = grp(g, 0, 0.42, 0); mesh(bed, cbox(L, 0.05, w, 0.01), 'planks', 0, 0.12, 0); for (const s of [-1, 1]) { mesh(bed, cbox(L, 0.22, 0.04, 0.008), 'planks', 0, 0.25, s * (w / 2)); mesh(bed, cbox(0.04, 0.22, w, 0.008), 'planks', s * L / 2, 0.25, 0); }
    for (const s of [-1, 1]) { const wh = grp(g, -0.15, 0.4, s * (w / 2 + 0.06)); mesh(wh, prism(0.4, 0.05, 8).rotateX(Math.PI / 2), 'walnut'); mesh(wh, prism(0.43, 0.04, 8, 0.43).rotateX(Math.PI / 2), 'iron').scale.set(1, 1, 0.6); mesh(wh, prism(0.08, 0.1, 6).rotateX(Math.PI / 2), 'iron'); }
    for (const s of [-1, 1]) mesh(g, tube([[L / 2, 0.55, s * 0.3], [L / 2 + 0.9, 0.35, s * 0.25]], 0.025, { seg: 1, rad: 4 }), 'oak'); mesh(g, prism(0.025, w + 0.25, 4).rotateX(Math.PI / 2), 'iron', -0.15, 0.4, 0); return g; },
  ladder({ h = 3.1, w = 0.48 } = {}) { const g = grp(); for (const s of [-1, 1]) mesh(g, cbox(0.06, h, 0.06, 0.012), 'oak', s * w / 2, h / 2, 0); for (let i = 0; i < Math.floor(h / 0.36); i++) mesh(g, prism(0.022, w, 5).rotateZ(Math.PI / 2), 'walnut', 0, 0.3 + i * 0.36, 0); return g; },
  post({ h = 1.7, r = 0.065 } = {}) { const g = grp(); mesh(g, prism(r, h, 6, r * 0.85).translate(0, h / 2, 0), 'walnut'); mesh(g, lathe([[r * 0.85, h], [0.0005, h + r * 0.9]], 6), 'walnut'); return g; },
  signpost({ h = 1.6, words = 2 } = {}) { const g = grp(); g.add(P.post({ h })); for (let i = 0; i < words; i++) { const s = i % 2 ? -1 : 1; mesh(g, extrude(shape([[0, -0.08], [0.5, -0.08], [0.6, 0], [0.5, 0.08], [0, 0.08]]), 0.03, 0.008), 'planks', 0.03 * s, h - 0.25 - i * 0.24, 0.07, 0, s > 0 ? 0 : Math.PI, 0); } return g; },
  tent({ L = 1.0, W = 0.92, H = 0.58 } = {}) { const g = grp(); const cv = lmat('canvas', { side: THREE.DoubleSide }); const sl = Math.hypot(W / 2, H);
    for (const s of [-1, 1]) mesh(g, cbox(L, 0.012, sl, 0.002), cv, 0, H / 2, s * W / 4, Math.atan2(H, s * W / 2), 0, 0);
    mesh(g, extrude(shape([[-W / 2, 0], [W / 2, 0], [0, H]]), 0.01, 0).rotateY(Math.PI / 2), cv, -L / 2, 0, 0); for (const s of [-1, 1]) mesh(g, cbox(0.035, H + 0.12, 0.035, 0.008), 'walnut', s * (L / 2 + 0.02), (H + 0.12) / 2, 0); mesh(g, prism(0.016, L + 0.1, 5).rotateZ(Math.PI / 2), 'walnut', 0, H + 0.01, 0); return g; },
  pavilion({ R = 0.5, H = 1.05, color = 'purple' } = {}) { const g = grp(); const cv = lmat(color, { side: THREE.DoubleSide });
    mesh(g, lathe([[0.0005, H], [R * 0.35, H * 0.7], [R, H * 0.3], [R, 0.02]], 8), cv, 0, 0, 0, 0, 0, 0, 3); mesh(g, lathe([[R * 1.02, H * 0.3], [R * 1.06, H * 0.26], [R * 1.02, H * 0.22]], 8), 'goldEng');
    mesh(g, lathe([[0.0005, H - 0.02], [0.03, H], [0.02, H + 0.08], [0.045, H + 0.12], [0.0005, H + 0.2]], 5), 'gold'); return g; },
  sack({ h = 0.5, r = 0.18 } = {}) { const g = grp(); mesh(g, jitter(lathe([[0.0005, 0], [r * 0.9, 0], [r * 1.1, h * 0.35], [r, h * 0.7], [r * 0.4, h * 0.85], [r * 0.5, h], [0.0005, h * 0.95]], 7), r * 0.12, 5), 'canvas'); mesh(g, lathe([[r * 0.42, h * 0.82], [r * 0.48, h * 0.86], [r * 0.42, h * 0.9]], 7), 'rope'); return g; },
  rug({ w = 2, d = 1.3, color = 'clothRed' } = {}) { const g = grp(); mesh(g, cbox(w, 0.012, d, 0.004), color, 0, 0.006, 0, 0, 0, 0, 1); return g; },
  cauldron({ r = 0.35 } = {}) { const g = grp(); mesh(g, lathe([[0.0005, 0.08], [r * 0.6, 0.08], [r, r * 0.6], [r * 0.95, r * 1.1], [r * 0.85, r * 1.2], [r * 0.9, r * 1.28], [r * 0.8, r * 1.28], [0.0005, r * 1.0]], 8), 'iron'); for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; mesh(g, prism(0.03, 0.1, 4).translate(0, 0.05, 0), 'iron', Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55); } return g; },
};
export const PROP_NAMES = Object.keys(P);
/** prop(name, opts) -> Group (metres, base at y = 0). Unknown names fall back to a crate. */
export function prop(name, opts = {}) { const make = P[name] || P.crate; const g = make(opts); g.name = 'prop:' + name; if (opts.s) g.scale.setScalar(opts.s); g.userData.lowprop = name; return g; }

// ---------------------------------------------------------------- CC0 prop models -> low-poly twins (sized to the originals' bounds)
const SWAP = {
  wine_barrel_01: ['barrel', {}, 0.871], treasure_chest: ['chest', {}, 0.62], wooden_crate_01: ['crate', { w: 0.825, h: 0.32, d: 0.41 }, 0.35], lantern_01: ['lantern', {}, 0.294],
  brass_candleholders: ['candelabra', {}, 0.809], vintage_oil_lamp: ['oilLamp', {}, 0.802], wicker_basket_01: ['basket', { handle: false }, 0.117], brass_vase_01: ['vase', {}, 0.692],
  brass_vase_03: ['vase', { kind: 'bronzeEng' }, 0.2], antique_ceramic_vase_01: ['amphora', {}, 0.44], ceramic_vase_04: ['vase', { kind: 'clay' }, 0.342], book_encyclopedia_set_01: ['book', {}, 0.237],
  wine_bottles_01: ['bottle', {}, 0.331], wooden_candlestick: ['candlestick', {}, 0.22], planter_pot_clay: ['pot', {}, 0.222], round_wooden_table_01: ['roundTable', {}, 1.005], brass_goblets: ['goblet', {}, 0.272],
};
export const lowSwapped = (name) => !!SWAP[String(name).split('#')[0]];
/** a low-poly twin for a CC0 prop model name (`name#k` picks a seed), or null */
export function lowSwap(name) {
  const [base, v] = String(name).split('#'); const s = SWAP[base]; if (!s) return null; const k = /^\d+$/.test(v || '') ? +v : 0;
  const o = prop(s[0], { seed: k + 1, color: s[0] === 'bottle' ? ['green', 'wine', 'blue', 'green'][k % 4] : undefined, ...s[1] }); const bb = new THREE.Box3().setFromObject(o); const hh = bb.max.y - bb.min.y || 1; const inner = new THREE.Group(); inner.add(o); o.scale.multiplyScalar(s[2] / hh); o.position.y = -bb.min.y * (s[2] / hh);
  inner.name = name; inner.userData.asset = base; inner.userData.lowprop = s[0]; return inner;
}
