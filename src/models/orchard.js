// Newton's orchard at dusk turning to moonlight: the loading screen and the main menu share this one set.
// A hero apple tree (real branches, leaves, hanging red apples, one apple ripening as the game loads), Newton's stone
// study with lamplit windows and a smoking chimney, a porch telescope aimed at a gilded crescent moon with a sleeping
// face, crates of apples, a ladder, a little stream with reeds, lilies and a plank bridge, rows of orchard trees on
// the hill, cel grass and wildflowers in the wind, fireflies, drifting petals and leaves, stars and moonlit clouds.
// The menu's physical objects (stencilled apple crate, lantern post, leather journal on a stump, brass telescope,
// credits scroll) carry pixel-crisp Alagard lettering made with the UI kit (craft.js).
import * as THREE from 'three';
import * as T from './toon.js';
import * as F from './flora.js';
import { cottage, chimneySmoke, plankBridge, fence, Kit } from './village.js';
import { ridges } from './realworld.js';
import { Surf, wood, leather, parchment, brass, inscribeLines, slab, pxTex, frontMat, sideMat, plainMat, turned, rivet, groove, RAMP, FONT, measure, PX } from '../ui3d/craft.js';
import { Signboard } from '../ui3d/objects.js';
import { Particles } from '../gfx/particles.js';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32 } from '../core/util.js';
import { plantField } from '../gfx/plants.js';
import { groundTex, soilTex } from '../gfx/pixeltex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const MOON = V(36, 34, -110);
export const SPOTS = { tree: V(0, 0, 0), sleep: V(1.95, 0, 0.9), float: V(0.45, 0, 1.95), ripe: V(0.28, 2.05, 0.9), signNew: V(-1.95, 0, 4.4), signRes: V(2.35, 0, 4.3), journal: V(4.35, 0, 2.6), settings: V(5.35, 0, 0.6), telescope: V(-4.35, 0, 1.7), credits: V(-0.55, 0, 5.5), title: V(-0.15, 3.7, 4.3), prompt: V(2.35, 1.65, 2.3) };

// ---------------------------------------------------------------- an apple: turned body with striations and blush, stem, leaf
let APPLE = null;
function appleParts() {
  if (APPLE) return APPLE;
  const body = turned([[0.001, 0.05], [0.14, 0.0], [0.3, 0.03], [0.43, 0.14], [0.5, 0.32], [0.515, 0.5], [0.47, 0.67], [0.36, 0.8], [0.2, 0.845], [0.08, 0.79], [0.001, 0.75]], 28).clone();
  const p = body.attributes.position; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const stripe = 0.9 + 0.1 * Math.sin(a * 11 + y * 4); const top = 1 - 0.18 * smooth(0.55, 0.8, y) * (1 - smooth(0.0, 0.25, Math.hypot(x, z))); const k = stripe * top * (0.82 + 0.18 * smooth(0, 0.5, y)); col.set([k, k, k], i * 3); }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3)); body.deleteAttribute('uv'); body.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const stemC = new THREE.CatmullRomCurve3([V(0, 0.76, 0), V(0.01, 0.9, 0), V(0.05, 1.02, 0.01)]); const stem = new THREE.TubeGeometry(stemC, 6, 0.028, 5);
  const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.13, 0.05, 0.3, 0.0); ls.quadraticCurveTo(0.13, -0.08, 0, 0); const leaf = new THREE.ShapeGeometry(ls, 6); leaf.rotateX(-1.1); leaf.rotateY(0.6); leaf.translate(0.02, 0.92, 0);
  const tint = (g, hex) => { const c = C(hex); const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const extras = mergeGeometries([tint(stem.toNonIndexed(), '#5a3a1e'), tint(leaf.toNonIndexed(), '#4e8a2c')]);
  APPLE = { body, extras, mat: new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.5, 0.78, 1.0]) }) };
  return APPLE;
}
const RED = C('#c8261c'), GREEN = C('#7ab83a');
/** one apple (radius ~ s/2): body tinted by ripeness (0 green .. 1 red) */
export function makeApple({ s = 0.2, ripe = 1 } = {}) {
  const A = appleParts(); const g = new THREE.Group(); g.name = 'apple';
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: T.gradientMap([0.48, 0.76, 1.0]) }); const body = new THREE.Mesh(A.body, m); body.castShadow = true;
  const ex = new THREE.Mesh(A.extras, A.mat); ex.castShadow = true; g.add(body, ex); g.scale.setScalar(s);
  g.userData.setRipe = (k) => { m.color.copy(GREEN).lerp(RED, k).offsetHSL(0, 0, 0.02 * Math.sin(k * 3)); }; g.userData.setRipe(ripe); return g;
}
/** many apples (instanced bodies + stems/leaves) */
export function appleHeap(spots) {
  const A = appleParts(); const g = new THREE.Group(); const n = Math.max(1, spots.length);
  const bm = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: T.gradientMap([0.48, 0.76, 1.0]) });
  const ib = new THREE.InstancedMesh(A.body, bm, n), ie = new THREE.InstancedMesh(A.extras, A.mat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  spots.forEach(([x, y, z, s, k = 1], i) => { q.setFromEuler(e.set((Math.sin(i * 7.1) * 0.6), i * 2.3, Math.cos(i * 3.7) * 0.6)); m4.compose(V(x, y, z), q, V(s, s, s)); ib.setMatrixAt(i, m4); ie.setMatrixAt(i, m4); c.copy(GREEN).lerp(RED, k).offsetHSL((Math.sin(i * 9.1)) * 0.02, 0, Math.sin(i * 4.3) * 0.05); ib.setColorAt(i, c); });
  if (!spots.length) { ib.setColorAt(0, c.setRGB(1, 1, 1)); ib.count = ie.count = 0; }
  for (const im of [ib, ie]) { im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); } return g;
}

// ---------------------------------------------------------------- lettering: UI-kit plaques with Alagard at 16 / 32 / 48 px
export function plaque(lines, { font = 'title', style = 'carve', kind = 'oak', scale = 0.05, depth = 0.3, sub = null, color = null } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines]; const f = FONT[font]; const tw = Math.max(...arr.map((l) => measure(l, font))); const sw = sub ? measure(sub, 'head') : 0;
  const Wt = Math.max(tw, sw) + 26, Ht = arr.length * f.lineH + (sub ? 18 : 0) + 16; const S = new Surf(Wt, Ht);
  if (kind === 'brass') brass(S, 0, 0, Wt, Ht, { seed: Wt }); else if (kind === 'parch') parchment(S, 0, 0, Wt, Ht, { seed: Wt, torn: 0, tone: 4 }); else if (kind === 'leather') leather(S, 0, 0, Wt, Ht, { seed: Wt }); else wood(S, 0, 0, Wt, Ht, RAMP[kind] || RAMP.oak, { seed: Wt, base: 3, knots: 1, quiet: true });
  S.bevel(null, { lit: 2, dark: -2 }); if (kind !== 'parch') groove(S, 0, 0, Wt, Ht, 3, { cut: 2, deep: 0, lip: 4 });
  if (kind !== 'parch') for (const [x, y] of [[5, 5], [Wt - 8, 5], [5, Ht - 8], [Wt - 8, Ht - 8]]) rivet(S, x, y, kind === 'brass' ? RAMP.iron : RAMP.brass);
  inscribeLines(S, arr, { x: 4, y: 8, w: Wt - 8, h: arr.length * f.lineH }, font, style, color ? { color } : {});
  if (sub) inscribeLines(S, [sub], { x: 4, y: Ht - 22, w: Wt - 8, h: 16 }, 'head', style === 'gild' ? 'gild' : 'ink', {});
  const w = Wt / PX, h = Ht / PX; const m = new THREE.Mesh(slab(w, h, depth, { cut: 0.12, bevel: 0.08 }), [frontMat(pxTex(S.toCanvas()), { metal: kind === 'brass' ? 1 : 0 }), sideMat(kind === 'brass' ? 'brass' : kind === 'oak' ? 'oak' : 'walnut')]);
  m.castShadow = true; m.receiveShadow = true; m.scale.setScalar(scale); m.userData.size = [w * scale, h * scale]; return m;
}

// ---------------------------------------------------------------- the menu's physical objects
function crate({ label = null, apples = 22, seed = 3 } = {}) { // slatted apple crate heaped with apples; the front board is stencilled
  const G = new THREE.Group(); const K = new Kit(); const W = 1.15, D = 0.78, H = 0.62; const r = mulberry32(seed);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box('woodRaw', 0.08, H, 0.08, V(sx * (W / 2 - 0.04), H / 2, sz * (D / 2 - 0.04)), null, 0.015);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box('woodRaw', 0.04, 0.15, D - 0.06, V(sx * (W / 2 - 0.02), 0.1 + i * 0.2, 0), new THREE.Euler(0, 0, (r() - 0.5) * 0.04), 0.012);
  for (let i = 0; i < 3; i++) K.box('woodRaw', W - 0.06, 0.15, 0.04, V(0, 0.1 + i * 0.2, -D / 2 + 0.02), null, 0.012);
  K.box('woodDark', W - 0.04, 0.04, D - 0.04, V(0, 0.04, 0), null, 0.01); K.build(G);
  const front = label ? plaque(label, { font: 'title', style: 'paint', kind: 'oak', depth: 0.6, color: '#7a1a14' }) : null;
  if (front) { const [fw, fh] = front.userData.size; const k = (W - 0.06) / fw; front.scale.multiplyScalar(k); front.position.set(0, Math.max(0.3, fh * k / 2 + 0.03), D / 2 + 0.01); G.add(front); }
  else for (let i = 0; i < 3; i++) K.box('woodRaw', W - 0.06, 0.15, 0.04, V(0, 0.1 + i * 0.2, D / 2 - 0.02), null, 0.012);
  if (!label) K.build(G);
  const sp = []; for (let i = 0; i < apples; i++) { const x = (r() - 0.5) * (W - 0.3), z = (r() - 0.5) * (D - 0.25); const mound = 0.12 * (1 - Math.hypot(x / W, z / D) * 1.6); sp.push([x, H - 0.12 + Math.max(0, mound) + (i > apples * 0.6 ? 0.1 : 0), z, 0.2 + r() * 0.04, 0.75 + r() * 0.25]); }
  G.add(appleHeap(sp)); return G;
}
function lanternPost(label) { // a crooked post, an arm, a hanging brass lantern with a warm flame, a carved sign
  const G = new THREE.Group(); const K = new Kit();
  K.box('woodDark', 0.14, 2.2, 0.14, V(0, 1.1, 0), new THREE.Euler(0, 0, 0.03), 0.03); K.box('woodDark', 0.8, 0.1, 0.1, V(0.32, 2.05, 0), null, 0.02); K.box('woodDark', 0.08, 0.5, 0.08, V(0.2, 1.82, 0), new THREE.Euler(0, 0, -0.9), 0.02); K.build(G);
  const L = new THREE.Group(); L.position.set(0.62, 1.98, 0); G.add(L);
  const cage = new THREE.Mesh(turned([[0.001, -0.42], [0.13, -0.42], [0.16, -0.38], [0.12, -0.34], [0.12, -0.1], [0.16, -0.06], [0.1, 0.02], [0.03, 0.08], [0.001, 0.1]], 28), plainMat('brass')); cage.castShadow = true; L.add(cage);
  const glass = new THREE.Mesh(turned([[0.001, -0.34], [0.115, -0.34], [0.115, -0.1], [0.001, -0.1]], 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.3, 0.55), toneMapped: false })); glass.userData.noAO = true; L.add(glass);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.26, 0.018), plainMat('brass')); const a = (i / 4) * Math.PI * 2 + 0.4; b.position.set(Math.cos(a) * 0.125, -0.22, Math.sin(a) * 0.125); L.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), plainMat('iron')); ring.position.y = 0.13; L.add(ring);
  const pl = new THREE.PointLight(0xffb060, 3.2, 5.5, 1.6); pl.position.set(0.62, 1.78, 0.1); G.add(pl);
  const sign = plaque(label, { font: 'title', style: 'carve', kind: 'oak' }); const [sw] = sign.userData.size; sign.scale.multiplyScalar(1.05 / sw); sign.position.set(0, 1.25, 0.1); G.add(sign);
  G.userData.swing = L; return G;
}
function stumpWithJournal(label) { // a sawn stump with ring-painted top and a big leather journal lying on it, gold-tooled
  const G = new THREE.Group();
  const stump = new THREE.Mesh(turned([[0.001, 0.62], [0.42, 0.62], [0.44, 0.58], [0.42, 0.3], [0.46, 0.12], [0.62, 0.02], [0.66, 0], [0.001, 0]], 28), F.woodMat('oak')); stump.castShadow = stump.receiveShadow = true; G.add(stump);
  const S = new Surf(48, 48); for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - 23.5, y - 23.5); if (d > 23.5) continue; const ring = Math.floor(d / 3 + Math.sin(Math.atan2(y - 24, x - 24) * 3) * 0.3); S.set(x, y, RAMP.oak, d > 21.5 ? 1 : 3 + (ring % 2) - (d < 2 ? 1 : 0)); }
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.43, 28), frontMat(pxTex(S.toCanvas()))); top.rotation.x = -Math.PI / 2; top.position.y = 0.623; top.receiveShadow = true; G.add(top);
  const book = new THREE.Group(); book.position.set(0, 0.72, -0.05); book.rotation.set(0.62, -0.12, 0); G.add(book);
  const BW = 0.95, BD = 0.7; const LS = new Surf(64, 48); leather(LS, 0, 0, 64, 48, { seed: 4 }); LS.bevel(null, { lit: 1, dark: -2 }); for (const [x, y] of [[0, 0], [58, 0], [0, 42], [58, 42]]) LS.rect(x, y, 6, 6, RAMP.brass, 3);
  const coverM = frontMat(pxTex(LS.toCanvas()));
  const cover = new THREE.Mesh(slab(BW, BD, 0.05, { cut: 0.04, bevel: 0.015 }), [coverM, sideMat('walnut')]); cover.rotation.x = -Math.PI / 2; cover.position.y = 0.025; book.add(cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.06, 0.12, BD - 0.04), [plainMat('ivory'), plainMat('ivory'), plainMat('ivory'), plainMat('ivory'), plainMat('ivory'), plainMat('ivory')]); pages.position.y = 0.11; book.add(pages);
  const back = cover.clone(); back.position.y = 0.195; book.add(back);
  const title = plaque(label, { font: 'title', style: 'gild', kind: 'leather', depth: 0.2, sub: 'of Discoveries' }); const [tw, th] = title.userData.size; title.scale.multiplyScalar((BW - 0.08) / tw); title.rotation.x = -Math.PI / 2; title.position.y = 0.226; book.add(title); void th;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, BD + 0.02), plainMat('leather')); strap.position.set(BW * 0.32, 0.11, 0); book.add(strap);
  for (const o of [cover, back, pages, strap]) { o.castShadow = true; o.receiveShadow = true; }
  return G;
}
function telescope(label, aim) { // brass refractor on a wooden tripod with a yoke, aimed at the moon; an engraved brass tag
  const G = new THREE.Group(); const K = new Kit();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; K.box('woodDark', 0.07, 1.75, 0.07, V(Math.cos(a) * 0.36, 0.82, Math.sin(a) * 0.36), new THREE.Euler(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22, 'XYZ'), 0.02); }
  K.box('woodDark', 0.36, 0.08, 0.36, V(0, 1.66, 0), null, 0.03); K.build(G);
  const T0 = new THREE.Group(); T0.position.set(0, 1.78, 0); G.add(T0); T0.lookAt(T0.position.clone().add(aim));
  const tube = new THREE.Mesh(turned([[0.06, -0.75], [0.085, -0.72], [0.085, -0.66], [0.07, -0.64], [0.075, -0.2], [0.095, -0.17], [0.095, -0.12], [0.08, -0.1], [0.085, 0.5], [0.105, 0.53], [0.115, 0.62], [0.115, 0.7], [0.1, 0.72]], 28), plainMat('brass')); tube.rotation.x = Math.PI / 2; tube.castShadow = true; T0.add(tube);
  const eye = new THREE.Mesh(turned([[0.025, -0.95], [0.04, -0.93], [0.04, -0.82], [0.055, -0.78], [0.055, -0.74], [0.001, -0.74]], 28), plainMat('iron')); eye.rotation.x = Math.PI / 2; T0.add(eye);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 1.3), toneMapped: false })); lens.position.z = 0.715; T0.add(lens);
  const finder = new THREE.Mesh(turned([[0.025, -0.25], [0.03, -0.22], [0.03, 0.2], [0.035, 0.24], [0.001, 0.25]], 28), plainMat('brass')); finder.rotation.x = Math.PI / 2; finder.position.set(0, 0.13, 0.1); T0.add(finder);
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), plainMat('brass')); yoke.rotation.z = Math.PI; yoke.position.y = -0.02; G.add(yoke); yoke.position.copy(T0.position).add(V(0, -0.02, 0));
  const tag = plaque(label, { font: 'title', style: 'engrave', kind: 'brass' }); const [tw] = tag.userData.size; tag.scale.multiplyScalar(0.95 / tw); tag.position.set(0, 1.05, 0.42); tag.rotation.x = -0.12; G.add(tag);
  for (let i = 0; i < 2; i++) { const ch = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 4, 8), plainMat('iron')); ch.position.set(i ? 0.3 : -0.3, 1.32, 0.38); G.add(ch); }
  return G;
}
function scrollOnStool(label) { // a three-legged stool; a parchment scroll half unrolled, turned rollers, ribbon and wax seal
  const G = new THREE.Group(); const K = new Kit(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; K.box('woodRaw', 0.07, 0.62, 0.07, V(Math.cos(a) * 0.24, 0.3, Math.sin(a) * 0.24), new THREE.Euler(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15), 0.02); }
  K.build(G); const seat = new THREE.Mesh(turned([[0.001, 0.62], [0.36, 0.62], [0.38, 0.66], [0.36, 0.7], [0.001, 0.7]], 28), F.woodMat('oak')); seat.castShadow = seat.receiveShadow = true; G.add(seat);
  const sheet = plaque(label, { font: 'title', style: 'ink', kind: 'parch', depth: 0.06, sub: 'with thanks' }); const [sw, sh] = sheet.userData.size; const k = 0.62 / sw; sheet.scale.multiplyScalar(k); sheet.rotation.x = -0.42; sheet.position.set(0, 1.02, 0.02); G.add(sheet);
  for (const s of [-1, 1]) { const rl = new THREE.Mesh(turned([[0.001, -0.5], [0.04, -0.5], [0.05, -0.47], [0.035, -0.44], [0.045, -0.42], [0.045, 0.42], [0.035, 0.44], [0.05, 0.47], [0.04, 0.5], [0.001, 0.5]], 28), plainMat('walnut')); rl.rotation.z = Math.PI / 2; const off = (sh * k / 2 + 0.03) * s; rl.position.set(0, 1.02 + Math.cos(0.42) * off, 0.02 - Math.sin(0.42) * off); G.add(rl);
    const wrap = new THREE.Mesh(turned([[0.065, -0.4], [0.075, -0.38], [0.075, 0.38], [0.065, 0.4]], 28), plainMat('ivory')); wrap.rotation.z = Math.PI / 2; wrap.position.copy(rl.position); G.add(wrap); }
  const seal = new THREE.Mesh(turned([[0.001, 0], [0.07, 0], [0.08, 0.015], [0.06, 0.03], [0.001, 0.035]], 28), plainMat('wax')); seal.rotation.x = Math.PI / 2 - 0.42; seal.position.set(0.3, 0.86, 0.12); G.add(seal);
  return G;
}

// ---------------------------------------------------------------- sky, moon, stars, fireflies
function skyDome() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uNight: { value: 0 }, uMoon: { value: MOON.clone().normalize() }, uTime: T.WIND.time },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform float uNight; uniform vec3 uMoon; varying vec3 vW;
      vec3 pal(float e, vec3 zen, vec3 hi, vec3 mid, vec3 low, vec3 hor){ vec3 c = mix(hor, low, smoothstep(0.0, 2.5, e)); c = mix(c, mid, smoothstep(2.0, 7.0, e)); c = mix(c, hi, smoothstep(6.0, 16.0, e)); return mix(c, zen, smoothstep(14.0, 40.0, e)); }
      void main(){ vec3 d = normalize(vW - cameraPosition); float e = degrees(asin(clamp(d.y, -1.0, 1.0)));
        float west = smoothstep(0.2, -0.9, d.x); // the last of the sunset lingers in the west (left)
        vec3 dusk = pal(e, vec3(0.13, 0.15, 0.36), vec3(0.27, 0.24, 0.5), vec3(0.62, 0.36, 0.55), vec3(0.95, 0.5, 0.45), vec3(1.0, 0.72, 0.48));
        vec3 night = pal(e, vec3(0.03, 0.04, 0.13), vec3(0.07, 0.09, 0.24), vec3(0.14, 0.15, 0.36), vec3(0.24, 0.22, 0.44), vec3(0.36, 0.3, 0.48));
        vec3 c = mix(dusk, night, clamp(uNight - west * 0.35 * (1.0 - uNight), 0.0, 1.0));
        if (e < 0.0) c = mix(c, vec3(0.08, 0.08, 0.14), smoothstep(0.0, -5.0, e));
        float s = max(0.0, dot(d, normalize(uMoon))); c += vec3(0.75, 0.8, 1.0) * (pow(s, 90.0) * 0.4 + pow(s, 14.0) * 0.16 + pow(s, 3.0) * 0.05) * (0.5 + uNight * 0.5);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(185, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.noInk = true; mesh.userData.noAO = true; return mesh;
}
function moonTexture() { // a gilded crescent with a serene sleeping profile on its inner edge, cel-banded
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const R = 92, cx = 128, cy = 128, ox = 52; const halo = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, 126); halo.addColorStop(0, 'rgba(230,236,255,0.35)'); halo.addColorStop(1, 'rgba(230,236,255,0)'); g.fillStyle = halo; g.fillRect(0, 0, S, S);
  const crescent = (r, col) => { g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip(); g.fillStyle = col; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx + ox, cy - 18, r * 0.98, 0, Math.PI * 2); g.fill(); g.restore(); };
  crescent(R + 3, '#7a5a2a'); crescent(R, '#f6e2a6'); g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#e6c27a'; g.beginPath(); g.arc(cx - 26, cy + 30, R, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(cx + 10, cy - 40, R * 0.55, 0, Math.PI * 2); g.fill(); g.restore();
  // the sleeping face along the inner curve: closed eye, nose, smile, a little nightcap star
  g.strokeStyle = '#8a5a26'; g.lineWidth = 3.5; g.lineCap = 'round'; const ix = cx + ox - R * 0.98, iy = cy - 18;
  g.beginPath(); g.arc(ix + 30, iy - 4, 9, 0.2, Math.PI - 0.2); g.stroke(); // eyelid
  g.beginPath(); g.moveTo(ix + 12, iy + 10); g.quadraticCurveTo(ix + 2, iy + 26, ix + 14, iy + 30); g.stroke(); // nose
  g.beginPath(); g.arc(ix + 24, iy + 44, 9, 0.3, Math.PI - 0.6); g.stroke(); // smile
  g.fillStyle = 'rgba(232,140,110,0.45)'; g.beginPath(); g.arc(ix + 38, iy + 28, 8, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function stars(n = 650) {
  const r = mulberry32(17); const pos = [], seed = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = Math.asin(0.05 + r() * 0.95); const d = 170; pos.push(Math.cos(e) * Math.cos(a) * d, Math.sin(e) * d, Math.cos(e) * Math.sin(a) * d - 20); seed.push(r(), r()); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 2));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: T.WIND.time, uNight: { value: 0 } },
    vertexShader: 'attribute vec2 aSeed; uniform float uTime; uniform float uNight; varying float vA; varying float vBig; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999; float tw = 0.6 + 0.4 * sin(uTime * (1.0 + aSeed.y * 3.0) + aSeed.x * 40.0); vBig = step(0.93, aSeed.x); vA = tw * smoothstep(0.15, 0.9, uNight + aSeed.y * 0.2) * (0.5 + 0.5 * normalize(position).y); gl_PointSize = 2.0 + vBig * 5.0 + aSeed.y * 1.5; }',
    fragmentShader: 'varying float vA; varying float vBig; void main(){ vec2 p = gl_PointCoord - 0.5; float cr = max(step(abs(p.x), 0.07) * step(abs(p.y), 0.5), step(abs(p.y), 0.07) * step(abs(p.x), 0.5)); float core = step(length(p), 0.22); float a = mix(core, max(core, cr * 0.7), vBig); if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * a * vA, 1.0); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -9; pts.onBeforeRender = T.tickWind; return pts;
}
function fireflies(n, spots) {
  const pos = [], seed = []; const r = mulberry32(5); for (let i = 0; i < n; i++) { const [x, y, z] = spots(r); pos.push(x, y, z); seed.push(r(), r(), r(), r()); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: T.WIND.time, uScale: { value: 600 }, uNight: { value: 0 } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uScale, uNight; varying float vB; void main(){ vec3 p = position; float t = uTime;
      p += vec3(sin(t * (0.25 + aSeed.x * 0.2) + aSeed.y * 9.0) * 0.9, sin(t * (0.4 + aSeed.z * 0.3) + aSeed.x * 7.0) * 0.35, cos(t * (0.22 + aSeed.w * 0.2) + aSeed.z * 8.0) * 0.9);
      vB = smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(t * (0.9 + aSeed.w * 1.4) + aSeed.x * 30.0)) * smoothstep(0.2, 0.7, uNight);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vB *= smoothstep(2.0, 4.0, -mv.z); gl_PointSize = clamp((0.05 + 0.07 * vB) * uScale / -mv.z, 1.5, 7.0); }`,
    fragmentShader: 'varying float vB; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); float core = step(d, 0.18); float glow = smoothstep(0.5, 0.1, d) * 0.45; float a = (core + glow) * (0.15 + vB); if (a < 0.02) discard; gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a, 1.0); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.onBeforeRender = (rd) => { T.tickWind(); m.uniforms.uScale.value = rd.domElement.height * 0.7; }; pts.userData.noInk = true; return pts;
}

// ---------------------------------------------------------------- the orchard
export function buildOrchard({ renderer = null, menu = true } = {}) {
  const g = new THREE.Group(); g.name = 'orchard'; const rnd = mulberry32(1687); const n = makeNoise(1687);
  T.WIND.ptrK.value = 0; T.WIND.amp.value = 0.8;
  // land: a gentle hollow around the tree rising to the hill of orchard rows; the stream on the right
  const brook = F.celWater({ cx: 7.4, cz: -4, rx: 1.15, rz: 12, rot: -0.32, seed: 21, deep: '#16304e', mid: '#24506e', shallow: '#3e7486', sky: '#6a6aa0', foam: '#c8d8f0', sun: MOON.clone().normalize() });
  const land = (x, z) => (n.fbm(x * 0.07 + 3, z * 0.07, 4) - 0.5) * (0.25 + 0.6 * smooth(4, 14, Math.hypot(x, z))) + Math.max(0, -z - 6) ** 2 * 0.012 + Math.max(0, Math.abs(x) - 18) * 0.05;
  let level = 0; { const hs = []; for (let i = 0; i < 48; i++) { const p = brook.userData.edgePoint((i / 48) * Math.PI * 2, 0.97); hs.push(land(p.x, p.z)); } hs.sort((a, b) => a - b); level = hs[Math.floor(hs.length * 0.6)] - 0.05; }
  const hAt = (x, z) => { let y = land(x, z); const e = brook.userData.edgeD(x, z); if (e < 1.5) { const bank = y + Math.max(0, level + 0.05 + (e - 1) * 0.4 - y) * (1 - smooth(1.12, 1.45, e)); const bed = Math.min(y, level - 0.02 - 0.4 * smooth(1.0, 0.72, e)); y = bed + (bank - bed) * smooth(0.86, 0.985, e); } return y * (0.35 + 0.65 * smooth(1.5, 4.0, Math.hypot(x, z - 0.5))); };
  brook.position.y = level * 0.999; g.add(brook);
  const S = 161, Hs = 80; const pos = new Float32Array(S * S * 3), uv = new Float32Array(S * S * 2), idx = []; const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.6) * Hs;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const x = warp((i / (S - 1)) * 2 - 1), z = warp((j / (S - 1)) * 2 - 1) - 4; const k = j * S + i; pos.set([x, hAt(x, z), z], k * 3); uv.set([x / 6, z / 6], k * 2); }
  for (let j = 0; j < S - 1; j++) for (let i = 0; i < S - 1; i++) { const a = j * S + i; idx.push(a, a + S, a + 1, a + 1, a + S, a + S + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const gtex = (() => { const t = groundTex('lush').clone(); t.repeat.set(2.5, 2.5); t.needsUpdate = true; return t; })(); // pixel-art grass-earth (src/gfx/art/tiles.js)
  const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: gtex, vertexColors: true, gradientMap: T.gradientMap([0.55, 0.8, 1.0]) })); ground.receiveShadow = true; ground.name = 'ground'; g.add(ground);
  const ao = []; const solid = [];
  // the hero tree, its hanging apples, the ripening apple and its twig
  const hero = F.tree('apple', { v: 1, s: 1.22 }); g.add(hero); ao.push([0, 0, 3.4]);
  const heroApples = []; { const lg = hero.children.find((c) => c.material?.alphaTest > 0)?.geometry; const p = lg?.attributes.position; if (p) { const cand = []; for (let i = 0; i < p.count; i += 4) { const x = (p.getX(i) + p.getX(i + 2)) / 2 * 1.22, y = (p.getY(i) + p.getY(i + 2)) / 2 * 1.22, z = (p.getZ(i) + p.getZ(i + 2)) / 2 * 1.22; if (y < 2.4 || y > 4.2 || Math.hypot(x, z) < 0.9 || z > 2.0) continue; cand.push([x, y - 0.15, z]); } for (let i = 0; i < 18 && cand.length; i++) { const c = cand.splice(Math.floor(rnd() * cand.length), 1)[0]; heroApples.push([...c, 0.2 + rnd() * 0.04, 0.85 + rnd() * 0.15]); } } }
  g.add(appleHeap(heroApples));
  const ripe = makeApple({ s: 0.22, ripe: 0 }); ripe.position.copy(SPOTS.ripe); g.add(ripe);
  const twig = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.28, 2.27, 0.9), V(0.3, 2.5, 0.82), V(0.45, 2.85, 0.6), V(0.7, 3.1, 0.3)]), 12, 0.018, 5), F.woodMat('oak')); twig.castShadow = true; g.add(twig);
  // Newton's stone study with lamplit windows, a smoking chimney, a pergola porch
  const study = cottage(1687, { w: 4.6, d: 3.6, h: 2.8, roof: 'gable', walls: 'rubble', lit: true, pergola: true, paint: 'woodGreen' });
  const sx = -7.6, sz = -6.2, sry = 0.55; study.group.position.set(sx, hAt(sx, sz), sz); study.group.rotation.y = sry; g.add(study.group); if (study.smoke.length) study.group.add(chimneySmoke(study.smoke, { rate: 0.8 })); solid.push([sx, sz, 3.4]); ao.push([sx, sz, 4]);
  study.group.updateMatrixWorld(true); const grove = new F.Grove(); for (const gr of study.greens) { const q = study.group.localToWorld(V(gr.x, gr.y, gr.z)); grove.add(gr.kind, q.x, gr.y ? q.y : hAt(q.x, q.z), q.z, { s: gr.s }); }
  const winLights = study.lights.map((p) => { const w = study.group.localToWorld(p.clone()); const l = new THREE.PointLight(0xffa850, 5, 7, 1.6); l.position.copy(w); g.add(l); return l; });
  // orchard rows on the hill behind, cypress and pines along the ridge, a few framing trees
  for (let row = 0; row < 5; row++) for (let i = -5; i <= 5; i++) { const x = i * 4.2 + (row % 2) * 2.1 + (rnd() - 0.5) * 0.8, z = -10 - row * 4.2 + (rnd() - 0.5) * 0.8; if (brook.userData.edgeD(x, z) < 1.4 || Math.hypot(x - sx, z - sz) < 4.5) continue; grove.add('apple', x, hAt(x, z) - 0.05, z, { s: 0.75 + rnd() * 0.2, lod: z < -18 ? 1 : 0 }); ao.push([x, z, 2]); }
  for (let i = 0; i < 16; i++) { const x = -34 + i * 4.5 + rnd() * 2, z = -32 - rnd() * 6; grove.add(rnd() < 0.55 ? 'cypress' : 'pine', x, hAt(x, z), z, { s: 1.0 + rnd() * 0.3, lod: 1 }); }
  for (const [k, x, z, s] of [['oak', 12.5, 1.5, 1.2], ['pine', -13, 3, 1.1], ['cypress', -10.6, -1.6, 1.0], ['olive', 10.5, -7, 1.0], ['oak', -15, -8, 1.1]]) { grove.add(k, x, hAt(x, z) - 0.05, z, { s }); ao.push([x, z, 2.6 * s]); }
  for (const [k, x, z, s] of [['oleander', -5.2, -3.6, 1.1], ['myrtle', 3.6, -2.6, 0.9], ['broom', -3, -5.4, 1.0], ['myrtle', 6, 4.6, 1.0], ['oleander', -6.4, 4.4, 1.1], ['bush', 9.4, 2.6, 1.0]]) { grove.add(k, x, hAt(x, z) - 0.04, z, { s }); ao.push([x, z, 1.2]); }
  g.add(grove.build());
  // the stream: reeds, lilies, a plank bridge; a fence along the lane; a ladder against the tree; crates and a basket
  const reedSpots = [], padSpots = []; const rr = mulberry32(9); for (let i = 0; i < 70; i++) { const a = rr() * Math.PI * 2, d = 0.86 + rr() * 0.2; const p = brook.userData.edgePoint(a, d); for (let k = 0; k < 3; k++) reedSpots.push([p.x + (rr() - 0.5) * 0.4, Math.max(level - 0.08, hAt(p.x, p.z)) - 0.04, p.z + (rr() - 0.5) * 0.4, 0.8 + rr() * 0.7]); }
  for (let i = 0; i < 16; i++) { const p = brook.userData.edgePoint(rr() * Math.PI * 2, 0.3 + rr() * 0.45); padSpots.push([p.x, level + 0.012, p.z, 0.22 + rr() * 0.15]); }
  g.add(F.lilyPads(padSpots)); const plantItems = reedSpots.map(([x, y, z, h], i) => ({ kind: i % 4 === 0 ? 'cattail' : 'reeds', x, y, z, s: 0.7 + h * 0.25, flex: 1.1 }));
  { const bp = brook.userData.edgePoint(Math.PI / 2, 0); const br = plankBridge(3.4, 1.2, 4, { posts: 0.7 }); br.position.set(bp.x - 1.4, level + 0.42, bp.z + 2.6); br.rotation.y = 0.32 - 0.05; g.add(br); }
  g.add(fence([[-12, 6.5], [-9.5, 5.6], [-7, 5.2], [-4.6, 5.6]], hAt, 31));
  { const K = new Kit(); const lad = new THREE.Group(); for (const s of [-1, 1]) K.box('woodRaw', 0.07, 3.1, 0.07, V(s * 0.24, 1.55, 0), null, 0.02); for (let i = 0; i < 8; i++) K.box('woodRaw', 0.5, 0.05, 0.05, V(0, 0.3 + i * 0.36, 0), null, 0.015); K.build(lad); lad.position.set(-0.95, hAt(-0.95, -0.55), -0.55); lad.rotation.set(-0.3, 0.9, 0); g.add(lad); }
  for (const [x, z, ry, n2] of [[-2.0, 0.6, 0.4, 18], [-1.7, 1.45, -0.2, 14], [1.8, -1.0, 0.7, 20]]) { const cr = crate({ apples: n2, seed: Math.round(x * 10) }); cr.position.set(x, hAt(x, z), z); cr.rotation.y = ry; g.add(cr); solid.push([x, z, 0.8]); ao.push([x, z, 1.2]); }
  { const sp = []; const r2 = mulberry32(44); for (let i = 0; i < 9; i++) { const a = r2() * 6.28, d = 0.9 + r2() * 1.6; const x = Math.cos(a) * d + 0.4, z = Math.sin(a) * d * 0.7 + 0.4; sp.push([x, hAt(x, z) + 0.09, z, 0.2, 0.8 + r2() * 0.2]); } g.add(appleHeap(sp)); }
  // a dirt lane from the study door to the tree and on towards the viewer
  { const pts = [V(-6.2, 0, -4.2), V(-4.4, 0, -1.8), V(-2.6, 0, 1.2), V(-1.4, 0, 4.2), V(-1.2, 0, 9)].map((p) => p.setY(hAt(p.x, p.z) + 0.02)); const cv = new THREE.CatmullRomCurve3(pts); const P = [], U = [], I = []; const segs = 60, W = 0.9;
    for (let i = 0; i <= segs; i++) { const t = i / segs; const p = cv.getPointAt(t), d = cv.getTangentAt(t); const sd = V(-d.z, 0, d.x).normalize(); for (const a of [-1, -0.5, 0, 0.5, 1]) { const q = p.clone().addScaledVector(sd, a * W * (1 + 0.15 * Math.sin(t * 17))); q.y = hAt(q.x, q.z) + 0.025; P.push(q.x, q.y, q.z); U.push(a, t * 12); } }
    for (let i = 0; i < segs; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j; I.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); lg.setIndex(I); lg.computeVertexNormals();
    const lm = new THREE.MeshToonMaterial({ color: '#8a6e50', gradientMap: T.gradientMap([0.55, 0.8, 1.0]), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    lm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float lx = abs(vMapUv.x); float ldq = fract(sin(dot(floor(vMapUv * 64.0), vec2(12.9898, 78.233))) * 43758.5453); diffuseColor.a *= step(ldq * 0.9 + 0.05, smoothstep(1.0, 0.6, lx + sin(vMapUv.y * 3.1) * 0.08)); diffuseColor.rgb *= 0.9 + 0.12 * step(0.5, fract(sin(floor(vMapUv.y * 6.0) * 7.1 + floor(vMapUv.x * 4.0) * 3.3) * 43.7));'); };
    lm.map = soilTex(); lm.color.set('#d8c8b0'); lm.userData.noInk = true; const lane = new THREE.Mesh(lg, lm); lane.receiveShadow = true; lane.renderOrder = 1; lane.userData.noInk = true; g.add(lane); g.userData.laneD = (x, z) => { let d = 1e9; for (let i = 0; i <= 40; i++) { const p = cv.getPointAt(i / 40); d = Math.min(d, Math.hypot(p.x - x, p.z - z)); } return d; }; }
  // cel grass and wildflowers everywhere but the lane, the water, the study and the crates
  { const sp = []; const r3 = mulberry32(77); const laneD = g.userData.laneD; const fl = { daisy: [], clover: [], poppy: [], lavender: [], cornflower: [] };
    for (let gz = -14; gz < 9; gz += 0.36) for (let gx = -15; gx < 15; gx += 0.36) { const x = gx + (r3() - 0.5) * 0.36, z = gz + (r3() - 0.5) * 0.36; if (z < -9 && r3() < 0.5) continue; if (brook.userData.edgeD(x, z) < 1.0 || laneD(x, z) < 0.75 || Math.hypot(x, z) < 0.45) continue; const sl = Math.abs(z - SPOTS.sleep.z) < 0.55 && x > 0 && x < 2.3 ? 0.45 : 1; if (solid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar * 0.8)) continue; const pn = n.fbm(x * 0.2, z * 0.2, 3); if (r3() > 0.35 + pn) continue;
      sp.push([x, hAt(x, z) - 0.02, z, (0.32 + r3() * 0.32) * (0.8 + pn * 0.5) * (z > 5 ? 0.75 : 1) * sl, r3() * 0.2, 1]);
      const f = n.fbm(x * 0.3 + 40, z * 0.3, 2); if (f > 0.62 && r3() < 0.22) { const k = ['daisy', 'daisy', 'clover', 'poppy', 'cornflower', 'lavender', 'buttercup'][Math.floor(r3() * 7)]; (fl[k] ||= []).push([x, hAt(x, z) - 0.02, z, k === 'lavender' ? 0.5 + r3() * 0.2 : k === 'clover' ? 0.22 : 0.3 + r3() * 0.15]); } }
    // pixel-art tufts and flowers (moonlit tint), parted by Newton and the pointer
    const FS = { daisy: 'daisy', clover: 'clover', poppy: 'poppy', lavender: 'lavender', cornflower: 'cornflower', buttercup: 'buttercup' };
    for (const [x, y, z, h] of sp) { const k = r3(); plantItems.push({ kind: h > 0.5 ? (k < 0.5 ? 'tall' : k < 0.8 ? 'wide' : 'wispy') : h > 0.36 ? (k < 0.6 ? 'wide' : 'short') : k < 0.8 ? 'short' : 'clover', x, y, z, s: 0.75 + h * 0.4, v: r3() }); }
    for (const [k, list] of Object.entries(fl)) for (const [x, y, z] of list) plantItems.push({ kind: FS[k] || 'daisy', x, y, z, s: 0.9, v: r3() });
    g.add(plantField(plantItems, { wind: T.WIND, tick: T.tickWind, push: { value: F.GRASS_PUSH }, onScene: F.updatePushers, cam: V(0.6, 2.4, 10.8), tint: '#8e9ccc', texel: 0.022 })); }
  // vertex AO on the ground
  { const pp = geo.attributes.position; const cc = new Float32Array(pp.count * 3); for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i); let k = 1; for (const [ax, az, r] of ao) { const d = Math.hypot(x - ax, z - az); if (d < r) k -= (1 - d / r) * 0.35; } k = Math.max(0.5, k); cc.set([k, k, k * 1.02], i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
  // sky, ridges, moonlit clouds, the moon, stars
  const sky = skyDome(); g.add(sky); g.add(ridges(MOON.clone().normalize(), '#4a4a7a', T.SKY.orchard.mtn.slice().reverse()));
  const clouds = T.animeClouds('orchard', { seed: 5, n: 6, z: -150, sunDir: MOON.clone().normalize(), cam: V(0.6, 2.4, 10.8) }); g.add(clouds);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false, color: new THREE.Color(1.25, 1.2, 1.1) })); moon.position.copy(MOON); moon.scale.setScalar(13); moon.renderOrder = -8; moon.userData.noInk = true; g.add(moon);
  const starPts = stars(); g.add(starPts);
  const flies = fireflies(70, (r) => { const a = r() * Math.PI * 2, d = 1.5 + r() * 9; const x = Math.cos(a) * d + 1, z = Math.sin(a) * d * 0.8; return [x, hAt(x, z) + 0.3 + r() * 1.6, z]; }); g.add(flies);
  const leaves = new Particles(220); leaves.points.frustumCulled = false; leaves.points.userData.noInk = true; g.add(leaves.points);
  // light: the last dusk glow from the west, moonlight from the upper right, a cool sky fill
  const moonL = new THREE.DirectionalLight(0xb8c4ff, 1.4); moonL.position.copy(MOON).normalize().multiplyScalar(30); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -12, right: 12, top: 12, bottom: -10, near: 1, far: 80 }); moonL.shadow.bias = -0.0006; moonL.shadow.normalBias = 0.03; g.add(moonL, moonL.target);
  const duskL = new THREE.DirectionalLight(0xff9a5a, 1.6); duskL.position.set(-30, 6, -8); g.add(duskL);
  const hemi = new THREE.HemisphereLight(0x6a78c8, 0x2a3a24, 1.1); g.add(hemi); const amb = new THREE.AmbientLight(0xffe2c8, 0.35); g.add(amb);
  const fog = new THREE.Fog(0x4a4a78, 22, 95);
  // menu objects (hidden until the menu composes itself)
  const objs = {};
  if (menu) {
    const face = (o, at) => { o.position.y = hAt(o.position.x, o.position.z); o.rotation.y = Math.atan2(0.6 - o.position.x, 10.8 - o.position.z) + at; };
    objs.newRun = signBoard('New Run', { w: 1.9, seed: 3 }); objs.newRun.position.copy(SPOTS.signNew); face(objs.newRun, 0);
    objs.resume = signBoard('Resume', { w: 1.6, seed: 5 }); objs.resume.position.copy(SPOTS.signRes); face(objs.resume, 0);
    objs.journal = stumpWithJournal('Journal'); objs.journal.position.copy(SPOTS.journal); face(objs.journal, 0);
    objs.settings = lanternPost('Settings'); objs.settings.position.copy(SPOTS.settings); face(objs.settings, -0.1);
    objs.telescope = telescope('Star Gallery', MOON.clone().sub(SPOTS.telescope).normalize()); objs.telescope.position.copy(SPOTS.telescope); face(objs.telescope, 0);
    { const K = new Kit(); const deck = new THREE.Group(); for (let i = 0; i < 8; i++) K.box('woodRaw', 0.24, 0.07, 1.6, V(-0.84 + i * 0.24, 0.05, 0), new THREE.Euler(0, 0, (i % 3 - 1) * 0.01), 0.015); K.build(deck); deck.position.set(SPOTS.telescope.x, hAt(SPOTS.telescope.x, SPOTS.telescope.z), SPOTS.telescope.z); g.add(deck); }
    objs.credits = scrollOnStool('Credits'); objs.credits.position.copy(SPOTS.credits); face(objs.credits, 0);
    for (const o of Object.values(objs)) g.add(o);
  }
  // the title sign hanging from the tree, and the loading prompt hanging from a branch
  const title = new Signboard(['Apple of Discord'], { maxW: 30, hang: 7, style: 'gild', wood: 'walnut' }); title.group.scale.setScalar(0.19); title.group.position.copy(SPOTS.title); g.add(title.group);
  const prompt = new Signboard(['Click to Begin'], { maxW: 16, hang: 5, style: 'carve', wood: 'oak' }); prompt.group.scale.setScalar(0.085); prompt.group.position.copy(SPOTS.prompt); prompt.group.rotation.y = -0.35; g.add(prompt.group);
  // night factor: 0 = late dusk, 1 = full moonlight
  let night = -1; const setNight = (k) => {
    if (Math.abs(k - night) < 1e-3) return; night = k; sky.material.uniforms.uNight.value = k; starPts.material.uniforms.uNight.value = k; flies.material.uniforms.uNight.value = k;
    duskL.intensity = 2.3 * (1 - k) + 0.2; moonL.intensity = 1.4 + 1.0 * k; hemi.intensity = 1.7 - 0.2 * k; amb.intensity = 0.35; hemi.color.set(0x8a7cc8).lerp(C('#5a6ac0'), k); fog.color.set(0x6a5a88).lerp(C('#2e3260'), k); for (const l of winLights) l.intensity = 3 + 3 * k;
  };
  setNight(0.2);
  let petalT = 0; const update = (dt, t) => {
    petalT -= dt; if (petalT < 0) { petalT = 0.18; const a = rnd() * 6.28, d = 0.6 + rnd() * 2.4; leaves.spawn({ pos: [Math.cos(a) * d, 2.6 + rnd() * 2.2, Math.sin(a) * d * 0.8], vel: [T.WIND.dir.value.x * 0.5, -0.25, T.WIND.dir.value.y * 0.5], grav: 0.12, drag: 0.6, wobble: 1.6, spin: 3, life: 7, size: rnd() < 0.6 ? 9 : 12, color: rnd() < 0.6 ? '#f4dde6' : '#7a9a44', sprite: rnd() < 0.6 ? 'petal' : 'leaf', floor: 0.05, bounce: 0 }); }
    leaves.update(dt, t); title.update(dt, null, t); prompt.update(dt, null, t);
    if (objs.settings) objs.settings.userData.swing.rotation.z = Math.sin(t * 1.3) * 0.06;
  };
  const burst = (p) => { for (let i = 0; i < 26; i++) leaves.spawn({ pos: [p.x + (rnd() - 0.5) * 0.6, p.y + rnd() * 0.5, p.z + (rnd() - 0.5) * 0.6], vel: [(rnd() - 0.5) * 1.6, rnd() * 1.2, (rnd() - 0.5) * 1.6], grav: 0.5, drag: 0.8, wobble: 2, spin: 6, life: 3.5, size: 10, color: rnd() < 0.5 ? '#f4dde6' : '#6a9a3e', sprite: rnd() < 0.5 ? 'petal' : 'leaf', floor: 0.05, bounce: 0 }); };
  return { group: g, hAt, ripe, twig, title, prompt, objs, fog, setNight, update, burst, ground, perches: grove.perches(10) };
}

// ---------------------------------------------------------------- the loading time-lapse: an apple ripens, bruises, rots and
// wrinkles, collapses, worms wriggle out of it, then it shrinks back into one glossy seed that sprouts. set(age 0..1), sprout(0..1)
const NOISE_GLSL = `float aoH3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float aoN3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(aoH3(i), aoH3(i + vec3(1, 0, 0)), f.x), mix(aoH3(i + vec3(0, 1, 0)), aoH3(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(aoH3(i + vec3(0, 0, 1)), aoH3(i + vec3(1, 0, 1)), f.x), mix(aoH3(i + vec3(0, 1, 1)), aoH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float aoW(vec3 p){ return aoN3(p * 7.0) * 0.55 + aoN3(p * 17.0) * 0.3 + aoN3(p * 37.0) * 0.15; }\n`;
export function appleTimelapse() {
  const G = new THREE.Group(); G.name = 'appleTimelapse'; const U = { uRipe: { value: 0 }, uBruise: { value: 0 }, uRot: { value: 0 }, uCollapse: { value: 0 }, uMold: { value: 0 }, uHoleK: { value: 0 }, uTime: T.WIND.time,
    uGreen: { value: C('#86b83e') }, uRed: { value: C('#c8241a') }, uHole: { value: [V(), V(), V()] } };
  const prof = [[0.001, 0.05], [0.14, 0.0], [0.3, 0.03], [0.43, 0.14], [0.5, 0.32], [0.515, 0.5], [0.47, 0.67], [0.36, 0.8], [0.2, 0.845], [0.08, 0.79], [0.001, 0.75]];
  const body = turned(prof, 72, { sub: 8 }).clone(); { const p = body.attributes.position; const col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = (0.9 + 0.1 * Math.sin(a * 11 + y * 4)) * (0.84 + 0.16 * smooth(0, 0.5, y)); col.set([k, k, k], i * 3); } body.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: T.gradientMap([0.42, 0.72, 1.0]) });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uRot, uCollapse; varying vec3 vAP;\n' + NOISE_GLSL + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(normal); float aDisp = -uRot * 0.075;
        { float e = 0.012; float h0 = aoW(position); vec3 g = vec3(aoW(position + vec3(e, 0, 0)) - h0, aoW(position + vec3(0, e, 0)) - h0, aoW(position + vec3(0, 0, e)) - h0) / e; g -= objectNormal * dot(g, objectNormal); objectNormal = normalize(objectNormal - g * aDisp); }`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position) + normal * aDisp * aoW(position);
        transformed.y = mix(transformed.y, transformed.y * 0.58 + 0.03, uCollapse); transformed.xz *= 1.0 + 0.17 * uCollapse * smoothstep(0.85, 0.05, position.y); vAP = position;`);
    sh.fragmentShader = 'uniform float uRipe, uBruise, uRot, uMold, uHoleK; uniform vec3 uGreen, uRed; uniform vec3 uHole[3]; varying vec3 vAP; float aoWet = 0.0;\n' + NOISE_GLSL + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0, 0.86, 0.66), step(0.95, dot(normalize(vNormal), normalize(vec3(-0.35, 0.6, 0.7)))) * step(0.35, aoWet) * 0.75); // a wet, juicy gleam on the rot\n#include <opaque_fragment>').replace('#include <color_fragment>', `
        vec3 c = mix(uGreen, uRed, uRipe); c = mix(c, c * vec3(1.15, 1.05, 0.7), smoothstep(0.3, 0.0, vAP.x) * 0.35 * uRipe);
        float sp = aoN3(vAP * 4.5 + 3.0) * 0.65 + aoN3(vAP * 11.0) * 0.35;
        // soft brown patches spread from a few bruises (a darker water-soaked rim at their edge), merging into wet rot
        float th = 1.0 - uBruise * 0.62; float br = smoothstep(th, th + 0.09, sp); float rim = smoothstep(th - 0.025, th + 0.01, sp) * (1.0 - smoothstep(th + 0.02, th + 0.07, sp));
        c = mix(c, vec3(0.21, 0.085, 0.025), br * 0.95); c = mix(c, vec3(0.1, 0.035, 0.012), rim * 0.8 * uBruise);
        float rt = sp * 0.6 + aoN3(vAP * 6.0 + 7.0) * 0.4; float rot = smoothstep(1.0 - uRot * 1.05, 1.1 - uRot * 1.05, rt);
        c = mix(c, vec3(0.12, 0.05, 0.016), rot); c = mix(c, vec3(0.065, 0.028, 0.01), smoothstep(1.0 - uRot * 0.8, 1.08 - uRot * 0.8, aoN3(vAP * 3.0 + 1.0)) * 0.85);
        aoWet = max(rot, br * 0.5) * (0.55 + 0.45 * aoN3(vAP * 9.0 + 4.0));
        // mould: pale green-white rings clustered on the rot
        float md = aoN3(vAP * 30.0 + 2.0); float mz = step(0.4, aoN3(vAP * 5.0 + 11.0)) * uMold * max(rot, br);
        c = mix(c, vec3(0.42, 0.48, 0.34), step(0.76, md) * mz); c = mix(c, vec3(0.62, 0.66, 0.5), step(0.84, md) * mz);
        for (int i = 0; i < 3; i++) c = mix(c, vec3(0.03, 0.015, 0.008), (1.0 - smoothstep(0.035, 0.055, distance(vAP, uHole[i]))) * uHoleK);
        diffuseColor.rgb = c * vColor;`);
  };
  m.customProgramCacheKey = () => 'appleTimelapse';
  const apple = new THREE.Group(); G.add(apple); const bm = new THREE.Mesh(body, m); bm.castShadow = true; bm.receiveShadow = true; apple.add(bm);
  const stemM = new THREE.MeshToonMaterial({ color: '#5a3a1e', gradientMap: T.gradientMap([0.45, 0.75, 1.0]) }); const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.76, 0), V(0.01, 0.9, 0), V(0.05, 1.02, 0.01)]), 8, 0.028, 6), stemM); apple.add(stem);
  const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.13, 0.06, 0.32, 0.0); ls.quadraticCurveTo(0.13, -0.09, 0, 0); const leafG = new THREE.ShapeGeometry(ls, 8); const leafM = new THREE.MeshToonMaterial({ color: '#4e8a2c', side: THREE.DoubleSide, gradientMap: T.gradientMap([0.45, 0.75, 1.0]) });
  const leaf = new THREE.Mesh(leafG, leafM); leaf.position.set(0.03, 0.93, 0); leaf.rotation.set(-1.0, 0.6, 0); apple.add(leaf);
  // worms: tubes along paths from deep inside out of a hole and down the flank; a sliding window reveals each crawling body
  const holes = [V(0.62, 0.15, 0.75), V(-0.7, 0.3, 0.55), V(0.1, 0.55, 0.85)].map((d) => d.normalize());
  const wormM = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: T.gradientMap([0.5, 0.78, 1.0]) }); const worms = [];
  holes.forEach((d, i) => {
    const c0 = V(0, 0.42, 0); const exit = c0.clone().addScaledVector(d, 0.5); U.uHole.value[i].copy(exit);
    const side = V().crossVectors(d, V(0, 1, 0)).normalize(); const path = new THREE.CatmullRomCurve3([c0.clone().addScaledVector(d, 0.05), c0.clone().addScaledVector(d, 0.3), exit, exit.clone().addScaledVector(d, 0.12).add(V(0, -0.08, 0)).addScaledVector(side, 0.06 * (i - 1)), exit.clone().addScaledVector(d, 0.26).add(V(0, -0.32, 0)).addScaledVector(side, 0.12), exit.clone().addScaledVector(d, 0.42).add(V(0, -0.46, 0)).addScaledVector(side, -0.05)]);
    const wg = new THREE.TubeGeometry(path, 64, 0.03, 8); const wm = wormM.clone(); const WU = { uE: { value: 0 }, uTime: T.WIND.time, uPh: { value: i * 1.7 }, uCollapse: U.uCollapse };
    wm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, WU); sh.vertexShader = 'uniform float uE, uTime, uPh, uCollapse; varying float vWs;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float L = 0.34; float s = (uv.x - (uE - L)) / L; float inW = step(0.0, s) * step(s, 1.0); float r = inW * pow(max(0.0, sin(3.14159 * clamp(s, 0.0, 1.0))), 0.45) * (0.75 + 0.25 * s);
        vec3 ctr = position - normal * 0.03; vec3 transformed = ctr + normal * 0.03 * r + vec3(sin(uv.x * 34.0 - uTime * 7.0 + uPh), sin(uv.x * 21.0 - uTime * 5.0 + uPh) * 0.4, cos(uv.x * 28.0 - uTime * 6.0 + uPh)) * 0.012 * inW * s; vWs = s; transformed.y = mix(transformed.y, transformed.y * 0.58 + 0.03, uCollapse); transformed.xz *= 1.0 + 0.17 * uCollapse * smoothstep(0.85, 0.05, position.y);`);
      sh.fragmentShader = 'varying float vWs;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(vec3(0.86, 0.52, 0.48), vec3(0.62, 0.32, 0.3), step(0.5, fract(vWs * 9.0))) * mix(1.0, 0.75, smoothstep(0.85, 1.0, vWs)); if (vWs < 0.0 || vWs > 1.0) discard;'); };
    wm.customProgramCacheKey = () => 'worm'; const w = new THREE.Mesh(wg, wm); w.castShadow = true; w.frustumCulled = false; w.userData.noInk = true; w.userData.noAO = true; apple.add(w); worms.push(WU);
  });
  // the seed (glossy, with a hard specular streak) and its sprout
  const seedM = new THREE.MeshToonMaterial({ color: '#5a2c14', gradientMap: T.gradientMap([0.35, 0.7, 1.0]) });
  seedM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float gl = step(0.93, dot(normalize(vNormal), normalize(vec3(-0.35, 0.75, 0.55)))); outgoingLight = mix(outgoingLight, vec3(1.0, 0.92, 0.8), gl * 0.85);\n#include <opaque_fragment>'); };
  const seed = new THREE.Group(); G.add(seed); const sm = new THREE.Mesh(turned([[0.001, 0], [0.11, 0.05], [0.19, 0.17], [0.215, 0.3], [0.18, 0.43], [0.09, 0.53], [0.001, 0.58]], 40), seedM); sm.castShadow = true; seed.add(sm); seed.rotation.z = 0.35;
  const sprout = new THREE.Group(); sprout.position.set(0, 0.55, 0); seed.add(sprout);
  const shootM = new THREE.MeshToonMaterial({ color: '#8ac85a', gradientMap: T.gradientMap([0.45, 0.75, 1.0]), side: THREE.DoubleSide });
  sprout.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.05, 0.25, 0), V(-0.02, 0.5, 0.02), V(0.03, 0.7, 0)]), 16, 0.035, 6), shootM));
  const cot = new THREE.Shape(); cot.moveTo(0, 0); cot.quadraticCurveTo(0.12, 0.13, 0.32, 0.06); cot.quadraticCurveTo(0.16, -0.06, 0, 0); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.ShapeGeometry(cot, 10), shootM); l.position.set(0.03, 0.7, 0); l.rotation.set(0, s > 0 ? 0 : Math.PI, 0.35); l.userData.s = s; sprout.add(l); }
  seed.scale.setScalar(0.001); sprout.scale.setScalar(0.001);
  const stage = (a, b, x) => smooth(a, b, x);
  return {
    group: G, apple, seed,
    set(age) {
      U.uRipe.value = stage(0.0, 0.16, age); U.uBruise.value = stage(0.14, 0.4, age); U.uRot.value = stage(0.32, 0.66, age); U.uCollapse.value = stage(0.45, 0.74, age); U.uMold.value = stage(0.5, 0.72, age); U.uHoleK.value = stage(0.58, 0.63, age);
      worms.forEach((w, i) => { w.uE.value = stage(0.6 + i * 0.03, 0.9, age); });
      leafM.color.set('#4e8a2c').lerp(C('#6a4a22'), stage(0.2, 0.55, age)); leaf.rotation.x = -1.0 - stage(0.25, 0.6, age) * 1.1; stem.rotation.z = -stage(0.4, 0.7, age) * 0.4; const sink = -0.31 * U.uCollapse.value; stem.position.y = sink; leaf.position.y = 0.93 + sink;
      const shrink = 1 - stage(0.86, 0.97, age); apple.scale.setScalar(Math.max(0.001, shrink)); apple.visible = shrink > 0.01;
      seed.scale.setScalar(Math.max(0.001, stage(0.88, 0.98, age) * 0.46));
    },
    sprout(k) { sprout.scale.setScalar(Math.max(0.001, smooth(0, 0.6, k))); sprout.children.forEach((c) => { if (c.userData.s) c.rotation.z = 0.35 + (1 - smooth(0.3, 1, k)) * 1.2; }); },
  };
}
// a wooden farm sign on two posts with carved Alagard lettering (pixel-art wood); top edge is where birds perch
export function signBoard(text, { w = 1.7, seed = 1 } = {}) {
  const G = new THREE.Group(); G.name = 'sign:' + text; const K = new Kit(); const r = mulberry32(seed);
  for (const s of [-1, 1]) K.box('woodDark', 0.13, 1.7, 0.13, V(s * (w / 2 - 0.1), 0.85, -0.05), new THREE.Euler((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.04), 0.03);
  K.box('woodDark', w + 0.2, 0.08, 0.16, V(0, 1.68, -0.02), null, 0.02); K.build(G);
  const board = plaque(text, { font: 'title', style: 'carve', kind: 'oak', depth: 0.5 }); const [bw, bh] = board.userData.size; const k = w / bw; board.scale.multiplyScalar(k); board.position.set(0, 1.22, 0.04); G.add(board);
  G.userData.top = (n) => Array.from({ length: n }, (_, i) => V(-w / 2 + 0.25 + (i + 0.5) * ((w - 0.5) / n), 1.72, -0.02)); G.userData.boardH = bh * k; return G;
}
export { telescope, stumpWithJournal, scrollOnStool, lanternPost, crate };
