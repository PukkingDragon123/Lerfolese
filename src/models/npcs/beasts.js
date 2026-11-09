// Event creatures on the beast pipeline: the Sphinx (a tawny lioness body, folded falcon wings, a woman's face under a
// striped nemes headdress), Prometheus' eagle (brown body, white head, hooked yellow beak, great feathered wings) and
// Schrodinger's cat (a small grey tabby that may or may not be there). Sculpted, skinned and cel-painted like the
// battle beasts; built lazily per event.
import { THREE, K, hex, quadRows, sculptQuad, asset, createGeneric, rigidSkinned, add, fallSide } from '../beasts/kit.js';
import { sculptHead } from './human.js';

const lerp = (a, b, t) => a + (b - a) * t;
const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.05)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.006], { ref: (t, n) => n.set(0, 1, 0) }).geo;
const featherMat = (key, base, mid, tipC) => K.uvMat(key, 32, 128, (u, v, o) => {
  const shaft = Math.abs(u - 0.5) < 0.04; const barb = Math.sin(v * 70 + Math.abs(u - 0.5) * 30) > 0.8; const bar = Math.sin(v * 22) > 0.86;
  K.tone(v > 0.8 ? hex(tipC) : v > 0.5 ? hex(mid) : hex(base), K.band(0.52 + Math.cos(u * 6.28) * 0.2 + (shaft ? 0.25 : 0) + (barb ? -0.12 : 0) + (bar ? -0.1 : 0), 4), o.col);
});

// ================================================================== the Sphinx
const SO = { Lb: 1.15, Hw: 0.95, W: 0.2, Ln: 0.34, Lh: 0.3, Hd: 0.12, tail: 4, tailDir: [0, -0.4, -1], tailLen: 0.8 };
const SB = quadRows(SO); const STAIL = SB.tailEnd;
for (const [s, L] of [[1, '_L'], [-1, '_R']]) SB.push(['wing1' + L, 'spine3', [0.2 * s, 1.0, 0.34]], ['wing2' + L, 'wing1' + L, [0.3 * s, 1.18, 0.0]], ['wing3' + L, 'wing2' + L, [0.32 * s, 1.24, -0.42]]);
const SJ = Object.fromEntries(SB.map(([n, , p]) => [n, p]));
const SPAL = {
  fur: { s: 'fur', c: hex('#c8913f'), belly: hex('#dcb070'), fs: 18 }, paw: { s: 'fur', c: hex('#a8743a') }, skin: { s: 'skin', c: hex('#d9a070') }, blush: { s: 'skin', c: hex('#d88070') },
  brow: { s: 'skin', c: hex('#2a1810') }, lip: { s: 'skin', c: hex('#9a3a3a') }, hair: { s: 'cloth', c: hex('#2a4a9a'), folds: 4 }, veil: { s: 'cloth', c: hex('#2a4a9a'), folds: 4 },
  nemes: { s: 'cloth', c: hex('#2a4a9a'), folds: 4, fn: (c, o) => { if (Math.sin(c.y * 70) > 0.3) K.tone(hex('#e8c050'), K.band(0.55 + c.ny * 0.2, 4), o.col); } },
  gold: { s: 'metal', c: hex('#e0b040') }, feather: { s: 'feather', c: hex('#b8823a'), tip: hex('#6a4a2a'), sz: 0.04 }, tuft: { s: 'hair', c: hex('#6a3a1a'), fs: 30 },
  eye: { s: 'eye', c: hex('#3a8a6a'), white: hex('#f2ece0'), irisR: 0.55, pupil: 'round', iris: 0.95 }, default: { s: 'fur', c: hex('#c8913f') },
};
function sphinxSculpt(S) {
  sculptQuad(S, SJ, SO, { bulk: 0.9, depth: 0.95, tuck: 0.12, legR: 0.95, tags: { body: 'fur', paw: 'paw' } });
  const n1 = SJ.neck1, n2 = SJ.neck2, h = SJ.head;
  S.limb(n1, n2, 0.15, 0.1, 'neck1', { k: 0.05, tag: 'fur' }); S.limb(n2, [h[0], h[1] - 0.1, h[2] - 0.02], 0.1, 0.07, 'neck2', { k: 0.04, tag: 'skin' });
  S.blob([0, SO.Hw * 0.95, SO.Lb * 0.5 + 0.05], [0.13, 0.12, 0.1], 'spine3', { k: 0.04, tag: 'skin' }); // a woman's breast and shoulders above the lion's chest
  sculptHead(S, { head: h }, 1.75, { sex: 'f', hair: 'none', headK: 1.15, browTilt: -0.1 });
  // nemes: the striped headcloth over the crown, flaring wings either side and lappets down onto the chest; a gold band
  S.blob([h[0], h[1] + 0.1, h[2] - 0.05], [0.13, 0.11, 0.13], 'head', { k: 0.03, tag: 'nemes' });
  S.sym((s) => { S.limb([0.1 * s, h[1] + 0.06, h[2] - 0.02], [0.16 * s, h[1] - 0.12, h[2] - 0.03], 0.06, 0.08, 'head', { k: 0.03, tag: 'nemes' }); S.limb([0.13 * s, h[1] - 0.1, h[2] + 0.0], [0.1 * s, h[1] - 0.36, h[2] + 0.06], 0.045, 0.04, 'neck2', { k: 0.02, tag: 'nemes' }); });
  S.limb([0, h[1] + 0.06, h[2] - 0.1], [0, h[1] - 0.25, h[2] - 0.2], 0.06, 0.03, 'neck2', { k: 0.02, tag: 'nemes' });
  S.blob([h[0], h[1] + 0.155, h[2] + 0.02], [0.12, 0.014, 0.12], 'head', { k: 0.008, tag: 'gold' });
  // folded wings sit along the back; a tuft at the tail's end
  S.sym((s, L) => S.chain([SJ['wing1' + L], SJ['wing2' + L], SJ['wing3' + L], [0.32 * s, 1.22, -0.6]], [0.08, 0.07, 0.05, 0.02], ['wing1' + L, 'wing2' + L, 'wing3' + L], { k: 0.03, tag: 'feather' }));
  const tp = ['tail1', 'tail2', 'tail3', 'tail4'].map((n) => SJ[n]); S.chain([...tp, STAIL], [0.045, 0.035, 0.03, 0.025, 0.02], ['tail1', 'tail2', 'tail3', 'tail4'], { k: 0.02, tag: 'fur' });
  S.blob(STAIL, [0.06, 0.09, 0.06], 'tail4', { k: 0.02, tag: 'tuft' });
}
const SA = () => asset('npc:sphinx', { bones: SB, sculpt: sphinxSculpt, pal: SPAL, cell: 0.014, target: 12000, atlas: 640, maxChart: 0.025, wounds: 0 });
const SPHINX = {
  id: 'sphinx', bones: SB, height: 1.7, asset: SA, impact: 0.5, follow: { head: [16, 0.45], tail2: [7, 0.3], tail3: [6, 0.28], tail4: [5, 0.26] },
  clips: {
    laugh: [[0, {}], [0.2, { neck2: [-0.3, 0, 0], head: [-0.4, 0, 0], jaw: [0.35, 0, 0] }], [0.45, { neck2: [-0.15, 0, 0], head: [-0.2, 0, 0], jaw: [0.1, 0, 0] }], [0.7, { neck2: [-0.3, 0, 0], head: [-0.4, 0, 0], jaw: [0.35, 0, 0] }], [1.3, {}]],
    talk: [[0, {}], [0.3, { head: [0.1, -0.15, 0.05], jaw: [0.15, 0, 0] }], [1.0, { head: [-0.05, 0.1, -0.05] }], [1.4, {}]],
    attack: [[0, {}], [0.3, { _pos: [0, 0.1, -0.2], farm_L: [-1.2, 0, 0], fore_L: [-0.6, 0, 0], neck2: [-0.3, 0, 0] }], [0.45, { _pos: [0, 0, 0.3], farm_L: [-0.4, 0, 0], neck2: [0.2, 0, 0], jaw: [0.5, 0, 0] }], [0.9, {}]],
    cast: [[0, {}], [0.35, { wing1_L: [0, 0.4, 1.2], wing1_R: [0, -0.4, -1.2], wing2_L: [0, 0, 0.5], wing2_R: [0, 0, -0.5], neck2: [-0.25, 0, 0] }], [1.2, {}]],
  },
  props(ctx) {
    const fm = ctx.own(featherMat('sphinx-feather', '#b8823a', '#8a5a2a', '#3a2a1a')); const parts = [];
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) { const w2 = SJ['wing2' + L], w3 = SJ['wing3' + L];
      for (let i = 0; i < 10; i++) { const k = i / 9; const a = [lerp(w2[0], w3[0], k), lerp(w2[1], w3[1], k), lerp(w2[2], w3[2], k)]; parts.push([feather(a, [s * 0.15, -0.35 - k * 0.2, -1], 0.55 + k * 0.2, 0.08), k < 0.5 ? 'wing2' + L : 'wing3' + L]); }
      for (let i = 0; i < 6; i++) { const k = i / 5; const a = [lerp(SJ['wing1' + L][0], w2[0], k), lerp(SJ['wing1' + L][1], w2[1], k) + 0.03, lerp(SJ['wing1' + L][2], w2[2], k)]; parts.push([feather(a, [s * 0.2, -0.3, -1], 0.3, 0.07), 'wing1' + L]); } }
    rigidSkinned(ctx.B, parts, fm, ctx.model);
  },
  idle(P, t, st, ctx) {
    const br = Math.sin(t * 1.3), sw = Math.sin(t * 1.1); add(P, 'spine2', br * 0.015); add(P, 'neck2', 0.05 + (ctx.api.lookX ?? 0), Math.sin(t * 0.5) * 0.15 + (ctx.api.lookY ?? 0)); add(P, 'head', 0, Math.sin(t * 0.6) * 0.1);
    add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.2 : 0); add(P, 'tail2', 0, sw * 0.4, 0.1); add(P, 'tail3', 0, sw * 0.3, 0.15); add(P, 'tail4', 0, sw * 0.3);
    const open = ctx.api.wingsOpen ?? 0; for (const [s, L] of [[1, '_L'], [-1, '_R']]) { add(P, 'wing1' + L, 0, 0.3 * s * open, (0.15 + open * 1.1 + Math.sin(t * 3) * 0.05 * open) * s); add(P, 'wing2' + L, 0, 0, 0.3 * open * s); }
    if (ctx.api.pose === 'lounge') { add(P, '_pos', 0, -0.38, 0); for (const L of ['_L', '_R']) { add(P, 'farm' + L, -1.25); add(P, 'fore' + L, 1.0); add(P, 'fpaw' + L, 0.3); add(P, 'thigh' + L, 0.9); add(P, 'shin' + L, -1.6); add(P, 'hock' + L, 0.8); } add(P, 'neck1', -0.15); }
  },
  death: (T, m, ctx) => fallSide(T, m, ctx),
};
export const createSphinx = (seed = 1) => { const a = createGeneric(SPHINX, seed); a.pose = 'lounge'; return a; };

// ================================================================== Prometheus' eagle
const EB = [['root', null, [0, 0, 0]], ['body', 'root', [0, 0.42, 0]], ['neck', 'body', [0, 0.6, 0.12]], ['head', 'neck', [0, 0.72, 0.16]], ['jaw', 'head', [0, 0.7, 0.24]], ['tail1', 'body', [0, 0.36, -0.2]]];
for (const [s, L] of [[1, '_L'], [-1, '_R']]) EB.push(['wing1' + L, 'body', [0.11 * s, 0.56, 0.04]], ['wing2' + L, 'wing1' + L, [0.38 * s, 0.6, -0.02]], ['wing3' + L, 'wing2' + L, [0.68 * s, 0.6, -0.06]], ['thigh' + L, 'body', [0.07 * s, 0.32, 0.02]], ['foot' + L, 'thigh' + L, [0.07 * s, 0.06, 0.05]]);
const EJ = Object.fromEntries(EB.map(([n, , p]) => [n, p]));
const EPAL = { body: { s: 'feather', c: hex('#5a3a22'), tip: hex('#3a2416'), sz: 0.03 }, white: { s: 'feather', c: hex('#f2eee4'), sz: 0.02 }, beak: { s: 'keratin', c: hex('#e8b030'), rings: 160 }, leg: { s: 'scale', c: hex('#e0b040'), sz: 0.01 }, eye: { s: 'eye', c: hex('#f0c030'), pupil: 'round', pupilR: 0.3 }, default: { s: 'feather', c: hex('#5a3a22') } };
function eagleSculpt(S) {
  S.blob([0, 0.45, 0], [0.16, 0.2, 0.22], 'body', { k: 0.05, tag: 'body', dir: [0, 0.4, 1] }); S.blob([0, 0.5, 0.1], [0.13, 0.14, 0.12], 'body', { k: 0.04, tag: 'body' });
  S.limb([0, 0.58, 0.1], [0, 0.71, 0.15], 0.08, 0.075, ['body', 'neck'], { k: 0.03, tag: 'white' }); S.blob([0, 0.74, 0.17], [0.075, 0.075, 0.09], 'head', { k: 0.03, tag: 'white', imp: 3 });
  S.limb([0, 0.75, 0.24], [0, 0.73, 0.3], 0.03, 0.025, 'head', { k: 0.01, tag: 'beak', imp: 4 }); S.limb([0, 0.73, 0.3], [0, 0.69, 0.31], 0.022, 0.006, 'head', { k: 0.008, tag: 'beak', imp: 4 });
  S.sym((s) => { S.blob([0.045 * s, 0.76, 0.22], [0.014, 0.012, 0.01], 'head', { k: 0.004, tag: 'eye', dir: [0.7 * s, 0, 0.7], imp: 4 }); S.blob([0.04 * s, 0.78, 0.21], [0.03, 0.01, 0.02], 'head', { k: 0.006, tag: 'body', imp: 4 }); });
  S.sym((s, L) => { S.chain([EJ['wing1' + L], EJ['wing2' + L], EJ['wing3' + L], [0.82 * s, 0.58, -0.08]], [0.07, 0.05, 0.035, 0.015], ['wing1' + L, 'wing2' + L, 'wing3' + L], { k: 0.02, tag: 'body' });
    S.limb([0.07 * s, 0.36, 0.02], [0.07 * s, 0.2, 0.04], 0.06, 0.035, 'thigh' + L, { k: 0.02, tag: 'body' }); S.limb([0.07 * s, 0.2, 0.04], EJ['foot' + L], 0.022, 0.018, 'thigh' + L, { k: 0.01, tag: 'leg' }); S.blob(EJ['foot' + L], [0.035, 0.015, 0.045], 'foot' + L, { k: 0.01, tag: 'leg' }); });
}
const EA = () => asset('npc:eagle', { bones: EB, sculpt: eagleSculpt, pal: EPAL, cell: 0.008, target: 6000, atlas: 384, maxChart: 0.02, wounds: 0 });
const EAGLE = {
  id: 'eagle', bones: EB, height: 0.85, asset: EA, impact: 0.4, follow: { head: [20, 0.4], wing3_L: [12, 0.3], wing3_R: [12, 0.3] },
  clips: { attack: [[0, {}], [0.25, { _pos: [0, 0.3, -0.2], head: [-0.3, 0, 0], jaw: [0.4, 0, 0] }], [0.4, { _pos: [0, -0.1, 0.4], body: [0.5, 0, 0], head: [0.5, 0, 0] }], [0.8, {}]], cast: [[0, {}], [0.3, { head: [-0.5, 0, 0], jaw: [0.5, 0, 0] }], [1, {}]] },
  props(ctx) {
    const fm = ctx.own(featherMat('eagle-feather', '#5a3a22', '#4a2e1a', '#1e140c')); const parts = [];
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) { const w1 = EJ['wing1' + L], w2 = EJ['wing2' + L], w3 = EJ['wing3' + L], tip = [0.82 * s, 0.58, -0.08];
      for (let i = 0; i < 9; i++) { const k = i / 8; const a = [lerp(w3[0], tip[0], k), lerp(w3[1], tip[1], k), lerp(w3[2], tip[2], k)]; parts.push([feather(a, [s * (0.3 + k), -0.1, -1 + k * 0.6], 0.42 - Math.abs(k - 0.5) * 0.12, 0.05), 'wing3' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; const a = [lerp(w1[0], w3[0], k), lerp(w1[1], w3[1], k), lerp(w1[2], w3[2], k)]; parts.push([feather(a, [s * 0.15, -0.15, -1], 0.36, 0.05), k < 0.5 ? 'wing2' + L : 'wing3' + L]); } }
    for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 0.9; parts.push([feather([0, 0.38, -0.18], [Math.sin(a), -0.4, -Math.cos(a)], 0.36, 0.05), 'tail1']); }
    rigidSkinned(ctx.B, parts, fm, ctx.model);
  },
  idle(P, t, st, ctx) {
    const fly = ctx.api.pose === 'fly'; const fl = Math.sin(t * (fly ? 9 : 1.2));
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) { if (fly) { add(P, 'wing1' + L, 0, 0, (0.1 + fl * 0.8) * s); add(P, 'wing2' + L, 0, 0, (-fl * 0.3) * s); } else { add(P, 'wing1' + L, 0, -0.9 * s, -0.35 * s); add(P, 'wing2' + L, 0, -1.6 * s, 0); add(P, 'wing3' + L, 0, -0.6 * s, 0); } }
    add(P, 'head', Math.sin(t * 0.7) * 0.1, Math.sin(t * 1.3) * 0.5 * (fly ? 0.2 : 1), 0); add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 14)) * 0.3 : 0); add(P, 'tail1', 0.1 + (fly ? fl * 0.1 : 0));
  },
};
export const createEagle = (seed = 1) => { const a = createGeneric(EAGLE, seed); a.pose = 'perch'; return a; };

// ================================================================== Schrodinger's cat
const CO = { Lb: 0.42, Hw: 0.26, W: 0.06, Ln: 0.08, Lh: 0.12, Hd: 0.04, tail: 4, tailDir: [0, 0.75, -0.6], tailLen: 0.36 };
const CB = quadRows(CO); const CTAIL = CB.tailEnd; const CJ = Object.fromEntries(CB.map(([n, , p]) => [n, p]));
const tabby = (c, o) => { if (Math.sin(c.x * 26 + c.z * 9 + Math.sin(c.y * 30) * 2) > 0.55) K.tone(hex('#4a4650'), K.band(0.45 + c.ny * 0.15, 4), o.col); };
const CPAL = { fur: { s: 'fur', c: hex('#9a96a0'), belly: hex('#d8d4d0'), fs: 40, fn: tabby }, paw: { s: 'fur', c: hex('#e8e4e0'), fs: 40 }, nose: { s: 'skin', c: hex('#d88890') }, ear: { s: 'skin', c: hex('#c88890') }, eye: { s: 'eye', c: hex('#a0e040'), pupil: 'slit', glow: [120, 200, 60] }, default: { s: 'fur', c: hex('#9a96a0') } };
function catSculpt(S) {
  sculptQuad(S, CJ, CO, { bulk: 0.95, depth: 0.85, legR: 0.8, tags: { body: 'fur', paw: 'paw' } }); const h = CJ.head;
  S.limb(CJ.neck1, CJ.neck2, 0.055, 0.045, 'neck1', { k: 0.02, tag: 'fur' }); S.blob(h, [0.065, 0.058, 0.06], 'head', { k: 0.02, tag: 'fur', imp: 3 }); S.blob([h[0], h[1] - 0.015, h[2] + 0.045], [0.035, 0.028, 0.03], 'head', { k: 0.012, tag: 'paw', imp: 3 });
  S.blob([h[0], h[1] - 0.004, h[2] + 0.074], [0.009, 0.006, 0.006], 'head', { k: 0.003, tag: 'nose', imp: 4 });
  S.sym((s) => { S.blob([0.028 * s, h[1] + 0.012, h[2] + 0.052], [0.012, 0.01, 0.008], 'head', { k: 0.003, tag: 'eye', dir: [0.3 * s, 0, 1], imp: 4 }); S.limb([0.035 * s, h[1] + 0.04, h[2] - 0.005], [0.045 * s, h[1] + 0.09, h[2] - 0.01], 0.022, 0.003, 'head', { k: 0.006, tag: 'fur' }); S.blob([0.038 * s, h[1] + 0.055, h[2] + 0.004], [0.01, 0.022, 0.004], 'head', { k: 0.003, tag: 'ear', imp: 4 }); });
  const tp = ['tail1', 'tail2', 'tail3', 'tail4'].map((n) => CJ[n]); S.chain([...tp, CTAIL], [0.022, 0.02, 0.018, 0.016, 0.012], ['tail1', 'tail2', 'tail3', 'tail4'], { k: 0.01, tag: 'fur' });
}
const CA = () => asset('npc:cat', { bones: CB, sculpt: catSculpt, pal: CPAL, cell: 0.005, target: 6000, atlas: 384, maxChart: 0.02, wounds: 0 });
const CAT = {
  id: 'cat', bones: CB, height: 0.4, asset: CA, impact: 0.3, follow: { tail2: [6, 0.3], tail3: [5, 0.28], tail4: [4, 0.26] },
  clips: { cast: [[0, {}], [0.3, { neck2: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: [0.4, 0, 0] }], [1, {}]] },
  idle(P, t, st, ctx) { const sw = Math.sin(t * 2.2); add(P, 'tail2', 0, sw * 0.5); add(P, 'tail3', 0, sw * 0.4); add(P, 'tail4', 0, sw * 0.5); add(P, 'head', 0, Math.sin(t * 0.8) * 0.4); add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 12)) * 0.3 : 0);
    if (ctx.api.pose === 'sit') { add(P, '_pos', 0, -0.06, 0); add(P, 'pelvis', -0.6); for (const L of ['_L', '_R']) { add(P, 'thigh' + L, 0.9); add(P, 'shin' + L, -1.5); } } },
};
export const createCat = (seed = 1) => { const a = createGeneric(CAT, seed); a.pose = 'stand'; return a; };
export { THREE };
