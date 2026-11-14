// Spartoi: a dragon's-tooth skeleton hoplite (1.8 m). Bronze muscle cuirass with leather pteruges over a bare-bone
// frame: knobbed humerus, paired forearm bones, bony fists, femurs with kneecaps under bronze greaves, skeletal feet,
// a grinning skull with green-lit sockets inside a crested Corinthian helmet. Hoplon shield on the left arm (painted
// dragon of Ares) and a dory spear in the right fist. Attack: draw the spear back behind the shield, lunge-thrust
// (impact), recover. Death: the bones fold and the warrior crashes down in a rattling heap.
import { THREE, K, hex, humanRows, sculptHuman, sculptFist, fistFrame, asset, prop, createGeneric, onBone, add, lerp3, fallSide } from './kit.js';

const H = 1.8;
const BONES = humanRows(H, { sw: 1.05 });
const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const BRZ = { s: 'metal', c: hex('#94643a'), me: 0.6, ro: 0.3, rivet: 0.06 };
const PAL = {
  bronze: BRZ, bone: { s: 'bone', c: hex('#cfc2a2'), cavK: 0.9 }, leather: { s: 'leather', c: hex('#7a4426') }, socket: { s: 'dark', c: hex('#1a2a1c'), e: [26, 70, 36] },
  teeth: { s: 'bone', c: hex('#f0e6cc') }, default: { s: 'bone', c: hex('#e2d6b8') },
};
function sculpt(S) {
  sculptHuman(S, J, H, { bulk: 0.92, arms: false, legs: false, tags: { body: 'bronze', neck: 'bronze' } });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; S.box([Math.sin(a) * 0.15, 0.835, Math.cos(a) * 0.12], [0.035, 0.085, 0.008], 0.005, 'hips', { k: 0.004, tag: 'leather', dir: [Math.sin(a), 0, Math.cos(a)], up: [0, 1, 0] }); }
  S.blob([0, 0.94, -0.01], [0.15, 0.05, 0.12], 'hips', { k: 0.02, tag: 'leather' });
  S.sym((s, L) => {
    const sh = J['uparm' + L], el = J['forearm' + L], wr = J['hand' + L], hp = J['thigh' + L], kn = J['shin' + L], an = J['foot' + L];
    S.blob(sh, [0.06, 0.055, 0.06], ['clav' + L, 'uparm' + L], { k: 0.015, tag: 'bronze' });
    S.limb(sh, el, 0.021, 0.018, 'uparm' + L, { k: 0.008, tag: 'bone' }); S.blob(el, [0.03, 0.028, 0.028], 'forearm' + L, { k: 0.008, tag: 'bone' });
    for (const o of [-1, 1]) S.limb([el[0] + 0.011 * o, el[1], el[2] + 0.009 * o], [wr[0] + 0.009 * o, wr[1], wr[2] + 0.007 * o], 0.015, 0.013, 'forearm' + L, { k: 0.006, tag: 'bone' });
    sculptFist(S, J, L, H, 0.82, 'bone');
    S.limb(hp, kn, 0.026, 0.022, 'thigh' + L, { k: 0.008, tag: 'bone' }); S.blob(hp, [0.04, 0.035, 0.035], 'thigh' + L, { k: 0.01, tag: 'bone' }); S.blob([kn[0], kn[1], kn[2] + 0.025], [0.028, 0.03, 0.02], 'shin' + L, { k: 0.008, tag: 'bone' });
    S.limb(kn, an, 0.02, 0.016, 'shin' + L, { k: 0.006, tag: 'bone' });
    S.limb(lerp3(kn, an, 0.08), lerp3(kn, an, 0.92), 0.045, 0.034, 'shin' + L, { k: 0.01, tag: 'bronze' }); // greave
    S.box([an[0], 0.02, an[2] + 0.05], [0.03, 0.01, 0.06], 0.008, 'foot' + L, { k: 0.008, tag: 'bone' });
    for (let i = 0; i < 4; i++) S.limb([an[0] + (i - 1.5) * 0.016, 0.02, an[2] + 0.1], [an[0] + (i - 1.5) * 0.019, 0.012, an[2] + 0.15], 0.008, 0.006, 'foot' + L, { k: 0.003, tag: 'bone' });
  });
  // skull: cranium, cheekbones, sockets lit green, nasal cavity, grinning jaw
  S.blob([0, 1.68, 0.02], [0.082, 0.095, 0.1], 'head', { k: 0.02, tag: 'bone', imp: 3 }); S.blob([0, 1.63, 0.06], [0.07, 0.06, 0.07], 'head', { k: 0.02, tag: 'bone', imp: 3 });
  S.sym((s) => { S.blob([0.032 * s, 1.655, 0.118], [0.022, 0.02, 0.025], 'head', { k: 0.008, tag: 'socket', sub: true }); S.blob([0.032 * s, 1.655, 0.1], [0.008, 0.008, 0.008], 'head', { k: 0.002, tag: 'socket', imp: 4 }); });
  S.blob([0, 1.625, 0.125], [0.01, 0.014, 0.02], 'head', { k: 0.004, tag: 'socket', sub: true });
  S.blob([0, 1.585, 0.07], [0.055, 0.03, 0.055], 'jaw', { k: 0.012, tag: 'teeth', imp: 3 }); S.box([0, 1.604, 0.11], [0.04, 0.004, 0.03], 0.002, 'head', { k: 0.003, tag: 'socket', sub: true });
}
const A = () => asset('spartoi', { bones: BONES, sculpt, pal: PAL, cell: 0.0105, target: 10500, atlas: 512, maxChart: 0.012, woundScale: 0.7, woundSkip: ['socket'] });
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
const CLIPS = {
  attack: [[0, {}],
    [0.3, { _pos: [0, -0.05, -0.12], hips: [0, 0.3, 0], spine1: [-0.05, 0.15, 0], spine2: [-0.05, 0.1, 0], head: [0.05, -0.3, 0], uparm_R: [-0.4, 0, 0.9], forearm_R: [-1.5, 0, 0], hand_R: [0.6, 0, 0], thigh_L: [-0.4, 0, 0], shin_L: [0.5, 0, 0], thigh_R: [0.25, 0, 0], shin_R: [0.3, 0, 0] }],
    [0.38, { _pos: [0, -0.1, 0.4], hips: [0.12, -0.25, 0], spine1: [0.15, -0.15, 0], spine2: [0.1, -0.1, 0], head: [0.1, 0.1, 0], uparm_R: [-1.3, -0.2, 0.5], forearm_R: [-0.2, 0, 0], hand_R: [2.5, 0, 0], thigh_L: [-0.7, 0, 0], shin_L: [0.55, 0, 0], thigh_R: [0.45, 0, 0], shin_R: [0.1, 0, 0] }],
    [0.55, { _pos: [0, -0.08, 0.32], hips: [0.1, -0.2, 0], spine1: [0.12, -0.12, 0], uparm_R: [-1.2, -0.2, 0.45], forearm_R: [-0.3, 0, 0], hand_R: [2.45, 0, 0], thigh_L: [-0.6, 0, 0], shin_L: [0.5, 0, 0], thigh_R: [0.4, 0, 0] }], [0.85, {}]],
  cast: [[0, {}], [0.3, { spine2: [-0.1, 0, 0], head: [-0.3, 0, 0], jaw: [0.5, 0, 0], uparm_R: [-0.6, 0, 0.3], forearm_R: [-1.0, 0, 0] }], [0.5, { jaw: [0.1, 0, 0], head: [-0.25, 0.2, 0] }], [0.7, { jaw: [0.5, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.02, -0.18], spine1: [-0.15, 0.1, 0.08], spine2: [-0.12, 0.1, 0], head: [-0.4, 0.5, 0.25], jaw: [0.6, 0, 0], uparm_L: [0.3, 0, 0.3], thigh_R: [0.4, 0, 0], shin_R: [0.4, 0, 0] }], [0.3, { head: [0.15, -0.2, -0.1], jaw: [0.3, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.15, { spine2: [-0.25, 0, 0], head: [-0.6, 0.4, 0.3], jaw: [0.8, 0, 0], uparm_L: [0, 0, 0.6], uparm_R: [0, 0, -0.6] }],
    [0.4, { hips: [0.3, 0, 0], spine1: [0.35, 0, 0.1], spine2: [0.3, 0, 0], head: [0.6, 0, 0.4], jaw: [0.6, 0, 0], thigh_L: [-1.3, 0, 0], thigh_R: [-1.2, 0, 0], shin_L: [1.9, 0, 0], shin_R: [1.8, 0, 0], uparm_L: [-0.6, 0, 0.3], uparm_R: [-0.6, 0, -0.3] }],
    [0.75, { hips: [0.3, 0, 0], spine1: [0.4, 0, 0.3], spine2: [0.35, 0.2, 0.2], head: [0.7, 0.6, 0.6], jaw: [0.9, 0, 0], thigh_L: [-1.4, 0, 0.3], thigh_R: [-1.0, 0, -0.2], shin_L: [2.0, 0, 0], shin_R: [1.6, 0, 0], uparm_L: [-0.9, 0, 0.8], uparm_R: [-0.3, 0, -1.0], forearm_R: [-0.8, 0, 0] }]],
};
const SPEC = {
  id: 'spartoi', bones: BONES, height: H + 0.25, asset: A, blood: [0.03, 0.025, 0.02], clips: CLIPS, impact: 0.38,
  follow: { head: [20, 0.35], jaw: [14, 0.22] },
  props(ctx) {
    const { B } = ctx; const hm = prop('spartoi-helm', helmet, HELM_PAL, { cell: 0.007, target: 3200, atlas: 256 }); onBone(B, 'head', K.mesh(hm.geo, hm.mat));
    const sp = prop('spartoi-spear', spear, SPEAR_PAL, { cell: 0.008, target: 1200, atlas: 256, maxChart: 0.01 }); const F = fistFrame(J, '_R');
    const g = K.mesh(sp.geo, sp.mat); g.position.copy(F.wr).addScaledVector(F.z, 0.042 * H); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.z, F.y, F.x.clone().negate())); onBone(B, 'hand_R', g);
    const sh = K.mesh(shieldGeo(), shieldMat()); const el = new THREE.Vector3(...J.forearm_L), wr = new THREE.Vector3(...J.hand_L); const c = el.clone().lerp(wr, 0.45); const fd = wr.clone().sub(el).normalize();
    sh.position.copy(c).add(new THREE.Vector3(0.08, 0, 0)); sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)); sh.rotateOnWorldAxis(fd, 0); onBone(B, 'forearm_L', sh); ctx.vars.shield = sh;
  },
  idle(P, t, st) {
    const br = Math.sin(t * 1.7), sw = Math.sin(t * 0.6); const twitch = Math.max(0, Math.sin(t * 1.3) - 0.94) * 6; // a bony rattle now and then
    add(P, 'hips', 0, 0.12 + sw * 0.03); add(P, 'spine1', 0.02, 0.05); add(P, 'spine2', br * 0.015); add(P, 'neck', 0, -0.15 + Math.sin(t * 0.5) * 0.1); add(P, 'head', 0.05 + twitch * 0.1, -0.1 + Math.sin(t * 0.5 + 0.5) * 0.12, twitch * 0.15); add(P, 'jaw', 0.05 + twitch * 0.2 + (st.talk > 0 ? Math.abs(Math.sin(t * 18)) * 0.5 : 0));
    add(P, 'uparm_L', -0.55, -0.4, -0.25); add(P, 'forearm_L', -1.1, 0.6, 0); // shield up across the body
    add(P, 'uparm_R', -0.25, 0.2, 0.25); add(P, 'forearm_R', -1.2, 0.2, 0); add(P, 'hand_R', 0.1, 0, 0); // spear upright
    add(P, 'thigh_L', -0.25, 0, -0.06); add(P, 'shin_L', 0.3); add(P, 'thigh_R', 0.12, 0, 0.06); add(P, 'shin_R', 0.15); add(P, 'foot_L', -0.05); // braced stance
  },
  gait(P, g, a) { add(P, 'thigh_L', Math.sin(g) * 0.5 * a); add(P, 'thigh_R', -Math.sin(g) * 0.5 * a); add(P, 'shin_L', Math.max(0, Math.cos(g)) * 0.6 * a); add(P, 'shin_R', Math.max(0, -Math.cos(g)) * 0.6 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.22, rot: 1.34, lift: 0.03, slide: 0.05, t0: 0.4, t1: 0.72 }),
};
export const createSpartoi = (seed) => createGeneric(SPEC, seed);
export const warmSpartoi = () => void A();
