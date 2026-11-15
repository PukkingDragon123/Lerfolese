// The experimental bestiary's humanoids, on the SAME Limbo human base as Newton (humanoid.js limboBeast): realistic
// low-poly bodies pushed through the engine's body parameters, repainted per creature (frost, feathers, bronze, rock)
// by a paint hook, with sculpted pixel-textured attachments on the engine's bones and their own additive clips.
//   ice_nymph     Chione's daughter: frost-pale, white hair, a crown of ice crystals, an ice lance, frost-cracked skin
//   siren         a sea-green winged singer with a lyre, scaled bird legs and a voice you can see (she glows as it builds)
//   empusa        gaunt and fiery-haired, one bronze leg and one donkey leg, a drinker of what gets past your guard
//   automaton     the Pendulum Sentinel: a riveted steel-and-brass clockwork with a clock-tower yoke on its back from
//                 which a crescent pendulum blade swings like a metronome; gears turn in its chest
//   magnet_golem  Magnes: a hulking lodestone body bristling with iron filings, boulder pauldrons and fists, a halo of
//                 orbiting iron shards whose glow flips red (N) / blue (S) with its polarity
import { THREE, K, hex, limboBeast, mount, recolor, furTexel, near, lum } from './humanoid.js';
import { prop } from './kit.js';
import { makeBones, rigidSkinned } from './rig.js';

const lumOf = (o) => Math.max(1, lum(o));
const wrapAll = (paint, fn) => { const w = (f) => (f ? (c, o) => { f(c, o); fn(c, o); } : f); return { ...paint, acc: w(paint.acc || paint.body), body: w(paint.body), skin: w(paint.skin), hand: w(paint.hand), shoe: w(paint.shoe || paint.body) }; };

// ---------------------------------------------------------------- shared attachments
const ICE_PAL = { ice: { s: 'ice', c: hex('#bfe6f6'), L: 0.08, ro: 0.15, me: 0.1, fn: (c, o) => { o.em = [30, 60, 80]; } }, deep: { s: 'ice', c: hex('#6aaed8'), ro: 0.2, fn: (c, o) => { o.em = [20, 50, 80]; } }, default: { s: 'ice', c: hex('#bfe6f6') } };
function crown(S) { // a ring of ice crystals, taller at the front
  for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; const h = 0.05 + Math.max(0, Math.cos(a)) * 0.11 + (i % 2) * 0.03; const p = [Math.sin(a) * 0.125, 0, Math.cos(a) * 0.13]; S.limb(p, [p[0] * 1.2, h * 1.5, p[2] * 1.2], 0.024, 0.003, 'p', { k: 0.006, tag: i % 3 ? 'ice' : 'deep' }); }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.blob([Math.sin(a) * 0.128, 0.0, Math.cos(a) * 0.133], [0.016, 0.014, 0.016], 'p', { k: 0.01, tag: 'ice' }); }
}
function lance(S) { // an ice spear along +Y from the grip: a faceted shaft, a long leaf blade, frost spurs
  S.limb([0, -0.55, 0], [0, 0.9, 0], 0.02, 0.016, 'p', { k: 0.006, tag: 'deep' });
  S.limb([0, 0.85, 0], [0, 1.35, 0], 0.045, 0.003, 'p', { k: 0.01, tag: 'ice' }); S.blob([0, 1.0, 0], [0.05, 0.12, 0.016], 'p', { k: 0.01, tag: 'ice' });
  for (const s of [-1, 1]) S.limb([0, 0.88, 0], [0.09 * s, 0.98, 0], 0.014, 0.002, 'p', { k: 0.004, tag: 'deep' });
  S.limb([0, -0.55, 0], [0, -0.7, 0], 0.024, 0.004, 'p', { k: 0.004, tag: 'ice' });
}
function shard(S) { S.limb([0, 0, 0], [0.02, 0.16, -0.03], 0.03, 0.004, 'p', { k: 0.008, tag: 'ice' }); S.limb([0.03, 0, 0.01], [0.07, 0.1, -0.02], 0.02, 0.003, 'p', { k: 0.006, tag: 'deep' }); }

const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.05)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.005], { ref: (t, n) => n.set(0, 1, 0) }).geo;
const WING = (s, L, sp = 1) => [['w1' + L, 'wroot', [0.14 * s, 0.17, -0.1]], ['w2' + L, 'w1' + L, [0.42 * s * sp, 0.3, -0.16]], ['w3' + L, 'w2' + L, [0.74 * s * sp, 0.3, -0.12]]];
/** a pair of feathered wings on their own bones, mounted on the chest (back side) */
function wings(ctx, mat, sp = 1) {
  const wg = new THREE.Group(); mount(ctx, 'chest', wg);
  const B = makeBones([['wroot', null, [0, 0, 0]], ...WING(1, '_L', sp), ...WING(-1, '_R', sp)]); const parts = []; const lerp = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const w1 = B.map['w1' + L].userData.rest.toArray(), w2 = B.map['w2' + L].userData.rest.toArray(), w3 = B.map['w3' + L].userData.rest.toArray(), tip = [1.0 * s * sp, 0.22, -0.12];
    for (let i = 0; i < 10; i++) { const k = i / 9; parts.push([feather(lerp(w3, tip, k), [s * (0.25 + k * 0.9), -0.2, -1 + k * 0.6], 0.56 - Math.abs(k - 0.5) * 0.18, 0.06), 'w3' + L]); }
    for (let i = 0; i < 9; i++) { const k = i / 8; parts.push([feather(lerp(w2, w3, k), [s * 0.18, -0.25, -1], 0.46, 0.06), 'w2' + L]); }
    for (let i = 0; i < 8; i++) { const k = i / 7; const a = lerp(w1, w3, k); a[1] += 0.02; parts.push([feather(a, [s * 0.1, -0.12, -1], 0.22, 0.05), k < 0.5 ? 'w2' + L : 'w3' + L]); }
    parts.push([new K.Loft(10, 8).set(K.curve([w1, w2, w3, tip]), (t) => 0.05 * (1 - t * 0.7)).geo, 'w2' + L]);
  }
  rigidSkinned(B, parts, ctx.own(mat), wg); return B.map;
}
function flap(W, t, st, k = 1) {
  const at = st.mode === 'attack' ? st.modeT : st.mode === 'cast' ? st.modeT : -1; const fl = Math.sin(t * 4.6) * k; const dead = st.dead > 0 ? Math.min(1, st.deadT / 0.5) : 0;
  const raise = at >= 0 && at < 0.32 ? Math.sin((at / 0.32) * Math.PI * 0.5) : 0, sweep = at >= 0.32 && at < 0.6 ? 1 : 0;
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    W['w1' + L].rotation.set(0, (-0.3 - sweep * 0.5) * s, ((0.1 + fl * 0.5) * (1 - dead) + raise * 0.9 - sweep * 0.3 + dead * 0.6) * s);
    W['w2' + L].rotation.set(0, 0.25 * s, (-0.1 - fl * 0.22 * (1 - dead) - sweep * 0.3) * s); W['w3' + L].rotation.set(0, 0.2 * s, (-0.1 - fl * 0.18 * (1 - dead)) * s);
  }
}
/** scaled bird legs below the knee (replacing the engine's severed shins), with hooked talons */
function birdLegs(ctx, col, talon) {
  const lm = K.uvMat('bleg-' + col, 32, 64, (u, v, o) => { const C = K.cells2(u * 8, v * 18); K.tone(hex(col), K.band(0.5 + Math.cos(u * 6.28) * 0.15 + (C[1] - C[0] < 0.1 ? -0.2 : 0)), o.col); });
  const tm = K.uvMat('btal-' + talon, 16, 32, (u, v, o) => K.tone(hex(talon), K.band(0.5 + Math.cos(u * 6.28) * 0.25 + v * 0.1), o.col)); const out = [];
  for (const b of ['shinL', 'shinR']) {
    const g = new THREE.Group(); mount(ctx, b, g); const crv = K.curve([[0, 0, 0], [0, -0.12, 0.05], [0, -0.26, -0.06], [0, -0.4, -0.01], [0, -0.46, 0.04]]);
    const leg = K.skinnedLoft(18, 8, crv, (t) => { const r = t < 0.3 ? 0.055 - t * 0.08 : 0.03 - (t - 0.3) * 0.012; return [r, r]; }, {}, 3, g, lm); out.push(leg.bones);
    const toes = new THREE.Group(); const f = crv(1, new THREE.Vector3()); toes.position.copy(f).multiplyScalar(-1); leg.bones[3].add(toes);
    for (const a of [-0.45, 0, 0.45]) toes.add(K.mesh(new K.Loft(6, 5).set(K.curve([[f.x, f.y, f.z], [f.x + Math.sin(a) * 0.07, f.y - 0.025, f.z + 0.08], [f.x + Math.sin(a) * 0.11, f.y - 0.07, f.z + 0.12]]), (t) => 0.016 * (1 - t) + 0.002).geo, tm));
    toes.add(K.mesh(new K.Loft(6, 5).set(K.curve([[f.x, f.y, f.z], [f.x, f.y - 0.02, f.z - 0.07], [f.x, f.y - 0.06, f.z - 0.1]]), (t) => 0.014 * (1 - t) + 0.002).geo, tm));
  }
  return out;
}

// ================================================================== ICE NYMPH
const FROST = hex('#c4dcee');
const nymphHook = (paint, P, spec) => {
  const sk = spec.skin;
  return wrapAll(paint, (c, o) => {
    if (!near(o, sk, 0.13)) return; const C = K.cells3(c.x * 34 / P.H, c.y * 34 / P.H, c.z * 34 / P.H); const vein = C[1] - C[0] < 0.035; // frost-crack veins over pale skin
    recolor(o, vein ? hex('#7ab2d8') : FROST, sk, vein ? -0.05 : 0.04, c, 'skin', 0.15);
  });
};
export const warmNymph = () => { prop('ice-crown', crown, ICE_PAL, { cell: 0.007, target: 1400, atlas: 128 }); prop('ice-lance', lance, ICE_PAL, { cell: 0.012, target: 1200, atlas: 128 }); prop('ice-shard', shard, ICE_PAL, { cell: 0.008, target: 400, atlas: 64 }); };
const NYMPH_CLIPS = { cast: [[0, {}], [0.3, { chest: [-0.15, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0] }], [0.5, { chest: [0.2, 0, 0], neck: [0.25, 0, 0], head: [0.2, 0, 0], uarmL: [-1.2, 0, 0.3], farmL: [-0.4, 0, 0] }], [1.0, { chest: [0.15, 0, 0], neck: [0.2, 0, 0], head: [0.15, 0, 0], uarmL: [-1.1, 0, 0.3] }], [1.3, {}]] }; // the frost breath: inhale, then a long white exhale over an open palm
export const createIceNymph = (seed = 1) => limboBeast({
  id: 'ice_nymph', height: 1.86, blood: [0.32, 0.5, 0.62], speed: 0.85, sway: 1.1, impact: 0.45, attack: 'strike', clips: NYMPH_CLIPS, expr: 'cool', angry: 'angry',
  app: { skin: 0xd6e2ea, hair: 0x9ccaf0, hairStyle: 'long', build: 'slim', bodyShape: 1, age: 0.05, eyeColor: 0x6ac8ff, mouth: 1, face: 7, brows: 3, height: 1 },
  outfit: { torso: { tex: 'c_bandeau', color: 0x6a9ccc }, legs: { tex: 'c_skirt', color: 0x3e6c9c }, legsKind: 'skirt' }, overrides: { hairVolume: 1.6, makeup: { liner: 1, lash: 1, shadow: [140, 190, 230] }, lipstick: 0x7a98c0 }, hook: nymphHook,
  hover: (t, st) => (st.dead > 0 ? 0.12 * Math.max(0, 1 - st.deadT * 2) : 0.12 + Math.sin(t * 1.3) * 0.04), // she drifts an inch above the frost
  build(ctx) {
    const { L, sc, P } = ctx; const hr = L.restOf('head');
    const C = prop('ice-crown', crown, ICE_PAL, { cell: 0.007, target: 1400, atlas: 128 }); mount(ctx, 'head', K.mesh(C.geo, C.mat), { at: [0, (P.browY + 0.035 - hr.y) * sc, (-0.01 - hr.z) * sc] });
    const Ln = prop('ice-lance', lance, ICE_PAL, { cell: 0.012, target: 1200, atlas: 128 }); const lm = K.mesh(Ln.geo, Ln.mat); lm.rotation.x = Math.PI / 2; mount(ctx, 'handR', lm, { at: [0, -0.06 * sc, 0.01 * sc] });
    const Sh = prop('ice-shard', shard, ICE_PAL, { cell: 0.008, target: 400, atlas: 64 });
    for (const [b, r] of [['uarmL', 0.4], ['uarmR', -0.4], ['farmL', 0.2], ['farmR', -0.2]]) { const m = K.mesh(Sh.geo, Sh.mat); m.rotation.z = r; mount(ctx, b, m, { at: [0, -0.05 * sc, -0.02 * sc] }); }
  },
  pose(add, t) { add('spine', 0.03); add('head', -0.04, Math.sin(t * 0.4) * 0.1); add('uarmL', 0, 0, 0.18 + Math.sin(t * 0.9) * 0.04); add('farmL', -0.2); add('uarmR', 0.1, 0, -0.12); add('farmR', -0.6); },
}, seed);

// ================================================================== SIREN
const SEA = hex('#3a7a72'), SKIN_S = hex('#d6b49c');
const sirenHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  return wrapAll(paint, (c, o) => {
    if (!near(o, sk, 0.14)) return; const ax = Math.abs(c.x);
    if (c.y < P.pelvisY + 0.03 * H || (c.y > P.shoulderY - 0.03 * H && ax > 0.09 * H)) return furTexel(c, o, SEA, sk, H, 0.014, (c.y % (0.028 * H)) < 0.005 * H ? -0.12 : 0); // sea-green plumage at the hips and shoulders
    recolor(o, SKIN_S, sk, 0, c, 'skin', 0.3);
  });
};
const LYRE_PAL = { wood: { s: 'wood', c: hex('#6a4426'), grain: 70 }, horn: { s: 'keratin', c: hex('#d8c8a0'), rings: 90 }, gold: { s: 'metal', c: hex('#c89a3a'), me: 0.8, patina: false }, string: { s: 'dark', c: hex('#efe0b0'), e: [60, 50, 20] }, default: { s: 'wood', c: hex('#6a4426') } };
function lyre(S) { // a tortoiseshell-and-horn lyre: two curving arms, a crossbar, a sound box, seven strings (origin = grip at the box)
  S.blob([0, 0, 0], [0.08, 0.05, 0.035], 'p', { k: 0.02, tag: 'wood' });
  for (const s of [-1, 1]) S.chain([[0.05 * s, 0.03, 0], [0.11 * s, 0.14, 0], [0.09 * s, 0.26, 0], [0.12 * s, 0.33, 0]], [0.018, 0.016, 0.014, 0.01], 'p', { k: 0.008, tag: 'horn' });
  S.limb([-0.11, 0.28, 0], [0.11, 0.28, 0], 0.012, 0.012, 'p', { k: 0.006, tag: 'gold' });
  for (let i = 0; i < 7; i++) { const x = (i - 3) * 0.016; S.limb([x, 0.03, 0.02], [x * 1.3, 0.275, 0.005], 0.0025, 0.0025, 'p', { k: 0.001, tag: 'string' }); }
}
const featherSea = () => K.uvMat('siren-feather', 32, 128, (u, v, o) => { const top = Math.abs(((u + 0.25) % 0.5) - 0.25) < 0.03; const barb = Math.sin(v * 70 + Math.abs(u - 0.5) * 30) > 0.8; K.tone(v > 0.8 ? hex('#cfe6d8') : v > 0.5 ? hex('#4e9a8c') : hex('#2e5e5a'), K.band(0.5 + Math.cos(u * 6.28) * 0.12 + (top ? 0.2 : 0) + (barb ? -0.1 : 0)), o.col); });
export const warmSiren = () => { prop('lyre', lyre, LYRE_PAL, { cell: 0.006, target: 1200, atlas: 128 }); featherSea(); };
const SIREN_CLIPS = { cast: [[0, {}], [0.35, { chest: [-0.2, 0, 0], neck: [-0.25, 0, 0], head: [-0.35, 0, 0], uarmR: [-0.9, 0, -0.3], farmR: [-0.8, 0, 0] }], [1.0, { chest: [-0.22, 0, 0], neck: [-0.3, 0, 0], head: [-0.4, 0.1, 0], uarmR: [-0.9, 0.1, -0.35], farmR: [-0.7, 0, 0] }], [1.35, {}]] }; // head back, the high note, a hand strumming
export const createSiren = (seed = 1) => limboBeast({
  id: 'siren', height: 1.82, blood: [0.12, 0.004, 0.006], speed: 1.0, sway: 1.0, impact: 0.45, attack: 'strike', clips: SIREN_CLIPS, expr: 'cool',
  app: { skin: 0xd6b49c, hair: 0x2a2036, hairStyle: 'wavy', build: 'slim', bodyShape: 1, age: 0.12, eyeColor: 0x40c8b0, mouth: 2, face: 5, brows: 2, height: 1 },
  outfit: { torso: { tex: 'c_bandeau', color: 0x2e6a64 } }, severed: ['shin_l', 'shin_r'], overrides: { hairVolume: 1.7, makeup: { liner: 1, lash: 1, shadow: [40, 120, 110] }, lipstick: 0x8a2a3a }, hook: sirenHook,
  hover: (t, st) => { const up = 0.42 + Math.sin(t * 4.6) * 0.05; if (!st.dead) return up; const f = Math.min(1, st.deadT / 0.45); return up * (1 - f * f); },
  build(ctx) {
    ctx.vars.wings = wings(ctx, featherSea(), 0.95); ctx.vars.legs = birdLegs(ctx, '#7a8a6a', '#2a2428');
    const Ly = prop('lyre', lyre, LYRE_PAL, { cell: 0.006, target: 1200, atlas: 128 }); const lm = K.mesh(Ly.geo, Ly.mat); lm.rotation.set(-0.3, 0.6, 0.2); mount(ctx, 'handL', lm, { at: [0, -0.04 * ctx.sc, 0.04 * ctx.sc] });
    const m = ctx.L.mesh.material; m.emissive = new THREE.Color(0.2, 0.9, 0.8); m.emissiveIntensity = 0; ctx.vars.glowMat = m;
  },
  pose(add) { add('spine', 0.05); add('thighL', -0.35); add('thighR', -0.3); add('shinL', 0.5); add('shinR', 0.45); add('uarmL', -0.5, 0.2, 0.15); add('farmL', -1.2); },
  update(dt, ctx, t) {
    flap(ctx.vars.wings, t, ctx.st, 0.9); ctx.vars.legs.forEach((bs) => bs.forEach((b, i) => b.rotation.set(i === 1 ? -0.2 : i === 2 ? 0.5 : 0, 0, 0)));
    const p = ctx.root.userData.pressure || 0; const g = ctx.vars.glowMat; if (g) g.emissiveIntensity += ((p / 3) * (0.16 + Math.sin(t * 9) * 0.04) - g.emissiveIntensity) * Math.min(1, dt * 4); // her song shows as rising pressure
  },
}, seed);

// ================================================================== EMPUSA
const PALE = hex('#d8c6bc');
const empHook = (paint, P, spec) => {
  const sk = spec.skin, hair = [216, 64, 26];
  return wrapAll(paint, (c, o) => {
    if (near(o, hair, 0.16)) { const tip = K.vnoise(c.x * 30, c.y * 20, c.z * 30); recolor(o, tip > 0.55 ? hex('#ffb040') : hex('#c83a12'), hair, tip > 0.55 ? 0.12 : 0.02); return; } // the hair is fire
    if (!near(o, sk, 0.13)) return; const rib = c.y > P.waistY && c.y < P.bustY - 0.03 * P.H && Math.abs(c.x) > 0.04 * P.H && Math.abs((((c.y - Math.abs(c.x) * 0.4) / P.H) * 34) % 1 - 0.5) < 0.1;
    recolor(o, PALE, sk, rib ? -0.2 : 0, c, 'skin', 0.75);
  });
};
const BLEG_PAL = { bronze: { s: 'metal', c: hex('#9a6a34'), me: 0.75, ro: 0.35, rivet: 0.03 }, strap: { s: 'leather', c: hex('#3a2016') }, hoof: { s: 'keratin', c: hex('#2a2220') }, fur: { s: 'fur', c: hex('#6a5a4c'), fs: 50, strand: 0.3 }, default: { s: 'metal', c: hex('#9a6a34') } };
function bronzeLeg(S) { // a hammered bronze shin and foot (origin = knee, down -Y), riveted bands, a leather strap at the knee
  S.limb([0, 0, 0], [0, -0.42, -0.01], 0.05, 0.034, 'p', { k: 0.012, tag: 'bronze' }); S.blob([0, -0.02, 0.0], [0.055, 0.04, 0.055], 'p', { k: 0.01, tag: 'strap' });
  for (const y of [-0.12, -0.24, -0.34]) S.limb([0, y, 0], [0, y - 0.012, 0], 0.046 - y * -0.02, 0.046 - y * -0.02, 'p', { k: 0.003, tag: 'bronze' });
  S.box([0, -0.455, 0.05], [0.04, 0.025, 0.09], 0.012, 'p', { k: 0.01, tag: 'bronze' });
}
function donkeyLeg(S) { // a shaggy donkey shin ending in a small hoof (origin = knee)
  S.limb([0, 0, 0], [0, -0.3, -0.05], 0.05, 0.03, 'p', { k: 0.02, tag: 'fur' }); S.limb([0, -0.3, -0.05], [0, -0.44, 0.01], 0.028, 0.026, 'p', { k: 0.01, tag: 'fur' });
  S.box([0, -0.465, 0.03], [0.03, 0.02, 0.035], 0.01, 'p', { k: 0.008, tag: 'hoof' }); for (let i = 0; i < 6; i++) S.limb([0.03 * Math.sin(i), -0.36, 0.03 * Math.cos(i)], [0.05 * Math.sin(i), -0.43, 0.05 * Math.cos(i)], 0.012, 0.003, 'p', { k: 0.004, tag: 'fur' });
}
export const warmEmpusa = () => { prop('emp-bronze', bronzeLeg, BLEG_PAL, { cell: 0.008, target: 900, atlas: 128 }); prop('emp-donkey', donkeyLeg, BLEG_PAL, { cell: 0.008, target: 900, atlas: 128 }); };
const EMP_CLIPS = { attack: [[0, {}], [0.3, { spine: [-0.15, 0, 0], thighR: [0.5, 0, 0], shinR: [0.9, 0, 0], uarmL: [-0.4, 0, 0.5], uarmR: [-0.4, 0, -0.5] }], [0.45, { spine: [0.15, 0, 0], thighR: [-1.5, 0, 0], shinR: [0.1, 0, 0], uarmL: [0.3, 0, 0.6], uarmR: [0.3, 0, -0.6], head: [0.1, 0, 0] }], [0.65, { thighR: [-0.6, 0, 0], shinR: [0.3, 0, 0] }], [0.95, {}]] }; // the bronze kick
export const createEmpusa = (seed = 1) => limboBeast({
  id: 'empusa', height: 1.86, blood: [0.12, 0.004, 0.006], speed: 1.05, sway: 1.2, impact: 0.45, attack: 'attack', clips: EMP_CLIPS, expr: 'grin', angry: 'angry',
  app: { skin: 0xd0c0b8, hair: 0xd8401a, hairStyle: 'long', build: 'wiry', bodyShape: 1, age: 0.45, eyeColor: 0xff3020, mouth: 3, face: 6, brows: 1, height: 1 },
  outfit: { torso: { tex: 'c_bandeau', color: 0x3a1a24 }, legs: { tex: 'c_skirt', color: 0x2a141a }, legsKind: 'skirt' }, severed: ['shin_l', 'shin_r'], overrides: { hairVolume: 1.9, makeup: { liner: 1, lash: 1, shadow: [90, 20, 30] }, lipstick: 0x5a0a14 }, hook: empHook,
  build(ctx) {
    const { sc } = ctx; const B = prop('emp-bronze', bronzeLeg, BLEG_PAL, { cell: 0.008, target: 900, atlas: 128 }); mount(ctx, 'shinR', K.mesh(B.geo, B.mat));
    const D = prop('emp-donkey', donkeyLeg, BLEG_PAL, { cell: 0.008, target: 900, atlas: 128 }); mount(ctx, 'shinL', K.mesh(D.geo, D.mat)); void sc;
  },
  pose(add, t) { add('spine', 0.1); add('neck', 0.12); add('head', -0.1, Math.sin(t * 0.7) * 0.15, Math.sin(t * 0.5) * 0.12); add('uarmL', -0.2, 0, 0.25); add('farmL', -0.9); add('uarmR', -0.2, 0, -0.25); add('farmR', -0.9); add('handL', 0.4); add('handR', 0.4); }, // hungry, hunched, fingers curled
}, seed);

// ================================================================== PENDULUM SENTINEL (automaton)
const STEEL = hex('#5e646c'), BRASS = hex('#b08a44');
const autoHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  return wrapAll(paint, (c, o) => {
    const ref = near(o, sk, 0.14) ? sk : [lumOf(o), lumOf(o), lumOf(o)]; const band = Math.abs((((c.y / H) * 9) % 1) - 0.5) < 0.03; const plate = Math.abs(c.x) < 0.07 * H && c.nz > 0.2 && c.y > P.waistY;
    const rivet = Math.abs((((c.y / H) * 9) % 1) - 0.5) < 0.075 && Math.abs(((Math.atan2(c.x, c.z) * 2.5) % 1)) < 0.07;
    recolor(o, plate || c.y > P.shoulderY ? BRASS : STEEL, ref, (band ? -0.25 : 0) + (rivet ? 0.25 : 0), c, 'metal', 0.6);
  });
};
const CLOCK_PAL = { brass: { s: 'metal', c: hex('#b08a44'), me: 0.8, ro: 0.3, patina: 0.3 }, steel: { s: 'metal', c: hex('#6a7078'), me: 0.75, ro: 0.35, patina: false }, blade: { s: 'metal', c: hex('#c8ccd4'), me: 0.9, ro: 0.15, patina: false }, glow: { s: 'dark', c: hex('#8ae0ff'), e: [80, 200, 255] }, default: { s: 'metal', c: hex('#b08a44') } };
function yoke(S) { // the clock-tower frame on its back: two posts, an arched crossbar with a dial boss (origin = upper back)
  for (const s of [-1, 1]) S.limb([0.16 * s, -0.05, -0.08], [0.14 * s, 0.75, -0.1], 0.03, 0.025, 'p', { k: 0.01, tag: 'steel' });
  S.chain([[-0.15, 0.72, -0.1], [-0.06, 0.82, -0.1], [0.06, 0.82, -0.1], [0.15, 0.72, -0.1]], [0.03, 0.03, 0.03, 0.03], 'p', { k: 0.01, tag: 'brass' });
  S.blob([0, 0.8, -0.1], [0.08, 0.08, 0.035], 'p', { k: 0.01, tag: 'brass' }); S.blob([0, 0.8, -0.06], [0.04, 0.04, 0.01], 'p', { k: 0.004, tag: 'glow' });
}
function pend(S) { // the pendulum (origin = pivot): a long steel rod, a brass weight, a crescent blade at the bottom
  S.limb([0, 0, 0], [0, -1.15, 0], 0.016, 0.016, 'p', { k: 0.004, tag: 'steel' }); S.blob([0, -0.55, 0], [0.04, 0.06, 0.03], 'p', { k: 0.01, tag: 'brass' });
  const pts = []; for (let i = 0; i <= 8; i++) { const a = -1.2 + (i / 8) * 2.4; pts.push([Math.sin(a) * 0.3, -1.12 - Math.cos(a) * 0.12 + 0.12, 0]); }
  S.chain(pts, pts.map((_, i) => 0.05 - Math.abs(i - 4) * 0.01), 'p', { k: 0.015, tag: 'blade' }); S.blob([0, -1.14, 0], [0.07, 0.05, 0.025], 'p', { k: 0.01, tag: 'brass' });
}
function gear(S) { S.blob([0, 0, 0], [0.09, 0.09, 0.02], 'p', { k: 0.006, tag: 'brass' }); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.box([Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], [0.012, 0.012, 0.018], 0.003, 'p', { k: 0.003, tag: 'brass', rot: [0, 0, a] }); } S.blob([0, 0, 0.015], [0.025, 0.025, 0.01], 'p', { k: 0.004, tag: 'steel' }); }
function mask(S) { // a smooth steel face-plate with a single glowing slit and brass cheek rivets (origin = head joint)
  S.blob([0, 0.11, 0.02], [0.14, 0.16, 0.16], 'p', { k: 0.04, tag: 'steel' }); S.blob([0, 0.08, 0.1], [0.12, 0.12, 0.08], 'p', { k: 0.03, tag: 'steel' });
  S.box([0, 0.11, 0.175], [0.09, 0.012, 0.02], 0.006, 'p', { k: 0.004, tag: 'glow' }); for (const s of [-1, 1]) S.blob([0.1 * s, 0.05, 0.13], [0.018, 0.018, 0.012], 'p', { k: 0.004, tag: 'brass' });
  S.box([0, 0.27, -0.02], [0.02, 0.05, 0.12], 0.01, 'p', { k: 0.01, tag: 'brass' });
}
export const warmAutomaton = () => { prop('auto-yoke', yoke, CLOCK_PAL, { cell: 0.012, target: 1400, atlas: 128 }); prop('auto-pend', pend, CLOCK_PAL, { cell: 0.01, target: 1400, atlas: 128 }); prop('auto-gear', gear, CLOCK_PAL, { cell: 0.006, target: 700, atlas: 64 }); prop('auto-mask', mask, CLOCK_PAL, { cell: 0.012, target: 1200, atlas: 128 }); };
export const createAutomaton = (seed = 1) => limboBeast({
  id: 'automaton', height: 2.5, chest: [1.15, 1.04, 1.12], blood: [0.18, 0.16, 0.14], speed: 0.7, sway: 0.25, impact: 0.45, attack: 'attack', wounds: false,
  app: { skin: 0x7a6a50, hair: 0x222222, hairStyle: 'bald', build: 'broad', age: 0.2, height: 1 }, outfit: {}, overrides: { eyeW: 0.02, eyeH: 0.02 }, hook: autoHook,
  build(ctx) {
    const { sc } = ctx; const m = ctx.L.mesh.material; m.metalness = 0.7; m.roughness = 0.4;
    const Y = prop('auto-yoke', yoke, CLOCK_PAL, { cell: 0.012, target: 1400, atlas: 128 }); const yg = new THREE.Group(); yg.add(K.mesh(Y.geo, Y.mat)); mount(ctx, 'chest', yg, { at: [0, 0.1 * sc, -0.12 * sc] });
    const Pd = prop('auto-pend', pend, CLOCK_PAL, { cell: 0.01, target: 1400, atlas: 128 }); const piv = new THREE.Group(); piv.position.set(0, 0.8, -0.16); piv.add(K.mesh(Pd.geo, Pd.mat)); yg.add(piv); ctx.vars.piv = piv;
    const G = prop('auto-gear', gear, CLOCK_PAL, { cell: 0.006, target: 700, atlas: 64 }); ctx.vars.gears = [];
    for (const [x, y, s] of [[0.06, 0.06, 1], [-0.07, -0.04, 0.7]]) { const gg = new THREE.Group(); const gm = K.mesh(G.geo, G.mat); gm.scale.setScalar(s); gg.add(gm); mount(ctx, 'chest', gg, { at: [x * sc, y * sc, 0.2 * sc] }); ctx.vars.gears.push([gm, s]); }
    const Mk = prop('auto-mask', mask, CLOCK_PAL, { cell: 0.012, target: 1200, atlas: 128 }); mount(ctx, 'head', K.mesh(Mk.geo, Mk.mat), { at: [0, -0.02 * sc, 0] });
  },
  pose(add, t) { const tick = Math.round(Math.sin(t * 1.2) * 2) / 2; add('neck', 0, tick * 0.08); add('head', 0, tick * 0.1); add('uarmL', 0, 0, 0.1); add('uarmR', 0, 0, -0.1); add('farmL', -0.3); add('farmR', -0.3); }, // stiff, ticking head turns
  update(dt, ctx, t) {
    const st = ctx.st; const at = st.mode === 'attack' ? st.modeT : -1; const amp = at >= 0 ? 0.35 + Math.sin(Math.min(1, at / 0.5) * Math.PI) * 0.7 : 0.38; const dead = st.dead > 0 ? Math.max(0, 1 - st.deadT / 2) : 1;
    ctx.vars.pa = (ctx.vars.pa || 0) + dt * 2.6 * dead; if (ctx.vars.piv) ctx.vars.piv.rotation.z = Math.sin(ctx.vars.pa) * amp * dead; // TICK. TOCK.
    for (const [g, s] of ctx.vars.gears || []) g.rotation.z += dt * (s > 0.8 ? 1.3 : -1.9) * dead;
  },
}, seed);

// ================================================================== LODESTONE GOLEM
const LODE = hex('#3e3c42');
const golemHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  return wrapAll(paint, (c, o) => {
    const ref = near(o, sk, 0.14) ? sk : [lumOf(o), lumOf(o), lumOf(o)]; const C = K.cells3(c.x * 20 / H, c.y * 20 / H, c.z * 20 / H); const crack = C[1] - C[0] < 0.04; const rust = K.vnoise(c.x * 18 / H, c.y * 18 / H, c.z * 18 / H) > 0.7;
    const filing = Math.abs(Math.sin((c.x + c.z) * 900 / H + c.y * 300 / H)) > 0.97 && c.ny > -0.2; // bristling iron filings follow its field lines
    recolor(o, rust ? hex('#5a3a2c') : LODE, ref, (crack ? -0.3 : 0) + (filing ? 0.18 : 0) + (C[5] - 0.5) * 0.15, c, 'rock', 0.8);
  });
};
const ROCK_PAL = { rock: { s: 'rock', c: hex('#46424a'), age: 0.8 }, rust: { s: 'rock', c: hex('#5a3e30'), age: 0.9 }, glow: { s: 'dark', c: hex('#ff5a3a'), e: [255, 80, 50] }, iron: { s: 'metal', c: hex('#4a4e56'), me: 0.7, patina: false }, default: { s: 'rock', c: hex('#46424a') } };
function boulder(S) { S.blob([0, 0, 0], [0.16, 0.13, 0.15], 'p', { k: 0.05, tag: 'rock' }); S.blob([0.06, 0.06, 0.04], [0.1, 0.08, 0.1], 'p', { k: 0.04, tag: 'rust' }); S.blob([-0.07, -0.03, -0.05], [0.09, 0.08, 0.09], 'p', { k: 0.04, tag: 'rock' }); for (let i = 0; i < 9; i++) { const a = i * 2.3; S.limb([Math.cos(a) * 0.12, Math.sin(a * 0.7) * 0.1, Math.sin(a) * 0.12], [Math.cos(a) * 0.2, Math.sin(a * 0.7) * 0.15, Math.sin(a) * 0.2], 0.012, 0.002, 'p', { k: 0.004, tag: 'iron' }); } }
function rockHead(S) { S.blob([0, 0.1, 0.02], [0.15, 0.15, 0.16], 'p', { k: 0.05, tag: 'rock' }); S.blob([0, 0.2, -0.02], [0.13, 0.08, 0.13], 'p', { k: 0.04, tag: 'rust' }); S.blob([0, 0.1, 0.13], [0.12, 0.03, 0.05], 'p', { k: 0.02, tag: 'rock' }); for (const s of [-1, 1]) S.box([0.05 * s, 0.075, 0.165], [0.03, 0.008, 0.01], 0.004, 'p', { k: 0.003, tag: 'glow', rot: [0, 0, 0.2 * s] }); }
function shardRock(S) { S.box([0, 0, 0], [0.025, 0.07, 0.018], 0.004, 'p', { k: 0.006, tag: 'iron', rot: [0.3, 0.2, 0.5] }); S.box([0.02, 0.05, 0.01], [0.015, 0.04, 0.012], 0.003, 'p', { k: 0.004, tag: 'iron', rot: [-0.2, 0.4, -0.3] }); }
export const warmGolem = () => { prop('golem-boulder', boulder, ROCK_PAL, { cell: 0.014, target: 1200, atlas: 128 }); prop('golem-head', rockHead, ROCK_PAL, { cell: 0.012, target: 1200, atlas: 128 }); prop('golem-shard', shardRock, ROCK_PAL, { cell: 0.008, target: 300, atlas: 64 }); };
export const createGolem = (seed = 1) => limboBeast({
  id: 'magnet_golem', height: 2.85, chest: [1.24, 1.06, 1.2], blood: [0.28, 0.12, 0.08], speed: 0.65, sway: 0.4, impact: 0.45, attack: 'attack', wounds: false,
  app: { skin: 0x4a4a52, hair: 0x222222, hairStyle: 'bald', build: 'heavy', age: 0.9, height: 1 }, outfit: {}, overrides: { eyeW: 0.02, eyeH: 0.02 }, hook: golemHook,
  build(ctx) {
    const { sc } = ctx; const Bd = prop('golem-boulder', boulder, ROCK_PAL, { cell: 0.014, target: 1200, atlas: 128 });
    for (const [b, at, s] of [['uarmL', [0.05, 0.02, 0], 1.25], ['uarmR', [-0.05, 0.02, 0], 1.25], ['handL', [0, -0.08, 0.02], 1.0], ['handR', [0, -0.08, 0.02], 1.0], ['chest', [0, 0.12, -0.14], 1.1]]) { const m = K.mesh(Bd.geo, Bd.mat); m.scale.setScalar(s); m.rotation.set(at[0] * 9, at[1] * 9, 0); mount(ctx, b, m, { at: at.map((x) => x * sc) }); }
    const Hd = prop('golem-head', rockHead, ROCK_PAL, { cell: 0.012, target: 1200, atlas: 128 }); const hm = K.mesh(Hd.geo, Hd.mat); mount(ctx, 'head', hm, { at: [0, -0.03 * sc, 0] }); ctx.vars.eyeMat = hm.material;
    // the halo of iron shards held in its field; their glow says the polarity (N red, S blue)
    const Sr = prop('golem-shard', shardRock, ROCK_PAL, { cell: 0.008, target: 300, atlas: 64 }); const ring = new THREE.Group(); ctx.model.add(ring); ctx.vars.ring = ring; const gm = Sr.mat.clone(); gm.emissive = new THREE.Color(1, 0.3, 0.2); gm.emissiveIntensity = 0.12; ctx.vars.shardMat = gm;
    for (let i = 0; i < 9; i++) { const m = K.mesh(Sr.geo, gm); const a = (i / 9) * Math.PI * 2; m.position.set(Math.cos(a) * 1.0, 1.4 + Math.sin(a * 3) * 0.25, Math.sin(a) * 0.7); m.rotation.set(a, a * 2, 0); m.scale.setScalar(1.6); ring.add(m); }
  },
  pose(add, t) { add('spine', 0.1); add('neck', 0.18); add('head', -0.1); add('uarmL', 0, 0, 0.32); add('uarmR', 0, 0, -0.32); add('farmL', -0.35); add('farmR', -0.35); add('chest', Math.sin(t * 0.8) * 0.02); },
  update(dt, ctx, t) {
    const r = ctx.vars.ring; const dead = ctx.st.dead > 0; if (r) { r.rotation.y += dt * (dead ? 0 : 0.6); r.children.forEach((m, i) => { m.position.y += dead ? Math.max(-m.position.y, -dt * 3) : Math.sin(t * 1.4 + i) * 0.002; m.rotation.x += dt * 0.8; }); }
    const S = (ctx.root.userData.polarity || 0) === 1; const c = ctx.vars.shardMat; if (c) { const tgt = S ? [0.3, 0.55, 1] : [1, 0.3, 0.2]; c.emissive.r += (tgt[0] - c.emissive.r) * dt * 3; c.emissive.g += (tgt[1] - c.emissive.g) * dt * 3; c.emissive.b += (tgt[2] - c.emissive.b) * dt * 3; c.emissiveIntensity = dead ? 0 : 0.14 + Math.sin(t * 3) * 0.04; }
  },
}, seed);

export const NYMPH_IDS = ['ice_nymph', 'siren', 'empusa', 'automaton', 'magnet_golem'];
const B2 = { ice_nymph: createIceNymph, siren: createSiren, empusa: createEmpusa, automaton: createAutomaton, magnet_golem: createGolem };
const W2 = { ice_nymph: warmNymph, siren: warmSiren, empusa: warmEmpusa, automaton: warmAutomaton, magnet_golem: warmGolem };
export const createNymph = (id, seed) => B2[id](seed);
export const warmNymphs = (id) => W2[id]?.();
