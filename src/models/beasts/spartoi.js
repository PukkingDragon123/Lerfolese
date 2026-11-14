// Spartoi on the human base: a dragon's-tooth hoplite built on the Limbo human body (wiry build) whose flesh is
// repainted as stained, cracked bone with dark hollows between ribs and limb bones, a bronze muscle cuirass and
// greaves, leather pteruges; a crested Corinthian helmet over the skull, a hoplon with the dragon of Ares on the
// left forearm and a dory in the right fist. Animation: the engine's strike as a spear thrust; it falls in a heap.
import { THREE, K, hex, limboBeast, mount, recolor, near } from './humanoid.js';
import { prop } from './kit.js';

const BRZ = { s: 'metal', c: hex('#8a6a3e'), me: 0.6, ro: 0.4 };
const BONE = hex('#cfc2a2'), TEE = [150, 150, 150], SKIRT = [110, 70, 40];
const HELM_PAL = { bronze: { ...BRZ, rivet: 0 }, crest: { s: 'fur', c: hex('#8a2a22'), fs: 60, flow: 0.15, strand: 0.3 }, default: BRZ };
function helmet(S) { // Corinthian: hollow domed shell, T-shaped face opening, cheek guards, nasal, horsehair crest on a stand
  S.blob([0, 1.685, 0.025], [0.105, 0.12, 0.125], 'p', { k: 0.02, tag: 'bronze' });
  S.blob([0, 1.6, 0.04], [0.098, 0.1, 0.112], 'p', { k: 0.02, tag: 'bronze' });
  S.blob([0, 1.66, 0.03], [0.086, 0.108, 0.108], 'p', { k: 0.01, tag: 'bronze', sub: true });
  S.box([0, 1.655, 0.14], [0.065, 0.016, 0.06], 0.01, 'p', { k: 0.008, tag: 'bronze', sub: true });
  S.box([0, 1.6, 0.14], [0.016, 0.05, 0.06], 0.008, 'p', { k: 0.008, tag: 'bronze', sub: true });
  S.box([0, 1.53, 0.04], [0.12, 0.03, 0.14], 0.01, 'p', { k: 0.01, tag: 'bronze', sub: true });
  S.box([0, 1.82, -0.0], [0.012, 0.02, 0.1], 0.006, 'p', { k: 0.01, tag: 'bronze' });
  for (let i = 0; i < 11; i++) { const a = -1.15 + (i / 10) * 2.5; const y = 1.8 + Math.cos(a) * 0.13, z = -0.03 + Math.sin(a) * -0.15; S.blob([0, y, z], [0.02, 0.055 - Math.abs(a) * 0.012, 0.03], 'p', { k: 0.018, tag: 'crest', dir: [0, Math.sin(a) * 0.3, Math.cos(a)], up: [0, Math.cos(a), -Math.sin(a)] }); }
  for (let i = 0; i < 5; i++) S.limb([(i - 2) * 0.008, 1.86, -0.17], [(i - 2) * 0.02, 1.68 - (i % 2) * 0.04, -0.27], 0.02, 0.005, 'p', { k: 0.012, tag: 'crest' });
}
const SPEAR_PAL = { wood: { s: 'wood', c: hex('#8a6038'), grain: 90 }, iron: { s: 'metal', c: hex('#9aa0aa'), me: 0.6 }, bronze: { ...BRZ, rivet: 0 }, default: { s: 'wood', c: hex('#8a6038') } };
function spear(S) { // dory: ash shaft, leaf blade, bronze sauroter (local +Y from the grip)
  S.limb([0, -0.8, 0], [0, 1.45, 0], 0.016, 0.016, 'p', { k: 0.004, tag: 'wood' });
  S.blob([0, 1.6, 0], [0.032, 0.15, 0.007], 'p', { k: 0.006, tag: 'iron' }); S.limb([0, 1.42, 0], [0, 1.5, 0], 0.02, 0.014, 'p', { k: 0.006, tag: 'iron' });
  S.limb([0, -0.8, 0], [0, -1.0, 0], 0.02, 0.006, 'p', { k: 0.006, tag: 'bronze' });
}
function shieldGeo() { // hoplon: a deep bronze bowl with a flat rolled rim (axis +Z)
  const g = new THREE.LatheGeometry([[0, 0.085], [0.18, 0.075], [0.32, 0.05], [0.42, 0.015], [0.455, 0.0], [0.48, 0.0], [0.485, -0.012], [0.47, -0.02], [0.42, -0.005], [0.3, 0.035], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 14); g.rotateX(Math.PI / 2); return g;
}
const shieldMat = () => K.uvMat('spartoi-shield', 256, 128, (u, v, o) => { // u round, v along the profile (centre -> rim -> back)
  const r = Math.min(1, v / 0.42); const a = u * Math.PI * 2; o.me = 0.5; o.ro = 0.35;
  if (v > 0.55) { K.tone(hex('#4a3020'), 0.4, o.col); o.me = 0; return; }
  if (r > 0.86) { K.tone(hex('#d09a48'), K.band(0.6 + Math.cos(a) * 0.2, 4), o.col); return; }
  const coil = Math.abs(((a + r * 9) % (Math.PI * 2)) - Math.PI) < 0.45 && r > 0.18 && r < 0.78; const ring = Math.abs(r - 0.82) < 0.025;
  K.tone(coil ? hex('#1e1a1a') : ring ? hex('#6a2418') : hex('#8a3a26'), K.band(0.55 + Math.cos(a) * 0.12 - r * 0.1, 4), o.col); if (coil || ring) o.me = 0.1; else o.me = 0.15;
});

const sparHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  const wrap = (fn) => (c, o) => {
    fn(c, o);
    if (near(o, SKIRT, 0.16)) { const a = Math.atan2(c.x, c.z); const f = ((a / Math.PI) * 10 % 1 + 1) % 1; return recolor(o, f < 0.1 || f > 0.9 ? [36, 22, 14] : hex('#6a4a30'), SKIRT, 0, c, 'leather'); } // pteruges strips
    if (near(o, TEE, 0.1) && lumOf(o) > 40) { const ab = c.nz > 0.3 && Math.abs(c.x) < 0.07 * H && c.y < P.bustY && Math.abs((((c.y / H) * 28) % 1) - 0.5) < 0.08; return recolor(o, hex('#8a6a3e'), TEE, ab ? -0.2 : 0, c, 'metal', 0.85); } // muscle cuirass
    if (!near(o, sk, 0.14)) return;
    if (c.part === 'calf' && c.nz > -0.2) return recolor(o, hex('#8a6a3e'), sk, 0.05, c, 'metal', 0.8); // greaves
    const along = c.part === 'farm' || c.part === 'calf' || c.part === 'uarm' || c.part === 'thigh'; const gap = along ? Math.abs(Math.sin(Math.atan2(c.x - Math.sign(c.x) * 0.1 * H, c.z) * 2)) < 0.18 : false; // the gap between paired limb bones
    const joint = [P.elbowY, P.kneeY, P.wristY, P.ankleY, P.shoulderY].some((y) => Math.abs(c.y - y) < 0.012 * H);
    recolor(o, BONE, sk, (gap ? -0.32 : 0) + (joint ? -0.12 : 0), c, 'bone', 0.9);
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
};
const lumOf = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
export const warmSpartoi = () => { prop('spartoi-helm', helmet, HELM_PAL, { cell: 0.007, target: 3200, atlas: 256 }); prop('spartoi-spear', spear, SPEAR_PAL, { cell: 0.008, target: 1200, atlas: 256, maxChart: 0.01 }); };
export const createSpartoi = (seed = 1) => limboBeast({
  id: 'spartoi', height: 1.85, blood: [0.03, 0.025, 0.02], speed: 1.05, sway: 0.5, impact: 0.45,
  app: { skin: 0xcfc2a2, hair: 0x222222, hairStyle: 'bald', build: 'wiry', age: 0.9, eyeColor: 0x0a0a0a, height: 1 },
  outfit: { torso: { tex: 'c_tee', color: 0x969696 }, legs: { tex: 'c_skirt', color: 0x6e4628 }, legsKind: 'skirt' }, overrides: { eyeH: 1.3 }, hook: sparHook,
  build(ctx) {
    const { L, sc } = ctx; const hr = L.restOf('head');
    const hm = prop('spartoi-helm', helmet, HELM_PAL, { cell: 0.007, target: 3200, atlas: 256 }); const hg = new THREE.Group(); const hmesh = K.mesh(hm.geo, hm.mat); hmesh.position.set(0, -1.593, -0.0216); hg.add(hmesh); hg.scale.setScalar(1.05); mount(ctx, 'head', hg, { at: [0, 0.0, 0.01 * sc] });
    const sp = prop('spartoi-spear', spear, SPEAR_PAL, { cell: 0.008, target: 1200, atlas: 256, maxChart: 0.01 }); const sm = K.mesh(sp.geo, sp.mat); sm.rotation.x = Math.PI / 2; mount(ctx, 'handR', sm, { at: [0, -0.08 * sc, 0.01 * sc] });
    const sh = K.mesh(shieldGeo(), shieldMat()); sh.rotation.y = Math.PI / 2; mount(ctx, 'farmL', sh, { at: [0.07 * sc, -0.12 * sc, 0.02 * sc] }); void hr;
  },
  pose(add, t, st, ctx) { const tw = Math.max(0, Math.sin(t * 1.3) - 0.94) * 6; add('head', 0.04 + tw * 0.1, -0.1, tw * 0.15); add('thighL', -0.2, 0, -0.06); add('shinL', 0.25); add('thighR', 0.1, 0, 0.06); if (ctx.anim.mode === 'idle') { add('uarmL', -0.5, 0, 0.1); add('farmL', -1.0); add('farmR', -1.1); add('handR', 0.15); } }, // shield up, spear upright
}, seed);
