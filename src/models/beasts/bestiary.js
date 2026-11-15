// The experimental bestiary's beasts, on the sculpt kit (kit.js: SDF sculpt -> skinned low-poly mesh -> hand-painted
// pixel page, procedural key clips). Oddworld-minded: believable weight and anatomy, one or two traits pushed for
// character, weathered lived-in surfaces, real faces (no cartoon eyes). Each is built once, cached, and cloned.
//   karkinos        Hera's crab: a barnacled domed carapace, eye stalks, one oversized crusher claw, eight walking legs
//   boar            the Erymanthian Boar: a mountain of shoulder hump and bristle ridge, long snout, up-curled tusks
//   teumessian_fox  a lean russet fox with huge ears and an enormous brush of a tail, black stockings, a sly long face
//   salamander      a giant fire salamander: charcoal hide split by glowing ember cracks, flat head, sprawled legs
//   stymphalian     a heron-tall bird of hammered bronze: blade feathers, a spear beak, scaly legs, metal wings
//   bronze_bull     Khalkotauros: a riveted bronze bull with a furnace glowing through every seam, nostrils and maw
//   ladon           the hundred-voiced serpent of the Hesperides, coiled round a stump that bears three golden apples
import { K, THREE, hex, quadRows, sculptQuad, asset, createGeneric, curved, rigidSkinned, add, fallSide } from './kit.js';

const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const J = (rows) => Object.fromEntries(rows.map(([n, , p]) => [n, p]));

// ================================================================== KARKINOS (crab)
const CRAB = (() => {
  const rows = [['root', null, [0, 0, 0]], ['body', 'root', [0, 0.52, 0]], ['eye_L', 'body', [0.11, 0.7, 0.36]], ['eye_R', 'body', [-0.11, 0.7, 0.36]], ['mouth', 'body', [0, 0.5, 0.38]]];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const big = s < 0 ? 1.25 : 1; // the right claw is the crusher
    rows.push(['carm1' + L, 'body', [0.3 * s, 0.5, 0.3]], ['carm2' + L, 'carm1' + L, [0.52 * s, 0.56, 0.5]], ['claw' + L, 'carm2' + L, [0.5 * s, 0.6, 0.78 * big]], ['pincer' + L, 'claw' + L, [0.44 * s, 0.56, 0.92 * big]]);
    for (let i = 0; i < 4; i++) { const z = 0.16 - i * 0.17; rows.push(['leg' + i + 'a' + L, 'body', [0.42 * s, 0.5, z]], ['leg' + i + 'b' + L, 'leg' + i + 'a' + L, [0.68 * s, 0.6, z * 1.1]], ['leg' + i + 'c' + L, 'leg' + i + 'b' + L, [0.86 * s, 0.3, z * 1.16]]); }
  }
  return rows;
})();
const CJ = J(CRAB);
const CRAB_PAL = {
  shell: { s: 'scale', c: hex('#8e3a22'), back: hex('#6a2a18'), backY: 0.55, sz: 0.05, seam: 0.05, age: 0.8, fn: (c, o, q, L) => { if (c.ny > 0.4 && K.vnoise(c.x * 14, c.y * 14, c.z * 14) > 0.7) K.tone(hex('#a85a34'), L + 0.05, o.col); } },
  belly: { s: 'scale', c: hex('#d2b48e'), sz: 0.06, age: 0.4 }, tip: { s: 'keratin', c: hex('#1e1614'), rings: 120 }, joint: { s: 'skin', c: hex('#c89070'), age: 0.6 },
  barn: { s: 'rock', c: hex('#bdb6a4'), age: 0.9 }, eye: { s: 'eye', c: hex('#1a1210'), pupil: 'none', iris: 0.95, rim: hex('#2a1810') }, mouth: { s: 'dark', c: hex('#3a1a14') },
  default: { s: 'scale', c: hex('#8e3a22') },
};
function crabSculpt(S) {
  // the domed carapace: wider than long, a scalloped spiny rim, a ridged brow between the eye stalks
  S.blob([0, 0.6, 0.0], [0.56, 0.24, 0.42], 'body', { k: 0.08, tag: 'shell' });
  S.blob([0, 0.72, -0.06], [0.42, 0.16, 0.32], 'body', { k: 0.08, tag: 'shell' });
  S.blob([0, 0.48, 0.0], [0.44, 0.1, 0.34], 'body', { k: 0.06, tag: 'belly' });
  S.blob([0, 0.62, 0.32], [0.2, 0.08, 0.08], 'body', { k: 0.04, tag: 'shell' }); // brow
  S.sym((s) => {
    for (let i = 0; i < 6; i++) { const a = 0.35 + i * 0.36; const p = [Math.sin(a) * 0.52 * s, 0.6, Math.cos(a) * 0.4]; S.limb(p, [p[0] * 1.12, 0.62, p[2] * 1.12 + 0.02], 0.035, 0.006, 'body', { k: 0.02, tag: 'tip' }); }
    for (const [x, z, r] of [[0.22, -0.18, 0.05], [0.3, 0.05, 0.035], [0.12, -0.28, 0.04], [0.36, -0.12, 0.03]]) S.blob([x * s, 0.74 - Math.abs(x) * 0.12, z], [r, r * 0.7, r], 'body', { k: 0.015, tag: 'barn' });
    S.limb([0.1 * s, 0.6, 0.32], [0.11 * s, 0.7, 0.36], 0.022, 0.018, ['body', 'eye' + (s > 0 ? '_L' : '_R')], { k: 0.01, tag: 'joint' });
    S.blob([0.11 * s, 0.72, 0.37], [0.028, 0.03, 0.028], 'eye' + (s > 0 ? '_L' : '_R'), { k: 0.006, tag: 'eye', dir: [0.2 * s, 0.3, 0.9], imp: 4 });
  });
  S.box([0, 0.5, 0.39], [0.08, 0.04, 0.02], 0.01, 'mouth', { k: 0.01, tag: 'mouth' });
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const big = s < 0 ? 1.25 : 1; const a1 = CJ['carm1' + L], a2 = CJ['carm2' + L], cl = CJ['claw' + L], pc = CJ['pincer' + L];
    S.limb(a1, a2, 0.07, 0.06, 'carm1' + L, { k: 0.03, tag: 'shell' }); S.limb(a2, cl, 0.065, 0.085 * big, 'carm2' + L, { k: 0.03, tag: 'shell' });
    S.blob(lerp3(cl, pc, 0.1), [0.14 * big, 0.12 * big, 0.2 * big], 'claw' + L, { k: 0.04, tag: 'shell', dir: [0, 0.05, 1] }); // the palm of the claw
    S.limb(pc, [pc[0], pc[1] - 0.06 * big, pc[2] + 0.2 * big], 0.06 * big, 0.012, 'claw' + L, { k: 0.02, tag: 'tip' }); // fixed finger
    S.limb([pc[0], pc[1] + 0.08 * big, pc[2] - 0.02], [pc[0], pc[1] + 0.02, pc[2] + 0.2 * big], 0.05 * big, 0.01, 'pincer' + L, { k: 0.02, tag: 'tip' }); // the moving finger
    for (let i = 0; i < 3; i++) S.blob([pc[0] + (i - 1) * 0.02, pc[1] + 0.01, pc[2] + 0.02 + i * 0.05], [0.012, 0.012, 0.012], 'claw' + L, { k: 0.006, tag: 'barn' }); // crushing teeth
    for (let i = 0; i < 4; i++) {
      const a = CJ['leg' + i + 'a' + L], b = CJ['leg' + i + 'b' + L], c = CJ['leg' + i + 'c' + L]; const tip = [c[0] + 0.03 * s, 0.0, c[2] * 1.04];
      S.limb(a, b, 0.06, 0.05, 'leg' + i + 'a' + L, { k: 0.02, tag: 'shell' }); S.limb(b, c, 0.05, 0.036, 'leg' + i + 'b' + L, { k: 0.02, tag: 'shell' }); S.limb(c, tip, 0.036, 0.008, 'leg' + i + 'c' + L, { k: 0.01, tag: 'tip' });
      S.blob(b, [0.035, 0.035, 0.035], ['leg' + i + 'a' + L, 'leg' + i + 'b' + L], { k: 0.01, tag: 'joint' });
    }
  }
}
const crabA = () => asset('karkinos', { bones: CRAB, sculpt: crabSculpt, pal: CRAB_PAL, cell: 0.016, target: 9000, atlas: 512, maxChart: 0.025, woundScale: 0.6, woundSkip: ['eye', 'tip', 'barn'] });
const legs = (P, f) => { for (let i = 0; i < 4; i++) for (const [s, L] of [[1, '_L'], [-1, '_R']]) f(P, i, s, L); };
const CRAB_CLIPS = {
  attack: [[0, {}], [0.3, { _pos: [0, 0.06, -0.12], body: [-0.15, 0, 0], carm1_L: [-0.6, 0.4, 0.3], carm1_R: [-0.6, -0.4, -0.3], carm2_L: [-0.5, 0, 0], carm2_R: [-0.5, 0, 0], pincer_L: [-0.6, 0, 0], pincer_R: [-0.7, 0, 0] }],
    [0.42, { _pos: [0, -0.02, 0.32], body: [0.12, 0, 0], carm1_L: [0.4, -0.25, -0.1], carm1_R: [0.45, 0.25, 0.1], carm2_L: [0.3, 0, 0], carm2_R: [0.3, 0, 0], pincer_L: [0.25, 0, 0], pincer_R: [0.3, 0, 0] }],
    [0.62, { _pos: [0, 0, 0.18], carm1_L: [0.2, 0, 0], carm1_R: [0.2, 0, 0], pincer_L: [-0.3, 0, 0], pincer_R: [-0.4, 0, 0] }], [0.95, {}]],
  cast: [[0, {}], [0.35, { _pos: [0, -0.12, 0], body: [0.1, 0, 0], carm1_L: [0.3, 0.5, 0.2], carm1_R: [0.3, -0.5, -0.2], carm2_L: [0.6, 0, 0], carm2_R: [0.6, 0, 0] }], [0.9, { _pos: [0, -0.12, 0], carm1_L: [0.3, 0.5, 0.2], carm1_R: [0.3, -0.5, -0.2] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.05, -0.18], body: [-0.2, 0.15, 0.1], eye_L: [-0.5, 0, 0], eye_R: [-0.5, 0, 0], carm1_L: [-0.4, 0.3, 0.3], carm1_R: [-0.4, -0.3, -0.3] }], [0.35, { body: [0.05, -0.05, 0] }], [0.7, {}]],
  die: [[0, {}], [0.2, { body: [-0.2, 0, 0], eye_L: [-0.6, 0, 0], eye_R: [-0.6, 0, 0] }], [0.7, { body: [0.1, 0, 0], eye_L: [0.9, 0, 0.4], eye_R: [0.9, 0, -0.4], carm1_L: [0.6, 0, 0.5], carm1_R: [0.6, 0, -0.5], pincer_L: [-0.5, 0, 0], pincer_R: [-0.5, 0, 0] }]],
};
const CRAB_SPEC = {
  id: 'karkinos', bones: CRAB, height: 0.85, asset: crabA, clips: CRAB_CLIPS, impact: 0.42, lungeK: 0.05,
  follow: { eye_L: [12, 0.3], eye_R: [12, 0.3], pincer_L: [20, 0.4], pincer_R: [20, 0.4] },
  idle(P, t, st) {
    const br = Math.sin(t * 1.6); add(P, 'body', br * 0.02, Math.sin(t * 0.4) * 0.05, 0);
    add(P, 'eye_L', Math.sin(t * 1.3) * 0.15, Math.sin(t * 0.7) * 0.3, 0); add(P, 'eye_R', Math.sin(t * 1.1 + 1) * 0.15, Math.sin(t * 0.9 + 2) * 0.3, 0);
    const snap = Math.max(0, Math.sin(t * 0.9)) ** 10; add(P, 'pincer_L', -0.35 * (1 - snap) - 0.1); add(P, 'pincer_R', -0.3 + Math.sin(t * 7) * 0.05 - snap * 0.3); // the crusher clicks now and then
    add(P, 'carm1_L', Math.sin(t * 0.8) * 0.06); add(P, 'carm1_R', Math.sin(t * 0.7 + 1) * 0.05);
    legs(P, (Q, i, s, L) => add(Q, 'leg' + i + 'a' + L, 0, 0, Math.max(0, Math.sin(t * 2 + i * 1.7 + s)) ** 6 * 0.25 * s)); // restless leg taps
    if (st.talk > 0) add(P, 'mouth', 0, 0, 0);
  },
  gait(P, g, a) { legs(P, (Q, i, s, L) => { const ph = g * 1.6 + i * 1.57 + (s > 0 ? 0 : Math.PI); add(Q, 'leg' + i + 'a' + L, 0, Math.sin(ph) * 0.3 * a, Math.max(0, Math.cos(ph)) * 0.35 * s * a); }); add(P, 'body', 0, 0, Math.sin(g * 3.2) * 0.05 * a); },
  death: (T, m, ctx) => { const u = Math.min(1, Math.max(0, (T - 0.2) / 0.5)); m.position.y = -u * 0.12 * ctx.sc; m.rotation.z = Math.sin(u * Math.PI) * 0.12; legs(null, () => {}); }, // its legs fold, it slumps flat
  // the crab's flip (Karkinos.struck stuns it): rolled onto its back for the stun, legs waving in the air
  hover: (t, st, ctx) => (ctx.vars.fk || 0) * 0.55 * ctx.spec_h * ctx.sc,
  after(dt, t, ctx) {
    const V = ctx.vars; const fl = ctx.root.userData.flipped && !(ctx.st.dead > 0) ? 1 : 0; V.fk = (V.fk || 0) + (fl - (V.fk || 0)) * Math.min(1, dt * 6); if (V.fk > 0.001) ctx.model.rotation.z = V.fk * Math.PI * 0.94;
    if (V.fk > 0.5) legs(null, (Q, i, s, L) => { const b = ctx.B.map['leg' + i + 'a' + L]; if (b) b.rotation.y += Math.sin(t * 14 + i * 1.3 + s) * 0.35; }); // legs waving helplessly
    if (ctx.st.dead > 0) { const u = Math.min(1, ctx.st.deadT / 0.8); legs(null, (Q, i, s, L) => { const b = ctx.B.map['leg' + i + 'b' + L]; if (b) b.rotation.z += -0.7 * u * s; }); }
  },
};

// ================================================================== ERYMANTHIAN BOAR
const BO = { Lb: 1.1, Hw: 0.9, W: 0.19, Ln: 0.2, Lh: 0.45, Hd: -0.12, tail: 3, tailDir: [0, -0.7, -0.6], tailLen: 0.32 };
const BOAR = quadRows(BO); const BJ = J(BOAR);
const BOAR_PAL = {
  hide: { s: 'fur', c: hex('#74604a'), back: hex('#4a3c30'), backY: 0.5, belly: hex('#8a7860'), fs: 20, strand: 0.36, flow: 0.4, age: 0.95, skin: hex('#5a4a40') },
  bristle: { s: 'fur', c: hex('#3a2e26'), fs: 14, strand: 0.5, flow: 0.6, age: 0.6, fn: (c, o, q, L) => { if (K.vnoise(c.x * 60, c.y * 20, c.z * 60) > 0.62) K.tone(hex('#a89070'), L + 0.1, o.col); } }, belly: { s: 'fur', c: hex('#8a7a62'), fs: 26, age: 0.9 },
  snout: { s: 'skin', c: hex('#8a6a5a'), age: 1 }, nose: { s: 'skin', c: hex('#3a2a28'), ro: 0.3, L: 0.05 }, hoof: { s: 'keratin', c: hex('#221c1a') }, leg: { s: 'fur', c: hex('#54463a'), fs: 30, age: 0.9 },
  eye: { s: 'eye', c: hex('#4a1e12'), pupil: 'round', pupilR: 0.35 }, ear: { s: 'fur', c: hex('#3a2e26'), fs: 30 }, mouth: { s: 'dark', c: hex('#4a1a1a') },
  default: { s: 'fur', c: hex('#4e4034') },
};
function boarSculpt(S) {
  const { Hw } = BO;
  sculptQuad(S, BJ, BO, { bulk: 1.32, depth: 1.2, tuck: 0.04, hoof: true, legR: 0.9, tags: { body: 'hide', belly: 'belly', leg: 'leg', paw: 'hoof' } });
  S.blob([0, Hw * 1.14, 0.22], [0.27, 0.2, 0.38], ['spine2', 'spine3'], { k: 0.08, tag: 'hide' }); // the great shoulder hump
  S.limb([0, 0.98, 0.48], [0, 0.94, 0.68], 0.27, 0.19, ['neck1', 'neck2'], { k: 0.06, tag: 'hide' });
  S.blob([0, 0.93, 0.74], [0.15, 0.17, 0.17], 'head', { k: 0.05, tag: 'hide', imp: 3 });
  S.limb([0, 0.9, 0.82], [0, 0.8, 1.08], 0.11, 0.072, 'head', { k: 0.04, tag: 'snout', imp: 3 });
  S.blob([0, 0.79, 1.1], [0.075, 0.062, 0.03], 'head', { k: 0.015, tag: 'nose', imp: 4 });
  S.sym((s) => S.box([0.028 * s, 0.79, 1.13], [0.012, 0.016, 0.02], 0.006, 'head', { k: 0.004, tag: 'mouth', sub: true }));
  S.limb([0, 0.82, 0.8], [0, 0.76, 1.0], 0.085, 0.05, 'jaw', { k: 0.03, tag: 'snout', imp: 3 });
  S.box([0, 0.795, 0.95], [0.05, 0.006, 0.08], 0.003, 'head', { k: 0.006, tag: 'mouth', sub: true, rot: [0.3, 0, 0] });
  S.sym((s, L) => {
    S.blob([0.095 * s, 0.985, 0.85], [0.016, 0.014, 0.014], 'head', { k: 0.005, tag: 'eye', dir: [0.6 * s, 0.1, 0.8], imp: 4 });
    S.blob([0.1 * s, 1.0, 0.86], [0.035, 0.018, 0.03], 'head', { k: 0.012, tag: 'hide', imp: 3 }); // a heavy brow over the small eye
    S.blob([0.1 * s, 1.07, 0.7], [0.04, 0.07, 0.016], 'ear' + L, { k: 0.02, tag: 'ear', rot: [-0.4, 0.5 * s, -0.4 * s], imp: 2 });
    for (let i = 0; i < 4; i++) S.limb([0.12 * s, 0.9 - i * 0.03, 0.72], [0.2 * s, 0.84 - i * 0.04, 0.62], 0.04, 0.008, 'head', { k: 0.015, tag: 'bristle' }); // cheek whiskers of bristle
  });
  for (let i = 0; i < 16; i++) { // the bristle ridge from crown to rump
    const k = i / 15; const z = 0.72 - k * 1.2; const y = 1.0 + Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.18 - k * 0.12; const bn = k < 0.2 ? 'neck2' : k < 0.45 ? 'spine3' : k < 0.7 ? 'spine2' : 'spine1';
    S.limb([0, y + 0.02, z], [0, y + 0.13 - k * 0.04, z - 0.07], 0.05, 0.008, bn, { k: 0.03, tag: 'bristle' });
  }
  const T = ['tail1', 'tail2', 'tail3']; const tp = T.map((n) => BJ[n]); tp.push(BOAR.tailEnd); S.chain(tp, [0.03, 0.02, 0.018, 0.03], T, { k: 0.02, tag: 'bristle' });
}
const boarA = () => asset('boar', { bones: BOAR, sculpt: boarSculpt, pal: BOAR_PAL, cell: 0.017, target: 10000, atlas: 512, maxChart: 0.025, woundScale: 0.9, woundSkip: ['eye', 'nose', 'mouth', 'hoof'] });
const BOAR_CLIPS = {
  attack: [[0, {}], [0.3, { _pos: [0, -0.06, -0.2], pelvis: [0.1, 0, 0], neck1: [0.35, 0, 0], head: [0.3, 0, 0], farm_L: [0.4, 0, 0], farm_R: [0.3, 0, 0], thigh_L: [-0.4, 0, 0], thigh_R: [-0.45, 0, 0] }],
    [0.42, { _pos: [0, 0.04, 0.55], neck1: [0.25, 0, 0], head: [-0.55, 0.2, 0.2], jaw: [0.3, 0, 0], farm_L: [-0.8, 0, 0], farm_R: [-0.7, 0, 0], thigh_L: [0.5, 0, 0], thigh_R: [0.5, 0, 0] }], // the upward tusk rip
    [0.62, { _pos: [0, 0, 0.35], head: [-0.2, -0.2, -0.15], neck1: [0.1, 0, 0] }], [0.95, {}]],
  cast: [[0, {}], [0.3, { neck1: [-0.3, 0, 0], head: [-0.4, 0, 0], jaw: [0.4, 0, 0], farm_L: [-0.3, 0, 0] }], [0.6, { farm_L: [0.4, 0, 0], neck1: [0.3, 0, 0], head: [0.2, 0, 0] }], [0.9, { farm_L: [-0.3, 0, 0], neck1: [0.25, 0, 0] }], [1.3, {}]], // snort and paw the ground
  hurt: [[0, {}], [0.1, { _pos: [0, 0.04, -0.16], spine2: [-0.08, 0.15, 0.08], neck1: [-0.2, 0.3, 0], head: [-0.25, 0.35, 0.15], jaw: [0.4, 0, 0], ear_L: [0.5, 0, 0], ear_R: [0.5, 0, 0], tail1: [-0.6, 0, 0] }], [0.35, { head: [0.1, -0.1, 0] }], [0.7, {}]],
  die: [[0, {}], [0.2, { neck1: [-0.3, 0.2, 0], head: [-0.3, 0.3, 0.2], jaw: [0.5, 0, 0] }], [0.6, { farm_L: [0.5, 0, 0.3], farm_R: [0.5, 0, -0.3], thigh_L: [-0.5, 0, 0.3], thigh_R: [-0.5, 0, -0.3], head: [0.3, 0, 0], jaw: [0.4, 0, 0] }]],
};
const BOAR_SPEC = {
  id: 'boar', bones: BOAR, height: 1.25, asset: boarA, clips: BOAR_CLIPS, impact: 0.42, lungeK: 0.08,
  follow: { neck2: [20, 0.5], head: [18, 0.45], ear_L: [10, 0.25], ear_R: [10, 0.25], jaw: [16, 0.3], tail1: [9, 0.25], tail2: [8, 0.25], tail3: [7, 0.25] },
  props(ctx) { // up-curled ivory tusks from the lower jaw, and a pair of shorter whetters above
    const tusk = K.uvMat('boar-tusk', 16, 48, (u, v, o) => K.tone(v > 0.8 ? hex('#8a7a5a') : hex('#e6dcc0'), K.band(0.58 + Math.cos(u * 6.28) * 0.2 - v * 0.12 + (Math.sin(v * 60) > 0.85 ? -0.08 : 0), 3), o.col));
    const parts = []; for (const s of [-1, 1]) { parts.push([curved([0.06 * s, 0.79, 0.98], [0.35 * s, 1, 0.2], 0.2, 0.024, [0.05 * s, -0.02, -0.12], 7, 6), 'jaw'], [curved([0.055 * s, 0.82, 1.0], [0.5 * s, 0.5, 0.4], 0.07, 0.014, [0, -0.02, 0], 5, 5), 'head']); }
    rigidSkinned(ctx.B, parts, ctx.own(tusk), ctx.model);
  },
  idle(P, t, st) {
    const br = Math.sin(t * 1.5), snort = Math.max(0, Math.sin(t * 0.55)) ** 12;
    add(P, 'spine2', br * 0.022); add(P, 'neck1', 0.06 + snort * 0.1, Math.sin(t * 0.4) * 0.1); add(P, 'head', 0.06 - snort * 0.25, Math.sin(t * 0.4 + 0.5) * 0.12, Math.sin(t * 0.3) * 0.06);
    add(P, 'jaw', 0.04 + snort * 0.2 + (st.talk > 0 ? Math.abs(Math.sin(t * 13)) * 0.3 : 0)); add(P, 'tail1', 0.2, Math.sin(t * 6) * 0.4, 0);
    add(P, 'farm_L', Math.max(0, Math.sin(t * 0.37)) ** 14 * -0.5); // paws the ground, impatient
    add(P, 'ear_L', Math.max(0, Math.sin(t * 0.8) - 0.9) * 4); add(P, 'ear_R', Math.max(0, Math.sin(t * 0.7 + 2) - 0.9) * 4);
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g * 1.2 + ph) * 0.55 * a); add(P, 'spine2', Math.sin(g * 2.4) * 0.04 * a); add(P, 'head', Math.sin(g * 2.4) * 0.06 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.1, rot: 1.42, lift: 0.1, slide: 0.06, t0: 0.32, t1: 0.66 }),
};

// ================================================================== TEUMESSIAN FOX
const FO = { Lb: 0.62, Hw: 0.5, W: 0.085, Ln: 0.24, Lh: 0.28, Hd: 0.03, tail: 5, tailDir: [0, 0.18, -1], tailLen: 0.8 };
const FOX = quadRows(FO); const FJ = J(FOX); const FH = FJ.head;
const foxTail = (c, o, q, L) => { if (c.z < FOX.tailEnd[2] + 0.16) K.tone(hex('#efe6d6'), L + 0.05, o.col); };
const FOX_PAL = {
  fur: { s: 'fur', c: hex('#b4602a'), back: hex('#8a4420'), backY: 0.55, belly: hex('#e6dac6'), fs: 34, strand: 0.26, age: 0.5, skin: hex('#6a4a3a') },
  white: { s: 'fur', c: hex('#ece2d2'), fs: 40, strand: 0.14, age: 0.2 }, sock: { s: 'fur', c: hex('#2a201c'), fs: 40, age: 0.3 }, tail: { s: 'fur', c: hex('#b8642c'), back: hex('#8e4a22'), fs: 18, strand: 0.42, flow: 0.5, fn: foxTail, age: 0.3 },
  ear: { s: 'fur', c: hex('#9a4e24'), fs: 40, fn: (c, o, q, L) => { if (c.y > FH[1] + 0.09) K.tone(hex('#221a18'), L, o.col); } }, nose: { s: 'skin', c: hex('#1c1616'), ro: 0.25, L: 0.05 },
  eye: { s: 'eye', c: hex('#d89a2a'), pupil: 'slit', rim: hex('#1a1210') }, mouth: { s: 'dark', c: hex('#4a1418') }, default: { s: 'fur', c: hex('#b4602a') },
};
function foxSculpt(S) {
  sculptQuad(S, FJ, FO, { bulk: 0.78, depth: 1.05, tuck: 0.26, legR: 0.85, tags: { body: 'fur', belly: 'white', leg: 'sock', paw: 'sock' } });
  const [, hy, hz] = FH;
  S.limb([0, 0.56, 0.3], [0, 0.66, 0.47], 0.09, 0.066, ['neck1', 'neck2'], { k: 0.04, tag: 'fur' });
  S.blob([0, 0.5, 0.36], [0.075, 0.1, 0.07], 'spine3', { k: 0.04, tag: 'white' }); // a white bib
  S.blob([0, hy + 0.008, hz + 0.01], [0.072, 0.062, 0.078], 'head', { k: 0.03, tag: 'fur', imp: 3 });
  S.limb([0, hy - 0.005, hz + 0.05], [0, hy - 0.03, hz + 0.2], 0.04, 0.013, 'head', { k: 0.02, tag: 'fur', imp: 3 }); // a long narrow muzzle
  S.blob([0, hy - 0.031, hz + 0.205], [0.013, 0.011, 0.011], 'head', { k: 0.005, tag: 'nose', imp: 4 });
  S.limb([0, hy - 0.03, hz + 0.05], [0, hy - 0.042, hz + 0.18], 0.028, 0.01, 'jaw', { k: 0.015, tag: 'white', imp: 3 });
  S.box([0, hy - 0.036, hz + 0.13], [0.018, 0.004, 0.06], 0.002, 'head', { k: 0.004, tag: 'mouth', sub: true });
  S.sym((s, L) => {
    S.blob([0.05 * s, hy - 0.018, hz + 0.02], [0.042, 0.034, 0.04], 'head', { k: 0.018, tag: 'white', imp: 3 }); // cheek ruffs
    for (let i = 0; i < 3; i++) S.limb([0.06 * s, hy - 0.02 - i * 0.012, hz], [0.11 * s, hy - 0.05 - i * 0.015, hz - 0.03], 0.02, 0.005, 'head', { k: 0.01, tag: 'white' });
    S.blob([0.03 * s, hy + 0.022, hz + 0.06], [0.013, 0.01, 0.011], 'head', { k: 0.004, tag: 'eye', dir: [0.42 * s, 0.1, 0.9], imp: 4 });
    S.blob([0.058 * s, hy + 0.1, hz - 0.012], [0.04, 0.075, 0.013], 'ear' + L, { k: 0.015, tag: 'ear', rot: [-0.12, 0.35 * s, -0.22 * s], imp: 2 }); // huge ears
  });
  const T = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5']; const tp = T.map((n) => FJ[n]); tp.push(FOX.tailEnd);
  S.chain(tp, [0.05, 0.09, 0.12, 0.125, 0.105, 0.035], T, { k: 0.05, tag: 'tail' }); // the enormous brush
}
const foxA = () => asset('teumessian_fox', { bones: FOX, sculpt: foxSculpt, pal: FOX_PAL, cell: 0.0105, target: 9000, atlas: 512, maxChart: 0.018, woundScale: 0.55, woundSkip: ['eye', 'nose', 'mouth'] });
const FOX_CLIPS = {
  attack: [[0, {}], [0.26, { _pos: [0, -0.06, -0.12], pelvis: [0.12, 0, 0], neck1: [0.25, 0, 0], head: [0.2, 0, 0], farm_L: [0.4, 0, 0], farm_R: [0.4, 0, 0], thigh_L: [-0.5, 0, 0], thigh_R: [-0.5, 0, 0], shin_L: [0.5, 0, 0], shin_R: [0.5, 0, 0], tail1: [0.4, 0, 0] }],
    [0.36, { _pos: [0, 0.18, 0.4], pelvis: [-0.1, 0, 0], neck1: [-0.15, 0, 0], jaw: [0.7, 0, 0], farm_L: [-1.0, 0, 0], farm_R: [-0.9, 0, 0], thigh_L: [0.6, 0, 0], thigh_R: [0.6, 0, 0], tail1: [-0.4, 0, 0] }],
    [0.46, { _pos: [0, 0.04, 0.5], head: [0.2, 0.2, 0.2], jaw: [0.0, 0, 0] }], [0.65, { _pos: [0, 0.1, 0.1], tail1: [0.2, 0.6, 0] }], [0.9, {}]], // a snap, then it springs back out of reach
  cast: [[0, {}], [0.3, { neck1: [-0.4, 0, 0], head: [-0.4, 0, 0], jaw: [0.5, 0, 0], tail1: [-0.3, 0.3, 0] }], [0.9, { neck1: [-0.35, 0, 0], head: [-0.35, 0, 0], jaw: [0.45, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.05, -0.16], spine2: [-0.1, 0.2, 0.1], neck1: [-0.2, 0.35, 0], head: [-0.3, 0.4, 0.2], jaw: [0.4, 0, 0], ear_L: [0.6, 0, 0], ear_R: [0.6, 0, 0], tail1: [0.6, 0, 0] }], [0.32, { head: [0.1, -0.1, 0] }], [0.62, {}]],
  die: [[0, {}], [0.15, { neck1: [-0.3, 0.3, 0], head: [-0.4, 0.4, 0.2], jaw: [0.5, 0, 0] }], [0.7, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3], neck1: [-0.2, 0.4, 0], head: [0.1, 0.3, 0.3], tail1: [0.4, 0.4, 0], tail2: [0.3, 0.3, 0] }]],
};
const FOX_SPEC = {
  id: 'teumessian_fox', bones: FOX, height: 0.82, scale: 1.55, asset: foxA, clips: FOX_CLIPS, impact: 0.38, lungeK: 0.07,
  follow: { neck2: [24, 0.5], head: [22, 0.42], ear_L: [12, 0.25], ear_R: [12, 0.25], jaw: [18, 0.3], tail1: [6, 0.32], tail2: [5.5, 0.3], tail3: [5, 0.28], tail4: [4.5, 0.26], tail5: [4, 0.25] },
  idle(P, t, st) {
    const br = Math.sin(t * 2.6), tilt = Math.sin(t * 0.5);
    add(P, 'spine2', br * 0.015); add(P, 'neck1', 0.02 + Math.sin(t * 0.8) * 0.05, Math.sin(t * 0.45) * 0.2); add(P, 'head', 0.05, Math.sin(t * 0.45 + 0.6) * 0.18, tilt * 0.22); // the sly head-tilt
    add(P, 'jaw', 0.06 + (st.talk > 0 ? Math.abs(Math.sin(t * 16)) * 0.4 : 0)); for (let i = 1; i <= 5; i++) add(P, 'tail' + i, 0.1 - i * 0.02, Math.sin(t * 1.4 - i * 0.6) * 0.12 * i, 0);
    add(P, 'ear_L', Math.max(0, Math.sin(t * 1.1) - 0.85) * 3, 0, Math.sin(t * 0.6) * 0.1); add(P, 'ear_R', Math.max(0, Math.sin(t * 0.9 + 2) - 0.85) * 3, 0, -Math.sin(t * 0.6) * 0.1);
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g * 1.3 + ph) * 0.7 * a); add(P, 'fore_L', -Math.max(0, Math.cos(g * 1.3)) * 0.8 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g * 1.3)) * 0.8 * a); },
  // never quite where you look: a faint flicker sideways now and then (it is fated not to be caught)
  after(dt, t, ctx) { if (ctx.st.dead > 0) return; const f = Math.max(0, Math.sin(t * 0.7)) ** 30; ctx.model.position.x += Math.sin(t * 40) * f * 0.05 * ctx.sc; },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.12, rot: 1.36, lift: 0.06, slide: 0.05, t0: 0.3, t1: 0.6 }),
};

// ================================================================== FIRE SALAMANDER
const SO = { Lb: 1.2, Hw: 0.4, W: 0.25, Ln: 0.12, Lh: 0.32, Hd: -0.04, tail: 6, tailDir: [0, -0.14, -1], tailLen: 1.3 };
const SAL = quadRows(SO); const SJ = J(SAL); const SH = SJ.head;
const ember = (c, o, q, L) => { // glowing ember cracks and molten spots through the charcoal hide
  const C = K.cells3(c.x / 0.05, c.y / 0.05, c.z / 0.05); const crack = C[1] - C[0] < 0.045 && c.ny > -0.3; const spot = K.vnoise(c.x * 9, c.y * 9, c.z * 9) > 0.66 && c.ny > 0;
  if (spot) { K.tone(hex('#f0a020'), Math.min(0.85, L + 0.25), o.col); o.em = [210, 110, 20]; } else if (crack) { K.tone(hex('#ff6a1a'), 0.62, o.col); o.em = [200, 70, 12]; }
};
const SAL_PAL = {
  skin: { s: 'skin', c: hex('#2a2422'), age: 0.6, fn: ember, ro: 0.5 }, belly: { s: 'skin', c: hex('#6a3a1e'), age: 0.3, fn: (c, o) => { if (K.vnoise(c.x * 20, c.y * 20, c.z * 20) > 0.6) { o.em = [120, 40, 8]; } } },
  gland: { s: 'skin', c: hex('#d87a1e'), e: [190, 90, 16], age: 0 }, eye: { s: 'eye', c: hex('#f0b040'), pupil: 'bar', rim: hex('#120a08') }, mouth: { s: 'dark', c: hex('#ff7a2a'), e: [220, 90, 20] },
  toe: { s: 'skin', c: hex('#3a2a24'), age: 0.4 }, default: { s: 'skin', c: hex('#2a2422') },
};
function salSculpt(S) {
  sculptQuad(S, SJ, SO, { bulk: 1.3, depth: 0.78, tuck: -0.12, legR: 1.25, tags: { body: 'skin', belly: 'belly', leg: 'skin', paw: 'toe' } });
  const [, hy, hz] = SH;
  S.limb([0, 0.4, 0.6], [0, 0.44, 0.72], 0.16, 0.14, ['neck1', 'neck2'], { k: 0.05, tag: 'skin' });
  S.blob([0, hy - 0.02, hz + 0.06], [0.15, 0.075, 0.15], 'head', { k: 0.05, tag: 'skin', imp: 3 }); // a broad flat head
  S.blob([0, hy - 0.03, hz + 0.17], [0.11, 0.055, 0.08], 'head', { k: 0.04, tag: 'skin', imp: 3 });
  S.limb([0, hy - 0.07, hz + 0.04], [0, hy - 0.075, hz + 0.21], 0.11, 0.075, 'jaw', { k: 0.03, tag: 'belly', imp: 3 });
  S.box([0, hy - 0.06, hz + 0.14], [0.11, 0.007, 0.09], 0.003, 'head', { k: 0.006, tag: 'mouth', sub: true });
  S.sym((s, L) => {
    S.blob([0.085 * s, hy + 0.03, hz + 0.1], [0.04, 0.038, 0.04], 'head', { k: 0.015, tag: 'skin', imp: 3 }); // eye turrets
    S.blob([0.092 * s, hy + 0.04, hz + 0.115], [0.026, 0.024, 0.026], 'head', { k: 0.006, tag: 'eye', dir: [0.6 * s, 0.4, 0.7], imp: 4 });
    S.blob([0.1 * s, hy + 0.01, hz - 0.04], [0.05, 0.03, 0.08], 'head', { k: 0.02, tag: 'gland', imp: 3 }); // the glowing parotoid glands
    for (const [bn, f] of [['fpaw' + L, 1], ['hock' + L, -1]]) { const p = SJ[bn]; for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.45 + 0.5 * s * f * 0; S.limb([p[0], 0.03, p[2] + (f > 0 ? 0.04 : 0.1)], [p[0] + Math.sin(a) * 0.09 * s + 0.04 * s, 0.012, p[2] + (f > 0 ? 0.04 : 0.1) + Math.cos(a) * 0.09], 0.02, 0.008, bn, { k: 0.01, tag: 'toe' }); } }
  });
  for (let i = 0; i < 10; i++) { const k = i / 9; const z = 0.5 - k * 0.95; S.blob([0, 0.42 + Math.sin(k * Math.PI) * 0.04, z], [0.05, 0.03, 0.06], k < 0.3 ? 'spine3' : k < 0.65 ? 'spine2' : 'spine1', { k: 0.03, tag: 'gland' }); } // a dorsal ridge of molten nodules
  const T = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6']; const tp = T.map((n) => SJ[n]); tp.push(SAL.tailEnd);
  S.chain(tp, [0.14, 0.12, 0.1, 0.08, 0.06, 0.04, 0.012], T, { k: 0.05, tag: 'skin' });
}
const salA = () => asset('salamander', { bones: SAL, sculpt: salSculpt, pal: SAL_PAL, cell: 0.014, target: 9000, atlas: 512, maxChart: 0.022, woundScale: 0.7, woundSkip: ['eye', 'mouth', 'gland'] });
const sprawl = { farm_L: [0, 0, 0.55], farm_R: [0, 0, -0.55], fore_L: [0.2, 0, -0.75], fore_R: [0.2, 0, 0.75], thigh_L: [0, 0, 0.5], thigh_R: [0, 0, -0.5], shin_L: [0, 0, -0.7], shin_R: [0, 0, 0.7] };
const SAL_CLIPS = {
  attack: [[0, {}], [0.28, { _pos: [0, 0.04, -0.15], neck1: [-0.35, 0, 0], head: [-0.25, 0, 0], jaw: [0.5, 0, 0], tail1: [0, 0.4, 0] }], [0.4, { _pos: [0, -0.02, 0.4], neck1: [0.2, 0, 0], head: [0.15, 0, 0], jaw: [0.05, 0, 0], tail1: [0, -0.3, 0] }], [0.62, { _pos: [0, 0, 0.2], jaw: [0.2, 0, 0] }], [0.95, {}]],
  cast: [[0, {}], [0.4, { neck1: [-0.45, 0, 0], head: [-0.35, 0, 0], jaw: [0.6, 0, 0], spine2: [-0.08, 0, 0] }], [0.9, { neck1: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: [0.55, 0, 0] }], [1.3, {}]], // rears and drinks the warmth
  hurt: [[0, {}], [0.1, { _pos: [0, 0.03, -0.16], spine2: [0, 0.3, 0.1], neck1: [-0.2, 0.4, 0], head: [-0.2, 0.4, 0.1], jaw: [0.4, 0, 0], tail1: [0, -0.6, 0], tail2: [0, -0.4, 0] }], [0.35, { head: [0.1, -0.1, 0] }], [0.7, {}]],
  die: [[0, {}], [0.2, { neck1: [-0.3, 0.3, 0], jaw: [0.5, 0, 0] }], [0.7, { neck1: [0.3, 0.4, 0], head: [0.2, 0.3, 0.2], jaw: [0.3, 0, 0], tail1: [0, 0.5, 0], tail2: [0, 0.4, 0], tail3: [0, 0.3, 0] }]],
};
const SAL_SPEC = {
  id: 'salamander', bones: SAL, height: 0.55, asset: salA, clips: SAL_CLIPS, impact: 0.4, lungeK: 0.06,
  follow: { neck2: [18, 0.5], head: [16, 0.45], jaw: [16, 0.3], tail1: [7, 0.35], tail2: [6, 0.32], tail3: [5.5, 0.3], tail4: [5, 0.28], tail5: [4.5, 0.26], tail6: [4, 0.25] },
  idle(P, t, st, ctx) {
    for (const [n, r] of Object.entries(sprawl)) add(P, n, r[0], r[1], r[2]);
    const br = Math.sin(t * 1.2); add(P, 'spine2', 0, 0, br * 0.02); add(P, 'neck1', Math.sin(t * 0.5) * 0.04, Math.sin(t * 0.33) * 0.15); add(P, 'head', 0, Math.sin(t * 0.33 + 0.5) * 0.12, 0);
    add(P, 'jaw', 0.02 + Math.max(0, Math.sin(t * 0.6)) ** 16 * 0.25 + (st.talk > 0 ? Math.abs(Math.sin(t * 12)) * 0.3 : 0)); // a slow gape, embers glowing in its throat
    for (let i = 1; i <= 6; i++) add(P, 'tail' + i, 0, Math.sin(t * 0.9 - i * 0.55) * 0.09 * i, 0);
    const glow = 1 + Math.sin(t * 2.3) * 0.25 + Math.sin(t * 5.1) * 0.1; for (const m of ctx.api.mats) if (m.emissive) m.emissiveIntensity = glow; // the embers breathe
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, 0, Math.sin(g + ph) * 0.5 * a, 0); add(P, 'spine2', 0, Math.sin(g) * 0.15 * a, 0); add(P, 'pelvis', 0, -Math.sin(g) * 0.12 * a, 0); for (let i = 1; i <= 4; i++) add(P, 'tail' + i, 0, -Math.sin(g - i * 0.6) * 0.15 * a, 0); },
  death: (T, m, ctx) => { const u = Math.min(1, T / 1.2); for (const mm of ctx.api.mats) if (mm.emissive) mm.emissiveIntensity = Math.max(0.02, 1 - u); m.position.y = -u * 0.03; }, // it goes out like a coal
};

// ================================================================== STYMPHALIAN BIRD (custom bird rig)
const BIRD = [['root', null, [0, 0, 0]], ['pelvis', 'root', [0, 0.95, -0.05]], ['spine', 'pelvis', [0, 1.05, 0.15]], ['neck1', 'spine', [0, 1.15, 0.3]], ['neck2', 'neck1', [0, 1.38, 0.37]], ['head', 'neck2', [0, 1.55, 0.42]], ['jaw', 'head', [0, 1.535, 0.5]], ['tail', 'pelvis', [0, 0.96, -0.34]]];
for (const [s, L] of [[1, '_L'], [-1, '_R']]) BIRD.push(['w1' + L, 'spine', [0.16 * s, 1.17, 0.12]], ['w2' + L, 'w1' + L, [0.44 * s, 1.24, 0.04]], ['w3' + L, 'w2' + L, [0.74 * s, 1.18, -0.06]], ['thigh' + L, 'pelvis', [0.1 * s, 0.88, 0.0]], ['shin' + L, 'thigh' + L, [0.11 * s, 0.52, 0.06]], ['foot' + L, 'shin' + L, [0.11 * s, 0.07, -0.01]]);
const BIJ = J(BIRD);
const BIRD_PAL = {
  plume: { s: 'feather', c: hex('#9a6a32'), tip: hex('#c89a52'), sz: 0.03, me: 0.55, ro: 0.38, age: 0.4, fn: (c, o) => { o.me = 0.55; } }, neck: { s: 'feather', c: hex('#7a5228'), tip: hex('#a87a40'), sz: 0.02, me: 0.5, ro: 0.4 },
  head: { s: 'feather', c: hex('#6a4a2a'), sz: 0.015, me: 0.4 }, beak: { s: 'metal', c: hex('#b88a48'), me: 0.8, ro: 0.25, patina: false }, leg: { s: 'scale', c: hex('#4a3a2a'), sz: 0.014 },
  talon: { s: 'keratin', c: hex('#1a1614') }, eye: { s: 'eye', c: hex('#d8401a'), pupil: 'round', pupilR: 0.25, rim: hex('#2a1408') }, default: { s: 'feather', c: hex('#9a6a32') },
};
function birdSculpt(S) {
  S.blob([0, 1.0, -0.02], [0.19, 0.2, 0.34], ['pelvis', 'spine'], { k: 0.06, tag: 'plume' });
  S.blob([0, 1.04, 0.18], [0.17, 0.2, 0.17], 'spine', { k: 0.06, tag: 'plume' });
  S.chain([[0, 1.12, 0.28], [0, 1.27, 0.37], [0, 1.4, 0.38], [0, 1.53, 0.41]], [0.1, 0.065, 0.055, 0.05], ['neck1', 'neck1', 'neck2', 'head'], { k: 0.03, tag: 'neck' });
  S.blob([0, 1.565, 0.43], [0.055, 0.058, 0.075], 'head', { k: 0.025, tag: 'head', imp: 3 });
  S.limb([0, 1.565, 0.48], [0, 1.53, 0.75], 0.03, 0.004, 'head', { k: 0.012, tag: 'beak', imp: 3 }); // the spear beak
  S.limb([0, 1.54, 0.48], [0, 1.525, 0.68], 0.022, 0.003, 'jaw', { k: 0.01, tag: 'beak', imp: 3 });
  for (let i = 0; i < 5; i++) S.limb([0, 1.6, 0.41 - i * 0.02], [0, 1.66 + i * 0.012, 0.33 - i * 0.05], 0.018, 0.003, 'head', { k: 0.01, tag: 'plume' }); // a swept crest of blades
  S.sym((s, L) => {
    S.blob([0.042 * s, 1.58, 0.47], [0.012, 0.012, 0.012], 'head', { k: 0.004, tag: 'eye', dir: [0.7 * s, 0.1, 0.6], imp: 4 });
    S.limb(BIJ['thigh' + L], BIJ['shin' + L], 0.065, 0.032, 'thigh' + L, { k: 0.03, tag: 'plume' });
    S.limb(BIJ['shin' + L], BIJ['foot' + L], 0.024, 0.02, 'shin' + L, { k: 0.01, tag: 'leg' });
    const f = BIJ['foot' + L]; for (const a of [-0.5, 0, 0.5]) S.limb([f[0], 0.04, f[2]], [f[0] + Math.sin(a) * 0.13, 0.012, f[2] + Math.cos(a) * 0.13], 0.016, 0.004, 'foot' + L, { k: 0.008, tag: 'talon' });
    S.limb([f[0], 0.04, f[2]], [f[0], 0.012, f[2] - 0.09], 0.014, 0.004, 'foot' + L, { k: 0.008, tag: 'talon' });
  });
}
const birdA = () => asset('stymphalian', { bones: BIRD, sculpt: birdSculpt, pal: BIRD_PAL, cell: 0.011, target: 8000, atlas: 512, maxChart: 0.018, woundScale: 0.6, woundSkip: ['eye', 'beak', 'talon'] });
const blade = (a, dir, len, w) => new K.Loft(8, 5).set(K.curve([a, [a[0] + dir[0] * len * 0.5, a[1] + dir[1] * len * 0.5 - 0.015, a[2] + dir[2] * len * 0.5], [a[0] + dir[0] * len, a[1] + dir[1] * len - 0.04, a[2] + dir[2] * len]]), (t) => [w * Math.sin(Math.min(1, t * 1.2 + 0.1) * Math.PI) * 0.9 + 0.003, 0.004], { ref: (t, n) => n.set(0, 1, 0) }).geo;
const BIRD_CLIPS = {
  attack: [[0, {}], [0.3, { _pos: [0, 0.25, -0.25], spine: [-0.3, 0, 0], neck1: [-0.4, 0, 0], neck2: [-0.3, 0, 0], head: [0.2, 0, 0], thigh_L: [-0.4, 0, 0], thigh_R: [-0.4, 0, 0] }],
    [0.42, { _pos: [0, -0.15, 0.55], spine: [0.35, 0, 0], neck1: [0.5, 0, 0], neck2: [0.2, 0, 0], head: [0.1, 0, 0], jaw: [0.3, 0, 0], thigh_L: [-0.9, 0, 0], thigh_R: [-0.9, 0, 0], shin_L: [0.4, 0, 0], shin_R: [0.4, 0, 0] }],
    [0.62, { _pos: [0, 0, 0.3], neck1: [0.2, 0, 0] }], [0.95, {}]],
  cast: [[0, {}], [0.35, { spine: [-0.2, 0, 0], neck1: [-0.5, 0, 0], head: [-0.4, 0, 0], jaw: [0.5, 0, 0] }], [0.9, { neck1: [-0.45, 0, 0], head: [-0.35, 0, 0], jaw: [0.45, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.05, -0.2], spine: [-0.2, 0.2, 0.1], neck1: [-0.3, 0.3, 0], head: [-0.4, 0.3, 0.2], jaw: [0.4, 0, 0] }], [0.35, { head: [0.1, -0.1, 0] }], [0.7, {}]],
  die: [[0, {}], [0.25, { neck1: [-0.4, 0.3, 0], head: [-0.5, 0.3, 0.3], jaw: [0.5, 0, 0] }], [0.7, { spine: [0.5, 0, 0], neck1: [0.6, 0.3, 0], neck2: [0.4, 0, 0], head: [0.3, 0.4, 0.4], thigh_L: [-0.8, 0, 0.2], thigh_R: [-0.6, 0, -0.2] }]],
};
const BIRD_SPEC = {
  id: 'stymphalian', bones: BIRD, height: 1.7, asset: birdA, clips: BIRD_CLIPS, impact: 0.42, lungeK: 0.08,
  follow: { neck2: [16, 0.45], head: [14, 0.42], jaw: [18, 0.3], tail: [8, 0.3] },
  props(ctx) { // hammered-bronze blade feathers on the wing bones and the tail, one draw call
    const m = K.uvMat('stym-blade', 32, 128, (u, v, o) => { const vane = Math.abs(u - 0.5) < 0.04; const ridge = Math.sin(v * 50 + Math.abs(u - 0.5) * 24) > 0.86; K.tone(v > 0.82 ? hex('#e2b468') : v > 0.5 ? hex('#b08040') : hex('#7a5228'), K.band(0.55 + Math.cos(u * 6.28) * 0.14 + (vane ? 0.22 : 0) + (ridge ? -0.08 : 0)), o.col); o.me = 0.75; o.ro = 0.28; });
    const parts = []; const B = ctx.B.map;
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
      const w1 = B['w1' + L].userData.rest.toArray(), w2 = B['w2' + L].userData.rest.toArray(), w3 = B['w3' + L].userData.rest.toArray(), tip = [1.05 * s, 1.1, -0.12];
      for (let i = 0; i < 9; i++) { const k = i / 8; parts.push([blade(lerp3(w3, tip, k), [s * (0.2 + k * 0.8), -0.15, -1 + k * 0.5], 0.55 - Math.abs(k - 0.5) * 0.2, 0.05), 'w3' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; parts.push([blade(lerp3(w2, w3, k), [s * 0.15, -0.2, -1], 0.44, 0.05), 'w2' + L]); }
      for (let i = 0; i < 6; i++) { const k = i / 5; const a = lerp3(w1, w2, k); parts.push([blade([a[0], a[1] + 0.02, a[2]], [s * 0.1, -0.1, -1], 0.26, 0.04), 'w1' + L]); }
      parts.push([new K.Loft(10, 8).set(K.curve([w1, w2, w3, tip]), (t) => 0.045 * (1 - t * 0.7)).geo, 'w2' + L]);
    }
    const tp = B.tail.userData.rest.toArray(); for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 0.9; parts.push([blade(tp, [Math.sin(a) * 0.5, -0.15, -1], 0.5, 0.05), 'tail']); }
    const mat = ctx.own(m); mat.metalness = 0.65; mat.roughness = 0.32; rigidSkinned(ctx.B, parts, mat, ctx.model);
  },
  idle(P, t, st) {
    const fl = Math.sin(t * 4.2); add(P, 'spine', -0.08 + Math.sin(t * 1.3) * 0.02); add(P, 'neck1', Math.sin(t * 0.7) * 0.06, Math.sin(t * 0.45) * 0.15); add(P, 'head', Math.sin(t * 2.7) * 0.02, Math.round(Math.sin(t * 0.6) * 3) / 3 * 0.3, 0); // jerky bird head turns
    add(P, 'jaw', 0.02 + (st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.3 : 0)); add(P, 'tail', Math.sin(t * 1.1) * 0.05, Math.sin(t * 0.8) * 0.1, 0);
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) { add(P, 'w1' + L, 0, -0.3 * s, (0.2 + fl * 0.5) * s); add(P, 'w2' + L, 0, 0.2 * s, (-0.1 - fl * 0.25) * s); add(P, 'w3' + L, 0, 0.15 * s, (-0.1 - fl * 0.2) * s); add(P, 'thigh' + L, -0.25); add(P, 'shin' + L, 0.4); add(P, 'foot' + L, -0.15); }
  },
  hover: (t, st) => (st.dead > 0 ? Math.max(0, 0.45 * (1 - Math.min(1, st.deadT / 0.45) ** 2)) : 0.45 + Math.sin(t * 4.2) * 0.05),
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.05, rot: 1.3, lift: 0.04, slide: 0.06, t0: 0.4, t1: 0.7 }),
};

// ================================================================== KHALKOTAUROS (the bronze bull)
const BU = { Lb: 1.35, Hw: 1.18, W: 0.26, Ln: 0.3, Lh: 0.55, Hd: -0.04, tail: 4, tailDir: [0, -0.85, -0.45], tailLen: 0.75 };
const BULL = quadRows(BU); const UJ = J(BULL); const UH = UJ.head;
const BULL_PAL = {
  bronze: { s: 'metal', c: hex('#9a6c38'), me: 0.7, ro: 0.36, seam: 0.0035, glowC: [255, 160, 60], e: [200, 90, 20], rivet: 0.06 },
  dark: { s: 'metal', c: hex('#5a3e22'), me: 0.65, ro: 0.45 }, glow: { s: 'dark', c: hex('#ffb040'), e: [255, 140, 30] }, hoof: { s: 'metal', c: hex('#2e2620'), me: 0.6, ro: 0.5, patina: false },
  default: { s: 'metal', c: hex('#8e6434'), me: 0.7 },
};
function bullSculpt(S) {
  sculptQuad(S, UJ, BU, { bulk: 1.28, depth: 1.15, tuck: 0.12, hoof: true, legR: 0.95, tags: { body: 'bronze', belly: 'bronze', leg: 'bronze', paw: 'hoof' } });
  const [, hy, hz] = UH;
  S.blob([0, 1.4, 0.42], [0.3, 0.2, 0.34], ['spine2', 'spine3'], { k: 0.08, tag: 'bronze' }); // the hump
  S.limb([0, 1.22, 0.6], [0, 1.34, 0.9], 0.34, 0.22, ['neck1', 'neck2'], { k: 0.08, tag: 'bronze' });
  S.blob([0, 1.0, 0.78], [0.12, 0.22, 0.15], 'neck1', { k: 0.06, tag: 'bronze' }); // dewlap
  S.box([0, hy + 0.01, hz + 0.05], [0.16, 0.17, 0.17], 0.08, 'head', { k: 0.05, tag: 'bronze', imp: 3 });
  S.limb([0, hy - 0.03, hz + 0.12], [0, hy - 0.12, hz + 0.38], 0.15, 0.12, 'head', { k: 0.05, tag: 'bronze', imp: 3 });
  S.limb([0, hy - 0.16, hz + 0.12], [0, hy - 0.19, hz + 0.34], 0.1, 0.08, 'jaw', { k: 0.04, tag: 'dark', imp: 3 });
  S.box([0, hy - 0.16, hz + 0.3], [0.1, 0.02, 0.12], 0.01, 'head', { k: 0.01, tag: 'glow', sub: true }); // the furnace maw
  S.sym((s, L) => {
    S.blob([0.065 * s, hy - 0.12, hz + 0.45], [0.035, 0.028, 0.025], 'head', { k: 0.01, tag: 'glow', sub: true }); // nostrils, lit from inside
    S.blob([0.14 * s, hy + 0.06, hz + 0.18], [0.03, 0.022, 0.02], 'head', { k: 0.006, tag: 'glow', imp: 4 }); // furnace eyes
    S.blob([0.15 * s, hy + 0.09, hz + 0.18], [0.05, 0.02, 0.04], 'head', { k: 0.015, tag: 'dark', imp: 3 });
    S.blob([0.19 * s, hy + 0.12, hz - 0.02], [0.08, 0.04, 0.02], 'ear' + L, { k: 0.015, tag: 'dark', rot: [0, 0, -0.4 * s] });
  });
  S.blob([0, 1.05, 0.0], [0.08, 0.08, 0.1], 'spine2', { k: 0.03, tag: 'glow' }); // the belly furnace door
  const T = ['tail1', 'tail2', 'tail3', 'tail4']; const tp = T.map((n) => UJ[n]); tp.push(BULL.tailEnd); S.chain(tp, [0.045, 0.035, 0.03, 0.025, 0.06], T, { k: 0.03, tag: 'dark' });
}
const bullA = () => asset('bronze_bull', { bones: BULL, sculpt: bullSculpt, pal: BULL_PAL, cell: 0.02, target: 10000, atlas: 512, maxChart: 0.03, woundScale: 1, woundSkip: ['glow', 'hoof'] });
const BULL_CLIPS = {
  attack: [[0, {}], [0.3, { _pos: [0, -0.06, -0.2], neck1: [0.4, 0, 0], head: [0.3, 0, 0], farm_L: [0.4, 0, 0], thigh_L: [-0.4, 0, 0], thigh_R: [-0.45, 0, 0] }],
    [0.42, { _pos: [0, 0.04, 0.6], neck1: [0.3, 0, 0], head: [-0.6, 0.25, 0.25], farm_L: [-0.8, 0, 0], farm_R: [-0.7, 0, 0], thigh_L: [0.5, 0, 0], thigh_R: [0.5, 0, 0] }], [0.62, { _pos: [0, 0, 0.35], head: [-0.2, -0.2, -0.15] }], [0.95, {}]],
  cast: [[0, {}], [0.35, { neck1: [-0.3, 0, 0], head: [-0.5, 0, 0], jaw: [0.5, 0, 0] }], [0.9, { neck1: [-0.2, 0, 0], head: [-0.35, 0, 0], jaw: [0.6, 0, 0] }], [1.3, {}]], // the fire breath
  hurt: [[0, {}], [0.1, { _pos: [0, 0.03, -0.14], spine2: [-0.06, 0.1, 0.05], neck1: [-0.15, 0.2, 0], head: [-0.2, 0.25, 0.1], jaw: [0.3, 0, 0], tail1: [-0.5, 0, 0] }], [0.35, { head: [0.1, -0.1, 0] }], [0.7, {}]],
  die: [[0, {}], [0.3, { neck1: [-0.2, 0, 0], head: [-0.2, 0, 0], farm_L: [0.4, 0, 0], farm_R: [0.4, 0, 0] }], [0.8, { farm_L: [0.9, 0, 0], farm_R: [0.9, 0, 0], thigh_L: [-0.7, 0, 0], thigh_R: [-0.7, 0, 0], neck1: [0.4, 0, 0], head: [0.3, 0, 0] }]],
};
const BULL_SPEC = {
  id: 'bronze_bull', bones: BULL, height: 1.75, asset: bullA, clips: BULL_CLIPS, impact: 0.42, lungeK: 0.08,
  follow: { neck2: [18, 0.5], head: [16, 0.45], jaw: [14, 0.3], tail1: [7, 0.25], tail2: [6.5, 0.25], tail3: [6, 0.25], tail4: [5.5, 0.25] },
  props(ctx) { // great forward-swept horns of dark iron
    const hm = K.uvMat('bull-horn', 16, 48, (u, v, o) => { K.tone(v > 0.8 ? hex('#d0b078') : hex('#3a2c22'), K.band(0.5 + Math.cos(u * 6.28) * 0.22 + (Math.sin(v * 50) > 0.8 ? -0.1 : 0), 3), o.col); o.me = 0.5; });
    const [, hy, hz] = UH; const parts = []; for (const s of [-1, 1]) parts.push([curved([0.15 * s, hy + 0.13, hz + 0.06], [1 * s, 0.25, 0.35], 0.5, 0.06, [-0.2 * s, 0.3, 0.25], 9, 7), 'head']);
    rigidSkinned(ctx.B, parts, ctx.own(hm), ctx.model);
    for (const m of ctx.api.mats) { m.metalness = 0.6; m.roughness = 0.38; }
  },
  idle(P, t, st, ctx) {
    const br = Math.sin(t * 1.3); add(P, 'spine2', br * 0.015); add(P, 'neck1', 0.06 + Math.sin(t * 0.5) * 0.04, Math.sin(t * 0.35) * 0.08); add(P, 'head', 0.05, Math.sin(t * 0.35 + 0.5) * 0.08, 0);
    add(P, 'jaw', 0.03 + (st.talk > 0 ? Math.abs(Math.sin(t * 12)) * 0.25 : 0)); add(P, 'tail1', 0.1, Math.sin(t * 2.2) * 0.25, 0); add(P, 'farm_R', Math.max(0, Math.sin(t * 0.31 + 2)) ** 14 * -0.5);
    const fu = 1.0 + Math.sin(t * 3.1) * 0.2 + Math.sin(t * 7.3) * 0.08; for (const m of ctx.api.mats) if (m.emissive) m.emissiveIntensity = st.dead > 0 ? Math.max(0.03, fu * (1 - st.deadT)) : fu; // the furnace flickers
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g + ph) * 0.5 * a); add(P, 'head', Math.sin(g * 2) * 0.05 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.08, rot: 1.45, lift: 0.08, slide: 0.05, t0: 0.4, t1: 0.75 }), // it topples like a statue
};

// ================================================================== LADON (serpent of the Hesperides)
const LAD = [['root', null, [0, 0, 0]], ['coil', 'root', [0, 0.35, -0.3]], ['n1', 'coil', [0.1, 0.55, 0.25]], ['n2', 'n1', [0.05, 0.98, 0.42]], ['n3', 'n2', [-0.02, 1.46, 0.36]], ['n4', 'n3', [0, 1.92, 0.18]], ['n5', 'n4', [0, 2.32, 0.18]], ['n6', 'n5', [0, 2.62, 0.38]], ['head', 'n6', [0, 2.78, 0.62]], ['jaw', 'head', [0, 2.71, 0.7]], ['t1', 'coil', [-0.7, 0.18, -0.9]], ['t2', 't1', [-1.15, 0.12, -0.65]], ['t3', 't2', [-1.45, 0.08, -0.3]]];
const LJ = J(LAD);
const plates = (c, o, q, L) => { if (c.nz > 0.55 && Math.abs(c.x) < 0.14 && c.y > 0.6) { const band = ((c.y * 9) % 1 + 1) % 1 < 0.12; K.tone(hex('#d6c486'), L + (band ? -0.18 : 0.04), o.col); } };
const LAD_PAL = {
  scale: { s: 'scale', c: hex('#5a6e2e'), back: hex('#33461c'), backY: 0.45, sz: 0.045, age: 0.85, fn: plates }, belly: { s: 'scale', c: hex('#d0bc80'), sz: 0.05, age: 0.5 },
  crest: { s: 'keratin', c: hex('#8a6a2a'), rings: 60 }, horn: { s: 'keratin', c: hex('#cbb27a'), rings: 80 }, eye: { s: 'eye', c: hex('#e8c030'), pupil: 'slit', rim: hex('#1a1408') },
  mouth: { s: 'dark', c: hex('#5a1420') }, gold: { s: 'metal', c: hex('#e8b830'), me: 0.85, ro: 0.25, patina: false, e: [70, 46, 6] }, wood: { s: 'wood', c: hex('#4a3626'), grain: 30 }, leaf: { s: 'cloth', c: hex('#3e5a26'), folds: 14 },
  default: { s: 'scale', c: hex('#5a6e2e') },
};
function ladSculpt(S) {
  // three coils stacked round the stump of the apple tree
  for (let r = 0; r < 3; r++) { const R = 1.0 - r * 0.24, y = 0.19 + r * 0.34, w = 0.2 - r * 0.02; const pts = []; const n = 16; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 + r * 0.9; pts.push([Math.sin(a) * R, y + Math.sin(a * 2 + r) * 0.04, -0.3 + Math.cos(a) * R * 0.85]); } S.chain(pts, pts.map(() => w), 'coil', { k: 0.03, tag: 'scale' }); }
  // the stump and its three golden apples
  S.limb([0, 0.0, -0.3], [0.04, 1.05, -0.32], 0.16, 0.1, 'coil', { k: 0.06, tag: 'wood' }); S.limb([0.04, 0.95, -0.32], [0.3, 1.25, -0.4], 0.06, 0.03, 'coil', { k: 0.04, tag: 'wood' }); S.limb([0.04, 0.95, -0.32], [-0.25, 1.3, -0.25], 0.05, 0.025, 'coil', { k: 0.04, tag: 'wood' });
  for (const [x, y, z] of [[0.3, 1.18, -0.42], [-0.24, 1.22, -0.26], [0.05, 1.12, -0.12]]) { S.blob([x, y, z], [0.075, 0.07, 0.075], 'coil', { k: 0.02, tag: 'gold' }); S.blob([x + 0.04, y + 0.05, z], [0.05, 0.015, 0.03], 'coil', { k: 0.01, tag: 'leaf' }); }
  // the rising neck, belly plates forward, a crest of spines down its back
  const N = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'head']; const np = [[0.2, 0.42, 0.25], ...N.map((n) => LJ[n])];
  S.chain(np, [0.27, 0.25, 0.23, 0.21, 0.19, 0.17, 0.15, 0.13], ['n1', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'head'], { k: 0.08, tag: 'scale' });
  for (let i = 1; i < N.length; i++) for (let j = 0; j < 3; j++) { const p = lerp3(LJ[N[i - 1]], LJ[N[i]], j / 3); S.limb([p[0], p[1] + 0.02, p[2] - 0.17], [p[0], p[1] + 0.12, p[2] - 0.32], 0.05, 0.006, N[i - 1], { k: 0.03, tag: 'crest' }); }
  // the head: a long dragon-serpent skull, brow horns, a beard of spines (the hundred voices, as a hundred quills)
  const [, hy, hz] = LJ.head;
  S.blob([0, hy + 0.04, hz + 0.02], [0.17, 0.13, 0.22], 'head', { k: 0.06, tag: 'scale', imp: 3 }); S.limb([0, hy + 0.02, hz + 0.1], [0, hy - 0.02, hz + 0.4], 0.12, 0.07, 'head', { k: 0.05, tag: 'scale', imp: 3 });
  S.limb([0, hy - 0.08, hz + 0.08], [0, hy - 0.1, hz + 0.36], 0.09, 0.05, 'jaw', { k: 0.04, tag: 'belly', imp: 3 }); S.box([0, hy - 0.06, hz + 0.25], [0.09, 0.008, 0.16], 0.004, 'head', { k: 0.008, tag: 'mouth', sub: true, rot: [0.08, 0, 0] });
  S.sym((s) => {
    S.blob([0.1 * s, hy + 0.08, hz + 0.18], [0.03, 0.022, 0.026], 'head', { k: 0.006, tag: 'eye', dir: [0.7 * s, 0.2, 0.6], imp: 4 }); S.blob([0.11 * s, hy + 0.11, hz + 0.16], [0.05, 0.02, 0.06], 'head', { k: 0.02, tag: 'scale', imp: 3 });
    for (let i = 0; i < 6; i++) S.limb([0.12 * s, hy - 0.04 - i * 0.02, hz - 0.02 + i * 0.04], [0.26 * s, hy - 0.12 - i * 0.03, hz - 0.12 + i * 0.03], 0.025, 0.004, 'jaw', { k: 0.012, tag: 'crest' });
    S.blob([0.04 * s, hy - 0.01, hz + 0.42], [0.012, 0.01, 0.01], 'head', { k: 0.004, tag: 'mouth', sub: true });
  });
  const T = ['t1', 't2', 't3']; S.chain([[-0.4, 0.2, -1.0], ...T.map((n) => LJ[n]), [-1.55, 0.06, 0.0]], [0.22, 0.18, 0.13, 0.08, 0.02], ['coil', 't1', 't2', 't3', 't3'], { k: 0.06, tag: 'scale' });
}
const ladA = () => asset('ladon', { bones: LAD, sculpt: ladSculpt, pal: LAD_PAL, cell: 0.028, target: 12000, atlas: 1024, maxChart: 0.04, woundScale: 1.4, woundSkip: ['eye', 'gold', 'wood', 'leaf', 'crest', 'mouth'] });
const LAD_CLIPS = {
  attack: [[0, {}], [0.32, { n3: [-0.15, 0, 0], n4: [-0.3, 0, 0], n5: [-0.35, 0, 0], n6: [-0.2, 0, 0], head: [0.2, 0, 0], jaw: [0.3, 0, 0] }],
    [0.44, { _pos: [0, 0, 0.3], n2: [0.15, 0, 0], n3: [0.3, 0, 0], n4: [0.35, 0, 0], n5: [0.3, 0, 0], n6: [0.25, 0, 0], head: [0.1, 0, 0], jaw: [0.7, 0, 0] }],
    [0.64, { n3: [0.15, 0, 0], n4: [0.15, 0, 0], jaw: [0.1, 0, 0] }], [1.0, {}]],
  cast: [[0, {}], [0.4, { n4: [-0.15, 0, 0], n5: [-0.2, 0, 0], head: [-0.35, 0, 0], jaw: [0.6, 0, 0] }], [1.0, { n4: [-0.12, 0.1, 0], n5: [-0.18, 0.1, 0], head: [-0.3, -0.1, 0], jaw: [0.55, 0, 0] }], [1.4, {}]], // the hundred-voiced hiss
  hurt: [[0, {}], [0.12, { n3: [-0.1, 0.1, 0.05], n4: [-0.15, 0.15, 0.08], n5: [-0.2, 0.2, 0.1], head: [-0.3, 0.3, 0.2], jaw: [0.4, 0, 0] }], [0.4, { head: [0.1, -0.1, 0] }], [0.8, {}]],
  die: [[0, {}], [0.3, { n4: [-0.2, 0.2, 0], head: [-0.3, 0.2, 0.2], jaw: [0.5, 0, 0] }], [1.0, { n2: [0.35, 0.1, 0], n3: [0.45, 0.1, 0.1], n4: [0.5, 0, 0.1], n5: [0.45, 0, 0], n6: [0.3, 0, 0], head: [0.2, 0.3, 0.4], jaw: [0.35, 0, 0], t1: [0, 0.3, 0], t2: [0, 0.3, 0] }]], // the neck slumps across its own coils
};
const LAD_SPEC = {
  id: 'ladon', bones: LAD, height: 3.0, asset: ladA, clips: LAD_CLIPS, impact: 0.45, lungeK: 0.06,
  follow: { n4: [10, 0.5], n5: [9, 0.48], n6: [8, 0.46], head: [8, 0.45], jaw: [16, 0.3], t2: [6, 0.3], t3: [5, 0.3] },
  props(ctx) { // swept-back brow horns
    const hm = K.uvMat('ladon-horn', 16, 48, (u, v, o) => K.tone(v > 0.75 ? hex('#efe0b0') : hex('#9a7a42'), K.band(0.55 + Math.cos(u * 6.28) * 0.2 + (Math.sin(v * 40) > 0.82 ? -0.1 : 0), 3), o.col));
    const [, hy, hz] = LJ.head; const parts = []; for (const s of [-1, 1]) { parts.push([curved([0.11 * s, hy + 0.13, hz + 0.05], [0.4 * s, 0.5, -1], 0.42, 0.04, [0.05 * s, 0.15, 0], 8, 6), 'head'], [curved([0.15 * s, hy + 0.06, hz - 0.04], [0.7 * s, 0.2, -1], 0.22, 0.025, [0, 0.05, 0], 6, 5), 'head']); }
    rigidSkinned(ctx.B, parts, ctx.own(hm), ctx.model);
  },
  idle(P, t, st) {
    const sw = Math.sin(t * 0.6), sw2 = Math.sin(t * 0.6 - 0.8);
    add(P, 'n2', Math.sin(t * 0.9) * 0.02, sw * 0.04, 0); add(P, 'n3', 0, sw * 0.05, sw2 * 0.03); add(P, 'n4', Math.sin(t * 0.9 + 1) * 0.03, sw2 * 0.06, 0); add(P, 'n5', 0, sw2 * 0.07, 0); add(P, 'head', Math.sin(t * 1.4) * 0.03, Math.sin(t * 0.5 + 1) * 0.14, Math.sin(t * 0.4) * 0.08);
    add(P, 'jaw', 0.04 + Math.max(0, Math.sin(t * 0.8)) ** 18 * 0.35 + (st.talk > 0 ? Math.abs(Math.sin(t * 11)) * 0.4 : 0)); // a forked tongue-flick gape
    add(P, 't2', 0, Math.sin(t * 1.1) * 0.12, 0); add(P, 't3', 0, Math.sin(t * 1.1 - 0.7) * 0.2, 0);
  },
  death: () => {}, // the clip slumps the neck; the coils stay where they lie
};

const BUILD = { karkinos: CRAB_SPEC, boar: BOAR_SPEC, teumessian_fox: FOX_SPEC, salamander: SAL_SPEC, stymphalian: BIRD_SPEC, bronze_bull: BULL_SPEC, ladon: LAD_SPEC };
const ASSETS = { karkinos: crabA, boar: boarA, teumessian_fox: foxA, salamander: salA, stymphalian: birdA, bronze_bull: bullA, ladon: ladA };
export const BESTIARY_IDS = Object.keys(BUILD);
export function createBestiary(id, seed = 1) {
  const api = createGeneric(BUILD[id], seed);
  if (id === 'karkinos') { const st = api.root.userData; api.flip = (on) => { st.flipped = !!on; }; }
  return api;
}
export const warmBestiary = (id) => void ASSETS[id]?.();
void THREE;
