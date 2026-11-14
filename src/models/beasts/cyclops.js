// Cyclops on the human base: a 3.1 m Limbo giant (heavy build, sagging paunch, weathered warty hide) with the twin
// eyes folded away and one great eye set under a jutting brow shelf, heavy lids, an underbite jaw with chipped tusks,
// a hide loincloth and a gnarled iron-studded club in the right fist. Animation: the engine's overhead strike.
import { THREE, K, hex, limboBeast, mount, recolor, furTexel, near } from './humanoid.js';
import { prop } from './kit.js';

const SKIN = hex('#9a7a62');
const FACE_PAL = {
  eye: { s: 'eye', c: hex('#5a4024'), white: hex('#d8ccb4'), iris: 0.98, irisR: 0.5, pupil: 'round', pupilR: 0.2, rim: hex('#3a2418') },
  lid: { s: 'skin', c: hex('#8e6c56'), age: 0.95 }, brow: { s: 'skin', c: hex('#7a5a46'), age: 1 }, tusk: { s: 'keratin', c: hex('#d2c4a4'), rings: 220 }, gum: { s: 'dark', c: hex('#4a1a1c') },
  default: { s: 'skin', c: hex('#8e6c56'), age: 0.9 },
};
function eyeBrow(S) { // origin = the eye's centre (metres): one great eye, a jutting brow shelf, heavy lids, crow's-feet
  S.blob([0, 0, 0], [0.075, 0.066, 0.05], 'p', { k: 0.006, tag: 'eye', dir: [0, 0, 1] });
  S.blob([0, 0.066, 0.018], [0.15, 0.05, 0.08], 'p', { k: 0.025, tag: 'brow' }); S.blob([0, 0.085, -0.03], [0.16, 0.06, 0.07], 'p', { k: 0.03, tag: 'brow' });
  S.blob([0, 0.034, 0.012], [0.082, 0.03, 0.05], 'p', { k: 0.012, tag: 'lid' }); S.blob([0, -0.048, 0.008], [0.078, 0.024, 0.045], 'p', { k: 0.012, tag: 'lid' });
  S.sym((s) => S.blob([0.09 * s, -0.01, -0.01], [0.05, 0.06, 0.05], 'p', { k: 0.02, tag: 'lid' }));
}
function underbite(S) { // origin = the mouth: a jutting lower jaw with tusks splayed up over the lip
  S.blob([0, -0.035, 0.035], [0.13, 0.055, 0.075], 'p', { k: 0.025, tag: 'lid' }); S.blob([0, -0.02, 0.07], [0.11, 0.022, 0.04], 'p', { k: 0.012, tag: 'gum' });
  S.sym((s) => { S.limb([0.055 * s, -0.01, 0.085], [0.075 * s, 0.07, 0.095], 0.024, 0.007, 'p', { k: 0.006, tag: 'tusk' }); S.limb([0.025 * s, -0.012, 0.095], [0.03 * s, 0.03, 0.1], 0.012, 0.004, 'p', { k: 0.004, tag: 'tusk' }); });
}
const CLUB_PAL = { wood: { s: 'wood', c: hex('#6a4a2e'), grain: 40 }, iron: { s: 'metal', c: hex('#5a5e66'), me: 0.5 }, strap: { s: 'leather', c: hex('#3e2414') }, default: { s: 'wood', c: hex('#6a4a2e') } };
function club(S) { // gnarled log, knotted head studded with iron, leather grip (local +Y from the grip)
  S.chain([[0, -0.32, 0], [0.01, 0.1, 0], [0.03, 0.6, 0.01], [0.02, 1.05, 0], [0, 1.3, -0.01]], [0.055, 0.06, 0.09, 0.15, 0.13], 'p', { k: 0.04, tag: 'wood' });
  for (const [x, y, z, r] of [[0.08, 0.75, 0.05, 0.06], [-0.07, 0.95, -0.06, 0.07], [0.1, 1.12, -0.04, 0.06], [-0.05, 0.55, 0.06, 0.045], [0.02, 1.25, 0.1, 0.06]]) S.blob([x, y, z], [r, r * 1.2, r], 'p', { k: 0.04, tag: 'wood' });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 0.85 + (i % 3) * 0.16; S.limb([Math.cos(a) * 0.12, y, Math.sin(a) * 0.12], [Math.cos(a) * 0.22, y + 0.02, Math.sin(a) * 0.22], 0.03, 0.006, 'p', { k: 0.01, tag: 'iron' }); }
  S.limb([0, -0.2, 0], [0, 0.12, 0], 0.068, 0.068, 'p', { k: 0.01, tag: 'strap' });
}
const cycHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin, PELT = [110, 74, 44];
  const wrap = (fn) => (c, o) => {
    fn(c, o);
    if (near(o, PELT, 0.14)) return furTexel(c, o, hex('#5a3e26'), PELT, H, 0.018, (K.vnoise(c.x * 30, c.y * 30, c.z * 30) > 0.62 ? 0.18 : 0)); // spotted hide loincloth
    if (!near(o, sk, 0.12)) return;
    if (c.nz > 0.2 && c.y > P.pelvisY && c.y < P.bustY && Math.abs(c.x) < 0.04 * H && K.vnoise(c.x * 200, c.y * 120, c.z * 200) > 0.5) return recolor(o, hex('#3a2a20'), sk); // belly hair
    recolor(o, SKIN, sk, 0, c, 'skin', 1.0); // warts, scars, wrinkles, sun blotches
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
};
export const warmCyclops = () => { prop('cyc-eye', eyeBrow, FACE_PAL); prop('cyc-jaw', underbite, FACE_PAL); prop('club', club, CLUB_PAL, { cell: 0.018, target: 2200 }); };
export const createCyclops = (seed = 1) => limboBeast({
  id: 'cyclops', height: 3.1, chest: [1.18, 1.04, 1.15], blood: [0.12, 0.004, 0.006], speed: 0.8, sway: 0.8, impact: 0.45,
  app: { skin: 0xa07e66, hair: 0x2a2018, hairStyle: 'bald', facialHair: 'stubble', build: 'heavy', age: 0.85, nose: 2, ears: 2, mouth: 1, height: 1 },
  outfit: { legs: { tex: 'c_skirt', color: 0x6e4a2c }, legsKind: 'skirt' }, overrides: { eyeW: 0.02, eyeH: 0.02, hairVolume: 0.7 }, hook: cycHook,
  build(ctx) {
    const { L, sc } = ctx; const hr = L.restOf('head'); const P = ctx.P;
    const E = prop('cyc-eye', eyeBrow, FACE_PAL, { cell: 0.01, target: 1600, atlas: 160 }); mount(ctx, 'head', K.mesh(E.geo, E.mat), { at: [0, (P.browY - 0.01 - hr.y) * sc, (P.zf - 0.012 - hr.z) * sc] });
    const U = prop('cyc-jaw', underbite, FACE_PAL, { cell: 0.008, target: 900, atlas: 128 }); mount(ctx, 'head', K.mesh(U.geo, U.mat), { at: [0, (P.mouthY - 0.008 - hr.y) * sc, (P.zf - 0.03 - hr.z) * sc] });
    const C = prop('club', club, CLUB_PAL, { cell: 0.018, target: 2200 }); const cm = K.mesh(C.geo, C.mat); cm.rotation.x = Math.PI / 2; mount(ctx, 'handR', cm, { at: [0, -0.08 * sc, 0.01 * sc] });
  },
  pose(add, t, st, ctx) { add('spine', 0.06); add('neck', 0.12); add('head', -0.06); add('uarmL', 0, 0, 0.2); add('uarmR', 0, 0, -0.16); if (ctx.anim.mode === 'idle') { add('farmR', -0.7); add('handR', 0.5); } },
}, seed);
