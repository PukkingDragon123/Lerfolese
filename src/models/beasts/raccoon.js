// The FAT RACCOON (the prologue's tutorial foe, raiding the old garden's picnic basket): a chubby, low-slung raccoon
// on the quadruped template (src/models/beasts/kit.js): a barrel of a belly that sways when he waddles, short legs,
// clever black hand-paws, a broad face with fluffy cheek ruffs, the black bandit MASK with white brows and muzzle, a
// dark stripe down the nose, round ears rimmed in white, and a big bushy RINGED tail. Grizzled, lived-in fur (one
// torn ear, a scruffy belly). Oddworld-style character: the belly and the hands are pushed; the face is a real raccoon's.
// Attacks: 'attack' = rear up and SNATCH (both hand-paws grab forward, then clutch the loot to his chest),
// 'cast' = sit up and stuff his cheeks (chewing), plus hurt and a weighted belly-flop death. Waddle gait.
import { K, hex, quadRows, sculptQuad, asset, createGeneric, add } from './kit.js';

const O = { Lb: 0.48, Hw: 0.34, W: 0.1, Ln: 0.1, Lh: 0.2, Hd: -0.01, tail: 5, tailDir: [0, 0.12, -1], tailLen: 0.5 };
const BONES = quadRows(O);
const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const HJ = J.head; const hy = HJ[1], hz = HJ[2]; const T0 = J.tail1[2];
const DARK = hex('#2a2624'), WHITE = hex('#e4ddd0'), RING = hex('#3a332e'), RINGL = hex('#a8987e');
function face(c, o, q, L) { // the bandit mask, white brows and muzzle, the dark nose stripe
  if (c.z < hz - 0.02 || c.y < hy - 0.06) return;
  const ax = Math.abs(c.x); const ey = hy + 0.008;
  if (ax < 0.008 && c.y > hy - 0.005 && c.z > hz + 0.02 && c.z < hz + 0.115) { K.tone(DARK, L * 0.9, o.col); return; }
  if (Math.abs(c.y - ey) < 0.017 + Math.max(0, ax - 0.04) * 0.25 && c.z > hz + 0.012 && c.z < hz + 0.098 && ax > 0.006) { K.tone(DARK, L * 0.95, o.col); return; }
  if (c.y > ey + 0.017 && c.y < ey + 0.032 && c.z > hz + 0.025 && ax < 0.05) { K.tone(WHITE, L + 0.05, o.col); return; }
}
function rings(c, o, q, L) { const k = Math.floor((T0 - c.z) / 0.06 + (c.y - J.tail1[1]) * 2); if (c.z < T0 - 0.42) { K.tone(DARK, L, o.col); return; } K.tone(k % 2 ? RING : RINGL, L, o.col); }
function ear(c, o, q, L) { if (c.y > hy + 0.082 || Math.abs(c.x) > 0.072) K.tone(WHITE, L + 0.08, o.col); if (c.x < -0.07 && c.y > hy + 0.07 && c.y < hy + 0.085) K.tone(hex('#5a3a34'), L, o.col); } // a nick in the right ear
const PAL = {
  fur: { s: 'fur', c: hex('#857a6c'), back: hex('#5e564c'), backY: 0.55, belly: hex('#a69a86'), fs: 34, strand: 0.32, age: 0.7, skin: hex('#5a4a44') },
  belly: { s: 'fur', c: hex('#9c907c'), fs: 26, strand: 0.4, age: 0.85 },
  face: { s: 'fur', c: WHITE, fs: 46, strand: 0.08, fn: face, age: 0 }, cheek: { s: 'fur', c: hex('#d6cebf'), fs: 30, strand: 0.2, fn: face, age: 0 },
  head: { s: 'fur', c: hex('#7a7064'), fs: 40, strand: 0.12, fn: face, age: 0 },
  tail: { s: 'fur', c: RINGL, fs: 28, strand: 0.4, fn: rings, age: 0.5 },
  hand: { s: 'skin', c: hex('#2e2a2a'), age: 0.3 }, leg: { s: 'fur', c: hex('#4a443e'), fs: 36 },
  nose: { s: 'skin', c: hex('#161414'), L: 0.06, ro: 0.25 }, eye: { s: 'eye', c: hex('#3a2416'), pupil: 'round', pupilR: 0.42 },
  mouth: { s: 'dark', c: hex('#4a1418') }, ear: { s: 'fur', c: hex('#5a5248'), fs: 40, fn: ear }, default: { s: 'fur', c: hex('#857a6c') },
};
function sculpt(S) {
  sculptQuad(S, J, O, { bulk: 1.55, depth: 1.5, tuck: -0.05, legR: 0.95, tags: { body: 'fur', belly: 'belly', leg: 'leg', paw: 'hand' } });
  // the belly: a sagging barrel, and round haunches
  S.blob([0, O.Hw * 0.5, -0.02], [0.16, 0.13, 0.2], 'spine1', { k: 0.05, tag: 'belly' }); S.blob([0, O.Hw * 0.6, 0.1], [0.14, 0.12, 0.13], 'spine2', { k: 0.05, tag: 'belly' });
  S.sym((s, L) => { S.blob([0.1 * s, O.Hw * 0.72, -0.2], [0.09, 0.11, 0.12], ['pelvis', 'thigh' + L], { k: 0.04, tag: 'fur', t0: 0.3, t1: 0.9 }); });
  S.blob([0, O.Hw * 0.98, 0.02], [0.13, 0.08, 0.24], 'spine2', { k: 0.05, tag: 'fur' }); // a humped back
  // head: broad skull, fluffy cheek ruffs, a pointed muzzle, button nose, beady eyes, round ears
  S.blob([0, hy + 0.012, hz + 0.0], [0.075, 0.06, 0.07], 'head', { k: 0.03, tag: 'head', imp: 3 });
  S.limb([0, hy - 0.004, hz + 0.04], [0, hy - 0.022, hz + 0.125], 0.04, 0.016, 'head', { k: 0.02, tag: 'face', imp: 3 });
  S.blob([0, hy - 0.019, hz + 0.13], [0.015, 0.012, 0.012], 'head', { k: 0.006, tag: 'nose', imp: 4 });
  S.sym((s, L) => {
    S.blob([0.058 * s, hy - 0.018, hz - 0.004], [0.05, 0.042, 0.046], 'head', { k: 0.02, tag: 'cheek', imp: 3 });
    for (let i = 0; i < 4; i++) S.limb([0.07 * s, hy - 0.02 - i * 0.012, hz - 0.01], [0.105 * s, hy - 0.04 - i * 0.016, hz - 0.035], 0.022, 0.006, 'head', { k: 0.012, tag: 'cheek' });
    S.blob([0.031 * s, hy + 0.012, hz + 0.066], [0.011, 0.01, 0.009], 'head', { k: 0.004, tag: 'eye', dir: [0.35 * s, 0.12, 0.92], imp: 4 });
    S.blob([0.048 * s, hy + 0.072, hz - 0.012], [0.028, 0.03, 0.011], 'ear' + L, { k: 0.012, tag: 'ear', rot: [-0.2, 0.3 * s, -0.25 * s], imp: 2 });
  });
  S.limb([0, hy - 0.034, hz + 0.04], [0, hy - 0.036, hz + 0.105], 0.026, 0.012, 'jaw', { k: 0.015, tag: 'face', imp: 3 });
  S.box([0, hy - 0.03, hz + 0.09], [0.022, 0.004, 0.035], 0.002, 'head', { k: 0.004, tag: 'mouth', sub: true });
  // clever hand-paws with long fingers
  S.sym((s, L) => { const w = J['fpaw' + L]; for (let i = 0; i < 5; i++) { const x = w[0] + (i - 2) * 0.012; S.limb([x, 0.02, w[2] + 0.03], [x + (i - 2) * 0.004, 0.006, w[2] + 0.062 - Math.abs(i - 2) * 0.008], 0.008, 0.004, 'fpaw' + L, { k: 0.006, tag: 'hand' }); } });
  // the bushy ringed tail
  const T = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5']; const tp = T.map((n) => J[n]); tp.push(BONES.tailEnd);
  S.chain(tp, [0.045, 0.07, 0.078, 0.074, 0.06, 0.03], T, { k: 0.045, tag: 'tail' });
}
const A = () => asset('raccoon', { bones: BONES, sculpt, pal: PAL, cell: 0.0095, target: 9000, atlas: 512, maxChart: 0.016, woundScale: 0.5, woundSkip: ['eye', 'nose', 'mouth', 'hand'] });

const up = { pelvis: [-0.85, 0, 0], thigh_L: [0.75, 0, 0], thigh_R: [0.75, 0, 0], shin_L: [-0.2, 0, 0], shin_R: [-0.2, 0, 0], hock_L: [0.3, 0, 0], hock_R: [0.3, 0, 0], neck1: [0.45, 0, 0], head: [0.3, 0, 0], tail1: [0.5, 0, 0] }; // reared up on his haunches
const CLIPS = {
  attack: [[0, {}],
    [0.3, { _pos: [0, 0.04, -0.1], ...up, farm_L: [-0.6, 0, 0.3], farm_R: [-0.6, 0, -0.3], fore_L: [-1.2, 0, 0], fore_R: [-1.2, 0, 0], jaw: [0.3, 0, 0] }],
    [0.42, { _pos: [0, 0.02, 0.42], pelvis: [-0.35, 0, 0], thigh_L: [0.2, 0, 0], thigh_R: [0.2, 0, 0], neck1: [0.1, 0, 0], head: [0.25, 0, 0], farm_L: [-1.5, 0, -0.1], farm_R: [-1.5, 0, 0.1], fore_L: [0.2, 0, 0], fore_R: [0.2, 0, 0], jaw: [0.5, 0, 0] }],
    [0.62, { _pos: [0, 0.06, 0.1], ...up, farm_L: [-1.2, 0, -0.5], farm_R: [-1.2, 0, 0.5], fore_L: [-1.4, 0, 0], fore_R: [-1.4, 0, 0], head: [0.5, 0.2, 0], jaw: [0.1, 0, 0] }],
    [1.0, {}]],
  cast: [[0, {}], [0.35, { ...up, farm_L: [-1.0, 0, -0.4], farm_R: [-1.0, 0, 0.4], fore_L: [-1.6, 0, 0], fore_R: [-1.6, 0, 0], head: [0.55, 0, 0], jaw: [0.35, 0, 0] }], [0.6, { ...up, farm_L: [-1.0, 0, -0.4], farm_R: [-1.0, 0, 0.4], fore_L: [-1.6, 0, 0], fore_R: [-1.6, 0, 0], head: [0.6, 0.1, 0], jaw: [0.05, 0, 0] }], [0.85, { ...up, farm_L: [-1.0, 0, -0.4], farm_R: [-1.0, 0, 0.4], fore_L: [-1.6, 0, 0], fore_R: [-1.6, 0, 0], head: [0.55, -0.1, 0], jaw: [0.35, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.04, -0.16], spine2: [-0.12, 0.18, 0.12], neck1: [-0.25, 0.3, 0], head: [-0.3, 0.4, 0.2], jaw: [0.45, 0, 0], ear_L: [0.6, 0, 0], ear_R: [0.6, 0, 0], tail1: [-0.6, 0, 0], tail2: [-0.3, 0, 0] }], [0.35, { head: [0.1, -0.1, 0], tail1: [-0.3, 0, 0] }], [0.7, {}]],
  die: [[0, {}], [0.15, { neck1: [-0.3, 0.3, 0], head: [-0.4, 0.4, 0.2], jaw: [0.6, 0, 0] }], [0.5, { farm_L: [0.5, 0, 0.4], farm_R: [0.5, 0, -0.4], thigh_L: [-0.6, 0, 0.4], thigh_R: [-0.6, 0, -0.4], neck1: [0.2, 0, 0], head: [0.3, 0, 0], jaw: [0.4, 0, 0], tail1: [0.3, 0, 0] }],
    [0.9, { farm_L: [-0.4, 0, 0.6], farm_R: [0.3, 0, -0.5], fore_L: [-0.5, 0, 0], thigh_L: [-0.3, 0, 0.5], thigh_R: [0.3, 0, -0.4], neck1: [-0.2, 0.4, 0], head: [0.1, 0.4, 0.3], jaw: [0.5, 0, 0], tail1: [0.5, 0, 0], tail2: [0.4, 0, 0] }]],
};
const SPEC = {
  id: 'raccoon', bones: BONES, height: 0.56, asset: A, clips: CLIPS, impact: 0.42, lungeK: 0.05,
  follow: { neck2: [24, 0.5], head: [20, 0.42], ear_L: [12, 0.25], ear_R: [12, 0.25], jaw: [18, 0.3], tail1: [7, 0.32], tail2: [6.5, 0.3], tail3: [6, 0.28], tail4: [5.5, 0.26], tail5: [5, 0.25], spine2: [14, 0.35] },
  idle(P, t, st) {
    const br = Math.sin(t * 2.4), sniff = Math.max(0, Math.sin(t * 0.9)) ** 6;
    add(P, 'spine2', br * 0.02, 0, Math.sin(t * 0.8) * 0.02); add(P, 'spine1', -br * 0.01); add(P, 'neck1', 0.04 + sniff * 0.12, Math.sin(t * 0.5) * 0.18); add(P, 'head', -0.05 - sniff * 0.1 + Math.sin(t * 9) * 0.03 * sniff, Math.sin(t * 0.5 + 0.6) * 0.2, Math.sin(t * 0.33) * 0.12);
    add(P, 'jaw', 0.03 + (st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.35 : 0)); for (let i = 1; i <= 5; i++) add(P, 'tail' + i, 0.06 - i * 0.02, Math.sin(t * 1.6 - i * 0.55) * 0.08 * i, 0);
    // now and then he washes his little hands
    const wash = Math.max(0, Math.sin(t * 0.37 + 1)) ** 8; if (wash > 0.01) { add(P, 'farm_L', -0.9 * wash, 0, -0.3 * wash + Math.sin(t * 14) * 0.15 * wash); add(P, 'farm_R', -0.9 * wash, 0, 0.3 * wash - Math.sin(t * 14) * 0.15 * wash); add(P, 'fore_L', -1.2 * wash); add(P, 'fore_R', -1.2 * wash); add(P, 'pelvis', -0.3 * wash); add(P, 'thigh_L', 0.3 * wash); add(P, 'thigh_R', 0.3 * wash); add(P, 'head', 0.4 * wash); }
    add(P, 'ear_L', Math.max(0, Math.sin(t * 0.8) - 0.9) * 4); add(P, 'ear_R', Math.max(0, Math.sin(t * 0.7 + 2) - 0.9) * 4);
  },
  gait(P, g, a) { // a fat waddle: short quick steps, the belly rolls side to side
    for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g * 1.3 + ph) * 0.45 * a);
    add(P, 'fore_L', -Math.max(0, Math.cos(g * 1.3)) * 0.6 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g * 1.3)) * 0.6 * a);
    add(P, 'spine2', 0, 0, Math.sin(g * 1.3) * 0.16 * a); add(P, 'pelvis', 0, Math.sin(g * 1.3) * 0.1 * a, -Math.sin(g * 1.3) * 0.12 * a); add(P, 'tail1', 0, -Math.sin(g * 1.3) * 0.3 * a, 0);
  },
  props(ctx) { ctx.B.map.head.scale.setScalar(1.28); }, // a big round bandit face on the fat body
  hover: (t, st) => 0,
  death: (T, m, ctx) => ragdollFall(T, m, ctx),
};
// a procedural RAGDOLL fall: the fat body rolls over its side edge under gravity (a real pivot on the ground contact),
// slams, bounces twice, the belly jiggles on impact, the limbs and the tail flop and settle with lagging springs
function ragdollFall(T, model, ctx) {
  const V0 = ctx.vars; const sc = ctx.sc, H = ctx.spec_h * sc; const B = ctx.B.map;
  if (!V0.rd || T < V0.rd.T - 1e-3) V0.rd = { T: 0, th: 0, w: 0.6, slide: 0, vs: 0.9, hits: 0, jig: 0, jv: 0, limb: 0, lv: 0, side: Math.random() < 0.5 ? 1 : -1 };
  const R = V0.rd; const half = 0.26 * H, rest = Math.PI / 2 - 0.08;
  while (R.T < T) { // fixed-step integration
    const dt = Math.min(1 / 120, T - R.T); R.T += dt;
    const alpha = 13 * Math.sin(R.th + 0.35); R.w += alpha * dt; R.w *= Math.exp(-dt * 0.4); R.th += R.w * dt;
    if (R.th > rest) { R.th = rest; if (R.w > 0.4) { R.hits++; R.jv += -R.w * 2.6; R.lv += R.w * 3; R.w = -R.w * (R.hits < 3 ? 0.32 : 0); } else R.w = 0; }
    if (R.th < 0) { R.th = 0; R.w = Math.abs(R.w) * 0.3; }
    R.slide += R.vs * dt; R.vs *= Math.exp(-dt * (R.th > 1 ? 6 : 2));
    R.jv += (-R.jig * 180 - R.jv * 9) * dt; R.jig += R.jv * dt; R.lv += (-R.limb * 60 - R.lv * 5) * dt; R.limb += R.lv * dt;
  }
  const th = R.th; model.rotation.z = -th * R.side; model.rotation.x = 0.05 * Math.min(1, th); // pivot on the side edge: the origin moves so the contact stays put
  model.position.x = R.side * half * (1 - Math.cos(th)) * 0.9 - R.slide * 0.25 * sc; model.position.y = half * Math.sin(th) * 0.92;
  if (B.spine2) { const j = 1 + R.jig * 0.5; B.spine2.scale.set(1 / Math.sqrt(Math.max(0.6, j)), j, 1 / Math.sqrt(Math.max(0.6, j))); }
  const flop = R.limb, k = Math.min(1, th / rest);
  for (const [n, a, z] of [['farm_L', 0.6, 0.5], ['farm_R', 0.4, -0.6], ['thigh_L', -0.5, 0.4], ['thigh_R', -0.3, -0.5]]) if (B[n]) { B[n].rotation.x += (a * k + flop * 0.5) ; B[n].rotation.z += z * k * R.side + flop * 0.3; }
  for (let i = 1; i <= 5; i++) if (B['tail' + i]) B['tail' + i].rotation.z += (0.25 * k + flop * 0.35) * R.side * (i / 5);
  if (B.head) B.head.rotation.z += flop * 0.4 * R.side; if (B.jaw) B.jaw.rotation.x = Math.max(B.jaw.rotation.x, 0.35 * k);
}
export const createRaccoon = (seed) => createGeneric(SPEC, seed);
export const warmRaccoon = () => void A();
