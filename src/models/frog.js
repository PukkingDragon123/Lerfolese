// Archimage Croakley, the old toad-wizard of the star gallery: an original, Oddworld-flavoured creature (grotesque-
// charming, believable anatomy, grimy lived-in kit), built on the beasts pipeline (src/models/beasts): an SDF sculpt
// polygonised into one seamless skinned mesh with a custom skeleton and a cel painter.
//   anatomy: broad flat skull, huge bulging eyes on top (gold irises, horizontal bar pupils, nictitating lids, eyes
//   that retract when he blinks or swallows), a wide lipless mouth with an overbite, tympanum discs, an inflating
//   throat sac, a hunched spine over a pot belly, lanky arms with knobbly elbows and long webbed fingers with round
//   pads, long folded hind legs with big webbed feet; warty, wrinkled, leathery skin mottled olive / ochre / bruise
//   violet with a pale speckled belly; chin barbels and bristly warts for age.
//   kit: patched, layered robe with a frayed hem and a rust mantle, a belt with pouches, bottles and bone charms, a
//   tooth necklace, a battered floppy hat, and a staff of gnarled root clutching a glowing crystal.
//   rig: root, hips, spine1-2, neck, head, jaw, throat (scale), eyes + lids, tongue (stretch), hat tip, clavicles, arms,
//   hands with per-finger two-joint curl, thighs, shins, ankles, feet, toes, four robe panel bones (spring follow).
//   clips: cast (fingers splayed, throat ballooning), tongue (catches a firefly), tap (staff), scratch, hop, shuffle,
//   nod, ribbit; idle breathing with throat pulse, slow blinks, talk mouth; head and eyes track the viewer.
// API (gallery.js): createFrog() -> { root, crystal, headTop(), act(name), lookAt(v3), update(dt, t) }
import { K, THREE, hex, asset, createGeneric, rigidSkinned, add } from './beasts/kit.js';
import { onBone } from './beasts/kit.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const OCHRE = hex('#b8902e'), VIOLET = hex('#6a4a6e'), DARK = hex('#3a3a1e'), SPECK = hex('#7a6a48'), GOLD = hex('#e0b040');
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------- skeleton (bind pose, metres, facing +z)
const FING = [[-0.03, 0.0], [-0.01, 0.35], [0.012, 0.7], [0.03, 1.05]];
function bones() {
  const R = [['root', null, [0, 0, 0]], ['hips', 'root', [0, 0.5, -0.04]], ['robeF', 'hips', [0, 0.4, 0.26]], ['robeB', 'hips', [0, 0.4, -0.28]], ['robeL', 'hips', [0.28, 0.4, -0.02]], ['robeR', 'hips', [-0.28, 0.4, -0.02]],
    ['spine1', 'hips', [0, 0.64, 0.0]], ['spine2', 'spine1', [0, 0.78, 0.02]], ['neck', 'spine2', [0, 0.88, 0.08]], ['head', 'neck', [0, 0.95, 0.12]], ['jaw', 'head', [0, 0.935, 0.06]], ['throat', 'jaw', [0, 0.895, 0.22]],
    ['tongue', 'jaw', [0, 0.935, 0.2]], ['hat', 'head', [0, 1.15, -0.03]], ['hatTip', 'hat', [0.04, 1.42, -0.06]]];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    R.push(['eye' + L, 'head', [0.12 * s, 1.088, 0.238]], ['lid' + L, 'head', [0.12 * s, 1.088, 0.238]]);
    const hand = s > 0 ? [0.26, 0.44, 0.2] : [-0.25, 0.72, 0.3]; const elbow = s > 0 ? [0.28, 0.6, 0.04] : [-0.3, 0.6, 0.08];
    R.push(['clav' + L, 'spine2', [0.08 * s, 0.84, 0.06]], ['uparm' + L, 'clav' + L, [0.2 * s, 0.82, 0.04]], ['forearm' + L, 'uparm' + L, elbow], ['hand' + L, 'forearm' + L, hand]);
    FING.forEach(([dx], k) => { const fa = [hand[0] + dx * s * 2, hand[1] - 0.035, hand[2] + 0.04]; R.push([`f${k}a${L}`, 'hand' + L, fa], [`f${k}b${L}`, `f${k}a${L}`, [fa[0] + dx * s * 1.2, fa[1] - 0.075, fa[2] + 0.075]]); });
    R.push(['thigh' + L, 'hips', [0.12 * s, 0.48, -0.04]], ['shin' + L, 'thigh' + L, [0.21 * s, 0.3, 0.2]], ['ankle' + L, 'shin' + L, [0.19 * s, 0.1, -0.06]], ['foot' + L, 'ankle' + L, [0.2 * s, 0.03, 0.05]], ['toes' + L, 'foot' + L, [0.23 * s, 0.015, 0.2]]);
  }
  return R;
}
const BONES = bones(); const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const off = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

// ---------------------------------------------------------------- painter palette
const mottle = (c, o) => { const n = K.vnoise(c.x * 9 + 3, c.y * 9, c.z * 9); const n2 = K.vnoise(c.x * 26 + 7, c.y * 26, c.z * 26); if (n > 0.64) K.mixc(o.col, OCHRE, 0.5); else if (n < 0.32) K.mixc(o.col, VIOLET, 0.42); if (n2 > 0.84) K.mixc(o.col, DARK, 0.55); if (Math.sin(c.y * 90 + n * 8 + c.x * 20) > 0.94) K.mixc(o.col, DARK, 0.35); };
const speckle = (c, o) => { if (K.vnoise(c.x * 40, c.y * 40, c.z * 40) > 0.8) K.mixc(o.col, SPECK, 0.7); };
const robeFx = (c, o) => { const C = K.cells3(c.x / 0.11, c.y / 0.13, c.z / 0.11); const id = C[5] ?? C[2]; const patch = (id * 7.3) % 1;
  if (patch > 0.8) { K.mixc(o.col, patch > 0.9 ? hex('#7a5a2a') : hex('#5a3a4a'), 0.7); if (C[1] - C[0] < 0.07 && Math.sin((c.x + c.y + c.z) * 160) > 0) K.mixc(o.col, hex('#d8c890'), 0.8); }
  if (K.vnoise(c.x * 34, c.y * 34, c.z * 34) > 0.86) { const s = Math.abs(((c.x * 60) % 1 + 1) % 1 - 0.5) < 0.12 || Math.abs(((c.y * 60) % 1 + 1) % 1 - 0.5) < 0.12; if (s) K.mixc(o.col, GOLD, 0.8); }
  if (c.y < 0.2) K.mixc(o.col, hex('#2a2418'), (0.2 - c.y) * 3.5); }; // frayed, grimy hem
const PAL = {
  skin: { s: 'skin', c: hex('#6c7a3a'), cavK: 0.9, fn: mottle }, belly: { s: 'skin', c: hex('#d6cc98'), fn: speckle }, sac: { s: 'skin', c: hex('#e2d8a8'), L: 0.04, fn: speckle },
  wart: { s: 'skin', c: hex('#8a8a44'), L: 0.06, fn: (c, o) => { if (K.vnoise(c.x * 60, c.y * 60, c.z * 60) > 0.7) K.mixc(o.col, hex('#c8b870'), 0.6); } }, tymp: { s: 'skin', c: hex('#7a6a3a'), L: -0.04 },
  pad: { s: 'skin', c: hex('#c8b47a'), L: 0.05 }, web: { s: 'skin', c: hex('#8a9050'), L: 0.06 },
  eye: { s: 'eye', c: hex('#e2a428'), pupil: 'bar', rim: [46, 40, 22], iris: 0.86 }, mouth: { s: 'dark', c: hex('#3a1420') },
  robe: { s: 'cloth', c: hex('#3a3c6a'), folds: 11, fn: robeFx }, mantle: { s: 'cloth', c: hex('#7a3a26'), folds: 7, fn: robeFx },
  hat: { s: 'cloth', c: hex('#4a3a5a'), folds: 5, fn: (c, o) => { robeFx(c, o); if (c.y > 1.17 && c.y < 1.215) K.mixc(o.col, hex('#7a2a2a'), 0.85); } }, leather: { s: 'leather', c: hex('#6a4a2a') },
  default: { s: 'skin', c: hex('#6c7a3a'), fn: mottle },
};

// ---------------------------------------------------------------- sculpt
function sculpt(S) {
  // body: hunched spine, pot belly, back hump
  S.blob([0, 0.66, 0.08], [0.22, 0.2, 0.21], 'spine1', { k: 0.08, tag: 'belly', imp: 2 });
  S.blob([0, 0.8, 0.0], [0.2, 0.13, 0.17], 'spine2', { k: 0.07, tag: 'skin' }); S.blob([0, 0.84, -0.08], [0.16, 0.1, 0.12], 'spine2', { k: 0.06, tag: 'skin' });
  // the robe: eight lobed panels flaring to a frayed hem (folds come from the lobes), a belt, pouches; a rust mantle and hood
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const d = [Math.sin(a), 0, Math.cos(a)]; const bone = Math.abs(d[2]) > Math.abs(d[0]) ? (d[2] > 0 ? 'robeF' : 'robeB') : d[0] > 0 ? 'robeL' : 'robeR';
    S.limb([d[0] * 0.04, 0.64, d[2] * 0.04 - 0.02], [d[0] * 0.2, 0.15, d[2] * 0.2 - 0.02], 0.22, 0.19, ['hips', bone], { k: 0.06, tag: 'robe', imp: 1 }); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + 0.1; const r = 0.38 + Math.sin(i * 2.3) * 0.02; const p = [Math.sin(a) * r, 0.17, Math.cos(a) * r - 0.02]; S.limb(p, [p[0] * 1.04, 0.07 + (i % 3) * 0.02, p[2] * 1.04], 0.035, 0.012, Math.abs(Math.cos(a)) > 0.7 ? (Math.cos(a) > 0 ? 'robeF' : 'robeB') : Math.sin(a) > 0 ? 'robeL' : 'robeR', { k: 0.02, tag: 'robe' }); }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; S.limb([Math.sin(a) * 0.29, 0.6, Math.cos(a) * 0.29 + 0.01], [Math.sin(a + 0.66) * 0.29, 0.6, Math.cos(a + 0.66) * 0.29 + 0.01], 0.025, 0.025, 'hips', { k: 0.01, tag: 'leather' }); }
  S.blob([0.2, 0.53, 0.22], [0.06, 0.07, 0.04], 'hips', { k: 0.02, tag: 'leather', rot: [0, -0.7, 0] }); S.blob([-0.25, 0.51, 0.12], [0.05, 0.06, 0.04], 'hips', { k: 0.02, tag: 'leather', rot: [0, 0.9, 0] });
  S.blob([0, 0.86, 0.0], [0.27, 0.09, 0.22], 'spine2', { k: 0.05, tag: 'mantle' }); S.blob([0, 0.93, -0.13], [0.15, 0.1, 0.09], 'spine2', { k: 0.05, tag: 'mantle' });
  // head: broad flat skull, snout with an overbite, lower jaw, throat sac, tympana, bulging eyes on top, brow lids
  S.blob([0, 1.0, 0.17], [0.2, 0.085, 0.17], 'head', { k: 0.05, tag: 'skin', imp: 3 }); S.blob([0, 0.985, 0.31], [0.13, 0.055, 0.075], 'head', { k: 0.04, tag: 'skin', imp: 3 });
  S.blob([0, 0.932, 0.24], [0.175, 0.04, 0.12], 'jaw', { k: 0.03, tag: 'skin', imp: 3 }); S.blob([0, 0.895, 0.25], [0.13, 0.05, 0.1], 'throat', { k: 0.03, tag: 'sac', imp: 3 });
  S.box([0, 0.958, 0.27], [0.19, 0.007, 0.1], 0.004, 'head', { k: 0.008, tag: 'mouth', sub: true, rot: [0.08, 0, 0] });
  S.sym((s) => {
    S.blob([0.175 * s, 0.99, 0.11], [0.036, 0.036, 0.012], 'head', { k: 0.012, tag: 'tymp', dir: [s, 0.1, 0.2], imp: 3 });
    S.blob([0.113 * s, 1.052, 0.198], [0.08, 0.064, 0.074], 'head', { k: 0.03, tag: 'skin', imp: 3 });
    S.blob([0.12 * s, 1.088, 0.238], [0.071, 0.071, 0.071], 'eye' + (s > 0 ? '_L' : '_R'), { k: 0.006, tag: 'eye', dir: [0.35 * s, 0.35, 0.87], imp: 5 });
  });
  // warts across the head, back and shoulders
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI * 2, e = rnd() * 1.2; const onHead = i < 26; const c = onHead ? [Math.cos(a) * Math.sin(e) * 0.2, 1.0 + Math.cos(e) * 0.085, 0.17 + Math.sin(a) * Math.sin(e) * 0.17] : [Math.cos(a) * 0.19, 0.82 + rnd() * 0.06, -0.06 - Math.abs(Math.sin(a)) * 0.08];
    if (onHead && Math.hypot(Math.abs(c[0]) - 0.115, c[2] - 0.2) < 0.09) continue; const r = 0.009 + rnd() * 0.01; S.blob(c, [r, r * 0.8, r], onHead ? 'head' : 'spine2', { k: 0.008, tag: 'wart' }); }
  // arms: sleeves over lanky arms, knobbly elbows, long webbed fingers with pads
  S.sym((s, L) => {
    const sh = J['uparm' + L], el = J['forearm' + L], wr = J['hand' + L];
    S.limb(J['clav' + L], sh, 0.06, 0.07, 'clav' + L, { k: 0.04, tag: 'mantle' }); S.limb(sh, el, 0.075, 0.085, 'uparm' + L, { k: 0.03, tag: 'robe' });
    S.limb(el, off(wr, [(el[0] - wr[0]) * 0.3, (el[1] - wr[1]) * 0.3, (el[2] - wr[2]) * 0.3]), 0.09, 0.12, 'forearm' + L, { k: 0.02, tag: 'robe' });
    S.limb(el, wr, 0.034, 0.028, 'forearm' + L, { k: 0.02, tag: 'skin' }); S.blob(el, [0.04, 0.04, 0.04], 'forearm' + L, { k: 0.015, tag: 'wart' });
    S.blob(wr, [0.045, 0.022, 0.05], 'hand' + L, { k: 0.02, tag: 'skin', imp: 2 });
    FING.forEach(([dx], k) => { const a = J[`f${k}a${L}`], b = J[`f${k}b${L}`]; const tip = off(b, [dx * s * 0.8, -0.06, 0.06]);
      S.limb(wr, a, 0.017, 0.014, 'hand' + L, { k: 0.01, tag: 'skin', imp: 2 }); S.limb(a, b, 0.014, 0.012, `f${k}a${L}`, { k: 0.008, tag: 'skin', imp: 2 }); S.limb(b, tip, 0.012, 0.01, `f${k}b${L}`, { k: 0.006, tag: 'skin', imp: 2 });
      S.blob(tip, [0.02, 0.016, 0.02], `f${k}b${L}`, { k: 0.006, tag: 'pad', imp: 3 });
      if (k < 3) { const n = J[`f${k + 1}a${L}`]; S.blob([(a[0] + n[0]) / 2, (a[1] + n[1]) / 2 + 0.008, (a[2] + n[2]) / 2], [0.016, 0.006, 0.026], `f${k}a${L}`, { k: 0.01, tag: 'web', dir: [0, -0.7, 0.7] }); } });
    // legs folded under the robe, big webbed feet with long toes
    const th = J['thigh' + L], kn = J['shin' + L], an = J['ankle' + L], ft = J['foot' + L], to = J['toes' + L];
    S.limb(th, kn, 0.09, 0.06, 'thigh' + L, { k: 0.04, tag: 'skin' }); S.limb(kn, an, 0.055, 0.04, 'shin' + L, { k: 0.03, tag: 'skin' }); S.limb(an, ft, 0.04, 0.038, 'ankle' + L, { k: 0.02, tag: 'skin' }); S.limb(ft, to, 0.04, 0.03, 'foot' + L, { k: 0.02, tag: 'skin' });
    for (let k = 0; k < 4; k++) { const a = (k - 1.5) * 0.32 + s * 0.1; const tip = [to[0] + Math.sin(a) * 0.12, 0.012, to[2] + Math.cos(a) * 0.12]; S.limb(to, tip, 0.02, 0.012, 'toes' + L, { k: 0.01, tag: 'skin', imp: 2 }); S.blob(tip, [0.022, 0.012, 0.022], 'toes' + L, { k: 0.006, tag: 'pad', imp: 3 });
      if (k < 3) { const b2 = (k - 0.5 - 1.0) * 0.32 + s * 0.1 + 0.16; S.blob([to[0] + Math.sin(b2) * 0.07, 0.012, to[2] + Math.cos(b2) * 0.07], [0.03, 0.005, 0.04], 'toes' + L, { k: 0.01, tag: 'web', dir: [Math.sin(b2), 0, Math.cos(b2)] }); } }
  });
  // the battered floppy hat: a wide brim, a crumpled crown bending back to a drooping tip, a dent
  S.blob([0, 1.15, -0.035], [0.28, 0.017, 0.23], 'hat', { k: 0.02, tag: 'hat', rot: [-0.2, 0, 0.06] });
  const cp = [[0, 1.155, -0.045], [0.012, 1.3, -0.065], [0.04, 1.41, -0.105], [0.085, 1.48, -0.195], [0.11, 1.48, -0.3]]; const cr = [0.15, 0.115, 0.08, 0.048, 0.02];
  S.chain(cp, cr, ['hat', 'hat', 'hatTip', 'hatTip'], { k: 0.04, tag: 'hat' }); S.blob([0.07, 1.28, 0.03], [0.05, 0.04, 0.04], 'hat', { k: 0.02, sub: true, tag: 'hat' });
}
const A = () => asset('frog_wizard', { bones: BONES, sculpt, pal: PAL, cell: 0.011, target: 14000, atlas: 1024, maxChart: 0.02, wounds: 0 });

// ---------------------------------------------------------------- clips (additive bone eulers; _pos = body offset)
const splay = (L, k) => Object.fromEntries(FING.flatMap((_, i) => [[`f${i}a${L}`, [-0.3 * k, 0, (i - 1.5) * 0.35 * k * (L === '_L' ? 1 : -1)]], [`f${i}b${L}`, [-0.25 * k, 0, 0]]]));
const curl = (L, k) => Object.fromEntries(FING.flatMap((_, i) => [[`f${i}a${L}`, [1.0 * k, 0, 0]], [`f${i}b${L}`, [1.2 * k, 0, 0]]]));
const CLIPS = {
  cast: [[0, {}], [0.35, { _pos: [0, -0.04, 0], spine2: [0.1, 0, 0], head: [0.15, 0, 0], uparm_L: [-0.3, 0, -0.3], forearm_L: [-0.4, 0, 0], ...curl('_L', 0.6), hips: [0.05, 0, 0] }],
    [0.75, { _pos: [0, 0.03, 0], spine2: [-0.22, 0, 0], neck: [-0.15, 0, 0], head: [-0.3, 0, 0], jaw: [0.25, 0, 0], uparm_L: [-1.9, 0, -0.5], forearm_L: [-0.6, 0, 0], ...splay('_L', 1), uparm_R: [-0.7, 0, 0.3], forearm_R: [-0.3, 0, 0], hatTip: [-0.3, 0, 0] }],
    [1.5, { _pos: [0, 0.03, 0], spine2: [-0.2, 0, 0], head: [-0.25, 0.1, 0], jaw: [0.2, 0, 0], uparm_L: [-1.8, 0.1, -0.5], forearm_L: [-0.55, 0, 0], ...splay('_L', 1), uparm_R: [-0.6, 0, 0.3] }], [2.1, {}]],
  tongue: [[0, {}], [0.25, { neck: [-0.15, 0, 0], head: [-0.25, 0, 0] }], [0.34, { neck: [-0.2, 0, 0], head: [-0.32, 0, 0], jaw: [0.55, 0, 0] }], [0.62, { head: [-0.28, 0, 0], jaw: [0.5, 0, 0] }], [0.78, { head: [0.05, 0, 0], jaw: [0.05, 0, 0], spine2: [0.06, 0, 0] }], [1.3, { head: [0.08, 0, 0] }], [1.6, {}]],
  tap: [[0, {}], [0.3, { uparm_R: [-0.5, 0, 0.1], forearm_R: [-0.2, 0, 0], spine2: [-0.04, 0, 0] }], [0.42, { uparm_R: [0.15, 0, 0], forearm_R: [0.1, 0, 0], spine2: [0.05, 0, 0], head: [0.08, 0, 0], _pos: [0, -0.015, 0] }], [0.7, { uparm_R: [-0.35, 0, 0.1] }], [0.82, { uparm_R: [0.1, 0, 0], _pos: [0, -0.01, 0] }], [1.1, {}]],
  scratch: [[0, {}], [0.35, { uparm_L: [-1.2, 0, -0.9], forearm_L: [-1.6, 0, 0], head: [0.12, -0.25, 0.25], ...curl('_L', 0.5) }], [0.5, { uparm_L: [-1.25, 0, -0.85], forearm_L: [-1.75, 0, 0], ...curl('_L', 0.9) }], [0.62, { uparm_L: [-1.2, 0, -0.9], forearm_L: [-1.6, 0, 0], ...curl('_L', 0.4) }], [0.74, { uparm_L: [-1.25, 0, -0.85], forearm_L: [-1.75, 0, 0], ...curl('_L', 0.9) }], [0.86, { uparm_L: [-1.2, 0, -0.9], forearm_L: [-1.6, 0, 0], ...curl('_L', 0.4) }], [1.0, { uparm_L: [-1.25, 0, -0.85], forearm_L: [-1.75, 0, 0], ...curl('_L', 0.9), head: [0.15, -0.3, 0.3] }], [1.5, {}]],
  hop: [[0, {}], [0.22, { _pos: [0, -0.09, 0], hips: [0.15, 0, 0], spine2: [0.12, 0, 0], thigh_L: [-0.5, 0, 0], thigh_R: [-0.5, 0, 0], shin_L: [0.8, 0, 0], shin_R: [0.8, 0, 0], ankle_L: [-0.5, 0, 0], ankle_R: [-0.5, 0, 0] }],
    [0.42, { _pos: [0, 0.28, 0.05], hips: [-0.1, 0, 0], spine2: [-0.15, 0, 0], thigh_L: [0.35, 0, 0], thigh_R: [0.35, 0, 0], shin_L: [-0.3, 0, 0], shin_R: [-0.3, 0, 0], ankle_L: [0.3, 0, 0], ankle_R: [0.3, 0, 0], hatTip: [0.4, 0, 0], uparm_L: [-0.4, 0, -0.3] }],
    [0.62, { _pos: [0, -0.07, 0.08], hips: [0.12, 0, 0], thigh_L: [-0.4, 0, 0], thigh_R: [-0.4, 0, 0], shin_L: [0.6, 0, 0], shin_R: [0.6, 0, 0], hatTip: [-0.4, 0, 0] }], [0.95, { _pos: [0, 0, 0.06] }], [1.2, {}]],
  shuffle: [[0, {}], [0.3, { _pos: [0.02, 0.02, 0], hips: [0, 0.12, 0.04], thigh_L: [-0.4, 0, 0], shin_L: [0.5, 0, 0], spine2: [0, -0.06, 0] }], [0.6, { _pos: [0.03, 0, 0], hips: [0, 0.06, 0] }],
    [0.9, { _pos: [0.05, 0.02, 0], hips: [0, -0.1, -0.04], thigh_R: [-0.4, 0, 0], shin_R: [0.5, 0, 0], spine2: [0, 0.06, 0] }], [1.2, { _pos: [0.06, 0, 0] }], [1.5, {}]],
  nod: [[0, {}], [0.25, { neck: [0.12, 0, 0], head: [0.2, 0, 0] }], [0.5, { head: [-0.05, 0, 0] }], [0.75, { neck: [0.1, 0, 0], head: [0.15, 0, 0] }], [1.1, {}]],
  ribbit: [[0, {}], [0.3, { head: [-0.2, 0, 0], neck: [-0.1, 0, 0], spine2: [-0.06, 0, 0] }], [0.8, { head: [-0.22, 0, 0] }], [1.2, {}]],
};

const SPEC = {
  id: 'frogWizard', bones: BONES, height: 1.45, asset: A, clips: CLIPS,
  follow: { robeF: [6, 0.3], robeB: [6, 0.3], robeL: [6, 0.3], robeR: [6, 0.3], hatTip: [7, 0.22], throat: [14, 0.4], head: [16, 0.5] },
  props(ctx) {
    const { B, model, own } = ctx;
    // the staff: a gnarled root through the right fist, roots knotted around a glowing crystal, a little bone charm
    const wood = own(K.uvMat('frog-staff', 16, 64, (u, v, o) => { const g = Math.sin(v * 90 + Math.sin(u * 6.28 * 2) * 3); K.tone(hex('#6a4a2a'), K.band(0.55 + Math.cos(u * 6.28) * 0.18 + (g > 0.6 ? -0.2 : 0), 4), o.col); }));
    const hr = J.hand_R; const path = new THREE.CatmullRomCurve3([V(hr[0] - 0.01, 0.02, hr[2] + 0.04), V(hr[0] + 0.015, 0.35, hr[2] + 0.02), V(hr[0] - 0.01, 0.7, hr[2] + 0.03), V(hr[0] + 0.02, 1.0, hr[2] + 0.01), V(hr[0], 1.24, hr[2] + 0.02)]);
    const parts = [[new THREE.TubeGeometry(path, 40, 0.026, 8), 'hand_R']]; const top = V(hr[0], 1.3, hr[2] + 0.02);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; parts.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(hr[0], 1.2, hr[2] + 0.02), top.clone().add(V(Math.cos(a) * 0.07, 0.02, Math.sin(a) * 0.07)), top.clone().add(V(Math.cos(a + 1) * 0.04, 0.12, Math.sin(a + 1) * 0.04)), top.clone().add(V(Math.cos(a + 2) * 0.015, 0.17, Math.sin(a + 2) * 0.015))]), 12, 0.011, 5), 'hand_R']); }
    rigidSkinned(B, parts, wood, model);
    const cry = new THREE.OctahedronGeometry(0.055, 0); cry.scale(1, 1.6, 1); cry.translate(top.x, top.y + 0.06, top.z); const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.95, 1.7), toneMapped: false });
    ctx.vars.crystal = rigidSkinned(B, [[cry, 'hand_R']], glow, model); ctx.vars.crystal.userData.noAO = true;
    const pl = new THREE.PointLight(0x9cc8ff, 2.4, 4, 2); pl.position.set(top.x, top.y + 0.06, top.z); onBone(B, 'hand_R', pl); ctx.vars.glow = pl;
    // charms: bottles and bones on the belt, a tooth necklace, chin barbels and wart bristles, nictitating lids, the tongue
    const misc = own(K.uvMat('frog-charms', 32, 32, (u, v, o) => { const cols = [hex('#4a7a5a'), hex('#8a3a2a'), hex('#e8dcc0'), hex('#c8a040')]; K.tone(cols[Math.floor(u * 4)], K.band(0.5 + (v - 0.5) * 0.4, 4), o.col); }));
    const atU = (g, k) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (k + 0.5) / 4, uv.getY(i)); return g; };
    const lathe = (pts, x, y, z, k, rz = 0) => { const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 16); g.rotateZ(rz); g.translate(x, y, z); return atU(g, k); };
    const cp = [[lathe([[0.001, -0.05], [0.025, -0.045], [0.03, -0.01], [0.012, 0.01], [0.01, 0.03], [0.001, 0.03]], 0.12, 0.5, 0.28, 0), 'hips'], [lathe([[0.001, 0.03], [0.012, 0.035], [0.012, 0.05], [0.001, 0.05]], 0.12, 0.5, 0.28, 1), 'hips'],
      [lathe([[0.001, -0.04], [0.022, -0.035], [0.022, 0.0], [0.009, 0.015], [0.001, 0.025]], -0.08, 0.5, 0.29, 0), 'hips'], [lathe([[0.008, -0.04], [0.016, -0.045], [0.006, 0.0], [0.016, 0.045], [0.008, 0.04]], 0.27, 0.48, 0.12, 2, 0.4), 'hips']];
    for (let i = 0; i < 9; i++) { const a = -1.1 + (i / 8) * 2.2; cp.push([lathe([[0.001, 0], [0.009, 0.005], [0.006, 0.025], [0.001, 0.04]], Math.sin(a) * 0.2, 0.86 - Math.cos(a) * 0.02, 0.12 + Math.cos(a) * 0.11, 2, Math.PI), 'spine2']); }
    for (const [x, z, len] of [[-0.06, 0.32, 0.13], [0.0, 0.34, 0.16], [0.06, 0.32, 0.12], [0.1, 0.28, 0.09]]) cp.push([atU(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x, 0.905, z), V(x * 1.1, 0.905 - len * 0.5, z + 0.02), V(x * 1.2, 0.905 - len, z - 0.01)]), 8, 0.004, 4), 2), 'jaw']);
    rigidSkinned(B, cp, misc, model);
    const skinLid = own(K.uvMat('frog-lid', 8, 8, (u, v, o) => K.tone(hex('#8a9050'), K.band(0.55 + v * 0.2, 4), o.col)));
    const lp = []; for (const [s, L] of [[1, '_L'], [-1, '_R']]) { const e = J['lid' + L]; const g = new THREE.SphereGeometry(0.076, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); g.rotateX(Math.PI * 0.62); g.translate(e[0] + 0.003 * s, e[1] + 0.008, e[2] + 0.015); lp.push([g, 'lid' + L]); }
    rigidSkinned(B, lp, skinLid, model);
    const tongueM = own(K.uvMat('frog-tongue', 8, 16, (u, v, o) => K.tone(hex('#d86a7a'), K.band(0.5 + Math.cos(u * 6.28) * 0.2, 4), o.col)));
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.935, 0.2), V(0, 0.938, 0.25), V(0, 0.94, 0.3)]), 8, 0.02, 8); const tip = new THREE.SphereGeometry(0.03, 12, 8); tip.scale(1, 0.6, 1); tip.translate(0, 0.94, 0.3);
    rigidSkinned(B, [[tg, 'tongue'], [tip, 'tongue']], tongueM, model);
  },
  idle(P, t, st, ctx) {
    const br = Math.sin(t * 1.4); const lk = ctx.vars.look || [0, 0];
    add(P, 'spine1', br * 0.02); add(P, 'spine2', 0.12 + br * 0.015, lk[0] * 0.2); add(P, 'neck', 0.05 - lk[1] * 0.3, lk[0] * 0.35); add(P, 'head', -lk[1] * 0.35, lk[0] * 0.45, Math.sin(t * 0.37) * 0.05);
    add(P, 'jaw', st.talk > 0 ? Math.max(0, Math.sin(t * 15)) * 0.22 + 0.04 : 0.01);
    add(P, 'uparm_L', 0.1, 0, -0.08); add(P, 'forearm_L', -0.2 + Math.sin(t * 0.8) * 0.04); for (let i = 0; i < 4; i++) { add(P, `f${i}a_L`, 0.35 + Math.sin(t * 1.1 + i) * 0.06); add(P, `f${i}b_L`, 0.45); add(P, `f${i}a_R`, 1.15); add(P, `f${i}b_R`, 1.3); }
    add(P, 'thigh_L', -0.05); add(P, 'thigh_R', -0.05); add(P, 'hatTip', Math.sin(t * 0.9) * 0.08, 0, Math.sin(t * 0.7) * 0.06);
    const bl = ctx.vars.blink || 0; add(P, 'lid_L', 1.1 * (1 - bl)); add(P, 'lid_R', 1.1 * (1 - bl));
  },
  after(dt, t, ctx) {
    ctx.api.onVars?.(ctx.vars); const { B, st, vars } = ctx; const m = st.mode, u = st.modeT;
    // throat sac: a slow pulse; balloons when casting or croaking; gulps after the tongue
    let k = 0.06 * Math.max(0, Math.sin(t * 2.1)) ** 2; if (m === 'cast') k += 0.9 * ease(u / 0.6) * (1 - ease((u - 1.6) / 0.4)); if (m === 'ribbit') k += 1.1 * Math.sin(Math.min(1, u / 0.9) * Math.PI); if (m === 'tongue' && u > 0.75) k += 0.35 * Math.sin(Math.min(1, (u - 0.75) / 0.5) * Math.PI);
    B.map.throat.scale.set(1 + k * 0.5, 1 + k * 0.9, 1 + k * 0.7);
    // tongue: shoots out, snaps back with the firefly
    const tk = m === 'tongue' ? (u < 0.34 ? 0 : u < 0.46 ? (u - 0.34) / 0.12 : u < 0.62 ? 1 : Math.max(0, 1 - (u - 0.62) / 0.12)) : 0; B.map.tongue.scale.set(1, 1, 1 + tk * 7); vars.tongue = tk;
    // blinks: the lids sweep up while the eyes retract into the skull (and again when he swallows)
    vars.bt = (vars.bt ?? 3) - dt; if (vars.bt < 0) { vars.bt = 2.5 + Math.random() * 4; vars.bs = 0.32; } vars.bs = Math.max(0, (vars.bs || 0) - dt);
    const swallow = m === 'tongue' && u > 0.8 && u < 1.15 ? 1 : 0; vars.blink = Math.max(Math.sin(Math.min(1, (0.32 - vars.bs) / 0.32) * Math.PI) * (vars.bs > 0 ? 1 : 0), swallow * 0.8);
    for (const L of ['_L', '_R']) { const e = B.map['eye' + L]; const r = e.userData.rest, pr = e.parent.userData.rest; e.position.set(r.x - pr.x, r.y - pr.y - vars.blink * 0.022, r.z - pr.z - vars.blink * 0.01); const tg = vars.eyeLook || [0, 0]; e.rotation.set(-tg[1] * 0.5, tg[0] * 0.6, 0); }
    vars.glow && (vars.glow.intensity = 2.4 + (m === 'cast' ? 10 * ease(u / 0.5) * (1 - ease((u - 1.6) / 0.4)) : 0) + Math.sin(t * 3) * 0.3);
  },
};

export function createFrog() {
  const api = createGeneric(SPEC, 3); const root = api.root; root.name = 'frogWizard'; const ctx = { vars: null };
  // reach the spec's shared vars (createGeneric keeps them in its ctx): mirror through the closure the spec hooks receive
  let vars = null; api.onVars = (v) => { vars = v; ctx.vars = v; };
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // a firefly that hangs around his face (and gets eaten now and then)
  const fly = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.0, 0.7), toneMapped: false })); fly.userData.noAO = true; root.add(fly); const flyL = new THREE.PointLight(0xd8ff90, 0.5, 1.2, 2); fly.add(flyL);
  const st = { look: V(0, 1.1, 5), near: false, next: 3, act: null, flyGone: 0 };
  const head = api.bones.head;
  const wrap = {
    root, api, get crystal() { return vars?.crystal; },
    headTop: () => head.localToWorld(V(0, 0.4, 0)),
    act(a) { if (a === 'nod' || a === 'ribbit' || a === 'cast' || a === 'tongue' || a === 'tap' || a === 'scratch' || a === 'hop' || a === 'shuffle') { api.act(a); if (a === 'nod' || a === 'ribbit') api.talk(1.2); } },
    lookAt(v) { st.look.copy(v); },
    update(dt, t) {
      dt = Math.min(dt, 0.05);
      // head / eyes toward the viewer (head space)
      root.updateMatrixWorld(); const hp = head.getWorldPosition(V()); const to = st.look.clone().sub(hp); const inv = root.getWorldQuaternion(new THREE.Quaternion()).invert(); to.applyQuaternion(inv);
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(to.x, to.z))), pitch = Math.max(-0.5, Math.min(0.5, Math.atan2(to.y, Math.hypot(to.x, to.z))));
      if (vars) { vars.look = [yaw * 0.7, pitch * 0.6]; vars.eyeLook = [yaw * 0.3, pitch * 0.3]; }
      // behaviour: greet the viewer when they come close; otherwise an idle habit every few seconds
      const d = Math.hypot(to.x, to.z); if (d < 3.0 && !st.near) { st.near = true; wrap.act('nod'); } if (d > 3.6) st.near = false;
      st.next -= dt; if (st.next < 0 && api.st.mode === 'idle') { st.next = 4 + Math.random() * 4; const pick = ['tongue', 'tap', 'scratch', 'tongue', 'hop', 'shuffle'][Math.floor(Math.random() * 6)]; wrap.act(pick); }
      // the firefly: wanders before his face; the tongue catches it, it reappears later
      const m = api.st.mode, u = api.st.modeT; st.flyGone = Math.max(0, st.flyGone - dt);
      if (m === 'tongue' && u > 0.3 && u < 0.62) fly.position.set(0, 1.12, 0.66); else if (m === 'tongue' && u >= 0.62) { fly.visible = false; st.flyGone = 2.5; }
      else { fly.visible = st.flyGone <= 0; fly.position.set(Math.sin(t * 1.3) * 0.35, 1.25 + Math.sin(t * 2.1) * 0.12, 0.55 + Math.cos(t * 0.9) * 0.15); }
      flyL.intensity = fly.visible ? 0.5 + Math.sin(t * 9) * 0.2 : 0;
      api.update(dt);
    },
  };
  return wrap;
}
