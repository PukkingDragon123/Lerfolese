// Character kit: CC0 rigged base meshes (Quaternius Universal Base Characters + Universal Animation Library,
// see assets/characters/CREDITS.md), painted UV atlases and animation helpers.
//
// Painting: every texel of a mesh's existing UV layout is "baked" to its bind-pose surface point (position,
// normal, dominant bone). Painters are then plain functions of that 3D point, so faces, seams, buttons, joints,
// fur and scales land exactly on the anatomy whatever the UV layout looks like. Colours go through hue-shifted,
// banded ramps (violet shadows, warm gold lights) for the stylised low-poly look; materials are flat-shaded.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const DIR = new URL('../../assets/characters/', import.meta.url).href;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const PROM = new Map();
export const LIB = {};
function loadImage(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + url)); i.src = url; }); }
function imageData(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height); }
/** load one character asset ('base_male', 'anims', 'male_shade.png', ...); cached */
export function need(name) {
  if (!PROM.has(name)) PROM.set(name, (/\.(png|jpg)$/.test(name) ? loadImage(DIR + name).then(imageData) : loader.loadAsync(DIR + name + '.glb')).then((v) => (LIB[name] = v)));
  return PROM.get(name);
}
/** run fn now if every asset is loaded (synchronous build), else as soon as they are */
export function withAssets(names, fn) {
  if (names.every((n) => LIB[n])) { fn(); return; }
  Promise.all(names.map(need)).then(fn).catch((e) => console.error('[charkit]', e));
}
export const preloadCharacters = () => Promise.all(['base_male', 'base_female', 'anims', 'male_shade.png', 'female_shade.png', 'hair_long', 'hair_beard', 'bull_head'].map(need));
for (const n of ['base_male', 'anims', 'male_shade.png', 'hair_long']) need(n).catch(() => {});

// ---------------------------------------------------------------- maths, noise, colour
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash3(x, y, z) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), fx), b = lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), fx);
  const c = lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), fx), d = lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), fx);
  return lerp(lerp(a, b, fy), lerp(c, d, fy), fz);
}
export function fbm(x, y, z, o = 3) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f, z * f) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
export const hex = (s) => { const n = parseInt(s.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const SHADOW = [58, 30, 96], LIGHT = [255, 210, 130];
/** hue-shifted tone of base colour c: L 0 = deep violet shadow, 0.5 = c, 1 = warm gold light. Writes out. */
export function tone(c, L, out) {
  if (L < 0.5) { const t = (0.5 - L) * 2; for (let k = 0; k < 3; k++) out[k] = lerp(c[k], c[k] * 0.38 + SHADOW[k] * 0.32, t); }
  else { const t = (L - 0.5) * 2; for (let k = 0; k < 3; k++) out[k] = lerp(c[k], c[k] + (LIGHT[k] - c[k]) * 0.5, t); }
  return out;
}
/** banded painted light: quantise to n flat steps (clean cel planes) */
export const band = (L, n = 5) => Math.round(clamp01(L) * n) / n;
export const mixc = (out, c, t) => { for (let k = 0; k < 3; k++) out[k] = lerp(out[k], c[k], t); return out; };

// ---------------------------------------------------------------- surface bake (UV texel -> bind-pose point)
const SURF = new Map();
/** bake a (skinned) mesh's UV layout: per covered texel its bind-space position, normal and dominant bone name */
export function surface(key, mesh, size, xform = null) {
  const k = key + ':' + size; if (SURF.has(k)) return SURF.get(k);
  const geo = mesh.geometry; const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv;
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; const idx = geo.index ? geo.index.array : null;
  const m = xform || (mesh.isSkinnedMesh ? mesh.bindMatrix : new THREE.Matrix4()); const nm = new THREE.Matrix3().getNormalMatrix(m);
  const vc = pa.count; const VP = new Float32Array(vc * 3), VN = new Float32Array(vc * 3), VB = new Uint8Array(vc); const v = new THREE.Vector3();
  for (let i = 0; i < vc; i++) {
    v.fromBufferAttribute(pa, i).applyMatrix4(m); VP.set([v.x, v.y, v.z], i * 3); v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); VN.set([v.x, v.y, v.z], i * 3);
    if (si) { let bw = -1; for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > bw) { bw = w; VB[i] = si.getComponent(i, j); } } }
  }
  const N = size * size; const P = new Float32Array(N * 3), NN = new Float32Array(N * 3), B = new Uint8Array(N), cov = new Uint8Array(N);
  const tris = (idx ? idx.length : vc) / 3;
  for (let t = 0; t < tris; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
    const ax = ua.getX(a) * size, ay = ua.getY(a) * size, bx = ua.getX(b) * size, by = ua.getY(b) * size, cx = ua.getX(c) * size, cy = ua.getY(c) * size;
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, w2 = 1 - w0 - w1;
      if (w0 < -0.01 || w1 < -0.01 || w2 < -0.01) continue;
      const o = y * size + x;
      for (let q = 0; q < 3; q++) { P[o * 3 + q] = VP[a * 3 + q] * w0 + VP[b * 3 + q] * w1 + VP[c * 3 + q] * w2; NN[o * 3 + q] = VN[a * 3 + q] * w0 + VN[b * 3 + q] * w1 + VN[c * 3 + q] * w2; }
      B[o] = w0 >= w1 && w0 >= w2 ? VB[a] : w1 >= w2 ? VB[b] : VB[c]; cov[o] = 1;
    }
  }
  for (let pass = 0; pass < 3; pass++) { // pad UV islands so filtering never reaches unpainted texels
    const add = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const o = y * size + x; if (cov[o]) continue; const nb = x > 0 && cov[o - 1] ? o - 1 : x < size - 1 && cov[o + 1] ? o + 1 : y > 0 && cov[o - size] ? o - size : y < size - 1 && cov[o + size] ? o + size : -1; if (nb >= 0) add.push(o, nb); }
    for (let i = 0; i < add.length; i += 2) { const o = add[i], s = add[i + 1]; for (let q = 0; q < 3; q++) { P[o * 3 + q] = P[s * 3 + q]; NN[o * 3 + q] = NN[s * 3 + q]; } B[o] = B[s]; cov[o] = 1; }
  }
  let n = 0; for (let i = 0; i < N; i++) n += cov[i];
  const S = { size, n, off: new Int32Array(n), P: new Float32Array(n * 3), N: new Float32Array(n * 3), B: new Uint8Array(n), names: mesh.skeleton ? mesh.skeleton.bones.map((b) => b.name) : [''] };
  for (let i = 0, j = 0; i < N; i++) if (cov[i]) { S.off[j] = i; for (let q = 0; q < 3; q++) { S.P[j * 3 + q] = P[i * 3 + q]; S.N[j * 3 + q] = NN[i * 3 + q]; } S.B[j] = B[i]; j++; }
  SURF.set(k, S); return S;
}

/** run painter fn(c, o) over a baked surface. c: {x,y,z,nx,ny,nz,b,sh}; o: {col:[r,g,b], ro, me, em}. Returns canvases. */
export function paintSurface(S, fn, { shade = null, select = null, into = null } = {}) {
  const { size, n, off, P, N, B, names } = S;
  let cv = into?.canvas, img = into?.img, orm = into?.orm, em = into?.em;
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = cv.height = size; img = cv.getContext('2d', { willReadFrequently: true }).createImageData(size, size);
    orm = document.createElement('canvas'); orm.width = orm.height = size; orm.img = orm.getContext('2d').createImageData(size, size);
    em = document.createElement('canvas'); em.width = em.height = size; em.img = em.getContext('2d').createImageData(size, size); em.used = false;
  }
  const d = img.data, r = orm.img.data, e = em.img.data; const sc = shade ? shade.width / size : 1;
  const c = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, b: '', sh: 0 }; const o = { col: [0, 0, 0], ro: 0.8, me: 0, em: null };
  let x0 = size, y0 = size, x1 = 0, y1 = 0; const sum = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    c.x = P[i * 3]; c.y = P[i * 3 + 1]; c.z = P[i * 3 + 2]; c.nx = N[i * 3]; c.ny = N[i * 3 + 1]; c.nz = N[i * 3 + 2]; c.b = names[B[i]] || '';
    if (select && !select(c)) continue;
    const t = off[i];
    if (shade) { const tx = (t % size) * sc | 0, ty = ((t / size) | 0) * sc | 0; c.sh = shade.data[(ty * shade.width + tx) * 4] / 255 * 1.2 - 0.6; } else c.sh = 0;
    o.ro = 0.8; o.me = 0; o.em = null; fn(c, o);
    const p = t * 4; d[p] = o.col[0]; d[p + 1] = o.col[1]; d[p + 2] = o.col[2]; d[p + 3] = 255;
    r[p] = 255; r[p + 1] = o.ro * 255; r[p + 2] = o.me * 255; r[p + 3] = 255;
    if (o.em) { e[p] = o.em[0]; e[p + 1] = o.em[1]; e[p + 2] = o.em[2]; em.used = true; } else { e[p] = e[p + 1] = e[p + 2] = 0; } e[p + 3] = 255;
    sum[0] += o.col[0]; sum[1] += o.col[1]; sum[2] += o.col[2];
    const x = t % size, y = (t / size) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (!into) { // fill the gaps between islands with the mean colour (keeps mip levels clean)
    const m = sum.map((s) => s / Math.max(1, n));
    for (let p = 0; p < d.length; p += 4) if (!d[p + 3]) { d[p] = m[0]; d[p + 1] = m[1]; d[p + 2] = m[2]; d[p + 3] = 255; r[p] = 255; r[p + 1] = 200; r[p + 2] = 0; r[p + 3] = 255; e[p + 3] = 255; }
  }
  if (x1 >= x0) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    cv.getContext('2d').putImageData(img, 0, 0, x0, y0, w, h); orm.getContext('2d').putImageData(orm.img, 0, 0, x0, y0, w, h); em.getContext('2d').putImageData(em.img, 0, 0, x0, y0, w, h);
  }
  return { canvas: cv, img, orm, em, rect: [x0, y0, x1, y1] };
}

export function canvasTex(cv, srgb = true) {
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; return t;
}
/** stylised flat-shaded material from a painted result */
export function paintedMat(res, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(res.canvas), roughnessMap: canvasTex(res.orm, false), metalnessMap: canvasTex(res.orm, false), roughness: 1, metalness: 1, flatShading: true, ...extra });
  if (res.em.used) { m.emissiveMap = canvasTex(res.em); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 1.6; }
  return m;
}
export function refreshMat(m) { for (const k of ['map', 'roughnessMap', 'emissiveMap']) if (m[k]) m[k].needsUpdate = true; }

/** paint directly in UV space (loft props): fn(u, v, o) with o = {col, ro, me, em} */
export function paintUV(w, h, fn) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const img = cv.getContext('2d').createImageData(w, h);
  const orm = document.createElement('canvas'); orm.width = w; orm.height = h; orm.img = orm.getContext('2d').createImageData(w, h);
  const em = document.createElement('canvas'); em.width = w; em.height = h; em.img = em.getContext('2d').createImageData(w, h); em.used = false;
  const o = { col: [0, 0, 0], ro: 0.8, me: 0, em: null };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    o.ro = 0.8; o.me = 0; o.em = null; fn((x + 0.5) / w, (y + 0.5) / h, o); const p = (y * w + x) * 4;
    img.data[p] = o.col[0]; img.data[p + 1] = o.col[1]; img.data[p + 2] = o.col[2]; img.data[p + 3] = 255;
    orm.img.data[p] = 255; orm.img.data[p + 1] = o.ro * 255; orm.img.data[p + 2] = o.me * 255; orm.img.data[p + 3] = 255;
    if (o.em) { em.img.data.set([o.em[0], o.em[1], o.em[2]], p); em.used = true; } em.img.data[p + 3] = 255;
  }
  cv.getContext('2d').putImageData(img, 0, 0); orm.getContext('2d').putImageData(orm.img, 0, 0); em.getContext('2d').putImageData(em.img, 0, 0);
  return { canvas: cv, orm, em };
}
const UVMATS = new Map();
export function uvMat(key, w, h, fn, extra) { if (!UVMATS.has(key)) { const m = paintedMat(paintUV(w, h, fn), extra); for (const k of ['map', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) m[k].wrapS = m[k].wrapT = THREE.RepeatWrapping; UVMATS.set(key, m); } return UVMATS.get(key); }

// ---------------------------------------------------------------- faces (shared by every humanoid)
// Bind-pose landmarks of the two Quaternius bases (metres, +Y up, facing +Z, character's left = +X).
export const FACE = {
  male: { ey: 1.699, ex: 0.034, ez: 0.068, er: 0.016, my: -0.064, top: 1.81 },
  female: { ey: 1.656, ex: 0.0345, ez: 0.0618, er: 0.015, my: -0.058, top: 1.767 },
};
export const EXPR = {
  neutral: { bin: 0, bout: 0, by: 0, basym: 0, curve: 0.1, open: 0, asym: 0, lid: 0.15, wr: 0.3, frown: 0, teeth: 0, w: 1 },
  smug: { bin: -0.2, bout: 0.3, by: 0, basym: 0.9, curve: 0.25, open: 0, asym: 0.9, lid: 0.45, wr: 0.3, frown: 0, teeth: 0, w: 1 },
  delight: { bin: 0.5, bout: 0.4, by: 0.6, basym: 0, curve: 1, open: 0.55, asym: 0, lid: 0.05, wr: 0.8, frown: 0, teeth: 1, w: 1.15 },
  annoyed: { bin: -1, bout: 0.2, by: -0.3, basym: 0, curve: -0.6, open: 0, asym: 0.2, lid: 0.5, wr: 0.1, frown: 1, teeth: 0, w: 0.85 },
  hurt: { bin: 1, bout: -0.6, by: 0.2, basym: 0, curve: -0.9, open: 0.35, asym: 0, lid: 0.55, wr: 0.7, frown: 0.6, teeth: 1, w: 1 },
  shock: { bin: 0.8, bout: 0.8, by: 1, basym: 0, curve: -0.2, open: 0.9, asym: 0, lid: -0.15, wr: 1, frown: 0, teeth: 0, w: 0.7 },
  think: { bin: 0.3, bout: -0.2, by: 0.1, basym: -0.8, curve: -0.25, open: 0, asym: -0.7, lid: 0.35, wr: 0.5, frown: 0.5, teeth: 0, w: 0.8 },
  grin: { bin: -0.6, bout: 0.6, by: 0, basym: 0, curve: 1, open: 0.35, asym: 0, lid: 0.3, wr: 0.2, frown: 0.4, teeth: 1, w: 1.5 },
};
const T = [0, 0, 0];
/** paint facial features over the skin colour already in o.col. F = FACE[base], E = EXPR entry, A = look opts. Returns true if on the face. */
export function paintFace(c, o, F, E, A) {
  if (c.z < 0.015 || c.nz < -0.25) return false;
  const X = Math.abs(c.x), sx = c.x >= 0 ? 1 : -1, Y = c.y - F.ey; if (Y < -0.13 || Y > 0.1 || X > 0.08) return false;
  const skin = A.skin, ink = A.ink || [skin[0] * 0.32 + 30, skin[1] * 0.22 + 10, skin[2] * 0.3 + 40]; const age = A.age || 0;
  const col = o.col; let L = 0;
  const line = (dist, w, s = 1) => { const a = (1 - sstep(w * 0.5, w, Math.abs(dist))) * s; if (a > 0) mixc(col, ink, a); };
  // eye socket + lids (the eyeballs are separate meshes, these frame them)
  const de = Math.hypot((X - F.ex) / 1.25, Y * 1.05);
  if (de < 0.03) L -= 0.12 * (1 - de / 0.03) * (Y > 0 ? 1.4 : 0.8);
  const ce = X - F.ex;
  if (Math.abs(ce) < 0.019) { line(Y - (0.0125 - 22 * ce * ce + E.lid * -0.002), 0.0026, 0.85); if (age > 0.2) { line(Y - (-0.0125 + 18 * ce * ce), 0.0018, age * 0.6); line(Y - (-0.019 + 14 * ce * ce), 0.0016, age * 0.45); } }
  if (age > 0.3 && X > F.ex + 0.017 && X < F.ex + 0.032) for (const k of [-0.5, 0, 0.5]) line(Y - (X - F.ex - 0.017) * k, 0.0014, age * 0.7 * (1 - (X - F.ex - 0.017) / 0.015));
  // brows (painted, expression-driven)
  const bt = (X - 0.008) / 0.05;
  if (bt > -0.05 && bt < 1.05) {
    const yb = 0.021 + E.by * 0.005 + (E.bin * (1 - bt) + E.bout * bt) * 0.0065 + Math.sin(clamp01(bt) * Math.PI) * 0.0035 + sx * E.basym * 0.0045 * bt;
    const th = (A.browW || 1) * (0.0075 * (1 - 0.45 * bt) + 0.0022); const jag = (A.bushy || 0) * (vnoise(X * 900, Y * 300, 3) - 0.5) * 0.004;
    const dd = Math.abs(Y - yb + jag) - th * 0.5;
    if (dd < 0) { const hair = A.brow || ink; const s = vnoise(X * 1400, Y * 160, 7); tone(hair, band(0.45 + s * 0.35 + (Y - yb) / th * 0.4, 3), T); mixc(col, T, 1); return true; }
    if (dd < 0.0015) mixc(col, ink, 0.25);
  }
  if (E.frown > 0 && X < 0.009 && Y > 0.012 && Y < 0.034) line(X - 0.005 + (Y - 0.012) * 0.08, 0.0015, E.frown * 0.8);
  // forehead wrinkles
  const wr = E.wr * 0.6 + age * 0.6;
  if (wr > 0.05 && Y > 0.04 && Y < 0.08 && X < 0.052) for (let k = 0; k < 3; k++) line(Y - (0.046 + k * 0.0095 + Math.sin(X * 70 + k) * 0.0018 - X * X * 2.5), 0.0016, wr * (1 - X / 0.052) * 0.8);
  // nose: side planes, nostrils, tip colour
  if (Y < -0.005 && Y > -0.05 && X < 0.026) {
    if (c.ny < -0.25 && X > 0.003 && X < 0.017 && Y < -0.036) { mixc(col, ink, 0.85); return true; }
    if (X > 0.009 && c.nz < 0.8) L -= 0.1;
    if (A.nose) { const dn = Math.hypot(X / 1.4, Y + 0.041); if (dn < 0.016) mixc(col, A.nose, (1 - dn / 0.016) * 0.75); }
  }
  // nasolabial folds and marionette lines
  if (Y < -0.035 && Y > -0.085) { const fx = 0.021 + (-0.04 - Y) * 0.32; line(X - fx, 0.0018, (0.35 + age * 0.5) * (1 - sstep(-0.07, -0.085, Y))); }
  if (A.puppet && Y < F.my - 0.002 && Y > -0.13 && X > 0.016 && X < 0.03) line(X - (0.0235 - (F.my - Y) * 0.05), 0.0022, 1);
  // cheeks
  if (A.blush) { const dc = Math.hypot((X - 0.046) / 1.2, Y + 0.03); if (dc < 0.022) mixc(col, A.blush, (1 - dc / 0.022) * 0.6); }
  // mouth
  const mw = 0.021 * E.w; const my = F.my;
  if (X < mw + 0.004 && Y > my - 0.03 && Y < my + 0.015) {
    const s = Math.min(1, X / mw); const s2 = s * s;
    const yl = my + E.curve * 0.0075 * s2 + sx * E.asym * 0.005 * s2 * s; const h = E.open * 0.011 * Math.sqrt(Math.max(0, 1 - s2 * s2));
    if (X < mw && Y < yl + h * 0.4 && Y > yl - h) {
      const tt = (Y - (yl - h)) / Math.max(1e-4, h * 1.4); // 0 bottom .. 1 top of opening
      if (E.teeth && tt > 0.62) { tone([236, 226, 205], 0.6, T); mixc(col, T, 1); if (Math.abs(((X * 380) % 1) - 0.5) < 0.08) mixc(col, ink, 0.4); }
      else if (tt < 0.3) { tone([170, 60, 80], 0.45, T); mixc(col, T, 1); } else { tone([60, 14, 30], 0.4, T); mixc(col, T, 1); }
      return true;
    }
    const lipU = 0.0032 * (1 - s2), lipD = 0.0055 * (1 - s2);
    if (X < mw && Y >= yl + h * 0.4 && Y < yl + h * 0.4 + lipU) { tone(A.lip, 0.38, T); mixc(col, T, 0.85); }
    else if (X < mw && Y <= yl - h && Y > yl - h - lipD) { tone(A.lip, band(0.55 + (Y - (yl - h - lipD)) / lipD * 0.25, 3), T); mixc(col, T, 0.8); }
    if (X < mw + 0.002 && Math.abs(Y - yl) < 0.0012 + (X > mw - 0.003 ? 0.0008 : 0) && h < 0.001) mixc(col, ink, 0.9);
    if (X > mw - 0.002 && X < mw + 0.004) line(Math.hypot(X - mw - 0.001, Y - yl - E.curve * 0.002) - 0.002, 0.0016, 0.6);
    if (Y < my - 0.014 && Y > my - 0.022 && X < 0.011) line(Y - (my - 0.018 + X * X * 30), 0.0016, 0.35 + age * 0.3);
  }
  if (L) { const base = [col[0], col[1], col[2]]; tone(base, 0.5 + L, col); }
  return true;
}
/** eyeball texture painter: iris/pupil/sclera plus the upper lid (expression and blink live in the eye texture) */
export function paintEye(c, o, F, A, lid) {
  const sx = c.x >= 0 ? 1 : -1; const dx = c.x - sx * F.ex, dy = c.y - F.ey, dz = c.z - (F.ez - 0.002);
  const l = Math.hypot(dx, dy, dz) || 1; const ux = dx / l, uy = dy / l, uz = dz / l;
  const a = Math.acos(clamp01(uz * 0.995 + ux * sx * 0.0998));
  const edge = 0.62 - lid * 1.45; // upper lid line in unit-sphere y
  if (uy > edge + Math.abs(ux) * 0.18) { tone(A.skin, uy > edge + 0.12 ? 0.55 : 0.32, o.col); if (uy < edge + 0.08) mixc(o.col, A.ink || [40, 20, 40], 0.85); return; }
  if (uy < -0.72 + Math.max(0, lid) * 0.25) { tone(A.skin, 0.4, o.col); return; }
  const ir = A.irisR || 0.5;
  if (a < ir) {
    const t = a / ir; const slit = A.slit ? Math.abs(ux) < 0.06 * (1 - t * t) + 0.02 : t < 0.42;
    if (slit) { o.col[0] = 18; o.col[1] = 10; o.col[2] = 24; }
    else { tone(A.iris, band(0.75 - t * 0.45 + (uy > 0 ? -0.15 : 0.05), 3), o.col); if (A.glow) o.em = [A.iris[0], A.iris[1], A.iris[2]]; }
    if (Math.hypot(ux + 0.12, uy - 0.16) < 0.09) { o.col[0] = o.col[1] = o.col[2] = 255; if (A.glow) o.em = [255, 255, 255]; }
    if (t > 0.9) mixc(o.col, [20, 12, 30], 0.6); o.ro = 0.15; return;
  }
  tone(A.sclera || [238, 232, 222], uy > 0.25 ? 0.36 : 0.55, o.col); o.ro = 0.25;
  if (uy > edge - 0.12) mixc(o.col, [70, 40, 70], 0.4);
}

// ---------------------------------------------------------------- body instances
/** clone a base character. Returns { model, bones, body, eyes, brows } (all skinned meshes flat-shadow-ready) */
export function makeBody(base) {
  const model = cloneSkinned(LIB['base_' + base].scene); const bones = {}; const out = { model, bones };
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh) { const mn = o.material?.name || ''; out[/Eye/i.test(mn) ? 'eyes' : /Hair/i.test(mn) ? 'brows' : 'body'] = o; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
  });
  if (out.brows) out.brows.visible = false; // brows are painted (expression texture swaps)
  return out;
}
export function srcMesh(asset, test = () => true) { let m = null; LIB[asset].scene.traverse((o) => { if (!m && o.isMesh && test(o)) m = o; }); return m; }
export const baseBody = (base) => srcMesh('base_' + base, (o) => !/Eye|Hair/i.test(o.material?.name || ''));
export const baseEyes = (base) => srcMesh('base_' + base, (o) => /Eye/i.test(o.material?.name || ''));
/** shade (baked form/AO) image for a base */
export const shadeOf = (base) => LIB[base + '_shade.png'];

/** wrap obj so that coordinates given in the base's bind-pose model space follow bone `name` */
export function attachBind(obj, skinned, name) {
  const sk = skinned.skeleton; const i = sk.bones.findIndex((b) => b.name === name); const bone = sk.bones[i];
  const w = new THREE.Group(); sk.boneInverses[i].clone().multiply(skinned.bindMatrix).decompose(w.position, w.quaternion, w.scale);
  w.add(obj); bone.add(w); return w;
}
/** a rigid accessory mesh from a "rigged to head" asset (hair, beard) re-parented onto `skinned`'s Head bone */
export function headPiece(asset, mat, skinned, { push = 0, seed = 1, scale = 1, offset = null } = {}) {
  const src = srcMesh(asset); const sk = src.skeleton; const hi = sk.bones.findIndex((b) => b.name === 'Head');
  const geo = src.geometry.clone(); geo.applyMatrix4(src.bindMatrix);
  if (push) { const p = geo.attributes.position, n = geo.attributes.normal; for (let i = 0; i < p.count; i++) { const k = (vnoise(p.getX(i) * 30 + seed, p.getY(i) * 30, p.getZ(i) * 30) - 0.35) * push; p.setXYZ(i, p.getX(i) + n.getX(i) * k, p.getY(i) + n.getY(i) * k + Math.max(0, k) * 0.4, p.getZ(i) + n.getZ(i) * k); } }
  for (const k of ['skinIndex', 'skinWeight']) geo.deleteAttribute(k);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const hp = new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[hi].clone().invert()).add(new THREE.Vector3(0, 0.1, 0.02));
  if (scale !== 1) { m.position.copy(hp).multiplyScalar(1 - scale); m.scale.setScalar(scale); } if (offset) m.position.add(offset);
  const w = new THREE.Group(); sk.boneInverses[hi].clone().multiply(src.bindMatrix).decompose(w.position, w.quaternion, w.scale); w.add(m);
  skinned.skeleton.bones.find((b) => b.name === 'Head').add(w); return w;
}

// ---------------------------------------------------------------- animation
export class Anim {
  constructor(model) {
    this.mixer = new THREE.AnimationMixer(model); this.a = {};
    for (const c of LIB.anims.animations) this.a[c.name] = this.mixer.clipAction(c);
    this.idle = this.a.idle; this.idle.play(); this.cur = null; this.hold = false; this.saved = new Map();
    this.mixer.addEventListener('finished', (e) => { if (e.action !== this.cur || this.hold) return; this.idle.reset().play(); this.idle.crossFadeFrom(this.cur, 0.3, false); this.cur = null; });
  }
  play(name, { fade = 0.15, speed = 1, hold = false } = {}) {
    const a = this.a[name]; if (!a) return;
    const from = this.cur || this.idle; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = speed; a.setEffectiveWeight(1); a.play();
    if (from !== a) a.crossFadeFrom(from, fade, false); this.cur = a; this.hold = hold;
  }
  revive() { this.hold = false; if (this.cur) { this.idle.reset().play(); this.idle.crossFadeFrom(this.cur, 0.3, false); this.cur = null; } }
  /** additive local rotation on top of the mixer pose (undone before the next mixer update: the mixer only
   *  rewrites properties whose sampled value changed, so offsets must not accumulate) */
  nudge(bone, x = 0, y = 0, z = 0) { if (!bone) return; if (!this.saved.has(bone)) this.saved.set(bone, bone.quaternion.clone()); _q1.setFromEuler(_e.set(x, y, z)); bone.quaternion.multiply(_q1); }
  update(dt) { for (const [b, q] of this.saved) b.quaternion.copy(q); this.saved.clear(); this.mixer.update(dt); }
}
const _e = new THREE.Euler();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
/** rotate `bone` (world-space delta) so that its child `child` points at world `target` (a one-bone aim; chain two for IK) */
export function aimBone(bone, child, target, amt = 1) {
  bone.updateWorldMatrix(true, true); bone.getWorldPosition(_v1); child.getWorldPosition(_v2);
  const cur = _v2.sub(_v1).normalize(); const des = target.clone().sub(_v1).normalize();
  _q1.setFromUnitVectors(cur, des); if (amt < 1) _q1.slerp(_q3.identity(), 1 - amt);
  bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q3.invert().multiply(_q1.multiply(_q2)));
}
/** add a small local rotation (additive on top of the mixer pose) */
export function nudge(bone, x = 0, y = 0, z = 0) { if (!bone) return; _q1.setFromEuler(new THREE.Euler(x, y, z)); bone.quaternion.multiply(_q1); }

// ---------------------------------------------------------------- lofted surfaces (tails, horns, necks, props)
const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3();
/** a swept, tapering tube with parallel-transport frames; u runs round (0 = "up" side), v along. Re-sweep any time with set(). */
export class Loft {
  constructor(rings, sides, { uRep = 1, vRep = 1 } = {}) {
    this.R = rings; this.M = sides; const vc = rings * (sides + 1);
    const g = (this.geo = new THREE.BufferGeometry()); const uv = new Float32Array(vc * 2); const idx = [];
    for (let r = 0; r < rings; r++) for (let s = 0; s <= sides; s++) { const i = r * (sides + 1) + s; uv[i * 2] = (s / sides) * uRep; uv[i * 2 + 1] = (r / (rings - 1)) * vRep; }
    for (let r = 0; r < rings - 1; r++) for (let s = 0; s < sides; s++) { const a = r * (sides + 1) + s, b = a + sides + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.pts = Array.from({ length: rings }, () => new THREE.Vector3());
  }
  /** path(t, outVec3) -> point; radius(t) -> [rx (side), ry (up)] or number; shape(a, t) optional multiplier */
  set(path, radius, { up = _UP, ref = null, shape = null, normals = true } = {}) {
    const { R, M, pts } = this; const pos = this.geo.attributes.position.array;
    for (let r = 0; r < R; r++) path(r / (R - 1), pts[r]);
    _n.copy(up);
    for (let r = 0; r < R; r++) {
      const a = pts[Math.max(0, r - 1)], b = pts[Math.min(R - 1, r + 1)]; _t.subVectors(b, a).normalize();
      if (ref) ref(r / (R - 1), _n);
      _n.addScaledVector(_t, -_n.dot(_t)); if (_n.lengthSq() < 1e-8) _n.set(1, 0, 0).addScaledVector(_t, -_t.x); _n.normalize(); _b.crossVectors(_t, _n);
      const t = r / (R - 1); const rr = radius(t); const rx = Array.isArray(rr) ? rr[0] : rr, ry = Array.isArray(rr) ? rr[1] : rr;
      for (let s = 0; s <= M; s++) {
        const ang = (s / M) * Math.PI * 2; const k = shape ? shape(ang, t) : 1;
        _p.copy(pts[r]).addScaledVector(_n, Math.cos(ang) * ry * k).addScaledVector(_b, Math.sin(ang) * rx * k);
        const i = (r * (M + 1) + s) * 3; pos[i] = _p.x; pos[i + 1] = _p.y; pos[i + 2] = _p.z;
      }
    }
    this.geo.attributes.position.needsUpdate = true; if (normals) this.geo.computeVertexNormals(); this.geo.computeBoundingSphere();
    return this;
  }
}
const _UP = new THREE.Vector3(0, 1, 0);
export function mesh(geo, mat, parent) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent?.add(m); return m; }
/** smooth path through control points */
export const curve = (pts) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, 'centripetal'); return (t, out) => c.getPoint(t, out); };
