// Minotaur (+ Minotaur Rex) on the human base: a broad, heavy Limbo body (the same engine and low-poly pixel style as
// Newton) pushed toward the brute (bulk, mass, thick limbs), its human head folded away under a sculpted bull head:
// a massive neck-hump rolling into a broad skull, tiny sunk eyes under a heavy brow, jowls, wet nose pad and ring,
// chipped ringed horns, and a hinged jaw. Fur repainted over the shoulders, forearms and legs, scarred hide on the
// torso, cloven hooves over the feet, a tufted tail on its own bone chain, a labrys in the right fist.
// Animation: the engine's procedural human motion (axe swing = its overhead strike) plus head tosses, snorts,
// a head-down charge read from the root's speed, a jaw that roars and talks.
import { THREE, K, hex, limboBeast, mount, recolor, furTexel, near } from './humanoid.js';
import { prop } from './kit.js';

const mat = (key, w, h, fn) => K.uvMat(key, w, h, fn);

// ---------------------------------------------------------------- bull head (sculpted attachment, old 2.8 m rest space)
const HEAD0 = [0, 2.58, 0.14], JAW0 = [0, 2.52, 0.22];
const HPAL = (king) => ({
  head: { s: 'fur', c: king ? hex('#2a1c16') : hex('#3e2618'), fs: 34, age: 0.6 }, mane: { s: 'fur', c: king ? hex('#1e1410') : hex('#2e1c12'), fs: 18, strand: 0.32, flow: 0.4, age: 0.7 },
  throat: { s: 'fur', c: king ? hex('#3a2a20') : hex('#4a2e1e'), fs: 26 }, brow: { s: 'fur', c: king ? hex('#1a1210') : hex('#2a1a12'), fs: 40 }, curls: { s: 'fur', c: hex('#5a3a22'), fs: 60, flow: 1 },
  muzzle: { s: 'skin', c: king ? hex('#8a847a') : hex('#8a7464'), age: 0.7 }, jaw: { s: 'skin', c: king ? hex('#7e7870') : hex('#7e6a5a'), age: 0.6 }, nose: { s: 'skin', c: hex('#2a2224'), ro: 0.25, age: 0 },
  nostril: { s: 'dark', c: hex('#140c0c') }, mouth: { s: 'dark', c: hex('#3a1418') }, eye: { s: 'eye', c: hex('#2a1810'), pupil: 'bar', iris: 0.95, rim: hex('#1a1210') }, default: { s: 'fur', c: hex('#3e2618') },
});
function bullSkull(S) {
  const t = (a, d, l, r, tag = 'head') => S.limb(a, [a[0] + d[0] * l, a[1] + d[1] * l, a[2] + d[2] * l], r, r * 0.25, 'p', { k: 0.025, tag });
  S.limb([0, 2.24, -0.02], [0, 2.58, 0.12], 0.28, 0.2, 'p', { k: 0.07, tag: 'mane' }); // the bull neck rising out of the shoulders
  S.blob([0, 2.36, -0.1], [0.34, 0.24, 0.24], 'p', { k: 0.08, tag: 'mane' }); // nuchal hump, pushed big
  S.blob([0, 2.4, 0.17], [0.16, 0.17, 0.14], 'p', { k: 0.06, tag: 'throat' }); // dewlap
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6; t([Math.sin(a) * 0.3, 2.5 - Math.abs(a) * 0.08, -0.06 - Math.cos(a) * 0.24], [Math.sin(a) * 0.5, -0.55, -Math.cos(a) * 0.6], 0.15, 0.05, 'mane'); }
  S.blob([0, 2.7, 0.19], [0.17, 0.135, 0.16], 'p', { k: 0.05, tag: 'head' });
  S.blob([0, 2.79, 0.13], [0.16, 0.06, 0.07], 'p', { k: 0.05, tag: 'head' });
  S.blob([0, 2.68, 0.3], [0.17, 0.11, 0.075], 'p', { k: 0.05, tag: 'head', dir: [0, 0.68, 0.73] });
  S.limb([0, 2.65, 0.33], [0, 2.48, 0.51], 0.13, 0.11, 'p', { k: 0.05, tag: 'head' });
  S.blob([0, 2.45, 0.535], [0.145, 0.105, 0.1], 'p', { k: 0.05, tag: 'muzzle' });
  S.blob([0, 2.457, 0.598], [0.12, 0.072, 0.04], 'p', { k: 0.03, tag: 'nose', dir: [0, 0.35, 0.94] });
  S.sym((s) => {
    S.blob([0.06 * s, 2.468, 0.632], [0.03, 0.02, 0.04], 'p', { k: 0.015, tag: 'nostril', sub: true, dir: [0.4 * s, 0.2, 0.9] });
    S.blob([0.135 * s, 2.54, 0.3], [0.075, 0.095, 0.1], 'p', { k: 0.04, tag: 'jaw', dir: [0, -0.5, 0.86] }); // heavy jowls
    S.blob([0.12 * s, 2.72, 0.315], [0.08, 0.045, 0.065], 'p', { k: 0.025, tag: 'brow' }); // brow shelf over...
    S.blob([0.15 * s, 2.668, 0.32], [0.017, 0.016, 0.02], 'p', { k: 0.008, tag: 'eye', dir: [0.85 * s, 0.1, 0.5] }); // ...tiny, sunk eyes
    S.blob([0.14 * s, 2.79, 0.13], [0.07, 0.065, 0.07], 'p', { k: 0.04, tag: 'head' });
    t([0.15 * s, 2.58, 0.2], [0.5 * s, -0.5, -0.7], 0.12, 0.045);
  });
  S.box([0, 2.408, 0.46], [0.14, 0.012, 0.16], 0.004, 'p', { k: 0.012, tag: 'mouth', sub: true, rot: [0.12, 0, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.2; S.blob([Math.sin(a) * 0.07, 2.8 + Math.cos(a) * 0.015, 0.2 + Math.cos(a) * 0.03], [0.042, 0.035, 0.045], 'p', { k: 0.02, tag: 'curls' }); }
}
function bullJaw(S) {
  S.sym((s) => S.limb([0.11 * s, 2.53, 0.2], [0.07 * s, 2.4, 0.48], 0.05, 0.045, 'p', { k: 0.04, tag: 'jaw' }));
  S.limb([0, 2.47, 0.24], [0, 2.375, 0.54], 0.09, 0.072, 'p', { k: 0.04, tag: 'jaw' }); S.blob([0, 2.36, 0.5], [0.08, 0.05, 0.07], 'p', { k: 0.03, tag: 'jaw' });
  S.blob([0, 2.33, 0.36], [0.07, 0.05, 0.1], 'p', { k: 0.03, tag: 'throat' }); // beard of coarse hair under the chin
}
function bullHead(king) {
  const P = HPAL(king); const sk = prop(king ? 'bull-skull-k' : 'bull-skull', bullSkull, P, { cell: 0.02, target: 5200, atlas: 384 }); const jw = prop(king ? 'bull-jaw-k' : 'bull-jaw', bullJaw, P, { cell: 0.014, target: 900, atlas: 160 });
  const g = new THREE.Group(); K.mesh(sk.geo, sk.mat, g);
  const jaw = new THREE.Group(); jaw.position.set(...JAW0); const jm = K.mesh(jw.geo, jw.mat); jm.position.set(-JAW0[0], -JAW0[1], -JAW0[2]); jaw.add(jm); g.add(jaw);
  for (const s of [-1, 1]) {
    g.add(horn(s, king));
    const l = new K.Loft(16, 14).set(K.curve([[0.15 * s, 2.705, 0.14], [0.26 * s, 2.7, 0.15], [0.37 * s, 2.665, 0.15], [0.46 * s, 2.62, 0.14]]), (t) => [0.016 * (1 - t) + 0.005, 0.085 * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * (1 - t * 0.3) + 0.005], { ref: (t, n) => n.set(0, 0.35, 1), shape: (a) => 1 + Math.max(0, Math.sin(a)) * 0.6 });
    const ear = K.mesh(l.geo, mat('mino-ear', 64, 64, (u, v, o) => { if (Math.sin(u * Math.PI * 2) * s > 0.25 && v > 0.15 && v < 0.92) { K.tone(hex('#a8786a'), K.band(0.5), o.col); return; } K.fur2(u, v, o, hex('#3e2618'), 10, 6, 0.5); }));
    const pivot = new THREE.Group(); pivot.position.set(0.15 * s, 2.705, 0.14); ear.position.set(-0.15 * s, -2.705, -0.14); pivot.add(ear); g.add(pivot); (g.userData.ears ||= []).push(pivot);
  }
  g.add(noseRing(king));
  if (king) { const gm = mat('mino-crown', 32, 32, (u, v, o) => { K.tone(hex('#b8923e'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 - v * 0.1), o.col); o.me = 0.6; o.ro = 0.45; });
    const ring = new K.Loft(4, 24).set((t, p) => p.set(0, 2.8 + t * 0.05, 0.16), () => [0.13, 0.11]); K.mesh(ring.geo, gm, g);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const sp = new K.Loft(6, 6).set(K.curve([[Math.sin(a) * 0.125, 2.83, 0.16 + Math.cos(a) * 0.105], [Math.sin(a) * 0.15, 2.97 + (i % 2) * 0.04, 0.16 + Math.cos(a) * 0.13]]), (t) => 0.026 * (1 - t) + 0.003); K.mesh(sp.geo, gm, g); } }
  const inner = new THREE.Group(); g.position.set(-HEAD0[0], -HEAD0[1], -HEAD0[2]); inner.add(g); inner.userData = { jaw, ears: g.userData.ears }; return inner;
}
const HOOF_PAL = { hoof: { s: 'keratin', c: hex('#262022'), rings: 160 }, fur: { s: 'fur', c: hex('#2e1c12'), fs: 40, age: 0.6 }, cleft: { s: 'dark', c: hex('#100c0c') }, default: { s: 'keratin', c: hex('#262022') } };
function hoof(S) { // a cloven hoof with dewclaws and fetlock feathering, origin at the ankle (metres)
  S.box([0, -0.07, 0.05], [0.055, 0.045, 0.075], 0.022, 'p', { k: 0.02, tag: 'hoof', rot: [0.22, 0, 0] });
  S.box([0, -0.06, 0.13], [0.012, 0.07, 0.06], 0.004, 'p', { k: 0.01, tag: 'cleft', sub: true });
  S.blob([0, -0.005, -0.01], [0.07, 0.07, 0.075], 'p', { k: 0.03, tag: 'fur' });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; S.limb([Math.sin(a) * 0.06, 0.0, -0.01 + Math.cos(a) * 0.06], [Math.sin(a) * 0.1, -0.08, -0.01 + Math.cos(a) * 0.09], 0.035, 0.008, 'p', { k: 0.015, tag: 'fur' }); }
  for (const dx of [-0.04, 0.04]) S.blob([dx, -0.04, -0.08], [0.02, 0.026, 0.022], 'p', { k: 0.012, tag: 'hoof' });
}
// ---------------------------------------------------------------- body paint: hide, fur, hooves, leather skirt (from the engine's own shading)
const HIDE = hex('#6a3a2a'), HIDE_K = hex('#4e2c22'), FUR = hex('#2e1c12'), SKIRT = [124, 74, 40];
const minoHook = (king) => (paint, P, spec) => {
  const H = P.H; const skinC = spec.skin;
  const wrap = (fn) => (c, o) => {
    fn(c, o);
    if (near(o, SKIRT, 0.14)) { const a = Math.atan2(c.x, c.z); const f = ((a / Math.PI) * 9 % 1 + 1) % 1; if (f < 0.07 || f > 0.93) recolor(o, [40, 26, 20], SKIRT); else recolor(o, king ? hex('#7a1a22') : hex('#5a3420'), SKIRT, 0, c, 'leather'); if (king && Math.abs(c.y - (P.kneeY + 0.12 * H)) < 0.012 * H) recolor(o, hex('#b8923e'), SKIRT, 0.2); return; }
    if (!near(o, skinC, 0.12)) return;
    if (c.y < P.ankleY + 0.01 * H) return recolor(o, hex('#262022'), skinC);
    const shoulder = c.y > P.shoulderY - 0.05 * H && (c.part === 'uarm' || Math.abs(c.x) > 0.09 * H || c.nz < -0.2); const back = c.nz < -0.45 && c.y > P.bustY;
    if (c.y < P.crotchY || shoulder || back || c.part === 'farm' && c.nz < -0.2) return furTexel(c, o, king ? hex('#1e1410') : FUR, skinC, H, 0.02);
    if (king && Math.abs(-c.x * 0.75 + (c.y - P.bustY) * 0.66) < 0.022 * H && c.y > P.pelvisY) return recolor(o, Math.abs(((c.y * 14 / H) % 1)) < 0.2 ? hex('#b8923e') : hex('#3a2014'), skinC); // studded harness
    recolor(o, king ? HIDE_K : HIDE, skinC, 0, c, 'skin', king ? 0.9 : 0.75); // scarred, wrinkled hide
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
};
// ---------------------------------------------------------------- assembly
export const warmMinotaur = (king = false) => { bullHead(king); prop('mino-hoof', hoof, HOOF_PAL, { cell: 0.012, target: 900, atlas: 128 }); };
export function createMinotaur(seed = 1, king = false) {
  const spec = {
    id: king ? 'minotaur_king' : 'minotaur', height: king ? 3.15 : 3.0, headScale: 0.01, chest: [1.32, 1.08, 1.25], blood: [0.12, 0.004, 0.005],
    app: { skin: 0x9a5a40, hair: 0x2a1810, hairStyle: 'bald', build: 'heavy', age: 0.5, height: 1 }, outfit: { legs: { tex: 'c_skirt', color: 0x7c4a28 }, legsKind: 'skirt' },
    overrides: { eyeW: 0.3, eyeH: 0.3 }, hook: minoHook(king), speed: 0.85, sway: 0.7, impact: 0.45,
    build(ctx) {
      const { L, sc } = ctx; const head = bullHead(king); const hs = 1.0; const hg = new THREE.Group(); hg.add(head); hg.scale.setScalar(hs); mount(ctx, 'head', hg, { cancel: 0.01 }); ctx.vars.head = head;
      const hf = prop('mino-hoof', hoof, HOOF_PAL, { cell: 0.012, target: 900, atlas: 128 }); for (const b of ['footL', 'footR']) mount(ctx, b, K.mesh(hf.geo, hf.mat), { at: [0, 0.02 * sc, 0.02 * sc] });
      const ax = labrys(king); ax.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0))); // haft forward along the grip, blades up and down const axG = new THREE.Group(); axG.add(ax); mount(ctx, 'handR', axG, { at: [0, -0.08 * sc, 0.01 * sc] });
      // tufted tail on its own bone chain
      const tg = new THREE.Group(); mount(ctx, 'hips', tg, { at: [0, -0.02 * sc, -0.12 * sc] }); const tm = mat('mino-tail', 32, 64, (u, v, o) => K.fur2(u, v, o, hex('#2e1c12'), 8, 14, 0.5));
      const tail = K.skinnedLoft(24, 10, K.curve([[0, 0, 0], [0, -0.22, -0.12], [0, -0.48, -0.2], [0, -0.74, -0.22], [0, -0.96, -0.2]]), (t) => { const r = 0.05 * (1 - t * 0.55) + (t > 0.78 ? Math.sin((t - 0.78) / 0.22 * Math.PI) * 0.06 : 0); return [r, r]; }, { shape: (a, t) => (t > 0.78 ? 1 + Math.abs(Math.sin(a * 4 + t * 9)) * 0.3 : 1) }, 4, tg, tm);
      ctx.vars.tail = tail.bones; ctx.vars.lastX = null; ctx.vars.charge = 0;
      if (king) for (const [b, s] of [['uarmL', 1], ['uarmR', -1]]) { const gm = mat('mino-gold', 32, 32, (u, v, o) => { K.tone(hex('#b8923e'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 - v * 0.12 + (Math.abs(((v * 5) % 1) - 0.5) < 0.08 ? -0.2 : 0)), o.col); o.me = 0.6; o.ro = 0.45; }); gm.side = THREE.DoubleSide;
        const pa = new THREE.Group(); K.mesh(new THREE.LatheGeometry([[0.001, 0.14], [0.1, 0.13], [0.18, 0.09], [0.24, 0.02], [0.25, -0.03], [0.24, -0.05]].map(([x, y]) => new THREE.Vector2(x, y)), 9), gm, pa); pa.rotation.z = -0.5 * s; mount(ctx, b, pa, { at: [0.02 * s * sc, 0.04 * sc, 0] }); }
    },
    pose(add, t, st, ctx) {
      // heavy brute stance, head carried low and forward; ambient snorts; a head-down charge when the root rushes in
      const v = ctx.vars; const x = ctx.root.position.x; const dt = 1 / 60; const vel = v.lastX === null ? 0 : (x - v.lastX) / dt; v.lastX = x; v.charge += ((Math.abs(vel) > 10 ? 1 : 0) - v.charge) * 0.15;
      add('spine', 0.08); add('chest', 0.06); add('neck', 0.18 + v.charge * 0.35); add('head', -0.05 + v.charge * 0.45 + Math.max(0, Math.sin(t * 0.8) - 0.92) * -3);
      add('uarmL', 0, 0, 0.18); add('uarmR', 0, 0, -0.14); add('thighL', -0.05, 0, -0.05); add('thighR', -0.05, 0, 0.05); add('shinL', 0.12); add('shinR', 0.12);
      if (ctx.anim.mode === 'idle') { add('farmR', -0.9); add('handR', 0.3); } // labrys carried at the ready
    },
    update(dt, ctx, t) {
      const st = ctx.st, h = ctx.vars.head.userData; const roar = st.mode === 'attack' || st.mode === 'cast' ? Math.sin(Math.min(1, st.modeT / 0.9) * Math.PI) * 0.4 : 0;
      h.jaw.rotation.x = 0.03 + roar + (st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.3 : 0) + (st.dead > 0 ? 0.4 : 0);
      h.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.1 + Math.max(0, Math.sin(t * 0.9 + i * 2) - 0.93) * 6); });
      ctx.vars.tail.forEach((b, i) => { b.rotation.set(0.1 + Math.sin(t * 1.9 - i * 0.7) * 0.05 * (i + 1), Math.sin(t * 1.3 - i * 0.6) * 0.12 * (i + 1), 0); });
    },
  };
  return limboBeast(spec, seed);
}

function horn(s, king) {
  const k = king ? 1.22 : 1; const pts = [[0.12 * s, 2.79, 0.13], [0.26 * s, 2.83 + 0.01 * k, 0.12], [(0.38 + 0.04 * k) * s, 2.86 + 0.06 * k, 0.15], [(0.44 + 0.06 * k) * s, 2.94 + 0.1 * k, 0.24], [(0.44 + 0.06 * k) * s, 3.0 + 0.16 * k, 0.36 + 0.04 * k]];
  const l = new K.Loft(28, 12).set(K.curve(pts), (t) => (0.068 * k * (1 - t * 0.9) + 0.004) * (1 + (t < 0.6 && Math.sin(t * 70) > 0.4 ? 0.05 : 0)));
  const m = mat(king ? 'mino-horn-k' : 'mino-horn', 64, 128, (u, v, o) => {
    const ring = Math.sin(v * 70) > 0.4 && v < 0.6; const tip = K.sstep(0.62, 0.95, v); const lit = Math.cos(u * Math.PI * 2);
    K.tone(hex('#e6d6b2'), K.band(0.5 + lit * 0.22 + (ring ? -0.18 : 0.04) - v * 0.1, 4), o.col); K.mixc(o.col, hex('#3a2a24'), tip * 0.9); o.ro = 0.45;
    if (king && (v > 0.86 || Math.abs(v - 0.1) < 0.035)) { K.tone(hex('#c8a046'), K.band(0.55 + lit * 0.3, 4), o.col); o.me = 0.6; o.ro = 0.3; }
  });
  return K.mesh(l.geo, m);
}
function labrys(king) { // turned haft, leather grip, double crescent blades with bevelled edges (local: haft +Y, blades +-X)
  const g = new THREE.Group(); const L0 = -0.42, L1 = 1.08, hk = king ? 1.15 : 1;
  const haft = new K.Loft(30, 10).set((t, p) => p.set(0, L0 + t * (L1 - L0), 0), (t) => { const y = L0 + t * (L1 - L0); return 0.028 * (y < -0.36 ? 1.5 : Math.abs(y) < 0.16 ? 1.12 : 1) * (y > 0.95 ? 1.3 : 1); });
  K.mesh(haft.geo, mat(king ? 'labrys-haft-k' : 'labrys-haft', 32, 128, (u, v, o) => { const y = L0 + v * (L1 - L0); const grip = Math.abs(y) < 0.16; const cap = y < -0.36 || y > 0.95; if (cap) { K.tone(king ? hex('#c8a046') : hex('#9a6a30'), K.band(0.55 + Math.cos(u * 6.28) * 0.25, 4), o.col); o.me = 0.6; return; } if (grip) { K.tone(hex('#3a2416'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 + (Math.sin((y + u * 0.05) * 160) > 0.6 ? -0.2 : 0), 4), o.col); return; } K.tone(hex('#8a5a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.22 + (Math.sin(u * 40 + y * 3) > 0.9 ? -0.15 : 0), 4), o.col); }), g);
  const s = new THREE.Shape(); s.moveTo(0, -0.08); s.lineTo(0.12, -0.1); s.quadraticCurveTo(0.22, -0.2, 0.34, -0.32); s.quadraticCurveTo(0.44, 0, 0.34, 0.32); s.quadraticCurveTo(0.22, 0.2, 0.12, 0.1); s.lineTo(0, 0.08); s.closePath();
  const bm = mat(king ? 'labrys-blade-k' : 'labrys-blade', 128, 128, (u, v, o) => { const edge = u > 0.55 || u < 0.08; const etch = Math.abs(((u * 10 + v * 3) % 1) - 0.5) < 0.05 && !edge; K.tone(king ? hex('#c8a048') : hex('#a8783e'), K.band(0.5 + (edge ? 0.3 : 0) + (etch ? -0.25 : 0) + (v - 0.5) * 0.2, 4), o.col); o.me = 0.6; o.ro = 0.5; });
  for (const sg of [-1, 1]) {
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.016, bevelSegments: 1, curveSegments: 6 }); bg.translate(0, 0, -0.015);
    const uv = bg.attributes.uv, p = bg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 0.46, p.getY(i) / 0.7 + 0.5);
    bg.scale(0.95 * hk, 0.95 * hk, 1); if (sg < 0) bg.rotateY(Math.PI);
    bg.translate(0, 0.86, 0); bg.computeVertexNormals(); K.mesh(bg, bm, g);
  }
  const boss = new K.Loft(10, 14).set((t, p) => p.set(0, 0.74 + t * 0.24, 0), (t) => 0.05 * Math.sin(Math.min(1, t * 1.1 + 0.05) * Math.PI) + 0.03);
  K.mesh(boss.geo, bm, g);
  if (king) { const sp = new K.Loft(12, 10).set((t, p) => p.set(0, 1.08 + t * 0.22, 0), (t) => 0.035 * (1 - t) + 0.002); K.mesh(sp.geo, bm, g); }
  return g;
}
function noseRing(king) {
  const l = new K.Loft(24, 10).set((t, p) => { const a = t * Math.PI * 2 * 0.86 + 0.45; return p.set(0, 2.43 - Math.cos(a) * 0.05 + 0.02, 0.628 + Math.sin(a) * 0.035); }, () => 0.011);
  return K.mesh(l.geo, mat(king ? 'ring-k' : 'ring', 16, 16, (u, v, o) => { K.tone(king ? hex('#c8a046') : hex('#b08a40'), K.band(0.55 + Math.cos(u * 6.28) * 0.3, 4), o.col); o.me = 0.7; o.ro = 0.25; }));
}