// Places, not arenas: each battle / travel theme is a whole landscape around the fighting ground, and every event
// gets its own set-piece. Compositions only; the pieces come from flora.js (cel trees, bushes, flowers, water
// plants, water), village.js (cottages, windmill, well, fences, walls, laundry, bridges, shrines, a tholos) and the
// toon-converted CC0 models (rocks, boulders, cliffs, columns, statues, vases, stumps).
// ctx (from realStage): see makeCtx in realworld.js. plan(ctx) runs before the ground is built (water basins, hills);
// build(ctx) dresses the land.
import * as THREE from 'three';
import { cottage, windmill, well, fence, stoneWall, laundry, chimneySmoke, stoneBridge, plankBridge, shrine, tholos, mat } from './village.js';
import { celWater, lilyPads, reeds } from './flora.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MIX = { // weighted species mixes for woods
  olive: [['olive', 5], ['cypress', 1.2], ['pine', 1], ['oak', 0.6]],
  meadow: [['olive', 3], ['oak', 2], ['cypress', 1.4], ['pine', 1.2]],
  forest: [['pine', 3], ['fir', 3], ['oak', 2.5], ['cypress', 0.8], ['olive', 0.5]],
  garden: [['cypress', 3], ['laurel', 2], ['olive', 2], ['pine', 1]],
  marsh: [['oak', 3], ['fir', 1.2], ['cypress', 2]],
  dry: [['pine', 3], ['olive', 2], ['cypress', 1.5], ['oak', 0.6]],
};
const pickW = (mix, v) => { const tot = mix.reduce((s, [, w]) => s + w, 0); let a = v * tot; for (const [k, w] of mix) { a -= w; if (a <= 0) return k; } return mix[0][0]; };
const SIZE = { olive: [0.9, 1.25], oak: [0.85, 1.2], pine: [0.85, 1.2], fir: [0.8, 1.25], cypress: [0.85, 1.2], laurel: [0.7, 0.9], apple: [0.75, 0.95], golden: [0.8, 1.0] };
/** a wood: n trees by rejection sampling inside area(rnd) -> [x, z], spaced by `gap` */
export function woods(ctx, n, area, { mix = MIX.meadow, gap = 2.6, tries = 10, scale = 1, under = 0.5 } = {}) {
  const r = ctx.rnd; let placed = 0;
  for (let i = 0; i < n * tries && placed < n; i++) {
    const [x, z] = area(r); const kind = pickW(mix, r()); const g = gap * (kind === 'cypress' ? 0.6 : kind === 'fir' ? 0.85 : 1); if (!ctx.free(x, z, g)) continue;
    const [a, b] = SIZE[kind] || [0.9, 1.2]; ctx.tree(kind, x, z, { s: (a + r() * (b - a)) * scale }); placed++;
    if (r() < under) { const a2 = r() * 6.28, d = g * (0.5 + r() * 0.4); const bx = x + Math.cos(a2) * d, bz = z + Math.sin(a2) * d; if (ctx.free(bx, bz, 0.9)) ctx.bush(pickW([['bush', 3], ['myrtle', 2], ['broom', 1], ['oleander', 0.6]], r()), bx, bz, 0.8 + r() * 0.5); }
  }
  return placed;
}
const box = (cx, cz, w, d) => (r) => [cx + (r() - 0.5) * w, cz + (r() - 0.5) * d];
const ring = (cx, cz, r0, r1, a0 = 0, a1 = Math.PI * 2) => (r) => { const a = a0 + r() * (a1 - a0), d = r0 + Math.sqrt(r()) * (r1 - r0); return [cx + Math.sin(a) * d, cz - Math.cos(a) * d]; };
// the far hills: a belt of distant trees on the rising ground (LOD crowns)
function farBelt(ctx, n, mix, { z0 = -34, z1 = -58, x0 = -60, x1 = 50 } = {}) { woods(ctx, n, (r) => [x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)], { mix, gap: 3.4, under: 0, scale: 1.15 }); }
// the land behind the battle camera, seen by the intro crane along the road
function roadside(ctx, mix, { n = 34 } = {}) { woods(ctx, n, (r) => [-46 + r() * 62, 7 + r() * 34], { mix, gap: 3, under: 0.6 }); }

// ---------------------------------------------------------------- the six places
export const PLACES = {
  // a meadow below a whitewashed village: houses on the rise, a windmill on the hill, pasture, groves, field walls
  meadow: {
    plan(ctx) { ctx.hill(7.5, -30, 9, 3.4); ctx.hill(-26, -24, 10, 1.6); ctx.water({ name: 'pond', cx: -24.5, cz: -6, rx: 4.6, rz: 2.6, seed: 4 }); ctx.water({ name: 'brook', cx: -6.5, cz: 24, rx: 1.3, rz: 9, rot: 0.35, seed: 8 }); },
    build(ctx) {
      const r = ctx.rnd;
      for (const [x, z, ry, o] of [[-13.5, -15.5, 0.3, {}], [-7.8, -18.2, -0.05, { roof: 'gable', pergola: true }], [-18.5, -19.5, 0.45, { roof: 'flat' }], [-11.8, -22.8, 0.12, { roof: 'flat' }], [-3.6, -22.4, -0.3, { roof: 'gable' }], [-22.5, -13.2, 0.7, { roof: 'gable' }], [-0.5, -28.5, -0.2, { roof: 'flat' }]]) ctx.house(Math.round(x * 7 + z), x, z, ry, o);
      ctx.add(windmill(ctx.seed), 7.5, -30, { ry: -0.2, foot: 2.6 }); ctx.add(well(3), -10.2, -12.6, { ry: 0.3, foot: 1.2 }); ctx.add(laundry(ctx.p(-16.6, -11.4), ctx.p(-13.2, -10.6), 5), 0, 0, { abs: true });
      ctx.add(fence([[-17, -4.4], [-17.2, -6.6], [-16.8, -8.8], [-14.2, -9.4], [-11.4, -9.6], [-8.8, -9.2], [-8.4, -7], [-8.6, -4.8]], ctx.hAt, 3), 0, 0, { abs: true });
      ctx.add(stoneWall([[2.5, -10.5], [6, -11.6], [10, -11.2], [14.5, -12.6], [18.5, -15.5]], ctx.hAt, 4), 0, 0, { abs: true }); ctx.add(stoneWall([[-26, -9.8], [-21, -10.4], [-19.5, -11.5]], ctx.hAt, 6), 0, 0, { abs: true });
      ctx.add(shrine(2), 19.5, -7.5, { ry: -0.5, foot: 0.6 });
      // groves and framing trees; a clear view onto the village from the battle camera
      ctx.clear(-10, -16, 6.5); ctx.clear(-3, -20, 4); ctx.clear(5, -24, 4.5);
      woods(ctx, 9, box(9, -8.5, 10, 4), { mix: MIX.olive, gap: 3.2 }); woods(ctx, 4, box(0.5, -11.5, 5, 3), { mix: MIX.olive, gap: 3 }); ctx.tree('oak', 12.8, 0.6, { s: 1.15 }); ctx.tree('cypress', -20.6, -17.5, { s: 1.1 }); ctx.tree('cypress', -5.4, -26, { s: 1.0 }); ctx.tree('cypress', -15.4, -24.8, { s: 0.95 }); ctx.tree('pine', 18.5, -9, { s: 1.15 }); ctx.tree('pine', -27, -20, { s: 1.2 });
      woods(ctx, 12, box(13, -19, 14, 8), { mix: MIX.meadow, gap: 3.4 }); woods(ctx, 14, box(-10, -32, 30, 6), { mix: MIX.meadow, gap: 3.2 }); farBelt(ctx, 60, MIX.meadow); roadside(ctx, MIX.olive);
      // the pond by the pasture, reeds and lilies
      ctx.pads(ctx.W.pond, 14); ctx.reeds(ctx.W.pond, 60); ctx.reeds(ctx.W.brook, 40); if (ctx.W.brook) { const bp = ctx.W.brook.mesh.userData.edgePoint(Math.PI / 2, 0); ctx.add(stoneBridge(3.6, 2, 3), bp.x, bp.z, { ry: -0.35, y: ctx.W.brook.level + 0.45, raw: true, foot: 2.4 }); }
      // a farmstead by the road: cottage, well, laundry, field fence (seen by the opening crane)
      ctx.house(91, -29.5, 21.8, 2.2, { roof: 'gable', pergola: true }); ctx.add(well(9), -24.8, 25.4, { foot: 1.2 }); ctx.add(laundry(ctx.p(-26.5, 17.5), ctx.p(-23.2, 16.2), 9), 0, 0, { abs: true });
      ctx.add(fence([[-36, 14], [-31, 13.2], [-26, 13.6], [-21.5, 12.4]], ctx.hAt, 8), 0, 0, { abs: true }); ctx.add(shrine(5), -14.8, 14.6, { ry: 2.4, foot: 0.6 });
      for (let i = 0; i < 6; i++) ctx.model(['rock_moss_set_01', 'rock_moss_set_02'][i % 2], -18 + r() * 34, -4 - r() * 5, { s: 0.55 + r() * 0.5, y: -0.1 });
      ctx.model('wine_barrel_01', 8.4, -3.4, { s: 1.4 }); ctx.model('antique_ceramic_vase_01', -7.8, -3.3, { s: 2.4 });
      ctx.drifts(['poppy', 'poppy', 'daisy', 'cornflower', 'lavender', 'clover'], 26);
      ctx.pasture = { x: [-16, -9.6], z: [-8.8, -5] };
    },
  },
  // a marble garden on a lake shore: cypress alleys, laurel, statues; the far shore with a temple and a white village
  garden: {
    plan(ctx) { ctx.water({ name: 'lake', pct: 0.8, cx: -2, cz: -26, rx: 32, rz: 11.5, seed: 7, deep: '#245a86', mid: '#3c8aa8', shallow: '#78c4c0' }); ctx.hill(2, -43, 9, 2.2); },
    build(ctx) {
      const r = ctx.rnd; const lake = ctx.W.lake;
      for (const x of [-15.5, -10.5, 11, 16]) ctx.tree('cypress', x + (r() - 0.5), -8.4 - r() * 0.6, { s: 1.05 + r() * 0.2 }); ctx.clear(0, -11, 8);
      ctx.model('marble_bust_01', -6.5, -4.2, { s: 3.0, ry: 0.4, stone: true }); ctx.model('horse_statue_01', 7.8, -4.6, { s: 2.8, ry: -0.6, stone: true }); ctx.model('lion_head', 2.6, -6, { s: 2.0, ry: 0.2, stone: true });
      for (let i = 0; i < 4; i++) ctx.model('greek_column', -11 + i * 7.2 + r(), -6.4 - r(), { s: 0.72, stone: true }); for (let i = 0; i < 3; i++) ctx.model(r() < 0.5 ? 'antique_ceramic_vase_01' : 'ceramic_vase_04', -9 + i * 7.5, -3.6, { s: 2.1 });
      ctx.tree('laurel', 13, 0.4, { s: 1.0 }); ctx.tree('laurel', -14.5, -3.5, { s: 0.9 }); for (const x of [-18, -13, -7.5, 8, 13.5, 18.5]) ctx.bush(['oleander', 'myrtle'][Math.round(x) & 1], x + r(), -10.2 - r() * 1.2, 1.1);
      // jetty out into the lake, reeds and lilies along the near shore
      if (lake) { const jp = lake.mesh.userData.edgePoint(Math.PI / 2 + 0.25, 0.86); ctx.add(plankBridge(6.5, 1.3, 3, { rails: false, posts: 1.2 }), jp.x, jp.z, { ry: Math.PI / 2, y: lake.level + 0.32, raw: true }); }
      ctx.reeds(lake, 160); ctx.pads(lake, 46);
      // far shore: a tholos on the headland, white houses, cypress and pines
      ctx.add(tholos(4, { R: 2.6, n: 12, h: 3.6 }), 1.5, -40.5, { ry: 0.2, foot: 4 });
      for (const [x, z, ry] of [[-18, -40, 0.2], [-13.5, -42.5, -0.1], [-9, -40.5, 0.3], [-22, -43.5, 0.5]]) ctx.house(Math.round(x * 3 - z), x, z, ry, { roof: r() < 0.5 ? 'flat' : 'gable' });
      woods(ctx, 26, box(0, -44, 60, 8), { mix: MIX.garden, gap: 3 }); farBelt(ctx, 50, MIX.garden, { z0: -48, z1: -64 }); roadside(ctx, MIX.garden);
      woods(ctx, 10, box(-22, -10, 10, 6), { mix: MIX.garden, gap: 3 }); woods(ctx, 8, box(20, -9, 8, 6), { mix: MIX.garden, gap: 3 });
      ctx.house(77, -30, 21.5, 2.3, { roof: 'flat' }); ctx.add(shrine(7), -13.5, 14.4, { ry: 2.4, foot: 0.6 });
      ctx.drifts(['daisy', 'poppy', 'lavender', 'narcissus', 'clover'], 22);
    },
  },
  // a clearing deep in a pine and oak forest, a stream under a plank bridge, boulders and a cliff behind
  gully: {
    plan(ctx) { ctx.water({ name: 'stream', pct: 0.85, cx: 0, cz: -10.8, rx: 30, rz: 2.2, seed: 11, deep: '#2a6a78', mid: '#3e94a0', shallow: '#86ccc0' }); ctx.hill(-6, -30, 12, 3.5); ctx.hill(12, -27, 10, 3); },
    build(ctx) {
      const r = ctx.rnd; const st = ctx.W.stream;
      if (st) ctx.add(plankBridge(4.6, 1.5, 2, { posts: 0.8 }), -3, -10.5, { ry: Math.PI / 2, y: st.level + 0.55, raw: true, foot: 1.5 });
      for (let i = 0; i < 6; i++) ctx.model(i % 2 ? 'rock_moss_set_01' : 'rock_moss_set_02', -15 + i * 6 + r() * 2, -6 - r() * 2.5, { s: 1.0 + r() * 0.6, y: -0.1 });
      ctx.model('rock_face_02', 1, -19, { s: 2.6, ry: 0.1 }); ctx.model('rock_face_02', -14, -21, { s: 2.2, ry: 0.6 });
      for (let i = 0; i < 10; i++) ctx.model(r() < 0.5 ? 'fern_02' : 'nettle_plant', -16 + r() * 32, -5 - r() * 4, { s: 1.5 + r() });
      ctx.model('tree_stump_01', 7, -4.2, { s: 1.6 }); ctx.model('dead_tree_trunk_02', -9.5, -4.6, { s: 1.2 });
      // the forest: dense, layered, closing in at the sides and behind; undergrowth between the trunks
      woods(ctx, 60, box(0, -15.5, 56, 9), { mix: MIX.forest, gap: 2.4, under: 0.8 }); woods(ctx, 20, box(-19, -5, 10, 8), { mix: MIX.forest, gap: 2.4 }); woods(ctx, 20, box(19, -5, 10, 8), { mix: MIX.forest, gap: 2.4 });
      woods(ctx, 70, box(0, -30, 80, 18), { mix: MIX.forest, gap: 2.8, under: 0.3 }); farBelt(ctx, 70, MIX.forest, { z0: -38 }); roadside(ctx, MIX.forest, { n: 60 });
      ctx.reeds(st, 70); ctx.drifts(['daisy', 'cornflower', 'lavender', 'clover'], 14);
    },
  },
  // the approach to the Labyrinth: maze walls, a great gate under the bull, cypress rows, broken columns
  labyrinth: {
    plan(ctx) { ctx.hill(-4, -30, 14, 2); },
    build(ctx) {
      const r = ctx.rnd;
      ctx.add(gate(3), 0.5, -12, { foot: 4 }); ctx.model('bull_head', 0.5, -11.4, { s: 3.2, y: 5.1, stone: true });
      for (const [pts, s] of [[[[-16, -9], [-6, -9.5]], 1], [[[7, -9.5], [17, -9]], 2], [[[-14, -15], [-14, -22], [-4, -22]], 3], [[[5, -15], [15, -15], [15, -24]], 4], [[[-8, -17.5], [8, -17.5]], 5], [[[-20, -12], [-20, -26]], 6], [[[21, -12], [21, -26]], 7]]) ctx.add(stoneWall(pts, ctx.hAt, s, { h: 2.0 }), 0, 0, { abs: true });
      for (let i = 0; i < 7; i++) ctx.model('stone_wall_kit', -16 + i * 5.4, -6.8 - (i % 2) * 1.8, { s: 0.33, ry: (i % 2) * Math.PI / 2, stone: true });
      for (let i = 0; i < 5; i++) ctx.model(`greek_column#${1 + (i % 2)}`, -12 + i * 6 + r(), -5 - r() * 2, { s: 0.75, stone: true });
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) ctx.tree('cypress', 0.5 + sd * (5 + i * 2.2), -10.5 - i * 0.6, { s: 1.1 });
      woods(ctx, 30, box(0, -30, 70, 12), { mix: MIX.dry, gap: 3.2 }); farBelt(ctx, 50, MIX.dry); roadside(ctx, MIX.dry);
      ctx.drifts(['lavender', 'cornflower', 'clover'], 12);
    },
  },
  // a reed marsh: open water pools with lilies, cattails, drowned trunks, a boardwalk, cypress and oak islands
  marsh: {
    plan(ctx) { ctx.water({ name: 'pool', pct: 0.5, cx: 0, cz: -8.2, rx: 24, rz: 5.4, seed: 5, deep: '#1e4a52', mid: '#2e6e6a', shallow: '#5e9a80', sky: '#f2ecc8' }); ctx.water({ name: 'mere', cx: -28, cz: 5, rx: 7, rz: 4, seed: 6, deep: '#1e4a52', mid: '#2e6e6a', shallow: '#5e9a80', sky: '#f2ecc8' }); },
    build(ctx) {
      const r = ctx.rnd; const pool = ctx.W.pool;
      if (pool) ctx.add(plankBridge(9, 1.4, 4, { posts: 1.0 }), 11, -8, { ry: 0.25, y: pool.level + 0.4, raw: true, foot: 2 });
      ctx.model('dead_tree_trunk_02', -7, -6.5, { s: 1.4, y: -0.3 }); ctx.model('tree_stump_01', 6.5, -4.6, { s: 1.6 }); ctx.model('dry_branches_medium_01', 2, -5.8, { s: 2 });
      ctx.reeds(pool, 260); ctx.pads(pool, 70); ctx.reeds(ctx.W.mere, 70); ctx.pads(ctx.W.mere, 20);
      woods(ctx, 30, box(0, -18.5, 56, 8), { mix: MIX.marsh, gap: 2.8, under: 0.7 }); woods(ctx, 14, box(-20, -4, 8, 6), { mix: MIX.marsh, gap: 2.6 }); woods(ctx, 14, box(20, -4, 8, 6), { mix: MIX.marsh, gap: 2.6 });
      farBelt(ctx, 50, MIX.marsh); roadside(ctx, MIX.marsh); ctx.add(shrine(3), -12.5, 13.6, { ry: 2.4, foot: 0.6 });
      ctx.drifts(['daisy', 'clover', 'narcissus'], 12); ctx.dragonflies = { x: [-10, 10], z: [-11, -4] };
    },
  },
  // the guardian's cliff: a high windswept edge, ruined temple, statues, watch fires
  guardian: {
    plan(ctx) { ctx.hill(-12, -20, 10, 3.5); ctx.hill(14, -18, 9, 4); },
    build(ctx) {
      const r = ctx.rnd;
      ctx.model('rock_face_02', -12, -15, { s: 2.8, ry: 0.4 }); ctx.model('rock_face_02', 13, -14, { s: 3, ry: -0.5 }); ctx.model('cliff_mountainside', 0, -30, { s: 1.4 });
      ctx.add(tholos(9, { R: 3, n: 10, h: 3.8 }), -1, -19, { ry: 0.3, foot: 4.5 });
      ctx.model('marble_bust_01', -6.8, -4, { s: 3.2, ry: 0.4, stone: true }); ctx.model('horse_statue_01', 7.5, -4.6, { s: 3, ry: -0.6, stone: true });
      for (let i = 0; i < 5; i++) ctx.model(`greek_column#${i % 3}`, -12 + i * 6 + r(), -7 - r() * 2, { s: 0.75, stone: true });
      for (const [x, z] of [[-9.6, -5.2], [10.4, -5.6]]) ctx.firePit(x, z, 1.8);
      woods(ctx, 14, box(0, -12, 40, 6), { mix: [['pine', 4], ['cypress', 1.5], ['olive', 1]], gap: 3.4 }); farBelt(ctx, 40, [['pine', 3], ['cypress', 1]]); roadside(ctx, MIX.dry);
      ctx.drifts(['lavender', 'poppy', 'clover'], 10);
    },
  },
};

// the Labyrinth's gate: two rusticated pylons, a lintel and a pediment, steps
function gate(seed = 1) {
  const G = new THREE.Group(); G.name = 'labyrinthGate'; const parts = [];
  const add = (key, w, h, d, x, y, z, rot = 0) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, w / 3, h / 3, d / 3)), mat(key)); m.position.set(x, y, z); m.rotation.z = rot; m.castShadow = m.receiveShadow = true; G.add(m); parts.push(m); return m; };
  for (const s of [-1, 1]) { for (let i = 0; i < 6; i++) add('rubble', 1.6 - (i % 2) * 0.08, 0.72, 1.6 - (i % 2) * 0.08, s * 2.4, 0.36 + i * 0.74, 0); add('marble', 1.9, 0.3, 1.9, s * 2.4, 4.6, 0); }
  add('marble', 6.8, 0.7, 1.7, 0, 5.1, 0); add('marble', 7.2, 0.22, 1.9, 0, 5.56, 0);
  const tri = new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 1.3)]); const pg = new THREE.ExtrudeGeometry(tri, { depth: 1.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }); pg.translate(0, 0, -0.7); const pm = new THREE.Mesh(pg, mat('marble')); pm.position.y = 5.68; pm.castShadow = true; G.add(pm);
  for (let i = 0; i < 3; i++) add('stone', 7.6 - i * 0.6, 0.22, 2.6 - i * 0.4, 0, 0.11 + i * 0.22, 0.4);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshBasicMaterial({ color: '#120c10' })); dark.position.set(0, 2.4, -0.6); G.add(dark); void seed;
  // worldUV for the boxes so the stone reads at a constant size
  for (const m of parts) { const g = m.geometry; const p = g.attributes.position, n = g.attributes.normal; const uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const x = p.getX(i) + m.position.x, y = p.getY(i) + m.position.y, z = p.getZ(i); if (ay > 0.6) uv.setXY(i, x * 0.6, z * 0.6); else if (ax > 0.6) uv.setXY(i, z * 0.6, y * 0.6); else uv.setXY(i, x * 0.6, y * 0.6); } }
  return G;
}

// ---------------------------------------------------------------- event set-pieces (around the curiosity at (-0.6, 0, 0); Sir Isaac at (-4.4, 1.2))
export const SETS = {
  tree: { place: 'meadow', build(ctx) { // an old orchard: apple trees, ladder, baskets of windfalls, a hive wall
    for (const [x, z, s] of [[-5.5, -4.5, 1.0], [3.6, -4.8, 0.95], [0.4, -8.2, 1.05], [7.5, -7, 0.9], [-9, -7.5, 1.0], [-3, -11, 0.95]]) ctx.tree('apple', x, z, { s, keep: true });
    ctx.add(fence([[-8, -2.6], [-4, -3], [0, -3.3], [4, -3], [8, -2.7]], ctx.hAt, 12), 0, 0, { abs: true });
    for (const [x, z] of [[1.4, 1.2], [2.4, 0.6], [-2.4, -1.2]]) { ctx.model('wicker_basket_01', x, z, { s: 2.2 }); for (let i = 0; i < 4; i++) ctx.model('food_apple_01', x + (Math.random() - 0.5) * 1.2, z + 0.5 + Math.random() * 0.6, { s: 3 }); }
    ctx.model('wooden_crate_01', 3.2, -1.5, { s: 2.2, ry: 0.4 }); ctx.drifts(['daisy', 'clover', 'poppy'], 8);
  } },
  oracle: { place: 'garden', build(ctx) { // Delphi: the tholos behind the engine, laurels, incense smoke, the omphalos stone
    ctx.add(tholos(6, { R: 2.3, n: 10, h: 3.3 }), 1.6, -7.2, { ry: 0.2, foot: 3.6, keep: true }); ctx.smoke([V(1.6, ctx.hAt(1.6, -7.2) + 5.7, -7.2)]);
    for (const [x, z] of [[-4.2, -4.4], [6.4, -4.2], [-8, -6.5]]) ctx.tree('laurel', x, z, { s: 0.85, keep: true });
    ctx.model('planter_pot_clay', -2.6, -1.8, { s: 2.2 }); ctx.model('brass_vase_03', 3.2, -1.2, { s: 4 }); ctx.model('marble_bust_01', -6.4, -2.4, { s: 2.6, ry: 0.5, stone: true });
    for (let i = 0; i < 5; i++) ctx.model('greek_column#0', -6 + i * 3, -11.5, { s: 0.72, stone: true });
  } },
  sisyphus: { place: 'gully', plan(ctx) { ctx.noThemeWater = true; ctx.hill(1.5, -11, 6.5, 4.8); }, build(ctx) { // the hill with its worn path and the boulder waiting at the top
    ctx.clear(1.5, -11, 3); ctx.model('rock_moss_set_01', 1.5, -11, { s: 1.6, y: 0.2, keep: true }); for (let i = 0; i < 14; i++) { const a = i * 0.55, d = 6.2 - i * 0.38; ctx.model('namaqualand_boulder_05', 1.5 + Math.sin(a) * d, -11 + Math.cos(a) * d * 0.7, { s: 0.22 + (i % 3) * 0.06, keep: true }); }
    ctx.add(fence([[-1, -4.4], [0.6, -5.8], [1.6, -7.6]], ctx.hAt, 13), 0, 0, { abs: true }); ctx.model('tree_stump_01', -3, -3.2, { s: 1.2 });
  } },
  pan: { place: 'meadow', plan(ctx) { ctx.water({ name: 'spring', cx: 4.2, cz: -3.8, rx: 1.9, rz: 1.1, seed: 3 }); }, build(ctx) { // Pan's glade: a ring of oaks, stumps for stools, a spring with reeds, vines and lavender
    for (let i = 0; i < 9; i++) { const a = -1.9 + (i / 8) * 3.8; ctx.tree(i % 3 ? 'oak' : 'olive', 1 + Math.sin(a) * 9.5, -3 - Math.cos(a) * 7.5, { s: 1.0, keep: true }); }
    ctx.reeds(ctx.W.spring, 6, true, 0.7); ctx.flowersAround(ctx.W.spring, 'daisy', 20); for (const [x, z] of [[-1.8, 0.4], [2.6, -0.8], [0.6, -2.2]]) ctx.model('tree_stump_01', x, z, { s: 0.9 });
    ctx.bush('vine', -3.4, -2.6, 1.2); ctx.bush('vine', 5.8, -1.4, 1.1); ctx.drifts(['lavender', 'poppy', 'daisy'], 10);
  } },
  icarus: { place: 'gully', plan(ctx) { ctx.noThemeWater = true; ctx.hill(0.5, -10.5, 6.5, 3.4); }, build(ctx) { // Daedalus' launch site on the crag: a wooden ramp aimed at the sun, a workbench, candles and spare feathers
    const ramp = plankBridge(5.2, 1.3, 9, { rails: false, posts: 2.2 }); ramp.rotation.z = 0.36; ctx.add(ramp, 0.2, -9.6, { ry: -0.35, y: 0.9, foot: 2.4 }); ctx.clear(-1, -6, 3.5);
    ctx.model('round_wooden_table_01', -2.4, -2.6, { s: 1.4 }); ctx.model('wooden_candlestick', -2.7, -2.5, { s: 3, y: 0.95 }); ctx.model('wooden_candlestick', -2.1, -2.7, { s: 3, y: 0.95 }); ctx.model('wicker_basket_01', -3.4, -1.6, { s: 2 });
    ctx.model('rock_face_02', 5.5, -13, { s: 2.2, keep: true }); ctx.model('lantern_01', -1.6, -2.2, { s: 2.4 });
  } },
  sphinx: { place: 'garden', build(ctx) { // the gate she guards: pylons and lintel, lion heads, stairs, the exam desk
    ctx.add(gate(5), 0.6, -6.5, { foot: 4, keep: true }); ctx.model('lion_head', -1.8, -5.6, { s: 1.6, y: 3.2, stone: true, keep: true }); ctx.model('lion_head', 3.0, -5.6, { s: 1.6, y: 3.2, stone: true, keep: true });
    ctx.model('round_wooden_table_01', 2.6, -1.2, { s: 1.3 }); ctx.model('book_encyclopedia_set_01#2', 2.6, -1.2, { s: 2.2, y: 0.82 }); for (const s of [-1, 1]) ctx.tree('cypress', 0.6 + s * 6, -7.2, { s: 1.05, keep: true });
  } },
  narcissus: { place: 'garden', plan(ctx) { ctx.water({ name: 'mirror', cx: -0.2, cz: -0.3, rx: 3.0, rz: 1.8, seed: 9, deep: '#26607a', mid: '#3a90a4', shallow: '#7ac8c0' }); }, build(ctx) { // a still pool ringed with narcissus, lilies, reeds, a mossy stone and a drooping laurel
    const p = ctx.W.mirror; ctx.pads(p, 14, true, 0.6); ctx.reeds(p, 9, true, 0.65);
    ctx.flowersAround(p, 'narcissus', 70); ctx.tree('laurel', -5.6, -3.2, { s: 0.95, keep: true }); ctx.model('rock_moss_set_01', 2.8, -1.4, { s: 0.8 }); ctx.model('marble_bust_01', -3.2, -3, { s: 2.2, ry: 0.6, stone: true });
  } },
  prometheus: { place: 'gully', build(ctx) { // the titan's crag with its chains, a market stall under an awning, the eagle's dead tree
    ctx.model('rock_face_02', 1.5, -6, { s: 2.4, ry: 0.2, keep: true }); ctx.model('dead_tree_trunk_02', 5.6, -4.2, { s: 1.3, keep: true });
    ctx.add(stall(4), 3, -1.6, { ry: -0.3, foot: 1.6, keep: true }); for (let i = 0; i < 4; i++) ctx.model('antique_ceramic_vase_01', 2 + i * 0.6, -0.4, { s: 1.4 });
  } },
  toll: { place: 'gully', plan(ctx) { ctx.noThemeWater = true; ctx.water({ name: 'brook', cx: -0.6, cz: -5, rx: 1.5, rz: 12, seed: 12, deep: '#2a6a78', mid: '#3e94a0', shallow: '#86ccc0' }); }, build(ctx) { // the spoon bridge spans a brook running towards the camera
    const b = ctx.W.brook; ctx.reeds(b, 18, true, 0.8); ctx.pads(b, 6, true);
    for (let i = 0; i < 6; i++) ctx.model('namaqualand_boulder_05', -0.6 + (i % 2 ? 1.8 : -1.8), -6 + i * 1.8, { s: 0.4 + (i % 3) * 0.15 });
  } },
  archimedes: { place: 'meadow', build(ctx) { // the bathtub in the woods: drying towels, a bucket, scrolls on a stump
    woods(ctx, 12, ring(-0.6, 0, 7, 12, -1.6, 1.6), { mix: MIX.forest, gap: 2.6 }); ctx.add(laundry(ctx.p(-6.2, -2.6), ctx.p(-2.6, -3.4), 13), 0, 0, { abs: true, keep: true });
    ctx.model('tree_stump_01', 2.6, -1.2, { s: 1.1 }); ctx.model('book_encyclopedia_set_01#4', 2.6, -1.2, { s: 2, y: 0.55 }); ctx.model('wicker_basket_01', -3, -1.2, { s: 1.8 });
  } },
  schrodinger: { place: 'garden', build(ctx) { // a crossroads with a shrine and a signpost
    ctx.add(shrine(11), 3.6, -2.2, { ry: -0.4, foot: 0.6, keep: true }); ctx.model('wooden_crate_01', -3, -2, { s: 1.8, ry: 0.5 }); ctx.model('wooden_crate_01', -2.6, -2.8, { s: 1.6, ry: 1.3 });
  } },
  discord: { place: 'garden', build(ctx) { // the Hesperides' garden: golden-fruited trees, marble pedestals
    for (const [x, z] of [[-4.8, -4], [3.8, -4.4], [0, -8], [7.2, -7.5]]) ctx.tree('golden', x, z, { s: 0.95, keep: true });
    for (let i = 0; i < 3; i++) ctx.model('greek_column#0', -2.4 + i * 2.4, -2.8, { s: 0.32, stone: true });
  } },
};
// Prometheus' stall: counter, corner posts, a striped awning
function stall(seed = 1) {
  const G = new THREE.Group(); G.name = 'stall'; const box = (key, w, h, d, x, y, z, rx = 0) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.03, w / 3, h / 3, d / 3)), mat(key)); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = m.receiveShadow = true; G.add(m); return m; };
  box('woodRaw', 2.4, 0.9, 0.8, 0, 0.45, 0); box('woodDark', 2.6, 0.08, 1.0, 0, 0.94, 0); for (const sx of [-1.2, 1.2]) for (const sz of [-0.45, 0.45]) box('woodDark', 0.1, 2.3, 0.1, sx, 1.15, sz);
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5, 8, 4), mat('canvas', { side: THREE.DoubleSide })); const p = aw.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 2.8) * Math.PI * 4) * 0.04); aw.geometry.computeVertexNormals(); aw.rotation.x = -Math.PI / 2 + 0.35; aw.position.set(0, 2.35, 0.15); aw.castShadow = true; G.add(aw); void seed;
  return G;
}
