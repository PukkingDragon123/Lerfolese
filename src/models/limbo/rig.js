// Apple of Discord wrapper round the Limbo Phobia low-poly people (src/models/limbo/gg, ported from the user's own
// game, PukkingDragon123/fictional-octo-train): builds the bone hierarchy, the skinned body and its pixel-art page,
// and drives it with a small procedural animator (idle, attack, throw, hit, cast, cheer, death, talk).
// Bones are plain groups whose rest frames are world-aligned translations (the Limbo convention), so a joint's
// rotation.x swings a hanging limb back (negative = forward) and tips an upright one forward.
import * as THREE from 'three';
import { BONES, BONE_PARENT, rigDims } from './humanModel.js';
import { GGSkin } from './gg/skin.js';
import { specOf } from './gg/spec.js';
import { SEC_BONES, SEC_PARENT } from './gg/types.js';

const DEF = { skin: 0xe8b98f, hair: 0x3b2a1e, hairStyle: 'short', face: 0, build: 'average', height: 1 };
let GRAD = null;
/** 3-band cel ramp for MeshToonMaterial (clean planes that read under the ink outline pass) */
export function toonGradient() {
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true; }
  return GRAD;
}
export const toonMat = (o = {}) => new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...o });
const hashApp = (a) => { const s = JSON.stringify(a); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** smooth shading for the lofted segments: average side-face normals over coincident vertices (caps stay flat),
 *  and flip V (the Limbo page is addressed top-down; r170 uploads DataTexture rows bottom-up) */
export function smoothSkin(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; const acc = new Map(); const key = (i) => `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
  const side = (i) => Math.abs(n.getY(i)) < 0.92;
  for (let i = 0; i < p.count; i++) { if (!side(i)) continue; const k = key(i); const a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  for (let i = 0; i < p.count; i++) { if (!side(i)) continue; const a = acc.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]); if (l > 0.3) n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  n.needsUpdate = true; uv.needsUpdate = true;
}

/** anime-clean the painted page: 3x3 median (kills pixel dither and speckle) then 5-band luminance posterize
 *  keeping hue; the hand-drawn face block and lids are left as painted */
export function cleanPage(d, S, k) {
  const skip = (x, y) => (x < 113 * k && y < 97 * k) || (x >= 231 * k && x < 256 * k && y >= 63 * k && y < 79 * k);
  const src = d.slice(); const r = [], g = [], b = [];
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const p = (y * S + x) * 4; if (!src[p + 3] || skip(x, y)) continue; r.length = g.length = b.length = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const q = ((y + j) * S + x + i) * 4; if (!src[q + 3]) continue; r.push(src[q]); g.push(src[q + 1]); b.push(src[q + 2]); }
    r.sort((a, c) => a - c); g.sort((a, c) => a - c); b.sort((a, c) => a - c); const m = r.length >> 1;
    let R = r[m], G = g[m], Bb = b[m]; const L = R * 0.3 + G * 0.59 + Bb * 0.11; const Lq = Math.max(8, Math.round(L / 255 * 5) / 5 * 255 * 0.92 + 14); const f = Lq / Math.max(8, L);
    d[p] = Math.min(255, R * f); d[p + 1] = Math.min(255, G * f); d[p + 2] = Math.min(255, Bb * f);
  }
}

export class LimboBody {
  /** app: Limbo Appearance; outfit: Limbo Outfit (LookParts); opts: { severed: ['shin_l', ...], overrides (SpecOverrides), hook(painters, P, spec), hd, paint, material } */
  constructor(app, outfit = {}, { severed = [], overrides = {}, hook = null, hd = true, paint = true, material = null } = {}) {
    this.app = { ...DEF, ...app }; const S = hd ? 512 : 256;
    const data = new Uint8Array(S * S * 4); const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; // smooth painted look (the page pads every face, so no bleeding) tex.generateMipmaps = false; tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
    this.tex = tex; this.gg = new GGSkin(hd ? 2 : 1, { tex, data });
    this.root = new THREE.Group(); this.bones = {};
    for (const b of BONES) { const g = new THREE.Group(); g.name = b; this.bones[b] = g; }
    for (const b of BONES) { const p = BONE_PARENT[b]; (p ? this.bones[p] : this.root).add(this.bones[b]); }
    for (const b of SEC_BONES) { const g = new THREE.Group(); g.name = b; this.bones[SEC_PARENT[b]].add(g); this.bones[b] = g; }
    this.dims = rigDims(this.app); for (const b of BONES) this.bones[b].position.fromArray(this.dims.off[b]);
    const spec = specOf(this.app, outfit, this.dims, hashApp(this.app), {}, overrides); if (hook) spec.hook = hook; this.spec = spec;
    const boneIndex = (b) => { const si = SEC_BONES.indexOf(b); return si >= 0 ? BONES.length + si : BONES.indexOf(b); };
    const geo = this.gg.build(spec, this.dims, new Set(severed), 0, boneIndex); this.P = this.gg.P;
    smoothSkin(geo);
    const inv = BONES.map((b) => { const r = this.dims.rest[b]; return new THREE.Matrix4().makeTranslation(-r[0], -r[1], -r[2]); });
    const piv = this.gg.plan?.pivots ?? {}; const r = this.dims.rest, s = this.dims.s;
    const def = { pack: [0, 1.42 * s, -0.14 * s], hair: [0, r.head[1] + 0.03 * s, r.head[2] - 0.05 * s], coat: [0, r.spine[1] + 0.02 * s, 0], badge: [0, r.neck[1] - 0.02 * s, 0.07 * s], bust: [0, r.chest[1] + 0.08 * s, 0.06 * s] };
    for (const b of SEC_BONES) { const p = piv[b] ?? def[b], par = r[SEC_PARENT[b]]; this.bones[b].position.set(p[0] - par[0], p[1] - par[1], p[2] - par[2]); inv.push(new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2])); this.rest = this.rest || {}; this.rest[b] = p; }
    this.skeleton = new THREE.Skeleton([...BONES, ...SEC_BONES].map((b) => this.bones[b]), inv);
    this.mesh = new THREE.SkinnedMesh(geo, material || toonMat({ map: tex })); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.root.add(this.mesh); this.mesh.bind(this.skeleton, new THREE.Matrix4());
    if (paint) { this.gg.paintAll(spec, this.app, {}, 'base'); cleanPage(this.tex.image.data, S, hd ? 2 : 1); this.gg.base?.set?.(this.tex.image.data); this.tex.needsUpdate = true; }
    geo.computeBoundingBox(); this.box = geo.boundingBox.clone(); this.height = this.box.max.y;
  }
  /** rest-pose (body space) position of a bone */
  restOf(b) { return this.rest?.[b] ? new THREE.Vector3(...this.rest[b]) : new THREE.Vector3(...this.dims.rest[b]); }
  /** parent obj under `bone` so that its coordinates are rest-pose body-space coordinates */
  attach(obj, bone, cancelScale = 1) { const g = new THREE.Group(); g.position.copy(this.restOf(bone)).multiplyScalar(-1); g.add(obj); if (cancelScale !== 1) { const f = new THREE.Group(); f.scale.setScalar(1 / cancelScale); f.add(g); this.bones[bone].add(f); } else this.bones[bone].add(g); obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); return g; }
  setExpression(name, hold = 0) { this.gg.setExpression(name, hold); }
  talk(sec) { this.gg.talk(sec); }
  update(dt) { this.gg.update(dt); }
}

// ---------------------------------------------------------------- procedural animator
const DUR = { attack: 1.0, strike: 1.0, throw: 0.8, hit: 0.75, cast: 1.1, cheer: 1.4, death: 1.5, punch: 1.0 };
/** seconds from act('attack') to the strike landing (anticipation -> strike) */
export const IMPACT = 0.45;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export class LimboAnim {
  constructor(L, { sway = 1, speed = 1, fall = true } = {}) { this.fall = fall; this.L = L; this.t = Math.random() * 10; this.mode = 'idle'; this.mt = 0; this.hold = false; this.sway = sway; this.speed = speed; this.dead = 0; this.extra = null; }
  play(mode, { hold = false } = {}) { this.mode = mode; this.mt = 0; this.hold = hold; }
  /** pose = { joint: [x, y, z] } accumulated; extra(pose, t) may add per-character offsets */
  update(dt) {
    const B = this.L.bones; this.t += dt * this.speed; this.mt += dt; const t = this.t, sw = this.sway;
    const P = {}; const add = (j, x = 0, y = 0, z = 0) => { const p = (P[j] ||= [0, 0, 0]); p[0] += x; p[1] += y; p[2] += z; };
    // idle: breathing, weight shift, relaxed arms
    add('chest', Math.sin(t * 1.6) * 0.02); add('spine', 0, Math.sin(t * 0.7) * 0.04 * sw, Math.sin(t * 0.9) * 0.025 * sw); add('hips', 0, 0, -Math.sin(t * 0.9) * 0.02 * sw);
    add('head', Math.sin(t * 1.3) * 0.03, Math.sin(t * 0.5) * 0.1 * sw, 0);
    add('uarmL', -0.05 + Math.sin(t * 1.6) * 0.03, 0, 0.1); add('uarmR', -0.05 + Math.sin(t * 1.6 + 1) * 0.03, 0, -0.1); add('farmL', -0.25); add('farmR', -0.25);
    add('fing1L', 0, 0, -0.5); add('fing1R', 0, 0, 0.5); add('fing2L', 0, 0, -0.6); add('fing2R', 0, 0, 0.6);
    const d = DUR[this.mode] || 1; const p = this.mt / d; const e = Math.sin(Math.min(1, p) * Math.PI); this.drop = 0; this.fwd = 0;
    switch (this.mode) {
      case 'attack': case 'punch': { // anticipation (wind back + crouch) -> strike (step in, twist through) -> follow-through -> recover
        const a = ss(0, 0.4, p) * (1 - ss(0.4, 0.5, p)), k = ss(0.4, 0.5, p) * (1 - ss(0.68, 1.0, p));
        add('uarmR', 0.95 * a - 1.75 * k, 0, -0.25 * a - 0.1 * k); add('farmR', -1.1 * a - 0.25 * k); add('handR', 0.4 * a - 0.3 * k);
        add('chest', -0.12 * a + 0.32 * k, -0.55 * a + 0.5 * k); add('spine', -0.05 * a + 0.2 * k, -0.2 * a + 0.2 * k); add('head', 0.12 * a - 0.12 * k, 0.3 * a - 0.2 * k);
        add('uarmL', -0.45 * a + 0.35 * k, 0, 0.35 * a + 0.2 * k); add('farmL', -0.8 * a - 0.3 * k);
        add('thighL', -0.3 * a - 0.55 * k); add('shinL', 0.55 * a + 0.35 * k); add('thighR', 0.1 * a + 0.35 * k); add('shinR', 0.5 * a + 0.25 * k); add('footL', -0.2 * a); add('footR', -0.2 * a);
        this.drop = 0.07 * a + 0.04 * k; this.fwd = -0.05 * a + 0.13 * k; break; }
      case 'strike': { // serpent strike: coil back, lash forward with both claws
        const a = ss(0, 0.4, p) * (1 - ss(0.4, 0.5, p)), k = ss(0.4, 0.5, p) * (1 - ss(0.7, 1.0, p));
        add('spine', -0.35 * a + 0.45 * k); add('chest', -0.3 * a + 0.4 * k); add('neck', -0.2 * a + 0.2 * k); add('head', -0.25 * a - 0.1 * k);
        add('uarmL', 0.6 * a - 1.5 * k, 0, 0.5 * a); add('uarmR', 0.6 * a - 1.5 * k, 0, -0.5 * a); add('farmL', -0.9 * a - 0.2 * k); add('farmR', -0.9 * a - 0.2 * k);
        this.drop = 0.05 * a; this.fwd = -0.08 * a + 0.16 * k; break; }
      case 'throw': { const w = p < 0.4 ? ss(0, 0.4, p) : 1 - ss(0.4, 0.65, p) * 2; add('uarmR', -1.2 * Math.max(0, w) + (p > 0.4 ? -1.6 * e : -1.2 * e), 0, -0.3 * e); add('farmR', -1.0 * e); add('chest', -0.1 * w + 0.15 * e, 0.3 * w); break; }
      case 'hit': { // stagger: snap back, a step back on one leg, arms flung, recover
        const k = ss(0, 0.1, p) * (1 - ss(0.35, 1, p)); const w = Math.sin(p * 18) * 0.06 * k;
        add('spine', -0.38 * k); add('chest', -0.25 * k, 0.18 * k + w); add('head', -0.45 * k, 0.25 * k);
        add('uarmL', -0.5 * k, 0, 0.65 * k); add('uarmR', 0.35 * k, 0, -0.75 * k); add('farmL', -0.7 * k); add('farmR', -0.5 * k);
        add('thighR', 0.4 * k); add('shinR', 0.3 * k); add('thighL', -0.15 * k); add('shinL', 0.45 * k);
        this.drop = 0.05 * k; this.fwd = -0.12 * k; break; }
      case 'cast': add('uarmL', -1.5 * e, 0, 0.2 * e); add('uarmR', -1.5 * e, 0, -0.2 * e); add('farmL', -0.3 * e); add('farmR', -0.3 * e); add('chest', -0.12 * e); add('head', -0.15 * e); break;
      case 'cheer': { const k = Math.min(1, p * 4) * (1 - ss(0.8, 1, p)); add('uarmL', -0.3 * k, 0, 2.5 * k); add('uarmR', -0.3 * k, 0, -2.5 * k); add('farmL', 0, 0, 0.3 * k + Math.sin(t * 14) * 0.15 * k); add('farmR', 0, 0, -0.3 * k - Math.sin(t * 14) * 0.15 * k); add('head', -0.2 * k); break; }
      case 'death': { // stagger, knees give, a gravity fall onto the back with a small bounce, limbs splay
        const k1 = ss(0, 0.2, p), f = p < 0.2 ? 0 : Math.min(1, ((p - 0.2) / 0.45) ** 2), b = p > 0.65 ? Math.sin(Math.min(1, (p - 0.65) / 0.2) * Math.PI) * 0.12 * (1 - ss(0.85, 1, p)) : 0;
        this.dead = Math.max(0, f - b * 0.6);
        add('head', -0.4 * k1 + 0.5 * f, 0.3 * f); add('spine', -0.2 * k1 + 0.15 * f); add('chest', -0.15 * k1);
        add('uarmL', -0.6 * k1 * (1 - f), 0, 0.5 * k1 + 0.7 * f); add('uarmR', -0.4 * k1 * (1 - f), 0, -0.4 * k1 - 0.8 * f); add('farmL', -0.5 * f); add('farmR', -0.3 * f);
        add('thighL', -0.5 * k1 - 0.4 * f); add('thighR', -0.2 * k1 - 0.7 * f); add('shinL', 0.9 * k1 + 0.3 * f); add('shinR', 0.5 * k1 + 0.6 * f); this.drop = 0.1 * k1 * (1 - f); break; }
    }
    if (this.mode !== 'idle' && this.mode !== 'death' && this.mt > d) this.mode = 'idle';
    this.extra?.(add, t, this);
    for (const j in B) { if (SEC_BONES.includes(j)) continue; const p2 = P[j]; if (p2) B[j].rotation.set(p2[0], p2[1], p2[2]); else B[j].rotation.set(0, 0, 0); }
    const hips = B.hips; hips.position.y = this.L.dims.off.hips[1] * (1 - this.drop); hips.position.z = this.fwd; if (this.fall) { hips.position.y = this.L.dims.off.hips[1] - this.dead * this.L.dims.off.hips[1] * 0.78; hips.rotation.x += -this.dead * 1.25; }
    this.L.update(dt);
  }
}
