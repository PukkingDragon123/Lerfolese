// Realistic low-poly pixel-art look shared by the beasts, the event NPCs and the Limbo monsters: a drop-in `K` that is
// charkit with the cartoon parts swapped out. Flat-shaded, physically lit materials (MeshStandardMaterial with
// roughness/metalness from the painted ORM page) carry low-resolution, nearest-filtered, hand-made pixel textures
// painted with natural colour ramps (seven steps, cool desaturated shadows, warm lights, a light dither so texels
// break into clusters) instead of cel bands; lofted parts get fewer rings and sides; sculpt budgets live in LOW.
import * as THREE from 'three';
import * as CK from '../charkit.js';

/** global low-poly budget: triangle targets, sculpt cell size, atlas size, loft rings/sides, UV-painted page size */
export const LOW = { tri: 0.3, cell: 1.45, atlas: 0.36, loftR: 0.5, loftS: 0.6, uv: 0.5 };
export const lowAtlas = (a) => Math.max(96, Math.round((a * LOW.atlas) / 16) * 16);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const SH = [16, 18, 26], LT = [255, 238, 212];
/** natural ramp of base colour c: L 0.5 = albedo, down to a cool desaturated dark, up toward warm sunlight */
export function tone(c, L, out = [0, 0, 0]) {
  if (L < 0.5) { const t = (0.5 - L) * 2 * 0.66; const g = (c[0] + c[1] + c[2]) / 3; for (let k = 0; k < 3; k++) out[k] = (c[k] * 0.85 + g * 0.15) * (1 - t) + SH[k] * t; }
  else { const t = (L - 0.5) * 2 * 0.36; for (let k = 0; k < 3; k++) out[k] = c[k] + (LT[k] - c[k]) * t; }
  return out;
}
/** seven-step pixel ramp with a light dither (hand-placed clusters rather than smooth gradients or cel bands) */
export const band = (L, n = 7) => { const m = Math.max(7, n + 3); return Math.round(clamp01(L + (Math.random() - 0.5) * (0.75 / m)) * m) / m; };
function texOf(cv, srgb) { const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = 2; return t; }
/** realistic flat-shaded lit material from a painted page {canvas, orm, em} */
export function paintedMat(res, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ map: texOf(res.canvas, true), flatShading: true, roughness: 1, metalness: 1, envMapIntensity: 0.35, ...extra });
  if (res.orm) { const o = texOf(res.orm, false); m.roughnessMap = o; m.metalnessMap = o; } else { m.roughness = 0.85; m.metalness = 0; }
  if (res.em?.used) { m.emissiveMap = texOf(res.em, true); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 1.0; }
  return m;
}
export const paintUV = (w, h, fn) => CK.paintUV(Math.max(8, Math.round(w * LOW.uv)), Math.max(8, Math.round(h * LOW.uv)), fn);
const UV = new Map();
export function uvMat(key, w, h, fn, extra) { if (!UV.has(key)) { const m = paintedMat(paintUV(w, h, fn), extra); for (const k of ['map', 'emissiveMap', 'roughnessMap']) if (m[k]) m[k].wrapS = m[k].wrapT = THREE.RepeatWrapping; UV.set(key, m); } return UV.get(key); }
/** fur clumps on a baked surface: strands flowing down, dark partings, lit tips (natural ramp) */
export function fur3(c, o, col, size = 0.03, stretch = 1.5, base = 0.5) {
  const Y = c.y / (size * stretch); const C = CK.cells3(c.x / size, Y, c.z / size); const dy = Y - C[3];
  let L = base + c.ny * 0.06 + (c.sh || 0) * 0.15 + dy * 0.3 + (C[5] - 0.5) * 0.14 + (CK.vnoise(c.x * 200, c.y * 40, c.z * 200) - 0.5) * 0.12;
  if (C[1] - C[0] < 0.08 && dy < 0.05) L -= 0.2; tone(col, band(L), o.col); o.ro = 0.95;
}
export function fur2(u, v, o, col, su = 14, sv = 6, base = 0.5, lightU = 0.22) {
  const C = CK.cells2(u * su, v * sv); let L = base + Math.cos(u * Math.PI * 2) * lightU * 0.5 + (v * sv - C[3]) * -0.25 + (C[4] - 0.5) * 0.12 + (CK.vnoise(u * 90, v * 20, 1) - 0.5) * 0.1;
  if (C[1] - C[0] < 0.1) L -= 0.22; tone(col, band(L), o.col); o.ro = 0.95;
}
/** lofts with fewer rings and sides (faceted under flat shading) */
export class Loft extends CK.Loft { constructor(rings, sides, o) { super(Math.max(3, Math.round(rings * LOW.loftR)), Math.max(4, Math.round(sides * LOW.loftS)), o); } }
export const skinnedLoft = (rings, sides, ...rest) => CK.skinnedLoft(Math.max(3, Math.round(rings * LOW.loftR)), Math.max(4, Math.round(sides * LOW.loftS)), ...rest);
/** charkit with the realistic low-poly pixel-art parts swapped in */
export const K = { ...CK, tone, band, paintedMat, paintUV, uvMat, fur3, fur2, Loft, skinnedLoft };
/** flat-shaded realistic material for a Limbo body page (nearest-filtered pixel art) */
export function limboMat(tex) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.35 }); }

// ---------------------------------------------------------------- weathering: lived-in surfaces (scars, wrinkles, warts,
// mottling, patchy fur, chips) as painted pixel detail. All are functions of the bind-pose point, so they stay put on
// the anatomy. `age` 0..1 scales how much life the creature has had.
const fr = (v) => v - Math.floor(v);
const hh = (a, b, c) => fr(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453);
/** healed scar lines: 1 = raised pale core, 0.5 = puckered dark rim, 0 = none */
export function scar(c, size = 0.24, dens = 0.32, wid = 0.007) {
  const ix = Math.floor(c.x / size), iy = Math.floor(c.y / size), iz = Math.floor(c.z / size); if (hh(ix, iy, iz) > dens) return 0;
  const cx = (ix + 0.5) * size, cy = (iy + 0.5) * size, cz = (iz + 0.5) * size; let dx = hh(ix + 3, iy, iz) - 0.5, dy = (hh(ix, iy + 5, iz) - 0.5) * 0.6, dz = hh(ix, iy, iz + 7) - 0.5; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  const px = c.x - cx, py = c.y - cy, pz = c.z - cz; const a = px * dx + py * dy + pz * dz; if (Math.abs(a) > size * 0.45) return 0;
  const w = wid * (1 + 0.6 * Math.sin(a * 140)) * (1 - Math.abs(a) / (size * 0.5)); const d = Math.hypot(px - dx * a, py - dy * a, pz - dz * a);
  return d < w * 0.55 ? 1 : d < w * 1.3 ? 0.5 : 0;
}
/** fine wrinkles that gather in creases and folds: 0..1 */
export function wrinkle(c, cav, freq = 120) { const w = Math.sin(c.y * freq + CK.vnoise(c.x * 14, c.y * 4, c.z * 14) * 7 + c.x * 30); return w > 0.84 ? Math.min(1, (1 - cav) * 4 + 0.25) : 0; }
/** warts and moles: 1 = lit dome top, 0.5 = shaded side, 0 = none */
export function wart(c, size = 0.03, dens = 0.07) { const C = CK.cells3(c.x / size, c.y / size, c.z / size); if (C[5] > dens || C[0] > 0.24) return 0; return C[3] < c.y / size ? 1 : 0.5; }
/** low-frequency blotching (age spots, sun damage, grime) -0.5..0.5 */
export const mottle = (c, f = 5) => CK.vnoise(c.x * f, c.y * f, c.z * f) - 0.5;
/** patchy, mangy fur: 1 where the coat has worn through to skin */
export const mange = (c, f = 4.5, thr = 0.74) => (CK.vnoise(c.x * f + 9, c.y * f, c.z * f) > thr ? 1 : 0);
/** chipped edges on horn, bone and bronze: 1 = chip */
export const chip = (c, cav, f = 26) => (cav > 0.96 && CK.vnoise(c.x * f, c.y * f, c.z * f) > 0.7 ? 1 : 0);
/** apply the generic weathering for a painter style; returns the adjusted L and may recolour col (array) */
export function weather(style, c, cav, L, col, age = 0.6, skin = null) {
  if (age <= 0) return L;
  const m = mottle(c); L += m * 0.08 * age;
  if (style === 'skin' || style === 'hide') {
    if (m > 0.22 * (2 - age)) for (let k = 0; k < 3; k++) col[k] = col[k] * 0.86 + [120, 70, 60][k] * 0.14; // blotches
    if (age > 0.3) { const w = wrinkle(c, cav); if (w) L -= 0.1 * w * age; const t = wart(c, 0.03, 0.05 * age); if (t) L += t === 1 ? 0.08 : -0.06; }
    const s = age > 0.35 ? scar(c, 0.26, 0.28 * age) : 0; if (s === 1) { for (let k = 0; k < 3; k++) col[k] = col[k] * 0.55 + [214, 170, 150][k] * 0.45; L += 0.06; } else if (s) L -= 0.1;
  } else if (style === 'fur') {
    if (skin && age > 0.3 && mange(c, 4.5, 0.82 - age * 0.12)) { for (let k = 0; k < 3; k++) col[k] = skin[k]; L -= 0.04; }
    const s = age > 0.35 ? scar(c, 0.28, 0.25 * age, 0.008) : 0; if (s === 1) { for (let k = 0; k < 3; k++) col[k] = col[k] * 0.5 + [200, 160, 140][k] * 0.5; } else if (s) L -= 0.12;
  } else if (style === 'scale') {
    if (CK.vnoise(c.x * 22, c.y * 22, c.z * 22) > 0.78) L -= 0.12 * age; // chipped, dulled plates
    const s = scar(c, 0.3, 0.3 * age, 0.01); if (s === 1) { for (let k = 0; k < 3; k++) col[k] = col[k] * 0.5 + [190, 180, 150][k] * 0.5; L += 0.05; } else if (s) L -= 0.12;
  } else if (style === 'metal') {
    if (chip(c, cav)) L += 0.14; if (CK.vnoise(c.x * 9, c.y * 9, c.z * 9) > 0.78) L -= 0.12 * age; // bright worn chips, dark dents
    const s = scar(c, 0.2, 0.5 * age, 0.004); if (s === 1) L += 0.16; // bright scratches
  } else if (style === 'bone' || style === 'keratin') {
    if (chip(c, cav, 30)) L -= 0.16; if (cav < 0.85) for (let k = 0; k < 3; k++) col[k] = col[k] * 0.8 + [90, 70, 40][k] * 0.2; // chips, grime in the hollows
  } else if (style === 'feather') { if (CK.vnoise(c.x * 12, c.y * 30, c.z * 12) > 0.76) L -= 0.14 * age; } // broken, ragged vanes
  return L;
}
