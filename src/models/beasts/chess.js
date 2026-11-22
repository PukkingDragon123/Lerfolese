// THE GRANDMASTER'S PIECES (story agent): the act bosses as living chess pieces of polished OBSIDIAN with gold-leaf
// veins and ivory accents, every one standing on its own lathe-turned piece base (felted, gold-ringed), fused with Greek
// myth. Humanoids on the SAME Limbo human base as Newton (humanoid.js limboBeast); the Knight's horse on the beasts kit
// (the centaur's quadruped template). Each piece's silhouette carries its chess shape:
//   black_pawn     a hoplite whose Corinthian helm ends in the pawn's ball-and-collar; hoplon with a gold pawn, dory
//                  (promoted: a gold queen's coronet rises from the helm and he grows)
//   black_knight   Hippolochos: an obsidian centaur with an ivory mane, gold barding, the rider in a HORSE-HEAD helm (the
//                  knight piece itself), a long lance and a round shield
//   oracle_bishop  the Hierophant: an old priest under the bishop's tall split MITRE, ivory beard, a staff crowned with
//                  Apollo's sun disc (glows when he casts), robes with gold orphreys
//   rook_titan     Pyrgos: a basalt titan of coursed masonry, a CRENELLATED crown, turret pauldrons, a gate in his chest
//                  with a portcullis and the fortress fire glowing behind it
//   black_queen    Ophira: a gorgon queen, serpents for hair under the queen's pointed CORONET, an orb-sceptre, emerald eyes
//   pessokrator    the Grandmaster: a towering king split down the middle, IVORY on one side and EBONY on the other with a
//                  gold seam, the king's cross-crown, a robe hemmed in a checkerboard, a white pawn held in his hand
import { THREE, K, hex, limboBeast, mount, recolor, near, lum } from './humanoid.js';
import { prop, quadRows, sculptQuad, asset, createGeneric, add, fallSide } from './kit.js';

const OBS = hex('#1c1822'), OBS2 = hex('#2e2838'), OBS3 = hex('#3e3648'), GOLD = hex('#c8963a'), GOLD2 = hex('#e8c060'), IVORY = hex('#e6dcc6'), IVORY2 = hex('#c8bca4');
const TEE = [150, 150, 150], SKIRT = [110, 70, 40];
const lumOf = (o) => Math.max(1, lum(o));
const T3 = [0, 0, 0];
/** recolour a flesh texel to `col`, keeping only a soft share of the engine's (bright) skin shading */
// (the engine's page is sampled as linear data, so a painted colour shows lifted: pre-darken by the display gamma to show it true)
const lin = (v) => 255 * Math.pow(Math.max(0, Math.min(255, v)) / 255, 2.0);
function rc(o, col, ref, add = 0) { const r = lum(o) / Math.max(1, lum(ref)); const L = Math.max(0.22, Math.min(0.68, 0.47 + (r - 1) * 0.2 + add)); const c = K.tone(col, K.band(L), T3); o[0] = lin(c[0]); o[1] = lin(c[1]); o[2] = lin(c[2]); }
// polished obsidian marble: deep violet-black, cloudy, thin marble veins filled with gold leaf
function obsidian(c, o, ref, H, { vein = GOLD, base = OBS, cloud = OBS2, add: a = 0 } = {}) {
  const n = K.vnoise(c.x * 16 / H + 3, c.y * 16 / H, c.z * 16 / H); const w = Math.abs(Math.sin((c.x * 7 + c.y * 11 + c.z * 5) / H + n * 7));
  if (w < 0.04) return rc(o, vein, ref, 0.12 + a);
  rc(o, n > 0.6 ? cloud : base, ref, (n - 0.5) * 0.12 + a + (c.ny > 0.55 ? 0.1 : 0)); // a polished top-light sheen
}
function ivoryTex(c, o, ref, H, a = 0) { const n = K.vnoise(c.x * 20 / H, c.y * 20 / H + 5, c.z * 20 / H); const w = Math.abs(Math.sin((c.x * 6 - c.y * 9 + c.z * 4) / H + n * 6)); rc(o, w < 0.03 ? IVORY2 : IVORY, ref, (n - 0.5) * 0.1 + a); }
const wrapAll = (paint, fn) => { const w = (f, key) => (f ? (c, o) => { f(c, o); fn(c, o, key); } : f); return { ...paint, acc: w(paint.acc || paint.body, 'acc'), body: w(paint.body, 'body'), skin: w(paint.skin, 'skin'), hand: w(paint.hand, 'hand'), head: w(paint.head, 'head'), shoe: w(paint.shoe || paint.body, 'shoe') }; }; // fn(c, o, painterKey)
/** a Greek key (meander) band test in (s, t) cell space: true on the key's strokes */
function meander(s, t) { const x = ((s % 1) + 1) % 1, y = ((t % 1) + 1) % 1; const X = Math.floor(x * 5), Y = Math.floor(y * 5); return Y === 0 || Y === 4 && X < 4 || X === 0 && Y > 0 || X === 4 && Y < 4 && Y > 0 || Y === 2 && X > 0 && X < 3; }

// ---------------------------------------------------------------- the piece base (every piece stands on one)
const BASE_PAL_KEY = (k) => 'chess-base-' + k;
function baseMat(kind = 'ebony') {
  return K.uvMat(BASE_PAL_KEY(kind), 128, 64, (u, v, o) => { // u around, v along the profile (felt -> foot -> rings -> top)
    const ring = (v > 0.36 && v < 0.46) || (v > 0.74 && v < 0.8); const felt = v < 0.08; const top = v > 0.92;
    if (felt) { K.tone(hex('#2a4a30'), K.band(0.4 + Math.sin(u * 200) * 0.04), o.col); o.ro = 1; return; } // green baize underneath
    if (ring) { K.tone(GOLD, K.band(0.58 + Math.cos(u * 6.28) * 0.18), o.col); o.me = 0.85; o.ro = 0.28; return; }
    const n = K.vnoise(u * 18, v * 6, 2.3); const w = Math.abs(Math.sin(u * 31 + v * 9 + n * 6)) < 0.05;
    const C = kind === 'ivory' ? (w ? IVORY2 : IVORY) : w ? GOLD : n > 0.6 ? OBS2 : OBS;
    K.tone(C, K.band(0.52 + Math.cos(u * 6.28) * 0.16 + (top ? 0.12 : 0) + (n - 0.5) * 0.1), o.col); o.ro = w ? 0.3 : 0.22; o.me = w ? 0.6 : 0.05;
  });
}
const BASEG = new Map();
/** a lathe-turned chess-piece base of radius R (felt, foot, cove, gold rings, a bevelled top), 12 facets */
export function pieceBase(R = 0.55, kind = 'ebony', h = 0.22) {
  const key = R + '|' + h; let g = BASEG.get(key);
  if (!g) { const P = [[0.001, 0], [R * 1.0, 0], [R * 1.03, h * 0.12], [R * 1.0, h * 0.26], [R * 0.93, h * 0.36], [R * 0.95, h * 0.46], [R * 0.86, h * 0.58], [R * 0.8, h * 0.74], [R * 0.84, h * 0.8], [R * 0.8, h * 0.92], [R * 0.74, h], [0.001, h]];
    g = new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 12); BASEG.set(key, g); }
  const m = K.mesh(g, baseMat(kind)); m.name = 'pieceBase'; m.userData.pieceBase = true; return m;
}
const BASE_H = 0.22;
const onBase = (t, st) => (st.dead > 0 ? BASE_H * Math.max(0, 1 - st.deadT * 1.6) : BASE_H); // stands on the base; topples off it

// ---------------------------------------------------------------- shared palettes
const PAL = {
  ebony: { s: 'metal', c: hex('#26222c'), me: 0.35, ro: 0.25, patina: false }, gold: { s: 'metal', c: hex('#c8963a'), me: 0.85, ro: 0.3, patina: false },
  ivory: { s: 'bone', c: hex('#e6dcc6'), age: 0.1 }, glow: { s: 'dark', c: hex('#ffd890'), e: [255, 200, 110] }, wood: { s: 'wood', c: hex('#3a2a22'), grain: 90 },
  iron: { s: 'metal', c: hex('#8a8e98'), me: 0.6, patina: false }, emerald: { s: 'dark', c: hex('#3aff9a'), e: [40, 255, 140] }, fire: { s: 'dark', c: hex('#ff8a3a'), e: [255, 120, 40] },
  stone: { s: 'rock', c: hex('#46424c'), age: 0.5 }, default: { s: 'metal', c: hex('#26222c'), me: 0.35, ro: 0.25, patina: false },
};
const P_OPT = (n = 2400, atlas = 256, cell = 0.008) => ({ cell, target: n, atlas });

/** the black pieces' paint: obsidian flesh, an ebony lacquered cuirass with a gold meander, black pteruges, gold greaves */
const pieceHook = ({ robe = false, skin = 'obsidian', greaves = true, trim = GOLD, cuirass = false } = {}) => (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  return wrapAll(paint, (c, o, key) => {
    if (near(o, SKIRT, 0.16) && lumOf(o) > 20) {
      if (robe) { const hem = c.y < P.kneeY - 0.16 * H; const key = hem && meander(Math.atan2(c.x, c.z) * 4, (c.y / H) * 22); return rc(o, key ? trim : hem ? OBS : OBS2, SKIRT, Math.cos(Math.atan2(c.x, c.z) * 13 + c.y * 9) * 0.08); }
      const a = Math.atan2(c.x, c.z); const f = ((a / Math.PI) * 10 % 1 + 1) % 1; const tip = c.y < P.kneeY + 0.07 * H; return rc(o, f < 0.1 || f > 0.9 ? [16, 12, 18] : tip ? trim : OBS2, SKIRT, 0);
    }
    if (near(o, TEE, 0.1) && lumOf(o) > 40) {
      const band = Math.abs(c.y - P.waistY) < 0.016 * H || Math.abs(c.y - P.neckBase + 0.01 * H) < 0.01 * H; const orph = robe && Math.abs(c.x) < 0.011 * H && c.nz > 0.3;
      const ab = !robe && c.nz > 0.3 && Math.abs(c.x) < 0.07 * H && c.y < P.bustY && Math.abs((((c.y / H) * 28) % 1) - 0.5) < 0.08;
      return rc(o, band || orph ? trim : robe ? OBS2 : OBS, TEE, (ab ? -0.2 : 0) + (robe ? Math.cos(Math.atan2(c.x, c.z) * 11 + c.y * 7) * 0.07 : 0.08));
    }
    const bright = o[0] + o[1] + o[2] > 660 || Math.max(o[0], o[1], o[2]) - Math.min(o[0], o[1], o[2]) > 90; // eye whites, irises, lips stay as painted
    if (!(key === 'skin' || key === 'hand' || key === 'body' ? true : key === 'head' ? near(o, sk, 0.35) && !bright : near(o, sk, 0.3))) return; // the flesh, found by its painter (the engine shades skin warm, past a tight colour match)
    if (greaves && c.part === 'calf' && c.nz > -0.2) return rc(o, GOLD, sk, 0.05);
    if (cuirass && c.y > P.pelvisY - 0.01 * H && c.y < P.neckBase - 0.012 * H && c.part !== 'uarm' && c.part !== 'farm' && c.part !== 'hand' && Math.abs(c.x) < 0.14 * H) { // an ebony muscle cuirass with a gold meander at the waist and a gold gorget
      const band = Math.abs(c.y - P.waistY) < 0.02 * H && meander(Math.atan2(c.x, c.z) * 3, (c.y - P.waistY) / (0.04 * H) + 0.5); const gorget = c.y > P.neckBase - 0.03 * H; const ab = c.nz > 0.3 && Math.abs(c.x) < 0.07 * H && c.y < P.bustY && Math.abs((((c.y / H) * 28) % 1) - 0.5) < 0.08;
      return rc(o, band || gorget ? GOLD : OBS, sk, (ab ? -0.2 : 0.1) + (c.ny > 0.4 ? 0.12 : 0) + (Math.abs(c.y - P.waistY) < 0.022 * H && !band ? -0.15 : 0));
    }
    if (skin === 'split') return c.x >= 0 ? (Math.abs(c.x) < 0.006 * H ? rc(o, GOLD2, sk, 0.2) : ivoryTex(c, o, sk, H)) : (Math.abs(c.x) < 0.006 * H ? rc(o, GOLD2, sk, 0.2) : obsidian(c, o, sk, H));
    if (skin === 'basalt') { // coursed ashlar: blocks offset per course, dark mortar, the odd gold-inlaid block
      const cy = c.y / (0.042 * H); const row = Math.floor(cy); const cx = (Math.atan2(c.x, c.z) / Math.PI) * 6 + (row % 2) * 0.5; const fy = cy - row, fx = cx - Math.floor(cx);
      const mortar = fy < 0.09 || fx < 0.05; const id = K.vnoise(Math.floor(cx) * 3.1, row * 1.7, 0.5); return rc(o, mortar ? [16, 14, 20] : id > 0.8 ? GOLD : id > 0.55 ? hex('#6a6272') : id > 0.3 ? hex('#57505e') : hex('#463f4c'), sk, mortar ? -0.3 : (id - 0.5) * 0.25 + (fy > 0.82 ? 0.14 : 0) - (fx > 0.9 ? 0.1 : 0));
    }
    obsidian(c, o, sk, H);
  });
};
const polish = (ctx, ro = 0.42) => { const m = ctx.L.mesh.material; m.roughness = Math.max(0.55, ro + 0.15); m.metalness = 0; m.envMapIntensity = 0.22; }; // a low sheen: the obsidian stays black under a bright sky


/** a long robe from the hips to the ankles (a lofted, folded mantle over the engine's short skirt) */
const robeMat = (key, col, trim, checker = false) => K.uvMat('chess-robe-' + key, 128, 128, (u, v, o) => {
  if (key.startsWith('rook')) { const row = Math.floor(v * 9); const fx = (u * 14 + (row % 2) * 0.5) % 1, fy = (v * 9) % 1; const mortar = fy < 0.1 || fx < 0.06; const id = K.vnoise(Math.floor(u * 14 + (row % 2) * 0.5) * 3.1, row * 1.7, 0.5);
    if (v > 0.9) { K.tone(trim, K.band(0.6), o.col); o.me = 0.8; return; } K.tone(mortar ? hex('#141218') : id > 0.62 ? hex('#6a6272') : id > 0.35 ? hex('#57505e') : hex('#463f4c'), K.band(0.5 + (fy > 0.82 ? 0.12 : 0) + (id - 0.5) * 0.15), o.col); o.ro = 0.85; return; } // coursed ashlar
  const fold = Math.cos(u * Math.PI * 2 * 14) * 0.12 + Math.cos(u * Math.PI * 2 * 5 + 1) * 0.06; const hem = v > 0.86, band = v > 0.82 && v <= 0.86;
  if (hem) { const on = checker ? (Math.floor(u * 24) + Math.floor((v - 0.86) * 40)) % 2 === 0 : meander(u * 24, (v - 0.86) * 7); K.tone(on ? (checker ? IVORY : trim) : OBS, K.band(0.5 + fold), o.col); if (on && !checker) o.me = 0.8; return; }
  if (band) { K.tone(trim, K.band(0.62 + fold), o.col); o.me = 0.8; o.ro = 0.3; return; }
  const n = K.vnoise(u * 30, v * 8, 4.4); K.tone(col, K.band(0.48 + fold + (n - 0.5) * 0.08 - v * 0.08), o.col); o.ro = 0.8;
});
function robe(ctx, mat, flare = 2) {
  const { L, P, sc } = ctx; const hy = L.restOf('hips').y * sc; const len = hy - 0.08; const r0 = (P.hipsX || 0.1) * sc * 1.18, rz0 = (P.hipsZ || 0.08) * sc * 1.3;
  const l = new K.Loft(10, 20).set((u, out) => out.set(0, 0.02 - u * len, -u * u * 0.06), (u) => { const f = 1 + (flare - 1) * Math.pow(u, 1.4); return [r0 * f, rz0 * f * 0.9]; });
  mat.side = THREE.DoubleSide; const m = K.mesh(l.geo, mat); mount(ctx, 'hips', m, { at: [0, 0.02 * sc, 0] }); return m;
}

// ================================================================== THE PAWN (the Black Phalanx)
function pawnHelm(S) { // Corinthian shell, T opening, cheek guards; the crest is the pawn's collar and ball
  S.blob([0, 1.685, 0.025], [0.105, 0.12, 0.125], 'p', { k: 0.02, tag: 'ebony' }); S.blob([0, 1.6, 0.04], [0.098, 0.1, 0.112], 'p', { k: 0.02, tag: 'ebony' });
  S.blob([0, 1.66, 0.03], [0.086, 0.108, 0.108], 'p', { k: 0.01, tag: 'ebony', sub: true });
  S.box([0, 1.655, 0.14], [0.065, 0.016, 0.06], 0.01, 'p', { k: 0.008, tag: 'ebony', sub: true }); S.box([0, 1.6, 0.14], [0.016, 0.05, 0.06], 0.008, 'p', { k: 0.008, tag: 'ebony', sub: true });
  S.box([0, 1.53, 0.04], [0.12, 0.03, 0.14], 0.01, 'p', { k: 0.01, tag: 'ebony', sub: true });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.blob([Math.sin(a) * 0.1, 1.715, 0.025 + Math.cos(a) * 0.118], [0.012, 0.008, 0.012], 'p', { k: 0.006, tag: 'gold' }); } // gold brow band
  S.limb([0, 1.79, 0.0], [0, 1.86, 0.0], 0.04, 0.028, 'p', { k: 0.02, tag: 'ebony' }); S.blob([0, 1.865, 0], [0.075, 0.016, 0.075], 'p', { k: 0.01, tag: 'gold' }); // the pawn's neck and collar
  S.blob([0, 1.95, 0], [0.072, 0.072, 0.072], 'p', { k: 0.01, tag: 'ebony' }); S.blob([-0.025, 1.975, 0.04], [0.02, 0.02, 0.012], 'p', { k: 0.008, tag: 'ivory' }); // the ball, an ivory glint inlay
}
function pawnCrown(S) { // a gold queen's coronet that rises from the helm when the pawn promotes
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.box([Math.sin(a) * 0.1, 0.02, Math.cos(a) * 0.1], [0.024, 0.022, 0.01], 0.004, 'p', { k: 0.004, tag: 'gold', rot: [0, a, 0] }); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const x = Math.sin(a) * 0.1, z = Math.cos(a) * 0.1; S.limb([x, 0.03, z], [x * 1.25, 0.14, z * 1.25], 0.018, 0.006, 'p', { k: 0.006, tag: 'gold' }); S.blob([x * 1.28, 0.155, z * 1.28], [0.014, 0.014, 0.014], 'p', { k: 0.004, tag: 'ivory' }); }
}
function dory(S) { S.limb([0, -0.8, 0], [0, 1.45, 0], 0.016, 0.016, 'p', { k: 0.004, tag: 'ebony' }); S.blob([0, 1.6, 0], [0.034, 0.16, 0.007], 'p', { k: 0.006, tag: 'gold' }); S.limb([0, 1.42, 0], [0, 1.5, 0], 0.02, 0.014, 'p', { k: 0.006, tag: 'gold' }); S.limb([0, -0.8, 0], [0, -1.0, 0], 0.02, 0.006, 'p', { k: 0.006, tag: 'gold' }); }
function hoplonGeo() { const g = new THREE.LatheGeometry([[0, 0.085], [0.18, 0.075], [0.32, 0.05], [0.42, 0.015], [0.455, 0.0], [0.48, 0.0], [0.485, -0.012], [0.47, -0.02], [0.42, -0.005], [0.3, 0.035], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 14); g.rotateX(Math.PI / 2); return g; }
/** a pawn silhouette (head ball, collar, flared body, base) in shield-face coords x, y in -1..1 */
const pawnShape = (x, y) => Math.hypot(x, y - 0.42) < 0.2 || (Math.abs(y - 0.2) < 0.04 && Math.abs(x) < 0.2) || (y < 0.2 && y > -0.42 && Math.abs(x) < 0.1 + (0.2 - y) * 0.42) || (y < -0.42 && y > -0.56 && Math.abs(x) < 0.4);
const hoplonMat = () => K.uvMat('chess-hoplon', 256, 128, (u, v, o) => {
  const r = Math.min(1, v / 0.42); const a = u * Math.PI * 2; o.me = 0.4; o.ro = 0.3;
  if (v > 0.55) { K.tone(hex('#2a1e18'), 0.4, o.col); o.me = 0; return; }
  if (r > 0.86) { K.tone(GOLD, K.band(0.6 + Math.cos(a) * 0.2, 4), o.col); o.me = 0.85; return; }
  const x = Math.sin(a) * r * 1.25, y = Math.cos(a) * r * 1.25; const key = r > 0.72 && r < 0.82 && meander(a * 6, r * 10);
  if (pawnShape(x, y) || key) { K.tone(GOLD2, K.band(0.6 + Math.cos(a) * 0.15, 4), o.col); o.me = 0.85; return; }
  const n = K.vnoise(x * 6, y * 6, 1.3); K.tone(n > 0.6 ? OBS2 : OBS, K.band(0.5 + Math.cos(a) * 0.12 - r * 0.1, 4), o.col); o.me = 0.1; o.ro = 0.22;
});
const PAWN_CLIPS = { attack: [[0, {}], [0.25, { chest: [-0.05, 0.35, 0], uarmR: [-0.9, 0, -0.5], farmR: [-1.6, 0, 0], thighL: [-0.3, 0, 0] }], [0.45, { chest: [0.15, -0.25, 0], uarmR: [-1.5, 0, -0.15], farmR: [-0.1, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.4, 0, 0], _pos: [0, 0, 0.22] }], [0.85, {}]] }; // brace, then the long spear thrust
export const warmPawn = () => { prop('chess-pawn-helm', pawnHelm, PAL, P_OPT(3200)); prop('chess-dory', dory, PAL, P_OPT(1200, 256)); prop('chess-pawn-crown', pawnCrown, PAL, P_OPT(1200, 128, 0.006)); };
export const createChessPawn = (seed = 1) => limboBeast({
    id: 'black_pawn', height: 1.9, blood: [0.55, 0.38, 0.08], speed: 1.0, sway: 0.45, impact: 0.45, attack: 'attack', clips: PAWN_CLIPS, expr: 'cool', angry: 'angry',
    app: { skin: 0x9a90a4, hair: 0x111111, hairStyle: 'bald', build: 'broad', age: 0.3, eyeColor: 0xffc860, height: 1 },
    outfit: { legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { eyeH: 1.2 }, hook: pieceHook({ cuirass: true }), hover: onBase,
    build(ctx) {
      const { sc } = ctx; polish(ctx);
      const hm = prop('chess-pawn-helm', pawnHelm, PAL, P_OPT(3200)); const hg = new THREE.Group(); const hmesh = K.mesh(hm.geo, hm.mat); hmesh.position.set(0, -1.593, -0.0216); hg.add(hmesh); hg.scale.setScalar(1.05); mount(ctx, 'head', hg, { at: [0, 0, 0.01 * sc] });
      const cr = prop('chess-pawn-crown', pawnCrown, PAL, P_OPT(1200, 128, 0.006)); const cm = K.mesh(cr.geo, cr.mat); cm.position.set(0, 0.3, -0.02); cm.visible = false; hg.add(cm); ctx.vars.crown = cm;
      ctx.api.promote = () => { cm.visible = true; ctx.vars.grow = 0; ctx.api.promoted = true; }; // the gold coronet rises; he grows a head taller
      const sp = prop('chess-dory', dory, PAL, P_OPT(1200, 256)); const sm = K.mesh(sp.geo, sp.mat); sm.rotation.x = Math.PI / 2; mount(ctx, 'handR', sm, { at: [0, -0.08 * sc, 0.01 * sc] });
      const sh = K.mesh(hoplonGeo(), hoplonMat()); sh.rotation.y = Math.PI / 2; mount(ctx, 'farmL', sh, { at: [0.07 * sc, -0.12 * sc, 0.02 * sc] });
      ctx.root.add(pieceBase(0.5));
    },
    pose(addp, t, st, ctx) { const tw = Math.max(0, Math.sin(t * 1.3) - 0.94) * 6; addp('head', 0.04 + tw * 0.1, -0.1, tw * 0.15); addp('thighL', -0.2, 0, -0.06); addp('shinL', 0.25); addp('thighR', 0.1, 0, 0.06); if (ctx.anim.mode === 'idle') { addp('uarmL', -0.5, 0, 0.1); addp('farmL', -1.0); addp('farmR', -1.1); addp('handR', 0.15); } },
    update(dt, ctx, t) { const c = ctx.vars.crown; if (c?.visible) { c.rotation.y += dt * 0.6; c.position.y = 0.3 + Math.sin(t * 2) * 0.01; } if (ctx.vars.grow != null && ctx.vars.grow < 1) { ctx.vars.grow = Math.min(1, ctx.vars.grow + dt * 1.5); ctx.model.scale.setScalar(1 + 0.18 * (1 - (1 - ctx.vars.grow) ** 3)); } },
  }, seed);

// ================================================================== THE KNIGHT (Hippolochos)
const KO = { Lb: 1.05, Hw: 1.35, W: 0.19, Ln: 0.2, Lh: 0.3, tail: 3, tailDir: [0, -0.7, -1], tailLen: 0.42 };
const REN = { spine1: 'back1', spine2: 'back2', spine3: 'withers' };
const KQR = quadRows(KO); const K_TAIL = KQR.tailEnd;
const KBONES = KQR.filter((r) => !['neck1', 'neck2', 'head', 'jaw', 'ear_L', 'ear_R'].includes(r[0])).map(([n, p, v]) => [REN[n] || n, REN[p] || p, v]);
const KJ = Object.fromEntries(KBONES.map(([n, , p]) => [n, p]));
const veinFn = (c, o) => { const n = K.vnoise(c.x * 9, c.y * 9, c.z * 9); if (Math.abs(Math.sin(c.x * 13 + c.y * 19 + c.z * 7 + n * 6)) < 0.035) K.tone(GOLD, 0.62, o.col); else if (c.y < 0.36) K.tone(GOLD, K.band(0.48 + c.ny * 0.1), o.col); }; // gold-leaf veins; gilded stockings
const KPAL = {
  coat: { s: 'skin', c: hex('#221e28'), belly: hex('#2c2834'), fn: veinFn, age: 0.05, ro: 0.35 }, hoof: { s: 'metal', c: hex('#c8963a'), me: 0.85, ro: 0.3, patina: false }, hair: { s: 'hair', c: hex('#e6dcc6'), fs: 60 },
  sash: { s: 'metal', c: hex('#c8963a'), me: 0.8, ro: 0.3, patina: false }, default: { s: 'skin', c: hex('#221e28') },
};
function knightBody(S) {
  sculptQuad(S, KJ, KO, { bulk: 1.0, depth: 0.88, tuck: 0.04, legR: 0.9, hoof: true, names: REN, tags: { body: 'coat', leg: 'coat', paw: 'hoof' } });
  S.blob([0, 1.47, 0.48], [0.26, 0.09, 0.25], 'withers', { k: 0.04, tag: 'sash' }); S.blob([0, 1.42, 0.5], [0.22, 0.16, 0.2], 'withers', { k: 0.06, tag: 'coat' });
  for (const z of [-0.35, 0.1]) S.blob([0, 1.36, z], [0.27, 0.05, 0.16], 'back2', { k: 0.03, tag: 'sash' }); // gold barding bands
  const tp = ['tail1', 'tail2', 'tail3'].map((n) => KJ[n]); S.chain([...tp, K_TAIL], [0.06, 0.055, 0.045, 0.03], ['tail1', 'tail2', 'tail3'], { k: 0.03, tag: 'hair' });
  for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 0.028; S.limb([x, tp[2][1], tp[2][2]], [x * 1.7, 0.5, tp[2][2] - 0.28 - Math.abs(x)], 0.05, 0.014, 'tail3', { k: 0.03, tag: 'hair' }); }
}
const KA = () => asset('chess-knight-horse', { bones: KBONES, sculpt: knightBody, pal: KPAL, cell: 0.018, target: 9000, atlas: 640, maxChart: 0.03, woundSkip: ['hoof', 'hair', 'sash'] });
function horseHelm(S) { // the knight piece as a helm: a carved horse head above the brow (muzzle forward), ears, an ivory mane down the back
  S.blob([0, 1.66, 0.025], [0.11, 0.125, 0.13], 'p', { k: 0.02, tag: 'ebony' }); S.blob([0, 1.66, 0.03], [0.09, 0.11, 0.11], 'p', { k: 0.01, tag: 'ebony', sub: true });
  S.box([0, 1.6, 0.14], [0.05, 0.035, 0.06], 0.01, 'p', { k: 0.008, tag: 'ebony', sub: true }); S.box([0, 1.52, 0.04], [0.13, 0.04, 0.15], 0.01, 'p', { k: 0.01, tag: 'ebony', sub: true });
  S.chain([[0, 1.78, -0.03], [0, 1.84, 0.05], [0, 1.82, 0.16], [0, 1.76, 0.26]], [0.085, 0.075, 0.06, 0.045], 'p', { k: 0.03, tag: 'ebony' }); // skull to muzzle
  S.blob([0, 1.745, 0.27], [0.05, 0.04, 0.045], 'p', { k: 0.02, tag: 'ebony' }); for (const s of [-1, 1]) { S.blob([0.022 * s, 1.75, 0.31], [0.012, 0.01, 0.008], 'p', { k: 0.004, tag: 'gold' }); S.blob([0.06 * s, 1.835, 0.09], [0.016, 0.014, 0.014], 'p', { k: 0.004, tag: 'glow' }); S.limb([0.045 * s, 1.88, 0.0], [0.06 * s, 1.97, -0.03], 0.022, 0.004, 'p', { k: 0.01, tag: 'ebony' }); }
  for (let i = 0; i < 8; i++) { const k = i / 7; S.limb([0, 1.9 - k * 0.3, -0.03 - k * 0.12], [0, 1.95 - k * 0.32, -0.12 - k * 0.12], 0.024, 0.008, 'p', { k: 0.012, tag: 'ivory' }); } // ivory mane
  S.box([0, 1.6, 0.13], [0.014, 0.05, 0.012], 0.004, 'p', { k: 0.004, tag: 'gold' }); // gold nasal
}
function lance(S) { S.limb([0, -0.7, 0], [0, 1.9, 0], 0.02, 0.012, 'p', { k: 0.004, tag: 'ebony' }); S.limb([0, 1.9, 0], [0, 2.25, 0], 0.024, 0.002, 'p', { k: 0.004, tag: 'gold' }); S.limb([0, 0.1, 0], [0, 0.32, 0], 0.024, 0.085, 'p', { k: 0.01, tag: 'gold' }); for (let i = 0; i < 4; i++) S.limb([0, 0.5 + i * 0.35, 0], [0, 0.52 + i * 0.35, 0], 0.024, 0.024, 'p', { k: 0.003, tag: 'ivory' }); }
const KHCLIPS = {
  cast: [[0, {}], [0.4, { back2: [-0.18, 0, 0], withers: [-0.14, 0, 0], farm_L: [-1.0, 0, 0], fore_L: [-1.3, 0, 0], farm_R: [-0.8, 0, 0], fore_R: [-1.1, 0, 0], thigh_L: [0.25, 0, 0], thigh_R: [0.25, 0, 0] }], [0.9, { back2: [-0.05, 0, 0] }], [1.3, {}]], // rears
  attack: [[0, {}], [0.25, { back2: [0.06, 0, 0], farm_L: [0.3, 0, 0], farm_R: [0.3, 0, 0] }], [0.45, { _pos: [0, 0.12, 0.35], back2: [-0.1, 0, 0], farm_L: [-0.9, 0, 0], fore_L: [-1.0, 0, 0], farm_R: [-0.7, 0, 0], thigh_L: [0.4, 0, 0], thigh_R: [0.4, 0, 0] }], [0.7, { _pos: [0, 0, 0.12] }], [1.0, {}]], // the leap
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.14], back2: [-0.05, 0.1, 0.04], farm_L: [-0.3, 0, 0], thigh_R: [0.3, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.2, { back2: [-0.15, 0, 0], farm_L: [-0.8, 0, 0], fore_L: [-1, 0, 0] }], [0.5, { farm_L: [0.6, 0, 0.1], farm_R: [0.6, 0, -0.1], fore_L: [-1.2, 0, 0], fore_R: [-1.2, 0, 0], thigh_L: [-0.6, 0, 0.2], thigh_R: [-0.6, 0, -0.2] }], [0.85, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3] }]],
};
const KRCLIPS = { attack: [[0, {}], [0.25, { chest: [0, 0.35, 0], uarmR: [-0.4, 0, -0.5], farmR: [-1.4, 0, 0] }], [0.48, { chest: [0.12, -0.3, 0], uarmR: [-1.4, 0, -0.1], farmR: [-0.2, 0, 0] }], [0.9, {}]] }; // the lance couched, then driven home
const RIDER = {
  id: 'chess-knight-rider', height: 1.8, attack: 'idle', clips: KRCLIPS, impact: 0.48, sway: 0.5, blood: [0.55, 0.38, 0.08], fall: false,
  app: { skin: 0x9a90a4, hair: 0x111111, hairStyle: 'bald', build: 'broad', age: 0.4, eyeColor: 0xffc860, height: 1 }, outfit: { torso: { tex: 'c_tee', color: 0x969696 } }, severed: ['thigh_l', 'thigh_r'], hook: pieceHook({ greaves: false }),
  build(ctx) {
    const { sc } = ctx; polish(ctx);
    const hm = prop('chess-horse-helm', horseHelm, PAL, P_OPT(3600)); const hg = new THREE.Group(); const hmesh = K.mesh(hm.geo, hm.mat); hmesh.position.set(0, -1.593, -0.0216); hg.add(hmesh); hg.scale.setScalar(1.08); mount(ctx, 'head', hg, { at: [0, 0, 0.01 * sc] });
    const ln = prop('chess-lance', lance, PAL, P_OPT(1400, 256)); const lm = K.mesh(ln.geo, ln.mat); lm.rotation.x = Math.PI / 2 - 0.15; mount(ctx, 'handR', lm, { at: [0, -0.08 * sc, 0.01 * sc] });
    const sh = K.mesh(hoplonGeo(), hoplonMat()); sh.scale.setScalar(0.72); sh.rotation.y = Math.PI / 2; mount(ctx, 'farmL', sh, { at: [0.07 * sc, -0.1 * sc, 0.02 * sc] });
  },
  pose(addp, t, st, ctx) { if (ctx.anim.mode === 'idle' && st.mode !== 'attack') { addp('uarmL', -0.5, 0, 0.1); addp('farmL', -1.0); addp('uarmR', -0.2, 0, -0.2); addp('farmR', -0.9); } },
};
export const warmKnight = () => { KA(); prop('chess-horse-helm', horseHelm, PAL, P_OPT(3600)); prop('chess-lance', lance, PAL, P_OPT(1400, 256)); };
export function createChessKnight(seed = 1) {
  const rider = limboBeast(RIDER, seed);
  const spec = {
    id: 'black_knight', bones: KBONES, height: 2.5, asset: KA, clips: KHCLIPS, impact: 0.48, blood: [0.55, 0.38, 0.08], follow: { tail1: [8, 0.3], tail2: [7, 0.28], tail3: [6, 0.26] },
    props(ctx) {
      const w = ctx.B.map.withers; rider.root.traverse((o) => { o.userData.keepMat = true; }); w.add(rider.root); rider.root.position.set(0, 1.42 - KJ.withers[1] - 0.94 * (1.8 / rider.L.P.crown), 0.02);
      const b = pieceBase(0.85); b.scale.set(1, 1, 1.45); ctx.root.add(b); ctx.vars.base = b; // the horse stands on an oval piece base
    },
    hover: (t, st) => onBase(t, st),
    idle(P, t, st) { const br = Math.sin(t * 1.5); add(P, 'back2', br * 0.01); for (let i = 1; i <= 3; i++) add(P, 'tail' + i, 0.15 + Math.sin(t * 1.6 - i * 0.5) * 0.04, Math.sin(t * 1.1 - i * 0.6) * 0.15 * i, 0); add(P, 'farm_R', Math.max(0, Math.sin(t * 0.4) - 0.85) * -3); add(P, 'fore_R', Math.max(0, Math.sin(t * 0.4) - 0.85) * -6); },
    gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g + ph) * 0.55 * a); add(P, 'fore_L', -Math.max(0, Math.cos(g)) * 0.9 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g)) * 0.9 * a); },
    after(dt, t, ctx) { rider.root.userData.hl = ctx.root.userData.hl; rider.update(dt); },
    onAct(m) { rider.act(m === 'die' ? 'hurt' : m); },
    death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.1, rot: 1.36, lift: 0.07, slide: 0.03, t0: 0.32, t1: 0.68 }),
  };
  const api = createGeneric(spec, seed); api.impactTime = 0.48;
  const sw = api.setWounds?.bind(api); if (sw) api.setWounds = (v) => { sw(v); rider.setWounds(v); };
  const tk = api.talk.bind(api); api.talk = (s = 1) => { tk(s); rider.talk(s); };
  api.rider = rider; return api;
}

// ================================================================== THE BISHOP (the Hierophant of Delphi)
function mitre(S) { // the bishop piece: a tall pointed mitre split by its diagonal cleft, a ball finial, a gold band
  S.limb([0, 1.71, 0.02], [0, 1.74, 0.02], 0.112, 0.112, 'p', { k: 0.01, tag: 'gold' });
  S.blob([0, 1.86, 0.02], [0.105, 0.17, 0.1], 'p', { k: 0.03, tag: 'ebony' }); S.limb([0, 1.96, 0.02], [0, 2.04, 0.02], 0.06, 0.012, 'p', { k: 0.04, tag: 'ebony' });
  S.box([0.03, 1.93, 0.02], [0.012, 0.11, 0.14], 0.004, 'p', { k: 0.006, tag: 'ebony', sub: true, rot: [0, 0, -0.65] }); // the cleft
  S.blob([0, 2.07, 0.02], [0.03, 0.03, 0.03], 'p', { k: 0.008, tag: 'gold' });
  for (let i = 0; i < 7; i++) { const y = 1.76 + i * 0.035; S.blob([0, y, 0.12 - Math.abs(i - 3) * 0.004], [0.01, 0.01, 0.006], 'p', { k: 0.003, tag: 'gold' }); } // gold orphrey studs
  S.limb([0, 1.66, 0.02], [0, 1.69, 0.02], 0.1, 0.11, 'p', { k: 0.01, tag: 'ebony', sub: true });
}
function sunStaff(S) { // a tall staff crowned with Apollo's sun disc (rays) above a laurel collar
  S.limb([0, -0.95, 0], [0, 1.0, 0], 0.017, 0.015, 'p', { k: 0.004, tag: 'ebony' }); S.limb([0, 0.95, 0], [0, 1.05, 0], 0.03, 0.022, 'p', { k: 0.008, tag: 'gold' });
  S.blob([0, 1.22, 0], [0.12, 0.12, 0.025], 'p', { k: 0.01, tag: 'gold' }); S.blob([0, 1.22, 0.018], [0.07, 0.07, 0.012], 'p', { k: 0.006, tag: 'glow' });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.limb([Math.sin(a) * 0.12, 1.22 + Math.cos(a) * 0.12, 0], [Math.sin(a) * (0.22 - (i % 2) * 0.05), 1.22 + Math.cos(a) * (0.22 - (i % 2) * 0.05), 0], 0.014, 0.003, 'p', { k: 0.004, tag: 'gold' }); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; S.blob([Math.sin(a) * 0.04, 0.98, Math.cos(a) * 0.04], [0.022, 0.008, 0.012], 'p', { k: 0.004, tag: 'gold', rot: [0, a, 0.5] }); }
  S.limb([0, -0.95, 0], [0, -1.05, 0], 0.02, 0.006, 'p', { k: 0.006, tag: 'gold' });
}
const BISHOP_CLIPS = {
  cast: [[0, {}], [0.3, { chest: [-0.15, 0, 0], head: [-0.15, 0, 0], uarmR: [-2.4, 0, -0.2], farmR: [-0.2, 0, 0] }], [0.9, { chest: [-0.18, 0, 0], uarmR: [-2.6, 0, -0.15], farmR: [-0.1, 0, 0] }], [1.3, {}]], // the staff raised to the sun
  attack: [[0, {}], [0.25, { chest: [-0.1, 0.25, 0], uarmR: [-1.8, 0, -0.4], farmR: [-0.6, 0, 0] }], [0.45, { chest: [0.15, -0.2, 0], uarmR: [-1.4, 0, -0.1], farmR: [0, 0, 0], _pos: [0, 0, 0.12] }], [0.9, {}]], // the staff levelled: the ray
};
export const warmBishop = () => { prop('chess-mitre', mitre, PAL, P_OPT(2600, 256, 0.007)); prop('chess-sunstaff', sunStaff, PAL, P_OPT(1800, 256)); };
export const createChessBishop = (seed = 1) => limboBeast({
  id: 'oracle_bishop', height: 2.05, blood: [0.55, 0.38, 0.08], speed: 0.8, sway: 0.6, impact: 0.45, attack: 'attack', clips: BISHOP_CLIPS, expr: 'cool', angry: 'angry',
  app: { skin: 0x9a90a4, hair: 0xe6dcc6, hairStyle: 'long', facialHair: 'beard', build: 'slim', age: 0.85, eyeColor: 0xffe8a0, height: 1 },
  outfit: { torso: { tex: 'c_tee', color: 0x969696, sleeve: 'long' }, legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { hairVolume: 1.2 }, hook: pieceHook({ robe: true, greaves: false }), hover: onBase,
  build(ctx) {
    const { sc } = ctx; polish(ctx, 0.5);
    const mt = prop('chess-mitre', mitre, PAL, P_OPT(2600, 256, 0.007)); const g = new THREE.Group(); const mm = K.mesh(mt.geo, mt.mat); mm.position.set(0, -1.593, -0.0216); g.add(mm); g.scale.setScalar(1.06); mount(ctx, 'head', g, { at: [0, 0.0, 0.0] });
    const st = prop('chess-sunstaff', sunStaff, PAL, P_OPT(1800, 256)); const sm = K.mesh(st.geo, st.mat); sm.rotation.x = Math.PI / 2; mount(ctx, 'handR', sm, { at: [0, -0.06 * sc, 0.02 * sc] }); ctx.vars.staffMat = sm.material;
    robe(ctx, robeMat('bishop', OBS2, GOLD), 2.0);
    ctx.root.add(pieceBase(0.55));
  },
  pose(addp, t, st, ctx) { addp('spine', 0.06); addp('head', -0.04, Math.sin(t * 0.4) * 0.12); if (ctx.anim.mode === 'idle') { addp('uarmR', -0.35, 0, -0.18); addp('farmR', -0.9); addp('uarmL', -0.25, 0, 0.12); addp('farmL', -1.2); addp('handL', 0.3); } },
  update(dt, ctx, t) { const m = ctx.vars.staffMat; if (m) { const k = ctx.st.mode === 'cast' || ctx.st.mode === 'attack' ? 2.4 : 0.9 + Math.sin(t * 2) * 0.15; m.emissiveIntensity += (k - m.emissiveIntensity) * Math.min(1, dt * 5); } },
}, seed);

// ================================================================== THE ROOK (Pyrgos, the Walking Bastion)
function gate(S) { // an arched gate in the chest: voussoirs, a portcullis, the fire inside
  S.box([0, 0, 0], [0.13, 0.16, 0.04], 0.01, 'p', { k: 0.01, tag: 'stone' }); S.box([0, -0.02, 0.02], [0.075, 0.12, 0.05], 0.01, 'p', { k: 0.01, tag: 'stone', sub: true });
  S.blob([0, 0.1, 0.02], [0.075, 0.06, 0.05], 'p', { k: 0.01, tag: 'stone', sub: true }); S.box([0, 0, -0.02], [0.08, 0.15, 0.012], 0.004, 'p', { k: 0.004, tag: 'fire' });
  for (let i = 0; i < 5; i++) S.limb([(i - 2) * 0.03, -0.13, 0.03], [(i - 2) * 0.03, 0.12, 0.03], 0.007, 0.007, 'p', { k: 0.002, tag: 'iron' });
  for (let j = 0; j < 3; j++) S.limb([-0.07, -0.08 + j * 0.08, 0.035], [0.07, -0.08 + j * 0.08, 0.035], 0.006, 0.006, 'p', { k: 0.002, tag: 'iron' });
  for (let i = 0; i < 7; i++) { const a = -1.2 + (i / 6) * 2.4; S.box([Math.sin(a) * 0.1, 0.1 + Math.cos(a) * 0.08, 0.03], [0.018, 0.026, 0.02], 0.004, 'p', { k: 0.004, tag: i === 3 ? 'gold' : 'stone', rot: [0, 0, -a] }); }
}
const ROOK_PAL = { ...PAL, stone: { s: 'rock', c: hex('#625a6a'), age: 0.6 } };
const ROOK_CLIPS = {
  attack: [[0, {}], [0.3, { chest: [-0.25, 0, 0], uarmL: [-2.6, 0, 0.3], uarmR: [-2.6, 0, -0.3], farmL: [-0.3, 0, 0], farmR: [-0.3, 0, 0], _pos: [0, 0.05, -0.1] }], [0.5, { chest: [0.4, 0, 0], spine: [0.2, 0, 0], uarmL: [-0.9, 0, 0.2], uarmR: [-0.9, 0, -0.2], _pos: [0, -0.05, 0.4] }], [1.0, {}]], // both fists hammered down
  cast: [[0, {}], [0.4, { chest: [-0.1, 0, 0], uarmL: [-0.3, 0, 1.1], uarmR: [-0.3, 0, -1.1], farmL: [-1.2, 0, 0], farmR: [-1.2, 0, 0] }], [1.1, {}]], // walls raised: arms wide
};
export const warmRook = () => { prop('chess-gate', gate, ROOK_PAL, P_OPT(2200, 256, 0.007)); chessPiece('rook', 'ebony'); };
export const createChessRook = (seed = 1) => limboBeast({
  id: 'rook_titan', height: 3.0, chest: [1.22, 1.06, 1.2], blood: [0.3, 0.26, 0.22], speed: 0.6, sway: 0.3, impact: 0.5, attack: 'attack', clips: ROOK_CLIPS, wounds: false,
  app: { skin: 0x4a4650, hair: 0x222222, hairStyle: 'bald', build: 'heavy', age: 0.9, eyeColor: 0xff8a3a, height: 1 }, outfit: { legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { eyeW: 0.02, eyeH: 0.02 }, hook: pieceHook({ skin: 'basalt', greaves: false }), hover: onBase,
  build(ctx) {
    const { sc } = ctx; const m = ctx.L.mesh.material; m.roughness = 0.85;
    const crown = chessPiece('rook', 'ebony'); crown.children[0].visible = false; crown.children[1].visible = false; crown.scale.setScalar(0.8); mount(ctx, 'head', crown, { at: [0, 0.22 * sc - 0.48, -0.01 * sc] }); // the rook's crenellated top as his crown
    for (const [b, x] of [['uarmL', 0.05], ['uarmR', -0.05]]) { const t = chessPiece('rook', 'ebony'); t.scale.setScalar(0.42); mount(ctx, b, t, { at: [x * sc, -0.1 * sc, 0] }); } // two turrets for pauldrons
    robe(ctx, robeMat('rook-tower', hex('#4a4452'), GOLD), 1.55); // the lower body widens into a tower's base
    const ga = prop('chess-gate', gate, ROOK_PAL, P_OPT(2200, 256, 0.007)); const gm = K.mesh(ga.geo, ga.mat); gm.scale.setScalar(1.3); mount(ctx, 'chest', gm, { at: [0, 0.0, 0.17 * sc] }); ctx.vars.gate = gm.material;
    const fire = new THREE.PointLight(0xff7a2a, 1.2, 2.4, 2); fire.position.set(0, 0, 0.1); gm.add(fire); ctx.vars.fire = fire;
    ctx.root.add(pieceBase(0.9));
  },
  pose(addp, t) { addp('spine', 0.08); addp('neck', 0.12); addp('head', -0.08); addp('uarmL', 0, 0, 0.3); addp('uarmR', 0, 0, -0.3); addp('farmL', -0.3); addp('farmR', -0.3); addp('chest', Math.sin(t * 0.7) * 0.02); },
  update(dt, ctx, t) { const f = ctx.vars.fire; if (f) f.intensity = ctx.st.dead > 0 ? Math.max(0, f.intensity - dt) : 1.1 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.12; },
}, seed);

// ================================================================== THE QUEEN (Ophira, the Gorgon of the Last Rank)
function coronet(S) { // the queen piece: a flared band of nine points, each tipped with an ivory ball, a gold orb at the centre
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.box([Math.sin(a) * 0.115, 0.025, Math.cos(a) * 0.115], [0.024, 0.026, 0.012], 0.004, 'p', { k: 0.004, tag: 'gold', rot: [0, a, 0] }); } // a flared gold band
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const x = Math.sin(a), z = Math.cos(a); S.limb([x * 0.12, 0.04, z * 0.12], [x * 0.16, 0.17, z * 0.16], 0.022, 0.006, 'p', { k: 0.008, tag: 'ebony' }); S.blob([x * 0.163, 0.185, z * 0.163], [0.016, 0.016, 0.016], 'p', { k: 0.004, tag: 'ivory' }); }
  S.blob([0, 0.12, 0], [0.04, 0.04, 0.04], 'p', { k: 0.01, tag: 'gold' }); S.blob([0, 0.12, 0.035], [0.012, 0.012, 0.008], 'p', { k: 0.004, tag: 'emerald' });
}
function sceptre(S) { S.limb([0, -0.6, 0], [0, 0.55, 0], 0.016, 0.014, 'p', { k: 0.004, tag: 'ebony' }); S.blob([0, 0.66, 0], [0.065, 0.065, 0.065], 'p', { k: 0.01, tag: 'emerald' }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; S.limb([Math.sin(a) * 0.02, 0.55, Math.cos(a) * 0.02], [Math.sin(a) * 0.07, 0.68, Math.cos(a) * 0.07], 0.008, 0.004, 'p', { k: 0.003, tag: 'gold' }); } S.limb([0, 0.72, 0], [0, 0.8, 0], 0.012, 0.004, 'p', { k: 0.004, tag: 'gold' }); }
const qSnakeMat = () => K.uvMat('chess-qsnake', 64, 128, (u, v, o) => { const belly = Math.abs(u - 0.5) < 0.18; const C = K.cells2(u * 14, v * 40); K.tone(belly ? GOLD : v > 0.85 ? hex('#1e4a34') : OBS2, K.band(0.55 + Math.cos(u * 6.28) * 0.15 + (C[1] - C[0] < 0.08 ? -0.2 : 0), 4), o.col); if (v > 0.86 && v < 0.9 && (Math.abs(u - 0.25) < 0.05 || Math.abs(u - 0.75) < 0.05)) { o.col[0] = 60; o.col[1] = 255; o.col[2] = 150; o.em = [40, 255, 140]; } o.ro = 0.35; });
const QUEEN_CLIPS = {
  cast: [[0, {}], [0.35, { chest: [-0.2, 0, 0], neck: [-0.15, 0, 0], head: [-0.2, 0, 0], uarmL: [-1.6, 0, 0.4], uarmR: [-1.6, 0, -0.4] }], [1.0, { chest: [-0.22, 0, 0], head: [-0.25, 0, 0], uarmL: [-1.7, 0, 0.5], uarmR: [-1.7, 0, -0.5] }], [1.35, {}]],
  attack: [[0, {}], [0.25, { chest: [-0.08, 0.3, 0], uarmR: [-2.0, 0, -0.5], farmR: [-0.8, 0, 0] }], [0.45, { chest: [0.2, -0.3, 0], uarmR: [-1.0, 0, -0.1], farmR: [0, 0, 0], head: [0.15, 0, 0], _pos: [0, 0, 0.2] }], [0.9, {}]],
};
export const warmQueen = () => { prop('chess-coronet', coronet, PAL, P_OPT(2400, 256, 0.006)); prop('chess-sceptre', sceptre, PAL, P_OPT(1200, 128)); qSnakeMat(); };
export const createChessQueen = (seed = 1) => limboBeast({
  id: 'black_queen', height: 2.25, blood: [0.2, 0.6, 0.3], speed: 0.9, sway: 1.0, impact: 0.45, attack: 'attack', clips: QUEEN_CLIPS, expr: 'cool', angry: 'angry',
  app: { skin: 0x9a90a4, hair: 0x111111, hairStyle: 'buzz', bodyShape: 1, build: 'slim', age: 0.1, eyeColor: 0x3aff9a, mouth: 1, face: 7, brows: 3, height: 1 },
  outfit: { torso: { tex: 'c_tee', color: 0x969696, sleeve: 'none' }, legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { makeup: { liner: 1, lash: 1, shadow: [30, 120, 80] }, lipstick: 0x1a0a20 }, hook: pieceHook({ robe: true, greaves: false }), hover: onBase,
  build(ctx) {
    const { L, P, sc } = ctx; polish(ctx, 0.38);
    const cr = prop('chess-coronet', coronet, PAL, P_OPT(2400, 256, 0.006)); const cm = K.mesh(cr.geo, cr.mat); mount(ctx, 'head', cm, { at: [0, (P.browY + 0.05 - L.restOf('head').y) * sc, (P.hcz - L.restOf('head').z) * sc] });
    const sp = prop('chess-sceptre', sceptre, PAL, P_OPT(1200, 128)); const sm = K.mesh(sp.geo, sp.mat); sm.rotation.x = Math.PI / 2; mount(ctx, 'handL', sm, { at: [0, -0.06 * sc, 0.02 * sc] });
    robe(ctx, robeMat('queen', OBS, hex('#2a8a5a')), 2.3);
    // serpents for hair (like Medusa's, black and gold, emerald-eyed), lagging behind the head
    const g = new THREE.Group(); mount(ctx, 'head', g, { at: [0, 0, 0] }); const smat = qSnakeMat(); const snakes = []; const hr = L.restOf('head'); const hc = new THREE.Vector3(0, (P.hairY + P.eyeY) / 2 + 0.01 - hr.y, P.hcz - 0.01 - hr.z);
    for (let i = 0; i < 15; i++) { const az = -2.3 + (i / 14) * 4.6 + Math.PI, el = 0.2 + (i % 3) * 0.3; const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const base = hc.clone().add(new THREE.Vector3(dir.x * P.hw * 0.95, dir.y * 0.08, dir.z * P.hd * 0.95)); const l = new K.Loft(18, 10); K.mesh(l.geo, smat, g); snakes.push({ l, base, dir, len: 0.2 + (i % 4) * 0.03, ph: i * 1.7 }); }
    ctx.vars.snakes = snakes; ctx.vars.sg = g; ctx.root.add(pieceBase(0.55));
  },
  pose(addp, t, st, ctx) { addp('head', 0.02, Math.sin(t * 0.5) * 0.15); addp('spine', -0.03); if (ctx.anim.mode === 'idle') { addp('uarmL', -0.4, 0, 0.15); addp('farmL', -0.9); addp('uarmR', -0.15, 0, -0.15); addp('farmR', -0.5); addp('handR', 0.3); } },
  update(dt, ctx, t) {
    const dead = ctx.st.dead > 0 ? Math.min(1, ctx.st.deadT) : 0;
    for (const s of ctx.vars.snakes || []) { const { base, dir, len, ph } = s; const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(); const coil = ctx.st.mode === 'cast' ? 1.6 : 1;
      s.l.set((u, out) => out.copy(base).addScaledVector(dir, u * len * 0.85).add(new THREE.Vector3(0, -u * u * len * (0.5 + dead * 0.5) + Math.sin(u * 4 + t * 3 + ph) * 0.02 * u * coil, 0)).addScaledVector(side, Math.sin(u * 7 - t * 4 * coil + ph) * 0.028 * u * (1 - dead)),
        (u) => { const r = u < 0.78 ? 0.014 * (1 - u * 0.45) : u < 0.9 ? 0.0098 + Math.sin((u - 0.78) / 0.12 * Math.PI) * 0.007 : 0.0098 * (1 - (u - 0.9) * 7); return [r * 1.25, r]; }); }
  },
}, seed);

// ================================================================== THE GRANDMASTER (Pessokrator)
function kingCrown(S) { // the king piece: a gold band, four arches meeting under an orb, the cross on top; ivory pearls
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.box([Math.sin(a) * 0.12, 0.03, Math.cos(a) * 0.12], [0.025, 0.03, 0.012], 0.004, 'p', { k: 0.004, tag: 'gold', rot: [0, a, 0] }); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const pts = []; for (let k = 0; k <= 6; k++) { const f = k / 6; pts.push([Math.sin(a) * 0.12 * (1 - f * f), 0.05 + Math.sin(f * Math.PI * 0.5) * 0.14, Math.cos(a) * 0.12 * (1 - f * f)]); } S.chain(pts, pts.map(() => 0.014), 'p', { k: 0.006, tag: 'gold' }); }
  S.blob([0, 0.2, 0], [0.032, 0.032, 0.032], 'p', { k: 0.008, tag: 'ivory' }); S.limb([0, 0.22, 0], [0, 0.34, 0], 0.016, 0.016, 'p', { k: 0.004, tag: 'gold' }); S.limb([-0.05, 0.29, 0], [0.05, 0.29, 0], 0.014, 0.014, 'p', { k: 0.004, tag: 'gold' });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.blob([Math.sin(a) * 0.125, 0.03, Math.cos(a) * 0.125], [0.011, 0.011, 0.011], 'p', { k: 0.003, tag: i % 2 ? 'ivory' : 'ebony' }); }
}
function whitePawn(S) { S.limb([0, 0, 0], [0, 0.014, 0], 0.04, 0.04, 'p', { k: 0.004, tag: 'ivory' }); S.limb([0, 0.014, 0], [0, 0.07, 0], 0.03, 0.014, 'p', { k: 0.008, tag: 'ivory' }); S.blob([0, 0.072, 0], [0.024, 0.006, 0.024], 'p', { k: 0.004, tag: 'gold' }); S.blob([0, 0.095, 0], [0.022, 0.022, 0.022], 'p', { k: 0.004, tag: 'ivory' }); }
const capeMat = () => K.uvMat('chess-cape', 128, 256, (u, v, o) => { // a cloak of the night sky lined at the hem with a checkerboard
  const hem = v > 0.84; if (hem) { const sq = (Math.floor(u * 16) + Math.floor((v - 0.84) * 50)) % 2; K.tone(sq ? IVORY : OBS, K.band(0.55), o.col); return; }
  if (v > 0.81) { K.tone(GOLD, K.band(0.6), o.col); o.me = 0.8; return; }
  const n = K.vnoise(u * 40, v * 40, 7.7); K.tone(n > 0.55 ? hex('#1a1840') : hex('#0c0a22'), K.band(0.4 + Math.cos(u * 12) * 0.08), o.col);
  const st = K.vnoise(u * 160, v * 160, 2.1); if (st > 0.86) { o.col[0] = 255; o.col[1] = 240; o.col[2] = 200; o.em = [255, 240, 200]; }
});
const GOD_CLIPS = {
  cast: [[0, {}], [0.4, { chest: [-0.12, 0, 0], head: [-0.1, 0, 0], uarmR: [-1.9, 0.3, -0.2], farmR: [-0.4, 0, 0], handR: [0.5, 0, 0] }], [1.0, { uarmR: [-1.6, 0.4, -0.1], farmR: [-0.6, 0, 0], handR: [0.8, 0, 0] }], [1.4, {}]], // reaching out to move a piece
  attack: [[0, {}], [0.3, { chest: [-0.15, 0.3, 0], uarmR: [-2.6, 0, -0.4], farmR: [-0.5, 0, 0] }], [0.5, { chest: [0.25, -0.3, 0], uarmR: [-0.8, 0, -0.1], farmR: [0, 0, 0], _pos: [0, 0, 0.25] }], [1.0, {}]], // a decree struck down
};
export const warmGod = () => { prop('chess-king-crown', kingCrown, PAL, P_OPT(2600, 256, 0.006)); prop('chess-white-pawn', whitePawn, PAL, P_OPT(600, 64, 0.004)); capeMat(); };
export const createGrandmaster = (seed = 1) => limboBeast({
  id: 'pessokrator', height: 3.3, chest: [1.08, 1.02, 1.06], blood: [1.0, 0.92, 0.7], speed: 0.7, sway: 0.5, impact: 0.5, attack: 'attack', clips: GOD_CLIPS, expr: 'cool', angry: 'angry',
  app: { skin: 0x9a90a4, hair: 0xe6dcc6, hairStyle: 'long', facialHair: 'beard', build: 'broad', age: 0.65, eyeColor: 0xffffff, height: 1 },
  outfit: { torso: { tex: 'c_tee', color: 0x969696, sleeve: 'long' }, legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { hairVolume: 1.4 }, hook: pieceHook({ robe: true, skin: 'split', greaves: false }), hover: onBase,
  build(ctx) {
    const { L, P, sc } = ctx; polish(ctx, 0.45); const m = ctx.L.mesh.material; m.emissive = new THREE.Color(0.25, 0.22, 0.4); m.emissiveIntensity = 0.12; ctx.vars.glow = m;
    const cr = prop('chess-king-crown', kingCrown, PAL, P_OPT(2600, 256, 0.006)); const cm = K.mesh(cr.geo, cr.mat); mount(ctx, 'head', cm, { at: [0, (P.browY + 0.04 - L.restOf('head').y) * sc, (P.hcz - L.restOf('head').z) * sc] });
    robe(ctx, robeMat('god', hex('#14122a'), GOLD, true), 2.1);
    const wp = prop('chess-white-pawn', whitePawn, PAL, P_OPT(600, 64, 0.004)); const pm = K.mesh(wp.geo, wp.mat); pm.name = 'heldPawn'; pm.scale.setScalar(1.6); mount(ctx, 'handL', pm, { at: [0.02 * sc, -0.09 * sc, 0.05 * sc] });
    // the cloak of night: a lofted mantle from the shoulders, swaying
    const cape = new K.Loft(10, 14); const cmat = capeMat(); cmat.side = THREE.DoubleSide; const cg = new THREE.Group(); mount(ctx, 'chest', cg, { at: [0, 0.05 * sc, -0.12 * sc] }); K.mesh(cape.geo, cmat, cg); ctx.vars.cape = cape; ctx.vars.capeH = (P.shoulderY - 0.02) * sc;
    ctx.root.add(pieceBase(0.95));
  },
  pose(addp, t, st, ctx) { addp('spine', -0.02); addp('head', 0.05, Math.sin(t * 0.3) * 0.1); if (ctx.anim.mode === 'idle') { addp('uarmL', -0.5, 0, 0.12); addp('farmL', -1.3); addp('uarmR', -0.1, 0, -0.12); addp('farmR', -0.3); addp('handL', 0.2); } },
  update(dt, ctx, t) {
    const c = ctx.vars.cape; if (c) { const H = ctx.vars.capeH; const sw = Math.sin(t * 0.9) * 0.04, dead = ctx.st.dead > 0 ? 1 : 0; c.set((u, out) => out.set(0, -u * H * 0.98, -0.04 - u * u * (0.22 + sw) - dead * u * 0.2), (u) => [0.26 + u * 0.2, 0.06 + u * 0.03]); }
    const g = ctx.vars.glow; if (g) g.emissiveIntensity = ctx.st.dead > 0 ? Math.max(0, g.emissiveIntensity - dt * 0.2) : 0.1 + Math.sin(t * 1.4) * 0.03;
  },
}, seed);

export const CHESS_MODEL_IDS = ['black_pawn', 'black_knight', 'oracle_bishop', 'rook_titan', 'black_queen', 'pessokrator'];
const BUILD = { black_pawn: createChessPawn, black_knight: createChessKnight, oracle_bishop: createChessBishop, rook_titan: createChessRook, black_queen: createChessQueen, pessokrator: createGrandmaster };
const WARM = { black_pawn: warmPawn, black_knight: warmKnight, oracle_bishop: warmBishop, rook_titan: warmRook, black_queen: warmQueen, pessokrator: warmGod };
export const createChessPiece = (id, seed) => BUILD[id](seed);
export const warmChessPiece = (id) => WARM[id]?.();

// ================================================================== the CHESSMEN themselves (the cosmic board, the map's boss pieces)
// Staunton-style turned bodies (12 facets, flat-shaded, veined ivory or obsidian with a gold collar ring) crowned with
// sculpted tops: the pawn's ball, the rook's battlements, the knight's carved horse head, the bishop's cleft mitre,
// the queen's coronet, the king's cross-crown. chessPiece(kind, side) -> Group (origin on the felt, about 1 unit for a king)
const PROF = {
  pawn: [[0.001, 0], [0.3, 0], [0.31, 0.04], [0.27, 0.08], [0.2, 0.11], [0.13, 0.3], [0.09, 0.4], [0.18, 0.43], [0.18, 0.46], [0.08, 0.48], [0.001, 0.48]],
  rook: [[0.001, 0], [0.34, 0], [0.35, 0.05], [0.3, 0.09], [0.22, 0.13], [0.19, 0.5], [0.24, 0.56], [0.26, 0.62], [0.001, 0.62]],
  knight: [[0.001, 0], [0.33, 0], [0.34, 0.05], [0.29, 0.09], [0.22, 0.13], [0.23, 0.18], [0.001, 0.18]],
  bishop: [[0.001, 0], [0.32, 0], [0.33, 0.05], [0.28, 0.09], [0.2, 0.13], [0.13, 0.4], [0.1, 0.56], [0.2, 0.6], [0.2, 0.63], [0.09, 0.66], [0.001, 0.66]],
  queen: [[0.001, 0], [0.35, 0], [0.36, 0.05], [0.31, 0.1], [0.22, 0.14], [0.14, 0.5], [0.11, 0.7], [0.22, 0.74], [0.22, 0.77], [0.12, 0.8], [0.16, 0.86], [0.001, 0.86]],
  king: [[0.001, 0], [0.37, 0], [0.38, 0.05], [0.33, 0.1], [0.24, 0.15], [0.15, 0.55], [0.12, 0.76], [0.23, 0.8], [0.23, 0.83], [0.13, 0.86], [0.18, 0.94], [0.001, 0.94]],
};
const pieceMat = (side) => K.uvMat('chessman-' + side, 64, 128, (u, v, o) => {
  const n = K.vnoise(u * 9, v * 14, side === 'ivory' ? 3.3 : 8.1); const w = Math.abs(Math.sin(u * 23 + v * 17 + n * 6)) < 0.045;
  const C = side === 'ivory' ? (w ? IVORY2 : IVORY) : w ? GOLD : n > 0.6 ? OBS2 : OBS; K.tone(C, K.band(0.52 + Math.cos(u * 6.28) * 0.2 + (n - 0.5) * 0.1), o.col); o.ro = 0.2; o.me = w && side !== 'ivory' ? 0.6 : 0.05;
});
const ringMat = () => K.uvMat('chessman-ring', 32, 8, (u, v, o) => { K.tone(GOLD, K.band(0.6 + Math.cos(u * 6.28) * 0.2), o.col); o.me = 0.85; o.ro = 0.28; });
function knightHead(S) { // the Staunton knight: an arched neck rising from the collar, a carved head looking forward and down, ears, a mane
  S.chain([[0, 0.16, -0.05], [0, 0.38, -0.08], [0, 0.6, -0.02], [0, 0.72, 0.06]], [0.17, 0.15, 0.13, 0.11], 'p', { k: 0.05, tag: 'body' });
  S.chain([[0, 0.72, 0.04], [0, 0.66, 0.2], [0, 0.56, 0.3]], [0.11, 0.09, 0.07], 'p', { k: 0.05, tag: 'body' }); S.blob([0, 0.54, 0.32], [0.075, 0.06, 0.07], 'p', { k: 0.03, tag: 'body' });
  for (const s of [-1, 1]) { S.limb([0.06 * s, 0.78, 0.02], [0.07 * s, 0.9, -0.02], 0.035, 0.008, 'p', { k: 0.02, tag: 'body' }); S.blob([0.085 * s, 0.68, 0.14], [0.018, 0.016, 0.016], 'p', { k: 0.006, tag: 'eye' }); S.blob([0.04 * s, 0.53, 0.38], [0.014, 0.012, 0.01], 'p', { k: 0.004, tag: 'eye', sub: true }); }
  for (let i = 0; i < 7; i++) { const k = i / 6; S.limb([0, 0.8 - k * 0.55, -0.02 - Math.sin(k * 2.6) * 0.12], [0, 0.82 - k * 0.55, -0.12 - Math.sin(k * 2.6) * 0.12], 0.04, 0.012, 'p', { k: 0.02, tag: 'mane' }); }
  S.limb([0, 0.08, 0], [0, 0.19, 0], 0.22, 0.2, 'p', { k: 0.04, tag: 'body' });
}
function bishopTop(S) { S.blob([0, 0.2, 0], [0.13, 0.2, 0.13], 'p', { k: 0.04, tag: 'body' }); S.limb([0, 0.33, 0], [0, 0.42, 0], 0.07, 0.01, 'p', { k: 0.05, tag: 'body' }); S.box([0.035, 0.24, 0], [0.014, 0.12, 0.2], 0.004, 'p', { k: 0.008, tag: 'body', sub: true, rot: [0, 0, -0.65] }); S.blob([0, 0.45, 0], [0.04, 0.04, 0.04], 'p', { k: 0.008, tag: 'eye' }); }
function rookTop(S) { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.box([Math.sin(a) * 0.235, 0.02, Math.cos(a) * 0.235], [0.055, 0.035, 0.03], 0.006, 'p', { k: 0.004, tag: 'body', rot: [0, a, 0] }); } for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; S.box([Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2], [0.075, 0.06, 0.06], 0.008, 'p', { k: 0.008, tag: 'body', rot: [0, a, 0] }); } }
const topPal = (side) => ({ body: side === 'ivory' ? { s: 'bone', c: IVORY, age: 0.05 } : { s: 'metal', c: hex('#26222c'), me: 0.3, ro: 0.22, patina: false }, mane: side === 'ivory' ? { s: 'bone', c: IVORY2, age: 0.05 } : { s: 'metal', c: GOLD, me: 0.8, ro: 0.3, patina: false }, eye: { s: 'metal', c: GOLD, me: 0.85, ro: 0.3, patina: false }, ...PAL, default: { s: 'metal', c: hex('#26222c'), me: 0.3, ro: 0.22, patina: false } });
const LATHE = new Map();
export function chessPiece(kind = 'pawn', side = 'ebony') {
  const G = new THREE.Group(); G.name = 'chessman:' + kind; const k = kind + ':' + side;
  let g = LATHE.get(kind); if (!g) { g = new THREE.LatheGeometry(PROF[kind].map(([x, y]) => new THREE.Vector2(x, y)), 12); LATHE.set(kind, g); }
  K.mesh(g, pieceMat(side), G);
  const ring = new THREE.LatheGeometry([[0.18, 0], [0.2, 0.01], [0.2, 0.03], [0.18, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 12); const rm = K.mesh(ring, ringMat(), G); rm.position.y = 0.1; // the gold collar above the foot
  const top = (key, fn, opts, y, s = 1) => { const P = prop('chessman-' + key + '-' + side, fn, topPal(side), opts); const m = K.mesh(P.geo, P.mat, G); m.position.y = y; m.scale.setScalar(s); return m; };
  if (kind === 'knight') top('knight', knightHead, P_OPT(2600, 256, 0.008), 0.0);
  if (kind === 'bishop') top('bishop', bishopTop, P_OPT(1600, 128, 0.007), 0.62);
  if (kind === 'rook') top('rook', rookTop, P_OPT(1400, 128, 0.008), 0.6);
  if (kind === 'queen') top('queen', coronet, P_OPT(2000, 128, 0.006), 0.84, 1.15);
  if (kind === 'king') top('king', kingCrown, P_OPT(2200, 128, 0.006), 0.92, 1.25);
  if (kind === 'pawn') { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), pieceMat(side)); b.castShadow = true; b.material.flatShading = true; b.position.y = 0.58; G.add(b); } // the pawn's faceted head
  G.userData.kind = kind; G.userData.side = side; G.userData.h = { pawn: 0.72, rook: 0.78, knight: 0.92, bishop: 1.1, queen: 1.12, king: 1.32 }[kind]; void k;
  return G;
}

/** veined marble for chessboard tiles and plinths: ivory | ebony (gold veins) | basalt | jade | kerb (ebony + gold meander rim) | gold */
export function marbleTileMat(kind = 'ivory') {
  return K.uvMat('chess-tile-' + kind, 96, 96, (u, v, o) => {
    if (kind === 'gold') { K.tone(GOLD, K.band(0.56 + Math.cos(u * 6.28) * 0.12 + K.vnoise(u * 20, v * 20, 1) * 0.1), o.col); o.me = 0.85; o.ro = 0.28; return; }
    const n = K.vnoise(u * 5, v * 5, kind.length * 1.7) + K.vnoise(u * 13, v * 13, 2) * 0.4; const w = Math.abs(Math.sin(u * 9 + v * 6 + n * 7)); const vein = w < 0.04, fine = w < 0.09; const rim = u < 0.035 || v < 0.035 || u > 0.965 || v > 0.965;
    if (kind === 'kerb' && (v > 0.3 && v < 0.7) && meander(u * 8, (v - 0.3) * 2.5)) { K.tone(GOLD, K.band(0.6), o.col); o.me = 0.85; o.ro = 0.3; return; }
    const C = kind === 'ivory' ? (vein ? hex('#b8a88a') : fine ? hex('#d8ccb2') : hex('#ece2cc')) : kind === 'basalt' ? (vein ? hex('#8a8290') : fine ? hex('#5a5462') : hex('#6c6674')) : kind === 'jade' ? (vein ? hex('#c8963a') : fine ? hex('#1e4a38') : hex('#173a2c')) : vein ? hex('#c8963a') : fine ? hex('#2e2838') : hex('#1c1822');
    K.tone(C, K.band(0.5 + (n - 0.7) * 0.2 + (rim ? (u < 0.5 && v < 0.5 ? 0.14 : -0.14) : 0)), o.col); o.ro = kind === 'basalt' ? 0.7 : vein && kind !== 'ivory' ? 0.3 : 0.14; o.me = vein && kind !== 'ivory' && kind !== 'basalt' ? 0.7 : 0.02;
  });
}
