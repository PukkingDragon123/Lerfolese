// Talos on the human base: a 3.4 m bronze automaton built on the Limbo human body (broad build), every texel repainted
// as hammered, riveted bronze plates with verdigris in the seams, dents and bright worn edges; the seams, the single
// ichor vein (nape, down the spine and the right leg to the bronze nail at the ankle) and a chest furnace glow from an
// emissive page baked onto the same UVs. A crested bronze helm-face with slit eyes covers the head. Death drains the glow.
import { THREE, K, hex, limboBeast, mount, recolor, near } from './humanoid.js';
import { prop } from './kit.js';
import { bake } from './flesh.js';

const BRZ = hex('#8a6436');
const HELM_PAL = { bronze: { s: 'metal', c: hex('#8a6436'), me: 0.6, ro: 0.4 }, crest: { s: 'metal', c: hex('#6a4a26'), me: 0.6 }, eyeglow: { s: 'dark', c: hex('#e0a040'), e: [170, 100, 30] }, default: { s: 'metal', c: hex('#8a6436') } };
function helm(S) { // origin = head joint (metres): domed skull, stern face plate with brow, nose and closed lips, crest fin, eye slits
  S.blob([0, 0.13, 0.0], [0.15, 0.165, 0.17], 'p', { k: 0.04, tag: 'bronze' }); S.blob([0, 0.07, 0.08], [0.14, 0.14, 0.11], 'p', { k: 0.03, tag: 'bronze' });
  S.blob([0, 0.145, 0.16], [0.13, 0.03, 0.06], 'p', { k: 0.015, tag: 'bronze' }); S.limb([0, 0.13, 0.19], [0, 0.05, 0.225], 0.018, 0.026, 'p', { k: 0.012, tag: 'bronze' });
  S.box([0, 0.27, -0.03], [0.016, 0.08, 0.21], 0.012, 'p', { k: 0.02, tag: 'crest', rot: [0.12, 0, 0] });
  S.sym((s) => { S.blob([0.055 * s, 0.105, 0.175], [0.042, 0.016, 0.02], 'p', { k: 0.005, tag: 'eyeglow', dir: [0.3 * s, 0, 1] }); S.blob([0.14 * s, 0.09, 0.02], [0.03, 0.08, 0.06], 'p', { k: 0.02, tag: 'bronze' }); });
  S.box([0, 0.005, 0.2], [0.04, 0.005, 0.02], 0.003, 'p', { k: 0.004, tag: 'eyeglow', sub: true });
}
const talosHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  const wrap = (fn) => (c, o) => {
    fn(c, o); const ref = near(o, sk, 0.14) ? sk : [lumOf(o), lumOf(o), lumOf(o)];
    const row = Math.abs((((c.y / H) * 11) % 1) - 0.5) < 0.035, rivet = Math.abs((((c.y / H) * 11) % 1) - 0.5) < 0.1 && Math.abs(((Math.atan2(c.x, c.z) * 3) % 1)) < 0.06;
    recolor(o, BRZ, ref, (row ? -0.25 : 0) + (rivet ? 0.25 : 0), c, 'metal', 0.85);
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand), shoe: wrap(paint.shoe || paint.body) };
};
const lumOf = (o) => Math.max(1, o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11);
/** emissive page on the body's UVs: plate seams, the ichor vein down the spine and right leg, the ankle nail, the furnace */
function glowPage(L) {
  const S = bake(L.mesh.geometry, 256, ['b']); const P = L.P, H = P.H;
  const res = K.paintSurface(S, (c, o) => {
    o.col = [0, 0, 0]; const ax = Math.abs(c.x);
    const vein = (c.nz < -0.3 && ax < 0.012 * H && c.y > P.hipY && c.y < P.neckBase) || (c.x < 0 && c.nz < -0.2 && Math.abs(c.x + P.hipX) < 0.014 * H && c.y < P.hipY && c.y > P.ankleY);
    const seam = Math.abs((((c.y / H) * 11) % 1) - 0.5) < 0.02 && K.vnoise(c.x * 40, c.y * 40, c.z * 40) > 0.35;
    const core = c.nz > 0.5 && ax < 0.045 * H && Math.abs(c.y - P.bustY) < 0.04 * H; const nail = c.x < 0 && c.y < P.ankleY + 0.03 * H && c.nz < -0.3;
    if (vein || core || nail) o.em = [200, 110, 30]; else if (seam) o.em = [120, 56, 16];
  });
  const t = new THREE.CanvasTexture(res.em); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
export const warmTalos = () => void prop('talos-helm', helm, HELM_PAL, { cell: 0.016, target: 1800, atlas: 160 });
export const createTalos = (seed = 1) => limboBeast({
  id: 'talos', height: 3.4, chest: [1.22, 1.06, 1.18], blood: [0.75, 0.28, 0.03], speed: 0.75, sway: 0.4, impact: 0.45,
  app: { skin: 0x8a6436, hair: 0x222222, hairStyle: 'bald', build: 'broad', age: 0.2, height: 1 }, outfit: {}, overrides: { eyeW: 0.02, eyeH: 0.02 }, hook: talosHook,
  build(ctx) {
    const { L, sc } = ctx; const m = L.mesh.material; m.metalness = 0.65; m.roughness = 0.42; m.emissiveMap = glowPage(L); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 1.1; m.needsUpdate = true;
    const hm = prop('talos-helm', helm, HELM_PAL, { cell: 0.016, target: 1800, atlas: 160 }); mount(ctx, 'head', K.mesh(hm.geo, hm.mat), { at: [0, -0.02 * sc, 0.0] });
  },
  pose(add, t) { const look = Math.round(Math.sin(t * 0.35) * 4) / 4; add('neck', 0.04, look * 0.12); add('head', -0.04, look * 0.14); add('uarmL', 0, 0, 0.12); add('uarmR', 0, 0, -0.12); },
  update(dt, ctx) { if (ctx.st.dead > 0) for (const m of ctx.api.mats) if (m.emissiveMap) m.emissiveIntensity = 1.1 * Math.max(0.04, 1 - ctx.st.deadT / 1.1); },
}, seed);
